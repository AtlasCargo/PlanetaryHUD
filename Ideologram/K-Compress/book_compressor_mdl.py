#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
book_compressor_mdl.py — MDL + CEP-aware distillation of books into statement vectors.

Run:
  python book_compressor_mdl.py \
    --book_id "sample_book" \
    --txt_path ./book.txt \
    --out_dir ./out \
    --cep ./cep.json

Outputs (out/BOOK_ID):
  sentences.jsonl
  ists.jsonl
  embeddings.npy
  paraphrase_clusters.json
  chapter_cores.jsonl
  book_core.json
  density_report.json
"""

import argparse, os, re, json, hashlib, math, lzma
from collections import defaultdict, Counter
from typing import List, Dict, Any, Tuple

# OpenAI imports
try:
    import openai
except ImportError:
    print("⚠️  OpenAI package not installed. Run: pip install openai")
    openai = None

# -------------------- Text utilities --------------------

def normalize_text(s: str) -> str:
    s = s.lower()
    s = re.sub(r"[“”‘’]", '"', s)
    s = re.sub(r"\s+", " ", s).strip()
    return s

def simhash_64(s: str) -> str:
    h = hashlib.blake2b(s.encode("utf-8"), digest_size=8).digest()
    return h.hex()

def split_chapters(text: str) -> List[str]:
    parts = re.split(r"\n\s*\n\s*(?=[A-Z][A-Za-z0-9 ,:'\"-]{0,80}\n)", text)
    if len(parts) < 2:
        parts = re.split(r"\n{3,}", text)
    return [p.strip() for p in parts if p.strip()]

def split_paragraphs(chapter: str) -> List[str]:
    return [p.strip() for p in re.split(r"\n{2,}", chapter) if p.strip()]

def split_sentences(paragraph: str) -> List[str]:
    sents = re.split(r"(?<=[.!?])\s+(?=[A-Z0-9\"“])", paragraph.strip())
    return [s.strip() for s in sents if s.strip()]

def make_sa(book_id: str, ch_i: int, para_i: int, sent_i: int, sent_text: str) -> str:
    norm = normalize_text(sent_text)
    h = simhash_64(norm)[:8]
    return f"{book_id}:{ch_i}.{para_i}.{sent_i}:{h}"

# -------------------- Compression / Complexity --------------------

def compressed_len_bits(s: str) -> int:
    # Kolmogorov proxy: compressed length in bits (lzma)
    if not s:
        return 0
    data = s.encode("utf-8", errors="ignore")
    comp = lzma.compress(data, preset=6)
    return len(comp) * 8

def concat_and_compress_bits(a: str, b: str) -> int:
    return compressed_len_bits(a + "\n" + b)

def ncd(a: str, b: str) -> float:
    # Normalized Compression Distance ∈ [0,1+] (lower == more similar)
    Ca = compressed_len_bits(a)
    Cb = compressed_len_bits(b)
    Cab = concat_and_compress_bits(a, b)
    denom = max(Ca, Cb) or 1
    return (Cab - min(Ca, Cb)) / denom

# -------------------- Embeddings (Real Semantic) --------------------

def get_semantic_embedding(text: str, client: openai.OpenAI) -> List[float]:
    """Get real semantic embedding from OpenAI"""
    try:
        response = client.embeddings.create(
            model="text-embedding-3-small",  # Cost-effective, high-quality embeddings
            input=text,
            dimensions=1536  # Standard dimension for text-embedding-3-small
        )
        return response.data[0].embedding
    except Exception as e:
        print(f"⚠️  Embedding API error: {e}")
        # Fallback to hash-based embedding
        return _hash_vec(text, 1536)

def embed_ist(ist: Dict[str,Any], client: openai.OpenAI) -> List[float]:
    """Generate semantic embedding for IST using OpenAI"""
    if ist.get("none"):
        return [0.0] * 1536
    
    # Create rich text representation for embedding
    triple = " | ".join(ist["triple"])
    facets = f"{ist.get('polarity','')}|{ist.get('modality','')}|{ist.get('tense','')}|{ist.get('hedging','')}|{ist.get('scope','')}"
    
    # Combine triple and facets for rich semantic representation
    embedding_text = f"{triple} || {facets}"
    
    return get_semantic_embedding(embedding_text, client)

def _hash_vec(s: str, d: int=1536) -> List[float]:
    """Fallback hash-based embedding when OpenAI fails"""
    raw = hashlib.blake2s(s.encode("utf-8"), digest_size=32).digest()
    raw = (raw * ((d // len(raw)) + 1))[:d]
    return [(b/127.5 - 1.0) for b in raw]

def cosine(a: List[float], b: List[float]) -> float:
    num = sum(x*y for x,y in zip(a,b))
    da = math.sqrt(sum(x*x for x in a))
    db = math.sqrt(sum(y*y for y in b))
    if da == 0 or db == 0:
        return 0.0
    return num/(da*db)

# -------------------- LLM Integration --------------------

import openai
import os
import json
import time

def setup_openai():
    """Setup OpenAI client with API key from environment"""
    if openai is None:
        raise ValueError("OpenAI package not installed. Run: pip install openai")
    
    api_key = os.getenv('OPENAI_API_KEY')
    if not api_key:
        raise ValueError("OPENAI_API_KEY environment variable not set")
    return openai.OpenAI(api_key=api_key)

def llm_sentence_to_ist_batch(sentences_batch: List[Dict], cep: Dict[str,Any], max_sentences: int = None) -> List[Dict[str,Any]]:
    """
    Extract ISTs from a batch of sentences using GPT-5-nano for efficiency.
    Returns list of ISTs in same order as input sentences.
    """
    if not sentences_batch:
        return []
    
    # Limit sentences for testing if specified
    if max_sentences:
        sentences_batch = sentences_batch[:max_sentences]
        print(f"🧪 TEST MODE: Processing only first {len(sentences_batch)} sentences")
    
    try:
        client = setup_openai()
        
        # Create batch prompt
        doc_type = cep.get("doc_type", "nonfiction")
        sensitivity = "high" if doc_type in ["paper", "math", "biology"] else "medium" if doc_type == "nonfiction" else "low"
        
        # Build batch content
        batch_texts = []
        for i, rec in enumerate(sentences_batch):
            batch_texts.append(f"{i+1}. {rec['text']}")
        
        batch_content = "\n".join(batch_texts)
        
        prompt = f"""You are a precise statement extractor for {doc_type} text. 

