import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'scores.json');
const USERS_PATH = path.join(DATA_DIR, 'users.json');

function ensureDb() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH, JSON.stringify({ entries: [] }, null, 2));
  if (!fs.existsSync(USERS_PATH)) fs.writeFileSync(USERS_PATH, JSON.stringify({ users: [] }, null, 2));
}

function readDb() {
  ensureDb();
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
  } catch {
    return { entries: [] };
  }
}

function writeDb(db) {
  ensureDb();
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

function readUsers() {
  ensureDb();
  try {
    return JSON.parse(fs.readFileSync(USERS_PATH, 'utf-8'));
  } catch {
    return { users: [] };
  }
}

function writeUsers(usersDb) {
  ensureDb();
  fs.writeFileSync(USERS_PATH, JSON.stringify(usersDb, null, 2));
}

const app = express();
app.use(express.json({ limit: '4mb' }));
// CORS for demo
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// Upsert a score entry keyed by isbn or id
app.post('/v1/scores', (req, res) => {
  const body = req.body || {};
  const { id, isbn, title, author, source, method, reliability, metrics, axes, termHits, axisTermContribs, metricTermContribs } = body;
  if (!(isbn || id)) return res.status(400).json({ error: 'isbn or id required' });
  const key = isbn || id;
  const db = readDb();
  const now = new Date().toISOString();
  const entry = { key, isbn, id, title, author, source, method, reliability, metrics, axes, termHits, axisTermContribs, metricTermContribs, updatedAt: now };
  const idx = db.entries.findIndex((e) => e.key === key);
  if (idx >= 0) db.entries[idx] = entry; else db.entries.push(entry);
  writeDb(db);
  res.json({ ok: true, key });
});

app.get('/v1/scores/:key', (req, res) => {
  const key = req.params.key;
  const db = readDb();
  const entry = db.entries.find((e) => e.key === key);
  if (!entry) return res.status(404).json({ error: 'not found' });
  res.json(entry);
});

app.get('/v1/scores', (req, res) => {
  const db = readDb();
  res.json({ entries: db.entries });
});

// --- User library & enrichment endpoints ---
app.post('/v1/users/:userId/library', (req, res) => {
  const { userId } = req.params;
  const { books } = req.body || {};
  if (!Array.isArray(books)) return res.status(400).json({ error: 'books array required' });
  const usersDb = readUsers();
  let user = usersDb.users.find((u) => u.userId === userId);
  if (!user) { user = { userId, library: { books: [], updatedAt: null }, enriched: { items: [], updatedAt: null }, scores: { entries: [], updatedAt: null } }; usersDb.users.push(user); }
  user.library = { books, updatedAt: new Date().toISOString() };
  writeUsers(usersDb);
  res.json({ ok: true, count: books.length });
});

app.get('/v1/users/:userId/library', (req, res) => {
  const { userId } = req.params;
  const usersDb = readUsers();
  const user = usersDb.users.find((u) => u.userId === userId);
  if (!user || !user.library) return res.json({ books: [], updatedAt: null });
  res.json(user.library);
});

app.post('/v1/users/:userId/enriched', (req, res) => {
  const { userId } = req.params;
  const { items } = req.body || {};
  if (!Array.isArray(items)) return res.status(400).json({ error: 'items array required' });
  const usersDb = readUsers();
  let user = usersDb.users.find((u) => u.userId === userId);
  if (!user) { user = { userId, library: { books: [], updatedAt: null }, enriched: { items: [], updatedAt: null }, scores: { entries: [], updatedAt: null } }; usersDb.users.push(user); }
  user.enriched = { items, updatedAt: new Date().toISOString() };
  writeUsers(usersDb);
  res.json({ ok: true, count: items.length });
});

app.get('/v1/users/:userId/enriched', (req, res) => {
  const { userId } = req.params;
  const usersDb = readUsers();
  const user = usersDb.users.find((u) => u.userId === userId);
  if (!user || !user.enriched) return res.json({ items: [], updatedAt: null });
  res.json(user.enriched);
});

// Attach score to a user as well (optional)
app.post('/v1/users/:userId/scores', (req, res) => {
  const { userId } = req.params;
  const entry = req.body || {};
  const usersDb = readUsers();
  let user = usersDb.users.find((u) => u.userId === userId);
  if (!user) { user = { userId, library: { books: [], updatedAt: null }, enriched: { items: [], updatedAt: null }, scores: { entries: [], updatedAt: null } }; usersDb.users.push(user); }
  if (!Array.isArray(user.scores?.entries)) user.scores = { entries: [], updatedAt: null };
  const key = entry.isbn || entry.id || Math.random().toString(36).slice(2);
  entry.key = key;
  entry.updatedAt = new Date().toISOString();
  const idx = user.scores.entries.findIndex((e) => e.key === key);
  if (idx >= 0) user.scores.entries[idx] = entry; else user.scores.entries.push(entry);
  user.scores.updatedAt = entry.updatedAt;
  writeUsers(usersDb);
  res.json({ ok: true, key });
});

app.get('/v1/users/:userId/scores', (req, res) => {
  const { userId } = req.params;
  const usersDb = readUsers();
  const user = usersDb.users.find((u) => u.userId === userId);
  if (!user || !user.scores) return res.json({ entries: [], updatedAt: null });
  res.json(user.scores);
});

// Filesystem-like listing
app.get('/v1/users/:userId/fs', (req, res) => {
  const { userId } = req.params;
  const usersDb = readUsers();
  const user = usersDb.users.find((u) => u.userId === userId);
  const tree = {
    name: userId,
    type: 'dir',
    children: [
      { name: 'library.json', type: 'file', updatedAt: user?.library?.updatedAt || null, size: user?.library ? JSON.stringify(user.library).length : 0 },
      { name: 'enriched.json', type: 'file', updatedAt: user?.enriched?.updatedAt || null, size: user?.enriched ? JSON.stringify(user.enriched).length : 0 },
      { name: 'scores.json', type: 'file', updatedAt: user?.scores?.updatedAt || null, size: user?.scores ? JSON.stringify(user.scores).length : 0 },
    ],
  };
  res.json(tree);
});

const PORT = process.env.PORT || 4545;
app.listen(PORT, () => {
  console.log(`Scores API on http://localhost:${PORT}`);
});


