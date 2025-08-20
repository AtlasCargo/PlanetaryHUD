import React, { useEffect } from 'react';
import type {
  BookInput,
  QuizResponse,
  Dimension,
  IdeologyVector,
  ComputeOptions,
  BookAnchor,
} from '@ideologram/core';
import { SAMPLE_ANCHORS } from '@ideologram/core';
import { useIdeologram } from './useIdeologram.js';

export type IdeologramWidgetProps = {
  mode?: 'books' | 'quiz' | 'both';
  books?: BookInput[];
  quizResponses?: QuizResponse[];
  anchors?: BookAnchor[];
  dimensionsMeta?: Omit<Dimension, 'value'>[];
  options?: ComputeOptions;
  theme?: { primary?: string };
  autoCompute?: boolean;
  onComplete?: (result: IdeologyVector) => void;
  className?: string;
  style?: React.CSSProperties;
};

export function IdeologramWidget({
  mode = 'both',
  books,
  quizResponses,
  anchors,
  dimensionsMeta,
  options,
  theme,
  autoCompute = true,
  onComplete,
  className,
  style,
}: IdeologramWidgetProps) {
  const { result, loading, error, compute } = useIdeologram({
    anchors: anchors ?? SAMPLE_ANCHORS,
    dimensionsMeta,
    options,
  });

  useEffect(() => {
    if (!autoCompute) return;
    const hasInput = (books && books.length > 0) || (quizResponses && quizResponses.length > 0);
    if (!hasInput) return;
    const r = compute({ books, quizResponses });
    onComplete?.(r);
  }, [autoCompute, books, quizResponses, compute, onComplete]);

  const handleComputeClick = () => {
    const r = compute({ books, quizResponses });
    onComplete?.(r);
  };

  const primary = theme?.primary ?? '#4f46e5';

  return (
    <div className={className} style={{ fontFamily: 'ui-sans-serif, system-ui, Arial, sans-serif', ...style }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
        <strong>Ideologram</strong>
        <span style={{ fontSize: 12, color: '#666' }}>mode: {mode}</span>
        {!autoCompute && (
          <button onClick={handleComputeClick} disabled={loading} style={{
            marginLeft: 'auto',
            background: primary,
            color: 'white',
            border: 'none',
            borderRadius: 6,
            padding: '6px 10px',
            cursor: 'pointer'
          }}>
            {loading ? 'Computing...' : 'Compute'}
          </button>
        )}
      </div>

      {error && (
        <div style={{ color: '#b91c1c', background: '#fee2e2', padding: 8, borderRadius: 6, marginBottom: 8 }}>
          {String(error)}
        </div>
      )}

      {!result && (
        <div style={{ color: '#555', fontSize: 14, marginBottom: 8 }}>
          Provide <code>books</code> and/or <code>quizResponses</code>, then compute.
        </div>
      )}

      {result && (
        <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: 12 }}>
          <div style={{ display: 'flex', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
            <Chip label={`Amplitude: ${(result.amplitude * 100).toFixed(0)}%`} color={primary} />
            <Chip label={`Confidence: ${(result.confidence * 100).toFixed(0)}%`} />
            <Chip label={`Books weight: ${(result.sourceWeights.books * 100).toFixed(0)}%`} />
            <Chip label={`Quiz weight: ${(result.sourceWeights.quiz * 100).toFixed(0)}%`} />
          </div>

          <div style={{ display: 'grid', gap: 10 }}>
            {result.dimensions.map((d) => (
              <DimensionBar key={d.key} label={d.label} value={d.value} color={primary} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Chip({ label, color = '#6b7280' }: { label: string; color?: string }) {
  return (
    <span style={{
      display: 'inline-block',
      background: `${color}20`,
      color: color,
      border: `1px solid ${color}66`,
      padding: '2px 8px',
      borderRadius: 999,
      fontSize: 12
    }}>{label}</span>
  );
}

function DimensionBar({ label, value, color }: { label: string; value: number; color: string }) {
  const left = value < 0 ? Math.abs(value) : 0;
  const right = value > 0 ? value : 0;
  return (
    <div>
      <div style={{ fontSize: 12, marginBottom: 4 }}>{label}</div>
      <div style={{ position: 'relative', height: 14, background: '#f3f4f6', borderRadius: 8, overflow: 'hidden', border: '1px solid #e5e7eb' }}>
        {/* center line */}
        <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: '#d1d5db' }} />
        {/* left (negative) */}
        <div style={{ position: 'absolute', right: '50%', top: 0, bottom: 0, width: `${left * 50}%`, background: `${color}66` }} />
        {/* right (positive) */}
        <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: `${right * 50}%`, background: color }} />
      </div>
      <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>−1 ← 0 → +1</div>
    </div>
  );
}
