import React, { useEffect, useState } from 'react';
import eventBus from '../../shared/events/eventBus';
import { Events } from '../../shared/events/contracts';
import { decorateTranscript, colorForConfidence, syllabifyWord } from './transcribe';

function WordSpan({ word }) {
  const conf = typeof word?.confidence === 'number' ? word.confidence : 0.9;
  const color = colorForConfidence(conf);
  const syllables = Array.isArray(word?.syllables)
    ? word.syllables
    : syllabifyWord(word?.text || '').map(s => ({ text: s, confidence: conf }));
  return (
    <span title={`${word.text} (${Math.round(conf * 100)}%)`} style={{ marginRight: 4 }}>
      {syllables.map((syl, idx) => (
        <span key={idx} style={{ background: color, color: '#0b1220', borderRadius: 2, padding: '0 1px', marginRight: 0 }}>{syl.text}</span>
      ))}
    </span>
  );
}

export default function TranscribeDevView() {
  const [transcript, setTranscript] = useState(null);
  const [correction, setCorrection] = useState(null);

  useEffect(() => {
    const off1 = eventBus.on(Events.VoiceTranscribeFinal, (p) => {
      setTranscript(decorateTranscript({ rawText: p?.rawText, segments: p?.segments }));
      setCorrection(null);
    });
    const off2 = eventBus.on(Events.VoiceTranscribeCorrected, (p) => {
      setCorrection(p?.corrections || null);
    });
    return () => { off1(); off2(); };
  }, []);

  if (!transcript) return null;
  return (
    <div style={{ position: 'fixed', bottom: 360, right: 16, zIndex: 9999 }}>
      <div style={{ background: '#0b1220cc', border: '1px solid #334155', padding: 12, borderRadius: 8, color: '#e2e8f0', width: 360, maxHeight: 260, overflowY: 'auto' }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Transcribe Dev</div>
        {(transcript.segments || []).map((seg, i) => (
          <div key={i} style={{ marginBottom: 6 }}>
            {(seg.words || []).map((w, j) => (
              <WordSpan key={j} word={w} />
            ))}
          </div>
        ))}
        {correction && (
          <div style={{ marginTop: 8, fontSize: 12, color: '#93c5fd' }}>
            <div><strong>Correction:</strong> {correction.correctedText || ''}</div>
            <div>Certainty: {correction.certainty != null ? Math.round(correction.certainty * 100) + '%' : 'n/a'} · Model: {correction.model || 'mini/strong'}</div>
          </div>
        )}
      </div>
    </div>
  );
}
