import API from '../../utils/api';

export async function buildUserFileTree(user) {
  const token = localStorage.getItem('token');
  if (token && token !== 'DUMMY_TOKEN') {
    try {
      const res = await API.get('/api/ideologram/fs');
      return res.data || null;
    } catch {
      return null;
    }
  }
  const lib = localStorage.getItem('ideologram:library');
  const enr = localStorage.getItem('ideologram:enriched');
  const sc = localStorage.getItem('ideologram:scores:v1');
  const sz = (s) => (s ? s.length : 0);
  return {
    name: (user && user.email) || 'local',
    type: 'dir',
    children: [
      { name: 'library.json', type: 'file', updatedAt: JSON.parse(lib || '{}').updatedAt || null, size: sz(lib) },
      { name: 'enriched.json', type: 'file', updatedAt: JSON.parse(enr || '{}').updatedAt || null, size: sz(enr) },
      { name: 'scores.json', type: 'file', updatedAt: null, size: sz(sc) },
    ],
  };
}



