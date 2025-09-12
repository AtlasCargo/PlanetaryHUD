import API from '../../utils/api';

export async function persistLibrary(books, setError) {
  try {
    const token = localStorage.getItem('token');
    if (!token || token === 'DUMMY_TOKEN') throw new Error('local-only');
    await API.post('/api/ideologram/library', { books });
  } catch (err) {
    try {
      localStorage.setItem('ideologram:library', JSON.stringify({ books, updatedAt: new Date().toISOString() }));
    } catch {}
    if (setError && err?.response?.status && err.response.status !== 0) {
      setError(`Library save failed (${err.response.status})`);
    }
  }
}

export async function persistEnriched(newItems, setError) {
  const byKey = (arr) => {
    const m = {}; (arr || []).forEach((it) => { if (it && it.key) m[it.key] = it; }); return m;
  };
  try {
    const token = localStorage.getItem('token');
    if (!token || token === 'DUMMY_TOKEN') throw new Error('local-only');
    let existing = [];
    try { const res = await API.get('/api/ideologram/enriched'); existing = Array.isArray(res.data?.items) ? res.data.items : []; } catch {}
    const mergedMap = { ...byKey(existing), ...byKey(newItems) };
    const merged = Object.values(mergedMap);
    await API.post('/api/ideologram/enriched', { items: merged });
  } catch (err) {
    try {
      const raw = localStorage.getItem('ideologram:enriched') || JSON.stringify({ items: [], updatedAt: null });
      const prev = JSON.parse(raw);
      const mergedMap = { ...byKey(prev.items), ...byKey(newItems) };
      const store = { items: Object.values(mergedMap), updatedAt: new Date().toISOString() };
      localStorage.setItem('ideologram:enriched', JSON.stringify(store));
    } catch {}
    if (setError && err?.response?.status && err.response.status !== 0) {
      setError(`Enriched save failed (${err.response.status})`);
    }
  }
}

export async function persistScore(entry) {
  try {
    const token = localStorage.getItem('token');
    if (!token || token === 'DUMMY_TOKEN') throw new Error('local-only');
    await API.post('/api/ideologram/scores', entry);
  } catch (err) {
    try {
      const raw = localStorage.getItem('ideologram:scores:v1') || JSON.stringify({ entries: [] });
      const db = JSON.parse(raw);
      db.entries.push(entry);
      localStorage.setItem('ideologram:scores:v1', JSON.stringify(db));
    } catch {}
  }
}



