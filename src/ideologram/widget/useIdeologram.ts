import { useCallback, useState } from 'react';
import type {
  ComputeInput,
  ComputeOptions,
  IdeologyVector,
  BookAnchor,
  Dimension,
} from '@ideologram/core';
import { computeIdeologram } from '@ideologram/core';

export type UseIdeologramOptions = {
  anchors?: BookAnchor[];
  dimensionsMeta?: Omit<Dimension, 'value'>[];
  options?: ComputeOptions;
};

export function useIdeologram(init?: UseIdeologramOptions) {
  const [result, setResult] = useState<IdeologyVector | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const compute = useCallback((data: Omit<ComputeInput, 'anchors' | 'dimensionsMeta' | 'options'>) => {
    setLoading(true);
    setError(null);
    try {
      const r = computeIdeologram({
        ...data,
        anchors: init?.anchors,
        dimensionsMeta: init?.dimensionsMeta,
        options: init?.options,
      });
      setResult(r);
      return r;
    } catch (e: any) {
      setError(e);
      throw e;
    } finally {
      setLoading(false);
    }
  }, [init?.anchors, init?.dimensionsMeta, init?.options]);

  return { result, loading, error, compute } as const;
}