Given {len(sentences_batch)} sentences, output a JSON array of ISTs (Information Structure Triples).
For each sentence, output ONE IST if it asserts a claim; otherwise output {{"none": true}}.

IST Schema (STRICT JSON array only):
[
  {{
    "id": "SENTENCE_ID",
    "triple": ["SUBJECT", "PREDICATE", "OBJECT"],
    "polarity": "affirm|negate",
    "modality": "assertive|hypothetical|prescribed|questioned|evidential",
    "tense": "past|present|future|timeless",
    "hedging": "none|low|medium|high",
    "scope": "local|global|character_voice|narrator_voice",
    "entities": [],
    "evidence_span": [0, SENTENCE_LENGTH],
    "confidence": 0.0-1.0
  }},
  // ... one IST per sentence, or {{"none": true}} if no claim
]

Rules:
- Only extract if sentence makes a factual claim or assertion
- Be sensitive to {sensitivity} hedging and uncertainty
- For {doc_type}, focus on {doc_type}-specific language patterns
- Output STRICT JSON array only, no explanations
- If no claim, output {{"none": true}}
- Maintain exact order: sentence 1 → index 0, sentence 2 → index 1, etc.

Sentences:
{batch_content}

IST Array:"""

        response = client.chat.completions.create(
            model="gpt-5-nano",  # Using gpt-5-nano for cost efficiency
            messages=[
                {"role": "system", "content": "You are a precise statement extractor. Output only valid JSON array."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.1,  # Low temperature for consistent output
            max_tokens=4000,  # Increased for batch processing
            response_format={"type": "json_object"}
        )
        
        # Parse the response
        content = response.choices[0].message.content
        try:
            # Handle both array and object responses
            parsed = json.loads(content)
            if isinstance(parsed, dict) and "results" in parsed:
                ists = parsed["results"]
            elif isinstance(parsed, list):
                ists = parsed
            else:
                print(f"⚠️  Unexpected response format: {type(parsed)}")
                return [{"none": True} for _ in sentences_batch]
            
            # Validate and fix ISTs
            validated_ists = []
            for i, ist in enumerate(ists):
                if ist.get("none"):
                    validated_ists.append(ist)
                    continue
                
                # Ensure ID matches sentence
                if "id" not in ist:
                    ist["id"] = sentences_batch[i]["sa"]
                
                # Validate required fields
                required_fields = ["id", "triple", "polarity", "modality", "tense", "hedging", "scope", "entities", "evidence_span", "confidence"]
                if not all(field in ist for field in required_fields):
                    print(f"⚠️  Invalid IST structure for sentence {i+1}: {sentences_batch[i]['text'][:50]}...")
                    validated_ists.append({"none": True})
                    continue
                
                # Ensure confidence is numeric
                if isinstance(ist.get("confidence"), str):
                    try:
                        ist["confidence"] = float(ist["confidence"])
                    except:
                        ist["confidence"] = 0.5
                
                validated_ists.append(ist)
            
            # Ensure we have the right number of ISTs
            while len(validated_ists) < len(sentences_batch):
                validated_ists.append({"none": True})
            
            return validated_ists[:len(sentences_batch)]
            
        except json.JSONDecodeError as e:
            print(f"⚠️  JSON parse error for batch: {e}")
            return [{"none": True} for _ in sentences_batch]
            
    except Exception as e:
        print(f"⚠️  OpenAI API error for batch: {e}")
        # Fallback to individual processing
        return [fallback_ist_extraction(rec["text"], rec["sa"]) for rec in sentences_batch]

def llm_sentence_to_ist(sentence_text: str, sa: str, cep: Dict[str,Any]) -> Dict[str,Any]:
    """
    Extract IST (Information Structure Triple) from sentence using GPT-5.
    Must output STRICT JSON per IST schema, or {"none":true} if no claim.
    """
    txt = sentence_text.strip()
    
    # Simple genre-aware gate: fiction is sparser.
    min_words = 6 if cep.get("doc_type") == "paper" else 8 if cep.get("doc_type") in {"nonfiction","biology","math"} else 10
    if len(txt.split()) < min_words:
        return {"none": True}

    # Skip very short or incomplete sentences
    if len(txt) < 20 or not txt.endswith(('.', '!', '?')):
        return {"none": True}

    try:
        client = setup_openai()
        
        # Create context-aware prompt based on document type
        doc_type = cep.get("doc_type", "nonfiction")
        sensitivity = "high" if doc_type in ["paper", "math", "biology"] else "medium" if doc_type == "nonfiction" else "low"
        
        prompt = f"""You are a precise statement extractor for {doc_type} text. 

