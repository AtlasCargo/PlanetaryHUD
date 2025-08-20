import React, { useState } from 'react';
import { IdeologramWidget } from '@ideologram/widget';
import { SAMPLE_ANCHORS } from '@ideologram/core';

export default function IdeologramPage() {
  const [quiz, setQuiz] = useState([
    { id: 'q1', answer: 4 },
    { id: 'q2', answer: 2 },
    { id: 'q3', answer: 3 },
  ]);

  const [books] = useState([
    { title: 'The Road to Serfdom', rating: 5, year: 1944, isRead: true },
    { title: 'The Communist Manifesto', rating: 1, year: 1848, isRead: true },
    { title: '1984', rating: 5, year: 1949, isRead: true },
  ]);

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12 }}>Ideologram</h2>
      <p style={{ color: '#555', marginBottom: 16 }}>Prototype integration of the Ideologram widget.</p>
      <IdeologramWidget
        mode="both"
        books={books}
        quizResponses={quiz}
        anchors={SAMPLE_ANCHORS}
        onComplete={(r) => console.log('Ideologram result', r)}
      />
    </div>
  );
}


