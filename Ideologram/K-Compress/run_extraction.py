import sys
import os
sys.path.append('Ideologram/K-Compress')
from book_compressor_mdl import split_chapters, split_paragraphs, split_sentences, make_sa, llm_sentence_to_ist_batch
import json

# Redirect stdout to stderr for debug messages, then restore for JSON output
original_stdout = sys.stdout
sys.stdout = sys.stderr

# Text processing
text = '''This is a test sentence that should trigger the extraction step.'''
chapters = split_chapters(text)

sentences = []
for ch_i, ch in enumerate(chapters):
    for p_i, para in enumerate(split_paragraphs(ch)):
        for s_i, s in enumerate(split_sentences(para)):
            sa = make_sa('timeout_test_123', ch_i, p_i, s_i, s)
            sentences.append({"sa": sa, "text": s, "ch": ch_i, "para": p_i, "sent": s_i})

# Limit to first 1000 sentences for debug mode
sentences = sentences[:1000]

# Create fake CEP for now
cep = {"doc_type": "nonfiction"}

# Extract statements using GPT-5 (debug output goes to stderr)
print("Extracting statements...")
ists = llm_sentence_to_ist_batch(sentences, cep, max_sentences=1000)

# Count results
total_sentences = len(sentences)
total_statements = len([ist for ist in ists if not ist.get('none')])

# Save to temporary directory
user_dir = os.path.join('server', 'compressed', 'USER_test_token')
book_dir = os.path.join(user_dir, 'timeout_test_123')
os.makedirs(book_dir, exist_ok=True)

with open(os.path.join(book_dir, 'sentences.jsonl'), 'w') as f:
    for rec in sentences:
        f.write(json.dumps(rec) + '\n')

with open(os.path.join(book_dir, 'ists.jsonl'), 'w') as f:
    for ist in ists:
        f.write(json.dumps(ist) + '\n')

# Output results
result = {
    'sentences': total_sentences,
    'statements': total_statements,
    'discarded': total_sentences - total_statements,
    'message': 'Statement extraction completed'
}

# Restore stdout and print only JSON
sys.stdout = original_stdout
print(json.dumps(result))