Given ONE sentence, output ONE IST (Information Structure Triple) if it asserts a claim; otherwise output {{"none": true}}.

IST Schema (STRICT JSON only):
{{
  "id": "{sa}",
  "triple": ["SUBJECT", "PREDICATE", "OBJECT"],
  "polarity": "affirm|negate",
  "modality": "assertive|hypothetical|prescribed|questioned|evidential",
  "tense": "past|present|future|timeless",
  "hedging": "none|low|medium|high",
  "scope": "local|global|character_voice|narrator_voice",
  "entities": [],
  "evidence_span": [0, {len(txt)}],
  "confidence": 0.0-1.0
}}

Rules:
- Only extract if sentence makes a factual claim or assertion
- Be sensitive to {sensitivity} hedging and uncertainty
- For {doc_type}, focus on {doc_type}-specific language patterns
- Output STRICT JSON only, no explanations
- If no claim, output {{"none": true}}

Sentence: "{txt}"

IST:"""

        response = client.chat.completions.create(
            model="gpt-5-nano",  # Using gpt-5-nano for cost efficiency
            messages=[
                {"role": "system", "content": "You are a precise statement extractor. Output only valid JSON."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.1,  # Low temperature for consistent output
            max_tokens=300,
            response_format={"type": "json_object"}
        )
        
        # Parse the response
        content = response.choices[0].message.content
        try:
            ist = json.loads(content)
            
            # Validate IST structure
            if ist.get("none"):
                return ist
                
            required_fields = ["id", "triple", "polarity", "modality", "tense", "hedging", "scope", "entities", "evidence_span", "confidence"]
            if not all(field in ist for field in required_fields):
                print(f"⚠️  Invalid IST structure for sentence: {txt[:50]}...")
                return {"none": True}
                
            # Ensure confidence is numeric
            if isinstance(ist.get("confidence"), str):
                try:
                    ist["confidence"] = float(ist["confidence"])
                except:
                    ist["confidence"] = 0.5
            
            return ist
            
        except json.JSONDecodeError as e:
            print(f"⚠️  JSON parse error for sentence: {txt[:50]}... Error: {e}")
            return {"none": True}
            
    except Exception as e:
        print(f"⚠️  OpenAI API error for sentence: {txt[:50]}... Error: {e}")
        # Fallback to rule-based extraction
        return fallback_ist_extraction(txt, sa)

def fallback_ist_extraction(sentence_text: str, sa: str) -> Dict[str,Any]:
    """
    Fallback rule-based IST extraction when GPT-5 fails
    """
    txt = sentence_text.strip()
    
    # Simple pattern matching for basic statements
    m = re.match(r"([A-Z][^,;]+?)\s+(is|are|was|were|seems|claims|argues|shows|suggests)\s+(.*)", txt)
    if m:
        subj, pred, obj = m.group(1).strip(), m.group(2).strip(), m.group(3).strip().rstrip(".")
    else:
        subj, pred, obj = "text", "states", txt.rstrip(".")
    
    ist = {
        "id": sa,
        "triple": [subj, pred, obj],
        "polarity": "affirm",
        "modality": "assertive",
        "tense": "timeless",
        "hedging": "none",
        "scope": "narrator_voice",
        "entities": [],
        "evidence_span": [0, len(sentence_text)],
        "confidence": 0.3  # Lower confidence for fallback
    }
    return ist

# -------------------- Clustering (cosine + NCD) --------------------

def paraphrase_clusters(ists: List[Dict[str,Any]], embs: List[List[float]],
                        sim_thresh: float, ncd_thresh: float, min_cluster: int):
    n = len(ists)
    used = [False]*n
    clusters = []
    for i in range(n):
        if used[i] or ists[i].get("none"):
            used[i] = True
            continue
        cur = [i]; used[i] = True
        base_text = " ".join(ists[i]["triple"]) if not ists[i].get("none") else ""
        for j in range(i+1, n):
            if used[j] or ists[j].get("none"):
                continue
            cos_ok = cosine(embs[i], embs[j]) >= sim_thresh
            ncd_ok = ncd(base_text, " ".join(ists[j]["triple"])) <= ncd_thresh
            if cos_ok or ncd_ok:
                cur.append(j); used[j] = True
        if len(cur) >= min_cluster:
            clusters.append(cur)
    # keep singletons too
    for i in range(n):
        if not used[i] and not ists[i].get("none"):
            clusters.append([i])
    return clusters

def cluster_centroid(embs: List[List[float]], idxs: List[int]) -> List[float]:
    d = len(embs[0])
    out = [0.0]*d
    for i in idxs:
        v = embs[i]
        for k in range(d):
            out[k] += v[k]
    return [x/len(idxs) for x in out]

def summarize_cluster_to_ist(cluster_ists: List[Dict[str,Any]]) -> Dict[str,Any]:
    if not cluster_ists:
        return {"none": True}
    preds = Counter(ist["triple"][1] for ist in cluster_ists if not ist.get("none"))
    if not preds:
        return {"none": True}
    pred = preds.most_common(1)[0][0]
    subj = cluster_ists[0]["triple"][0]
    obj = "; ".join(ist["triple"][2] for ist in cluster_ists if not ist.get("none"))[:400]
    merged = dict(cluster_ists[0])
    merged["triple"] = [subj, pred, obj]
    merged["confidence"] = sum(ist.get("confidence",0.0) for ist in cluster_ists)/max(1,len(cluster_ists))
    return merged

# -------------------- MDL selection --------------------

def ist_code_len_bits(ist: Dict[str,Any]) -> int:
    if ist.get("none"): return 0
    # Use triple + facets as code proxy
    s = " | ".join(ist["triple"]) + f" | {ist.get('polarity')}|{ist.get('modality')}|{ist.get('tense')}"
    return compressed_len_bits(s)

def greedy_mdl_selection(protos: List[Dict[str,Any]],
                         covers: Dict[int, List[int]],
                         ist_bits: List[int],
                         ptr_cost_bits: int,
                         target_cov: float):
    all_items = set(i for L in covers.values() for i in L)
    covered = set()
    chosen = []
    covered_bits = 0
    total_bits = sum(ist_bits[i] for i in all_items)

    while len(covered)/max(1,len(all_items)) < target_cov and len(chosen) < len(protos):
        best = None
        best_gain = -1e9
        for cid, L in covers.items():
            if cid in chosen: continue
            new_items = [i for i in L if i not in covered]
            if not new_items: continue
            gain_bits = sum(ist_bits[i] for i in new_items)
            proto_bits = compressed_len_bits(" | ".join(protos[cid]["triple"]))
            cost_bits = proto_bits + len(new_items)*ptr_cost_bits
            mdl_gain = gain_bits - cost_bits
            if mdl_gain > best_gain:
                best_gain = mdl_gain
                best = cid
        if best is None or best_gain <= 0:
            # Stop if no positive MDL gain; fallback to coverage-based pick
            break
        chosen.append(best)
        for i in covers[best]:
            if i not in covered:
                covered.add(i)
                covered_bits += ist_bits[i]

    cov_ratio = len(covered)/max(1,len(all_items))
    mdl_reduction = covered_bits  # approximate
    return chosen, cov_ratio, mdl_reduction

# -------------------- Density Metrics --------------------

def token_count(s: str) -> int:
    return len(re.findall(r"\w+|\S", s))

def density_report(sentences: List[Dict[str,Any]], ists: List[Dict[str,Any]]) -> Dict[str,Any]:
    total_tokens = sum(token_count(rec["text"]) for rec in sentences)
    stmt_ists = [ist for ist in ists if not ist.get("none")]
    n_statements = len(stmt_ists)
    per_1k = (1000.0 * n_statements / max(1, total_tokens))
    assertive = sum(1 for ist in stmt_ists if ist.get("modality") == "assertive")
    modal = sum(1 for ist in stmt_ists if ist.get("modality") in {"hypothetical","prescribed","questioned","evidential"})
    avg_bits_per_token = sum(ist_code_len_bits(ist) for ist in stmt_ists) / max(1,total_tokens)
    by_ch = defaultdict(lambda: {"tokens":0,"statements":0})
    for srec, ist in zip(sentences, ists):
        ch = srec["ch"]
        by_ch[ch]["tokens"] += token_count(srec["text"])
        by_ch[ch]["statements"] += 0 if ist.get("none") else 1
    chapters = {int(k):{
        "statements_per_1k_tokens": (1000.0 * v["statements"] / max(1,v["tokens"]))
    } for k,v in by_ch.items()}
    return {
        "tokens": total_tokens,
        "statements": n_statements,
        "statements_per_1k_tokens": per_1k,
        "assertive_ratio": assertive/max(1,n_statements),
        "modal_ratio": modal/max(1,n_statements),
        "avg_compressed_bits_per_token": avg_bits_per_token,
        "chapters": chapters
    }

# -------------------- CEP (Context Enrichment Profile) --------------------

DEFAULT_CEP = {
    "doc_type": "nonfiction",
    "expected_density_per_1k": 25.0,
    "thresholds": {
        "sim_cos": 0.86,
        "ncd": 0.35,
        "min_cluster": 2
    },
    "mdl": {
        "ptr_cost_bits": 64,
        "target_coverage": 0.85
    }
}

DOC_TYPE_PRESETS = {
    "fiction": {
        "expected_density_per_1k": 5.0,
        "thresholds": {"sim_cos": 0.88, "ncd": 0.30, "min_cluster": 3}
    },
    "paper": {
        "expected_density_per_1k": 45.0,
        "thresholds": {"sim_cos": 0.84, "ncd": 0.40, "min_cluster": 2}
    },
    "math": {
        "expected_density_per_1k": 40.0,
        "thresholds": {"sim_cos": 0.83, "ncd": 0.42, "min_cluster": 2}
    },
    "biology": {
        "expected_density_per_1k": 48.0,
        "thresholds": {"sim_cos": 0.85, "ncd": 0.38, "min_cluster": 2}
    }
}

def load_cep(path: str) -> Dict[str,Any]:
    cep = dict(DEFAULT_CEP)
    if path and os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            user = json.load(f)
        for k,v in user.items():
            cep[k] = v
    # apply presets
    dt = cep.get("doc_type")
    if dt in DOC_TYPE_PRESETS:
        for k,v in DOC_TYPE_PRESETS[dt].items():
            if k == "thresholds":
                cep["thresholds"].update(v)
            else:
                cep[k] = v
    return cep

# -------------------- Pipeline --------------------

def run_pipeline(book_id: str, txt_path: str, out_dir: str, cep_path: str):
    os.makedirs(os.path.join(out_dir, book_id), exist_ok=True)
    outp = lambda name: os.path.join(out_dir, book_id, name)

    cep = load_cep(cep_path)

    text = open(txt_path, "r", encoding="utf-8").read()
    chapters = split_chapters(text)

    sentences = []
    for ch_i, ch in enumerate(chapters):
        for p_i, para in enumerate(split_paragraphs(ch)):
            for s_i, s in enumerate(split_sentences(para)):
                sa = make_sa(book_id, ch_i, p_i, s_i, s)
                sentences.append({"sa": sa, "text": s, "ch": ch_i, "para": p_i, "sent": s_i})

    with open(outp("sentences.jsonl"), "w", encoding="utf-8") as f:
        for rec in sentences:
            f.write(json.dumps(rec, ensure_ascii=False) + "\n")

    # IST extraction using GPT-5-nano batch processing
    print(f"🔍 Extracting statements from {len(sentences)} sentences...")
    
    # Check for test mode (max sentences limit)
    max_sentences = os.getenv('MAX_SENTENCES_TEST')
    if max_sentences:
        try:
            max_sentences = int(max_sentences)
            print(f"🧪 TEST MODE: Processing only first {max_sentences} sentences")
        except:
            max_sentences = None
    
    # Process in batches for efficiency
    batch_size = 20  # Process 20 sentences at once
    ists = []
    start_time = time.time()
    
    for i in range(0, len(sentences), batch_size):
        batch = sentences[i:i+batch_size]
        batch_num = (i // batch_size) + 1
        total_batches = (len(sentences) + batch_size - 1) // batch_size
        
        # Progress update with timing
        elapsed = time.time() - start_time
        eta = (elapsed / batch_num) * (total_batches - batch_num) if batch_num > 1 else 0
        
        print(f"  📝 Processing batch {batch_num}/{total_batches} ({len(batch)} sentences)...")
        print(f"     ⏱️  Elapsed: {elapsed:.1f}s, ETA: {eta:.1f}s")
        
        # Process batch with sentence limit if in test mode
        batch_ists = llm_sentence_to_ist_batch(batch, cep, max_sentences)
        ists.extend(batch_ists)
        
        # Progress summary
        statements_found = len([ist for ist in ists if not ist.get('none')])
        print(f"     ✅ Total statements: {statements_found}/{len(ists)}")
        
        # Small delay between batches to avoid rate limiting
        time.sleep(0.2)
        
        # Stop if we hit the test limit
        if max_sentences and len(ists) >= max_sentences:
            print(f"🧪 TEST MODE: Reached {max_sentences} sentence limit")
            break
    
    print(f"✅ Extracted {len([ist for ist in ists if not ist.get('none')])} statements from {len(ists)} sentences")
    
    with open(outp("ists.jsonl"), "w", encoding="utf-8") as f:
        for ist in ists:
            f.write(json.dumps(ist, ensure_ascii=False) + "\n")

    # Embeddings
    import numpy as np
    embs = [embed_ist(ist, client) for ist in ists] # Pass client to embed_ist
    np.save(outp("embeddings.npy"), np.array(embs, dtype="float32"))

    # Paraphrase clusters (cosine OR NCD)
    thr = cep["thresholds"]
    clusters = paraphrase_clusters(
        ists, embs,
        sim_thresh=thr["sim_cos"],
        ncd_thresh=thr["ncd"],
        min_cluster=thr["min_cluster"]
    )

    covers = {cid: idxs for cid, idxs in enumerate(clusters)}
    protos = []
    for cid, idxs in covers.items():
        proto = summarize_cluster_to_ist([ists[i] for i in idxs])
        proto["id"] = f"{book_id}:cluster:{cid}"
        proto["coverage"] = len(idxs)
        proto["centroid"] = cluster_centroid(embs, idxs)
        protos.append(proto)

    with open(outp("paraphrase_clusters.json"), "w", encoding="utf-8") as f:
        json.dump({
            "clusters": {str(cid): [sentences[i]["sa"] for i in idxs] for cid, idxs in covers.items()},
            "stats": {"n_clusters": len(clusters), "n_items": len(ists)}
        }, f, ensure_ascii=False, indent=2)

    # MDL-based core selection
    ist_bits = [ist_code_len_bits(ist) for ist in ists]
    ptr_cost_bits = cep["mdl"]["ptr_cost_bits"]
    target_cov = cep["mdl"]["target_coverage"]
    chosen, cov_ratio, mdl_reduction = greedy_mdl_selection(protos, covers, ist_bits, ptr_cost_bits, target_cov)
    chapter_cores = [protos[cid] for cid in chosen]

    with open(outp("chapter_cores.jsonl"), "w", encoding="utf-8") as f:
        for core in chapter_cores:
            f.write(json.dumps(core, ensure_ascii=False) + "\n")

    # Book core: keep top theses by coverage & MDL contribution (toy summarization)
    theses = []
    for rank, cid in enumerate(chosen[:5]):
        theses.append({
            "id": f"{book_id}:thesis:{rank}",
            "triple": protos[cid]["triple"],
            "confidence": protos[cid].get("confidence", 0.6),
            "backlinks": [sentences[i]["sa"] for i in covers[cid]]
        })

    book_core = {
        "book_id": book_id,
        "doc_type": cep.get("doc_type"),
        "coverage_fraction": cov_ratio,
        "mdl_reduction_bits": mdl_reduction,
        "theses": theses
    }
    with open(outp("book_core.json"), "w", encoding="utf-8") as f:
        json.dump(book_core, f, ensure_ascii=False, indent=2)

    # Density diagnostics
    dens = density_report(sentences, ists)
    with open(outp("density_report.json"), "w", encoding="utf-8") as f:
        json.dump(dens, f, ensure_ascii=False, indent=2)

    # Console summary
    print(f"[{book_id}] doc_type={cep.get('doc_type')}")
    print(f"Statements/1k tokens: {dens['statements_per_1k_tokens']:.1f} (expected ~{cep.get('expected_density_per_1k')})")
    print(f"Coverage={cov_ratio:.1%}  MDL reduction≈{mdl_reduction} bits")
    print(f"Theses: {min(5,len(theses))}  Clusters: {len(clusters)}")

# -------------------- CLI --------------------

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--book_id", required=True)
    ap.add_argument("--txt_path", required=True)
    ap.add_argument("--out_dir", default="./out")
    ap.add_argument("--cep", dest="cep_path", default=None, help="Context Enrichment Profile JSON")
    args = ap.parse_args()
    run_pipeline(args.book_id, args.txt_path, args.out_dir, args.cep_path)