// src/features/voice/transcribe.js
// Utilities for processing ASR transcripts: syllabify, confidence mapping, and low-confidence extraction.

function isVowel(ch) {
  return /[aeiouy]/i.test(ch);
}

export function syllabifyWord(text) {
  const t = String(text || '').trim();
  if (!t) return [];
  // Very simple heuristic: split on transitions between vowel blocks and consonant blocks
  const parts = [];
  let cur = '';
  let prevVowel = isVowel(t[0]);
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    const v = isVowel(ch);
    if (i > 0 && v !== prevVowel && cur.length > 0) {
      parts.push(cur);
      cur = ch;
    } else {
      cur += ch;
    }
    prevVowel = v;
  }
  if (cur) parts.push(cur);
  // Merge very short trailing syllables
  if (parts.length > 1 && parts[parts.length - 1].length === 1) {
    parts[parts.length - 2] += parts.pop();
  }
  return parts;
}

export function decorateTranscript(result) {
  // result: { rawText, segments: [{ words: [{ text, startSec?, endSec?, confidence? }] }] }
  const decorated = { ...result, segments: [] };
  const segments = Array.isArray(result?.segments) ? result.segments : [];
  for (const seg of segments) {
    const words = Array.isArray(seg?.words) ? seg.words : [];
    const newWords = words.map(w => {
      const text = String(w?.text || '');
      const syllables = syllabifyWord(text).map(syl => ({ text: syl, confidence: (typeof w?.confidence === 'number' ? w.confidence : 0.9) }));
      return { ...w, syllables };
    });
    decorated.segments.push({ ...seg, words: newWords });
  }
  return decorated;
}

export function extractLowConfidence(result, threshold = 0.6) {
  const segments = Array.isArray(result?.segments) ? result.segments : [];
  const low = [];
  for (const seg of segments) {
    const words = Array.isArray(seg?.words) ? seg.words : [];
    const lowWords = words.filter(w => (typeof w?.confidence === 'number' ? w.confidence : 0.9) < threshold).map(w => w.text);
    if (lowWords.length) {
      const text = words.map(w => w.text).join(' ');
      low.push({ rawText: text, lowConfidenceWords: lowWords, startSec: seg.startSec, endSec: seg.endSec });
    }
  }
  // Merge into a single segment for correction (simple approach)
  if (!low.length) return null;
  const merged = low.map(s => s.rawText).join(' ');
  const words = low.flatMap(s => s.lowConfidenceWords);
  const startSec = Math.min(...low.map(s => s.startSec || 0));
  const endSec = Math.max(...low.map(s => s.endSec || startSec));
  return { rawText: merged, lowConfidenceWords: words, startSec, endSec };
}

export function colorForConfidence(c) {
  const v = typeof c === 'number' ? c : 0.9;
  if (v >= 0.9) return '#16a34a'; // green
  if (v >= 0.75) return '#84cc16';
  if (v >= 0.6) return '#f59e0b';
  return '#ef4444'; // red
}

