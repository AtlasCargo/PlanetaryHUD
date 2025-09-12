import { useEffect } from 'react';

export default function useDeepStateFeatures({ setDeepStateFeatures }) {
  useEffect(() => {
    let cancelled = false;
    fetch('https://cdn.jsdelivr.net/npm/deepstate-map-data@latest/data/world.geo.json')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => { if (!cancelled) setDeepStateFeatures(Array.isArray(data?.features) ? data.features : []); })
      .catch(err => { if (!cancelled) console.error('DeepState fetch error:', err); });
    return () => { cancelled = true; };
  }, [setDeepStateFeatures]);
}



