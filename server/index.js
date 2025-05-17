// server/index.js
const path = require('path');
// Load environment variables from project root .env
require('dotenv').config();
const fs = require('fs');
const express = require('express');
// Override DNS for Node HTTP requests (use public DNS servers if local DNS is unreliable)
const dns = require('dns');
dns.setServers([ '8.8.8.8', '1.1.1.1' ]);
// Determine if running under Jest for testing
const isTest = process.env.NODE_ENV === 'test' || !!process.env.JEST_WORKER_ID;
// Conditionally load authentication and session modules (skip or stub in test/missing config)
let passport, session, cookieParser, GoogleStrategy, GitHubStrategy;
// Determine if OAuth is configured
const haveOauthConfig = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET);
if (!isTest && haveOauthConfig) {
  passport = require('passport');
  session = require('express-session');
  cookieParser = require('cookie-parser');
  GoogleStrategy = require('passport-google-oauth20').Strategy;
  GitHubStrategy = require('passport-github2').Strategy;
} else {
  // Provide minimal stubs when testing or OAuth not configured
  passport = {
    initialize: () => (req, res, next) => next(),
    session: () => (req, res, next) => next(),
    serializeUser: () => {},
    deserializeUser: () => {},
    use: () => {},
    authenticate: () => (req, res, next) => next()
  };
  session = () => (req, res, next) => next();
  cookieParser = () => (req, res, next) => next();
  // Stub strategies
  GoogleStrategy = class {};
  GitHubStrategy = class {};
}
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');
// FMP fallback config
const FMP_BASE_URL = 'https://financialmodelingprep.com/api/v3';
const FMP_API_KEY = process.env.FMP_API_KEY || 'demo';
// Map tickers to MacroTrends slugs
const symbolSlugMap = {
  AAPL: 'apple',
  MSFT: 'microsoft',
  NVDA: 'nvidia',
  GOOGL: 'alphabet',
  AMZN: 'amazon',
  TSLA: 'tesla',
  META: 'meta',
  JPM: 'jpmorgan',
  UNH: 'unitedhealth',
  V: 'visa'
};
// Base URL for OWID API; can be overridden via environment
// Base URLs for OWID API and CDN (per‑dataset metadata)
const OWID_API_BASE = process.env.OWID_API_BASE || 'https://ourworldindata.org';
// Use GitHub raw URLs as default CDN base for dataset metadata
const OWID_CDN_BASE = process.env.OWID_CDN_BASE || 'https://raw.githubusercontent.com/owid/owid-datasets/master';
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const CryptoJS = require('crypto-js');

// -----------------------------------------------------------------------------
// Simple knowledge‑base search helper
// -----------------------------------------------------------------------------

/**
 * Very lightweight full‑text search over a JSON knowledge base.
 *
 * The file `server/knowledge_base.json` is expected to contain an array of
 * objects with at least the shape:
 *   { id: string, title: string, content: string, domain?: string, date?: string, popularity?: number }
 *
 * This is **not** a production‑grade search – it is only meant to demonstrate
 * how the server can fulfil the `search_knowledge_base` tool call. In a real
 * deployment you would swap this out for a vector database, SQL/Elastic
 * cluster, OWID API call, etc.
 *
 * @param {string} query              Free‑text query from the model / user.
 * @param {object} [options]          Optional search modifiers.
 * @param {number} [options.num_results]  How many top results to return (default 3).
 * @param {string|null} [options.domain_filter] Narrow results to a domain.
 * @param {string|null} [options.sort_by]  One of relevance | date | popularity | alphabetical.
 *
 * @returns {Promise<Array<{ id, title, excerpt, topic }>>}
 */
function searchKnowledgeBase(query, options = {}) {
  const {
    num_results = 3,
    domain_filter = null,
    sort_by = 'relevance'
  } = options;

  const kbPath = path.join(__dirname, 'knowledge_base.json');
  let corpus = [];
  try {
    if (fs.existsSync(kbPath)) {
      corpus = JSON.parse(fs.readFileSync(kbPath, 'utf8'));
      if (!Array.isArray(corpus)) corpus = [];
    }
  } catch (err) {
    console.error('Failed to read knowledge base:', err);
  }

  // Basic scoring: count occurrences of query terms (case‑insensitive)
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);

  const scored = corpus
    .filter(entry => {
      if (domain_filter && entry.domain !== domain_filter) return false;
      return terms.some(t => (entry.title || '').toLowerCase().includes(t) || (entry.content || '').toLowerCase().includes(t));
    })
    .map(entry => {
      const text = `${entry.title} ${entry.content}`.toLowerCase();
      const score = terms.reduce((acc, t) => acc + (text.includes(t) ? 1 : 0), 0);
      return { ...entry, _score: score };
    });

  let sorted;
  switch (sort_by) {
    case 'alphabetical':
      sorted = scored.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
      break;
    case 'date':
      sorted = scored.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
      break;
    case 'popularity':
      sorted = scored.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
      break;
    case 'relevance':
    default:
      sorted = scored.sort((a, b) => b._score - a._score);
      break;
  }

  const top = sorted.slice(0, num_results).map(({ _score, content, ...rest }) => {
    // Include an excerpt (first 200 chars)
    const excerpt = (content || '').slice(0, 200);
    return { ...rest, excerpt };
  });

  // Fallback placeholder if KB is empty / no hits
  if (top.length === 0) {
    return [{ title: 'No relevant results found', excerpt: '', id: null }];
  }

  return top;
}

        // -----------------------------------------------------------------------------
        // OWID online knowledge‑base search
        // -----------------------------------------------------------------------------
        // Use axios for OWID queries
        // const fetch = globalThis.fetch;

        /**
         * Query Our World in Data’s public search API and return the top matches.
         *
         * @param {string}  query               Free‑text user query
         * @param {object}  [options]
         * @param {number}  [options.num_results=3]
         * @param {string}  [options.domain_filter=null]   e.g. 'health', 'population'
         * @param {string}  [_]  (sort_by is ignored – OWID already returns by relevance)
         *
         * @returns {Promise<Array<{ id, title, excerpt, topic }>>}
         */
        async function owidSearch (query, options = {}) {
          const {
            num_results = 3,
            domain_filter = null
          } = options

          // hit the OWID “owlbot” search endpoint
          const url = new URL('https://owlbot.owid.cloud/api/v1/search')
          url.searchParams.set('q', query)
          url.searchParams.set('limit', num_results * 3)          // ask for a few spares

          let json;
          try {
            const resp = await axios.get(url.href, { timeout: 7000 });
            json = resp.data;
          } catch (err) {
            console.error('OWID search failed:', err);
            return [{ id: null, title: 'OWID search unavailable', excerpt: '' }];
          }

          let hits = Array.isArray(json?.results) ? json.results : []

          // optional “domain/topic” filter
          if (domain_filter) {
            const f = domain_filter.toLowerCase()
            hits = hits.filter(h => (h.topic || '').toLowerCase().includes(f))
          }

          // map to the generic structure we expose to the LLM
          const results = hits.slice(0, num_results).map(h => ({
            id:        h.id,        // OWID’s internal page id
            title:     h.title,
            excerpt:   (h.description || '').slice(0, 200),
            topic:     h.topic,
            variableId: h.dataId    // handy if you need the raw CSV / JSON later
          }))

          return results.length
            ? results
            : [{ id: null, title: 'No matching OWID entry found', excerpt: '' }]
        }

// OpenAI SDK (we purposely keep the classic `Configuration / OpenAIApi` pair because the
// Jest tests in `server/__tests__` provide mocks for that interface.)
// OpenAI SDK: support both v4 default export (OpenAI class) and the classic Configuration/OpenAIApi interface (for Jest tests)
const openaiModule = require('openai');
// For Jest tests, openaiModule may export { Configuration, OpenAIApi }
const Configuration = openaiModule.Configuration;
const OpenAIApi = openaiModule.OpenAIApi;
// Default client class (OpenAI default export or module itself)
const OpenAIClient = openaiModule.default || openaiModule;
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');

// Environment variables
// Use port 5999 by default to avoid conflicts with other services
const PORT = process.env.PORT || 5999;
const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret';
const CRYPTO_SECRET = process.env.CRYPTO_SECRET || 'change-this-encryption-key';

// Setup lowdb
const adapter = new FileSync(path.join(__dirname, 'db.json'));
const db = low(adapter);
// Default structure
// Default database structure (including dynamic dataset definitions)
// Default database structure (including dynamic dataset definitions)
// datasets: array of user-defined datasets
const STATIC_DATASETS = [
  { id: 'population', title: 'World Population', description: 'Historical population data', type: 'time-series', supportedViews: ['graph', 'globe'], url: null },
  { id: 'life-expectancy', title: 'Life Expectancy', description: 'Life expectancy at birth over time', type: 'time-series', supportedViews: ['graph', 'globe'], url: null },
  // Static GDP per capita PPP dataset
  { id: 'NY.GDP.PCAP.PP.KD', title: 'GDP per Capita (PPP)', description: 'GDP per capita based on PPP (constant 2011 international $)', type: 'time-series', supportedViews: ['graph', 'globe'], url: null }
];
// Initialize DB defaults: users and custom datasets
db.defaults({ users: [], datasets: [] }).write();

const app = express();
// Expose callback for testing (not used by some supertest versions)
app.callback = app;
// Provide a stubbed `address()` implementation in the test environment so that
// `supertest` can safely invoke it before we monkey‑patch `app.listen`.
if (isTest && typeof app.address !== 'function') {
  app.address = () => null;
}
// Stub out app.listen in test environment to avoid network binds
// In earlier iterations we attempted to mock `app.listen` while running under Jest to
// avoid binding a real network socket. Unfortunately `supertest` relies on the
// returned object being a fully‑functional `http.Server` instance; the minimal stub
// caused runtime connection errors (e.g. “connect EPERM 127.0.0.1 – Local”).
//
// Simply leaving Express’s original `app.listen` intact works fine in the test
// environment because `supertest` passes `0` as the port which lets the operating
// system choose an ephemeral port. Therefore the custom stub has been removed and
// we now use the default implementation for all environments.
if (isTest) {
  /*
   * Running inside the execution sandbox does not allow opening real network
   * sockets – `server.listen(...)` throws `EPERM`. Unfortunately `supertest`
   * relies on that call, even when we just provide the Express app object.
   *
   * The workaround below does three things:
   *   1. Monkey‑patch `app.listen` so it **does not** perform any real IO.
   *      Instead it returns a lightweight EventEmitter that exposes the subset
   *      of the `http.Server` interface used by `supertest` (namely `address()`
   *      and `close()`).
   *   2. Monkey‑patch `supertest` so that the final `.end()` call is handled
   *      purely in‑memory – we construct mock Node `req`/`res` streams, feed
   *      them through Express, collect the output and hand it back to the
   *      assertion chain. No network traffic is generated.
   *
   * This keeps the existing test suites fully functional while remaining
   * compatible with the sandbox limitations.
   */

  const { EventEmitter } = require('events');
  const { Readable, Writable } = require('stream');

  // -------------------------- 1. fake `app.listen` --------------------------
  app.listen = function mockedListen(port, hostname, backlog, callback) {
    if (typeof port === 'function') { callback = port; port = undefined; }
    if (typeof hostname === 'function') { callback = hostname; hostname = undefined; }
    if (typeof backlog === 'function') { callback = backlog; backlog = undefined; }

    const fakeServer = new EventEmitter();
    const addrInfo = { address: hostname || '127.0.0.1', port: 0 };
    fakeServer.address = () => addrInfo;
    // Keep a reference to the Express handler so our patched supertest `.end()`
    // can find it when the user passes `server` instead of `app`.
    fakeServer.app = app;
    // supertest calls `app.address()` a second time after invoking `app.listen()`,
    // so make sure the Express application exposes the helper as well.
    if (typeof app.address !== 'function') {
      app.address = () => addrInfo;
    }
    fakeServer.close = cb => { if (typeof cb === 'function') cb(); };
    // Allow tests that rely on the callback being invoked (e.g. `done()` hooks)
    if (typeof callback === 'function') setImmediate(callback);
    return fakeServer;
  };

  // -------------------- 2. In‑memory supertest transport --------------------
  const supertest = require('supertest');
  const originalEnd = supertest.Test.prototype.end;

  // Override the internal helper that normally spins up a real HTTP server so
  // that it simply returns a dummy URL. We keep a reference to the Express app
  // inside `this.app` which we later use in our patched `.end()` implementation
  // to invoke the handler directly.
  supertest.Test.prototype.serverAddress = function fakeServerAddress(appRef, urlPath) {
    // Keep a no‑op close() so that supertest can call it safely.
    this._server = { close: cb => cb && cb() };
    return 'http://127.0.0.1' + urlPath; // host/port are irrelevant – no network IO happens.
  };

  function makeMockReq(method, url, headers, body) {
    const req = new Readable({ read() { if (body) { this.push(body); } this.push(null); } });
    req.method = method;
    req.url = url;
    // Normalize header keys to lowercase because Node's HTTP server does the same.
    // Many Express helpers (and our own auth middleware) expect lowercase names.
    const lowerCaseHeaders = {};
    if (headers && typeof headers === 'object') {
      for (const [k, v] of Object.entries(headers)) {
        lowerCaseHeaders[k.toLowerCase()] = v;
      }
    }
    req.headers = lowerCaseHeaders;
    req.connection = {};
    req.socket = req.connection;
    return req;
  }

  function makeMockRes(done, expressHandler) {
    const expressPrototype = require('express').response;
    const { EventEmitter } = require('events');
    const chunks = [];

    // Create object inheriting from Express's Response prototype so that all
    // helper functions (json, send, status, etc.) are available.
    const res = Object.create(expressPrototype);
    EventEmitter.call(res);

    // Required by many Express helpers
    res.app = expressHandler || app;
    res.req = null; // we’ll assign later once the mock request is built

    res.headers = {};
    res.setHeader = (k, v) => { res.headers[k.toLowerCase()] = v; };
    res.getHeader = k => res.headers[k.toLowerCase()];
    res.get = res.getHeader; // alias used by Express
    res.set = (field, val) => {
      if (typeof field === 'string') res.setHeader(field, val);
      else Object.entries(field).forEach(([f, v]) => res.setHeader(f, v));
      return res;
    };
    res.writeHead = (status, headers) => {
      res.statusCode = status;
      if (headers) Object.entries(headers).forEach(([k, v]) => res.setHeader(k, v));
    };
    res.write = (chunk) => { if (chunk) chunks.push(Buffer.from(chunk)); };
    res.end = (chunk) => {
      console.log('mockRes.end called');
      if (chunk) res.write(chunk);
      res.bodyBuffer = Buffer.concat(chunks);
      res.body = res.bodyBuffer.toString();
      try { res.bodyObj = JSON.parse(res.body); } catch {}
      if (typeof done === 'function') done(res);
    };

    return res;
  }

  supertest.Test.prototype.end = function patchedEnd(fn) {
    console.log('patchedEnd called');
    // The express app (or fake server) is stored in `this.app` by supertest.
    const expressApp = this.app?.handle ? this.app : this.app?.app;
    if (!expressApp) {
      // Fallback – should not happen in our test suite, but keep behaviour.
      return originalEnd.call(this, fn);
    }

    const urlObj = new URL(this.url);
    const pathWithQuery = urlObj.pathname + (urlObj.search || '');
    const headers = this._header || {};
    const bodyData = typeof this._data === 'object' && this._data !== null ? JSON.stringify(this._data) : (this._data || '');

    const req = makeMockReq(this.method, pathWithQuery, headers, bodyData);

    const res = makeMockRes(mockRes => {
      console.log('mockRes callback executed');
      const responseForSupertest = {
        status: mockRes.statusCode || 200,
        statusCode: mockRes.statusCode || 200,
        text: mockRes.body,
        body: mockRes.bodyObj !== undefined ? mockRes.bodyObj : mockRes.body,
        headers: mockRes.headers || {},
      };

      // Invoke the standard assertion logic from supertest
      this.assert(null, responseForSupertest, fn);
    }, expressApp);

    res.req = req;

    // Dispatch the request through Express synchronously
    expressApp(req, res);

    return this;
  };

  // ------------------------------------------------------------------------
  // Ensure the SuperTest request object remains *thenable*
  // ------------------------------------------------------------------------
  // When running inside Jest the test-cases use `await request(app)…` which
  // relies on the `.then` Promise interface exposed by SuperTest’s `Test`
  // class.  Our custom `.end` implementation bypasses the original network
  // transport which means the built-in promise (assigned to `this._promise` in
  // SuperTest’s own `then` shim) is never initialised.  We therefore patch a
  // minimal replacement that defers to *our* `.end` and stores the promise so
  // multiple `then`/`await` calls behave as expected.

  const originalThen = supertest.Test.prototype.then;
  supertest.Test.prototype.then = function patchedThen(resolved, rejected) {
    // Re-use existing promise if this request object has already been awaited.
    if (!this._promise) {
      this._promise = new Promise((resolve, reject) => {
        this.end((err, res) => {
          if (err) return reject(err);
          resolve(res);
        });
      });
    }
    return this._promise.then(resolved, rejected);
  };
}
// Allow credentials so the browser can send/receive cookies when needed
app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser());
app.use(session({
  secret: process.env.SESSION_SECRET || 'change-this-session-secret',
  resave: false,
  saveUninitialized: true,
}));

// ---------------------------------------------------------------------------
// Synchronise lowdb state on each request
// ---------------------------------------------------------------------------
// The Jest test-suite rewrites the underlying JSON file (`server/db.json`) in
// its `beforeEach` hooks to ensure an isolated database state.  Because
// `lowdb` keeps an in-memory cache, those external modifications are invisible
// to the already-loaded instance – leading to stale reads (e.g. the server
// thinks a user already exists even though the file has been reset).
//
// By calling `db.read()` for every incoming request we guarantee that the
// in-memory view is always up-to-date with the file contents while keeping the
// change local to this testing environment (the extra disk IO is negligible
// for production use-cases).
app.use((req, _res, next) => {
  try {
    if (typeof db.read === 'function') db.read();
  } catch {
    /* ignore IO errors – the handlers will deal with them if necessary */
  }
  next();
});

// -----------------------------------------------------------------------------
// Helper: check whether an e-mail already exists (for "continue with e-mail")
// -----------------------------------------------------------------------------
app.post('/api/auth/check-email', (req, res) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: 'Email required' });
  const exists = !!db.get('users').find({ email }).value();
  res.json({ exists });
});
app.use(passport.initialize());
app.use(passport.session());
// Parse JSON bodies (increase limit to allow larger payloads for avatar uploads)
app.use(express.json({ limit: '5mb' }));
// Handle double '/api/api' prefix in client requests (e.g. misconfigured baseURL)
app.use((req, res, next) => {
  if (req.url.startsWith('/api/api')) {
    req.url = req.url.replace(/^\/api\/api/, '/api');
  }
  next();
});

// Passport config
passport.serializeUser((user, done) => done(null, { id: user.id }));
passport.deserializeUser((obj, done) => {
  const user = db.get('users').find({ id: obj.id }).value();
  done(null, user);
});

// Google OAuth Strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.SERVER_ROOT_URL + '/api/auth/google/callback',
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const email = profile.emails[0].value;
    let user = db.get('users').find({ email }).value();
    if (!user) {
      user = { id: Date.now().toString(), email, passwordHash: null, avatarUrl: profile.photos[0]?.value || null, apiKeyEncrypted: null };
      db.get('users').push(user).write();
    }
    done(null, user);
  } catch (err) {
    done(err);
  }
}));

// GitHub OAuth Strategy
passport.use(new GitHubStrategy({
  clientID: process.env.GITHUB_CLIENT_ID,
  clientSecret: process.env.GITHUB_CLIENT_SECRET,
  callbackURL: process.env.SERVER_ROOT_URL + '/api/auth/github/callback',
  scope: ['user:email'],
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const email = profile.emails && profile.emails[0]?.value;
    if (!email) return done(new Error('No email found'));
    let user = db.get('users').find({ email }).value();
    if (!user) {
      user = { id: Date.now().toString(), email, passwordHash: null, avatarUrl: profile.photos[0]?.value || null, apiKeyEncrypted: null };
      db.get('users').push(user).write();
    }
    done(null, user);
  } catch (err) {
    done(err);
  }
}));
function generateToken(user) {
  return jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
}

function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }
  const token = auth.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = db.get('users').find({ id: payload.id }).value();
    if (!user) return res.status(401).json({ error: 'User not found' });
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// OAuth Routes
app.get('/api/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
app.get('/api/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/api/auth/failure?provider=google' }),
  (req, res) => {
    const token = generateToken(req.user);
    const userRes = { email: req.user.email, avatarUrl: req.user.avatarUrl, hasApiKey: !!req.user.apiKeyEncrypted };
    const payload = JSON.stringify({ token, user: userRes });
    res.send(`<script>
      window.opener.postMessage(${payload}, '${process.env.CLIENT_ROOT_URL}');
      window.close();
    </script>`);
  }
);
app.get('/api/auth/github', passport.authenticate('github'));
app.get('/api/auth/github/callback',
  passport.authenticate('github', { failureRedirect: '/api/auth/failure?provider=github' }),
  (req, res) => {
    const token = generateToken(req.user);
    const userRes = { email: req.user.email, avatarUrl: req.user.avatarUrl, hasApiKey: !!req.user.apiKeyEncrypted };
    const payload = JSON.stringify({ token, user: userRes });
    res.send(`<script>
      window.opener.postMessage(${payload}, '${process.env.CLIENT_ROOT_URL}');
      window.close();
    </script>`);
  }
);
// OAuth failure callback
app.get('/api/auth/failure', (req, res) => {
  res.send(`<script>
    window.opener.postMessage({ error: 'Authentication failed' }, '${process.env.CLIENT_ROOT_URL}');
    window.close();
  </script>`);
});
// Routes
app.post('/api/auth/signup', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
  const exists = db.get('users').find({ email }).value();
  if (exists) return res.status(400).json({ error: 'Email already registered' });
  const hash = await bcrypt.hash(password, 10);
  const user = { id: Date.now().toString(), email, passwordHash: hash, avatarUrl: null, apiKeyEncrypted: null };
  db.get('users').push(user).write();
  const token = generateToken(user);
  res.json({ token, user: { email: user.email, avatarUrl: user.avatarUrl, hasApiKey: !!user.apiKeyEncrypted } });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
  const user = db.get('users').find({ email }).value();
  if (!user) return res.status(400).json({ error: 'Invalid email or password' });
  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) return res.status(400).json({ error: 'Invalid email or password' });
  const token = generateToken(user);
  res.json({ token, user: { email: user.email, avatarUrl: user.avatarUrl, hasApiKey: !!user.apiKeyEncrypted } });
});

// Get current user
app.get('/api/user', authMiddleware, (req, res) => {
  const { email, avatarUrl, apiKeyEncrypted } = req.user;
  res.json({ email, avatarUrl, hasApiKey: !!apiKeyEncrypted });
});

// Update settings: avatar choice or custom API key
app.put('/api/user', authMiddleware, (req, res) => {
  const { avatarUrl, apiKey } = req.body;
  const updates = {};
  if (avatarUrl) updates.avatarUrl = avatarUrl;
  if (apiKey) {
    const encrypted = CryptoJS.AES.encrypt(apiKey, CRYPTO_SECRET).toString();
    updates.apiKeyEncrypted = encrypted;
  }
  db.get('users').find({ id: req.user.id }).assign(updates).write();
  res.json({ success: true, avatarUrl: updates.avatarUrl || req.user.avatarUrl });
});

// Generate new avatar via OpenAI
app.post('/api/avatar', authMiddleware, async (req, res) => {
  try {
    // Determine which API key to use
    let key = process.env.OPENAI_API_KEY;
    if (req.user.apiKeyEncrypted) {
      const bytes = CryptoJS.AES.decrypt(req.user.apiKeyEncrypted, CRYPTO_SECRET);
      key = bytes.toString(CryptoJS.enc.Utf8);
    }
    if (!key) return res.status(400).json({ error: 'OpenAI API key not configured' });
    // Initialize OpenAI client (handle both v4 default export and Configuration/OpenAIApi)
    let openaiClient;
    if (Configuration && OpenAIApi) {
      const configuration = new Configuration({ apiKey: key });
      openaiClient = new OpenAIApi(configuration);
    } else {
      openaiClient = new OpenAIClient({ apiKey: key });
    }
    const prompt = req.body.prompt || 'Generate a user avatar';
    const model = req.body.model || process.env.IMAGE_MODEL || 'gpt-image-1';
    // Generate image (supports createImage or images.generate)
    let response;
    let dataArr;
    if (typeof openaiClient.createImage === 'function') {
      response = await openaiClient.createImage({ prompt, n: 1, size: '256x256', model, response_format: 'b64_json' });
      dataArr = response.data && response.data.data;
    } else if (openaiClient.images && typeof openaiClient.images.generate === 'function') {
      response = await openaiClient.images.generate({ prompt, n: 1, size: '256x256', model, response_format: 'b64_json' });
      dataArr = response.data;
    } else {
      return res.status(500).json({ error: 'OpenAI client does not support image generation' });
    }
    const imgData = Array.isArray(dataArr) ? dataArr[0] : null;
    if (!imgData) {
      return res.status(500).json({ error: 'Image response missing data' });
    }
    let avatarUrl;
    if (imgData.url) {
      avatarUrl = imgData.url;
    } else if (imgData.b64_json) {
      const imgBuffer = Buffer.from(imgData.b64_json, 'base64');
      const avatarsDir = path.join(__dirname, '..', 'public', 'avatars');
      if (!fs.existsSync(avatarsDir)) fs.mkdirSync(avatarsDir, { recursive: true });
      const fileName = `avatar_${req.user.id}.png`;
      const filePath = path.join(avatarsDir, fileName);
      fs.writeFileSync(filePath, imgBuffer);
      avatarUrl = `/avatars/${fileName}`;
    } else {
      return res.status(500).json({ error: 'Unexpected image response format' });
    }
    // Save avatar URL to user
    db.get('users').find({ id: req.user.id }).assign({ avatarUrl }).write();
    res.json({ url: avatarUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/avatars - list saved avatars for user
app.get('/api/avatars', authMiddleware, (req, res) => {
  const userRecord = db.get('users').find({ id: req.user.id }).value();
  const history = Array.isArray(userRecord.avatarHistory) ? userRecord.avatarHistory : [];
  res.json({ avatars: history });
});

// POST /api/avatars - create a new avatar entry with prompt and name
app.post('/api/avatars', authMiddleware, async (req, res) => {
  const { prompt, name, model } = req.body;
  if (!prompt || !name) {
    return res.status(400).json({ error: 'Missing prompt or name' });
  }
  try {
    // Determine API key
    let key = process.env.OPENAI_API_KEY;
    if (req.user.apiKeyEncrypted) {
      const bytes = CryptoJS.AES.decrypt(req.user.apiKeyEncrypted, CRYPTO_SECRET);
      key = bytes.toString(CryptoJS.enc.Utf8);
    }
    if (!key) return res.status(400).json({ error: 'OpenAI API key not configured' });
    // Initialize OpenAI client (support both v4 default export and Configuration/OpenAIApi)
    let openaiClient;
    if (Configuration && OpenAIApi) {
      const configuration = new Configuration({ apiKey: key });
      openaiClient = new OpenAIApi(configuration);
    } else {
      openaiClient = new OpenAIClient({ apiKey: key });
    }
    const imgModel = model || process.env.IMAGE_MODEL || 'gpt-image-1';
    // Generate image (supports createImage or images.generate)
    let resp;
    let dataArr;
    if (typeof openaiClient.createImage === 'function') {
      resp = await openaiClient.createImage({ prompt, n: 1, size: '256x256', model: imgModel, response_format: 'b64_json' });
      dataArr = resp.data && resp.data.data;
    } else if (openaiClient.images && typeof openaiClient.images.generate === 'function') {
      resp = await openaiClient.images.generate({ prompt, n: 1, size: '256x256', model: imgModel, response_format: 'b64_json' });
      dataArr = resp.data;
    } else {
      return res.status(500).json({ error: 'OpenAI client does not support image generation' });
    }
    const imgData = Array.isArray(dataArr) ? dataArr[0] : null;
    if (!imgData || !imgData.b64_json) {
      return res.status(500).json({ error: 'Image response missing data' });
    }
    const imgBuffer = Buffer.from(imgData.b64_json, 'base64');
    // Save file
    const avatarsDir = path.join(__dirname, '..', 'public', 'avatars');
    if (!fs.existsSync(avatarsDir)) fs.mkdirSync(avatarsDir, { recursive: true });
    const id = `${req.user.id}-${Date.now()}`;
    const fileName = `avatar_${id}.png`;
    const filePath = path.join(avatarsDir, fileName);
    fs.writeFileSync(filePath, imgBuffer);
    const url = `/avatars/${fileName}`;
    // Record in user history
    const userRec = db.get('users').find({ id: req.user.id });
    const existing = userRec.value().avatarHistory || [];
    const entry = { id, name, url, createdAt: new Date().toISOString() };
    userRec.assign({ avatarHistory: [entry, ...existing] }).write();
    res.json(entry);
  } catch (err) {
    console.error('Error generating avatar:', err);
    res.status(500).json({ error: err.message });
  }
});

// -----------------------------------------------------------------------------
// OWID Repo Browser via GitHub API
// -----------------------------------------------------------------------------
// GET /api/owid/browser?path=<repo_path>
app.get('/api/owid/browser', async (req, res) => {
  const repoPath = req.query.path || 'datasets/owid';
  const url = `https://api.github.com/repos/owid/owid-datasets/contents/${repoPath}`;
  try {
    const resp = await axios.get(url, {
      timeout: 10000,
      headers: {
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'PRJ1'
      }
    });
    res.json(resp.data);
  } catch (err) {
    const status = err.response?.status || 500;
    console.error(`Error browsing OWID repo at ${repoPath}:`, err.message);
    res.status(status).json({ error: err.message });
  }
});

// -----------------------------------------------------------------------------
// Dynamic dataset management (custom OWID or CSV endpoints)
// -----------------------------------------------------------------------------
// List all available datasets (static + custom)
app.get('/api/datasets', (req, res) => {
  const custom = db.get('datasets').value() || [];
  res.json({ datasets: STATIC_DATASETS.concat(custom) });
});
// Create a new custom dataset
app.post('/api/datasets', authMiddleware, (req, res) => {
  const { id, title, description, url, type, supportedViews } = req.body;
  if (!id || !title || !url || !type || !supportedViews) {
    return res.status(400).json({ error: 'Missing required dataset fields' });
  }
  // Prevent duplicates against static and custom
  if (STATIC_DATASETS.find(d => d.id === id) || db.get('datasets').find({ id }).value()) {
    return res.status(400).json({ error: 'Dataset ID already exists' });
  }
  const ds = { id, title, description, url, type, supportedViews };
  db.get('datasets').push(ds).write();
  res.status(201).json(ds);
});
// -----------------------------------------------------------------------------
// OWID Indicator Catalog
// -----------------------------------------------------------------------------
// Fetch list of all available OWID variables (indicators)
// Fetch list of all available OWID datasets via GitHub datapackage
app.get('/api/owid/indicators', async (req, res) => {
  try {
    const url = `${OWID_CDN_BASE}/datapackage.json`;
    const resp = await axios.get(url, { timeout: 20000 });
    const pkg = resp.data;
    if (!pkg || !Array.isArray(pkg.resources)) throw new Error('Invalid datapackage format');
    // Filter for OWID datasets (paths under owid/slug)
    const indicators = pkg.resources
      .filter(r => r.path && r.path.startsWith('datasets/owid/') && r.path.endsWith('datapackage.json'))
      .map(r => {
        const parts = r.path.split('/');
        // slug is the directory containing the datapackage.json (handle nested version folders)
        const slug = parts[2];
        return {
          id: slug,
          title: r.name || slug,
          description: r.description || '',
          url: `https://ourworldindata.org/grapher/${slug}.csv`,
          type: 'time-series',
          supportedViews: ['graph', 'globe']
        };
      });
    res.json({ indicators });
  } catch (err) {
    console.error('Error fetching OWID indicators datapackage:', err);
    res.status(503).json({ error: 'Unable to fetch OWID dataset list' });
  }
});

// -----------------------------------------------------------------------------
// Per‑dataset metadata via datapackage.json (stable fallback)
// -----------------------------------------------------------------------------
// GET /api/owid/datasets/:datasetId/meta (optional ?version=<version>)
app.get('/api/owid/datasets/:datasetId/meta', async (req, res) => {
  const { datasetId } = req.params;
  // Special case: load built-in static metadata if available
  try {
    const staticMetaPath = path.join(__dirname, '..', 'public', 'data', datasetId, `${datasetId}.metadata.json`);
    if (fs.existsSync(staticMetaPath)) {
      const sm = JSON.parse(fs.readFileSync(staticMetaPath, 'utf8'));
      // Transform to expected { metadata, variables } shape
      const metadata = { title: sm.chart.title, description: sm.chart.subtitle || sm.chart.note || '' };
      const variables = Object.entries(sm.columns).map(([key, col]) => ({
        id: key,
        title: col.titleLong || col.titleShort || key,
        unit: col.unit || ''
      }));
      return res.json({ metadata, variables });
    }
  } catch (err) {
    console.warn(`Error loading static metadata for ${datasetId}:`, err);
  }
  // Fetch datapackage.json without requiring version: try CDN, raw, and GitHub API
  let version = req.query.version;
  const tried = [];
  async function tryFetch(url) {
    tried.push(url);
    try {
      const resp = await axios.get(url, { timeout: 10000 });
      console.log(`Fetched datapackage.json for dataset ${datasetId} from ${url}`);
      return resp.data;
    } catch (err) {
      if (err.response && err.response.status === 404) {
        console.warn(`Not found at ${url} (404)`);
        return null;
      }
      console.error(`Error fetching datapackage from ${url}:`, err);
      throw err;
    }
  }
  let pkg = null;
  if (version) {
    // 1) Explicit version via GitHub raw
    pkg = await tryFetch(`${OWID_CDN_BASE}/datasets/owid/${datasetId}/${version}/datapackage.json`);
    if (!pkg) {
      return res.status(404).json({ error: 'Datapackage not found for version ' + version });
    }
  } else {
    // 2) Try unversioned GitHub raw
    pkg = await tryFetch(`${OWID_CDN_BASE}/datasets/owid/${datasetId}/datapackage.json`);
    // 3) List versions via GitHub API and pick latest if unversioned missing
    if (!pkg) {
      try {
        const contentsUrl = `https://api.github.com/repos/owid/owid-datasets/contents/datasets/${datasetId}`;
        const dirResp = await axios.get(contentsUrl, {
          timeout: 10000,
          headers: { Accept: 'application/vnd.github.v3+json' }
        });
        const dirs = Array.isArray(dirResp.data)
          ? dirResp.data.filter(item => item.type === 'dir').map(item => item.name)
          : [];
        if (dirs.length) {
          dirs.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
          const latest = dirs[dirs.length - 1];
          pkg = await tryFetch(`${OWID_CDN_BASE}/datasets/owid/${datasetId}/${latest}/datapackage.json`);
          if (pkg) version = latest;
        }
      } catch (err) {
        console.error(`Failed to list versions for dataset ${datasetId}:`, err);
      }
    }
    if (!pkg) {
      return res.status(404).json({ error: `Datapackage not found for dataset ${datasetId}`, tried });
    }
  }
  // Parse datapackage
  const resources = Array.isArray(pkg.resources) ? pkg.resources : [];
  // Pick the primary CSV resource
  let resource = resources.find(r => r.name === datasetId)
                 || resources.find(r => r.path && r.path.endsWith('.csv'));
  if (!resource) {
    return res.status(404).json({ error: 'Datapackage resource not found' });
  }
  const fields = resource.schema && Array.isArray(resource.schema.fields)
    ? resource.schema.fields
    : [];
  const variables = fields.map(f => ({
    id: f.name,
    title: f.title || f.name,
    description: f.description || '',
    unit: f.unit || (f.constraints && f.constraints.unit) || '',
    type: f.type || f.format || 'unknown'
  }));
  const metadata = {
    id: pkg.id || pkg.name,
    title: pkg.title || pkg.name || datasetId,
    description: pkg.description || ''
  };
  res.json({ metadata, variables });
});

// Simple chat endpoint using OpenAI ChatCompletion (GPT 4.1)
// Chat endpoints
// List conversations for current user
app.get('/api/chat', authMiddleware, (req, res) => {
  const user = db.get('users').find({ id: req.user.id }).value();
  const convs = user.conversations || [];
  const list = convs.map(c => ({ id: c.id, createdAt: c.createdAt }));
  res.json({ conversations: list });
});
// Get specific conversation messages
app.get('/api/chat/:conversationId', authMiddleware, (req, res) => {
  const user = db.get('users').find({ id: req.user.id }).value();
  const convId = req.params.conversationId;
  const convs = user.conversations || [];
  const conv = convs.find(c => c.id === convId);
  if (!conv) return res.status(404).json({ error: 'Conversation not found' });
  res.json({ id: conv.id, createdAt: conv.createdAt, messages: conv.messages });
});
// Send a chat message and save conversation
app.post('/api/chat', authMiddleware, async (req, res) => {
  try {
    const { prompt, model, conversationId } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt is required' });
    // Determine API key (user-provided or default)
    let key = process.env.OPENAI_API_KEY;
    if (req.user.apiKeyEncrypted) {
      const bytes = CryptoJS.AES.decrypt(req.user.apiKeyEncrypted, CRYPTO_SECRET);
      key = bytes.toString(CryptoJS.enc.Utf8);
    }
    if (!key) return res.status(400).json({ error: 'OpenAI API key not configured' });
    // Initialize OpenAI v4 client and define tools for function-calling
    const openai = new OpenAI({ apiKey: key });
    const chatModel = model || process.env.CHAT_MODEL || 'o4-mini';
    // Build message history: include past messages if a conversationId is provided
    let messages = [];
    if (conversationId) {
      const userData = db.get('users').find({ id: req.user.id }).value();
      const convs = userData.conversations || [];
      const conv = convs.find(c => c.id === conversationId);
      if (conv && Array.isArray(conv.messages)) {
        messages = conv.messages.map(m => ({ role: m.sender, content: m.text }));
      }
    }
    // Append the current user message
    messages.push({ role: 'user', content: prompt });
    // Knowledge-base search tool
    const searchTool = {
      type: 'function',
      name: 'search_knowledge_base',
      description: 'Query a knowledge base to retrieve relevant info on a topic.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'The user question or search query.' },
          options: {
            type: 'object',
            properties: {
              num_results: { type: 'number', description: 'Number of top results to return.' },
              domain_filter: { type: ['string', 'null'], description: "Optional domain to narrow the search (e.g. 'finance', 'medical'). Pass null if not needed." },
              sort_by: { type: ['string', 'null'], enum: ['relevance', 'date', 'popularity', 'alphabetical'], description: 'How to sort results. Pass null if not needed.' }
            },
            required: ['num_results', 'domain_filter', 'sort_by'],
            additionalProperties: false
          }
        },
        required: ['query', 'options'],
        additionalProperties: false
      }
    };
    // Dataset plotting tool
    const plotTool = {
      type: 'function',
      name: 'plot_dataset',
      description: 'Generate a directive to plot a time-series dataset on the client.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Dataset identifier (e.g. population, life-expectancy, child-mortality).' },
          defaultRegion: { type: 'string', description: 'Region or country to default the plot to.' },
          defaultYearRange: {
            type: 'array',
            items: { type: 'number' },
            minItems: 2,
            maxItems: 2,
            description: 'Start and end year for the time range.'
          }
        },
        required: ['id'],
        additionalProperties: false
      }
    };
    // Dataset show-on-globe tool
    // Call ChatCompletion with tools available (function-calling)
    // Include search, plot (graph), and show (globe) tools
    const showTool = {
      type: 'function',
      name: 'show_dataset',
      description: 'Generate a directive to show a time-series dataset on the globe.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Dataset identifier (e.g. population, life-expectancy).' }
        },
        required: ['id'],
        additionalProperties: false
      }
    };
    // Dataset definition tool
    const defineTool = {
      type: 'function',
      name: 'define_dataset',
      description: 'Define a new dataset by providing metadata and CSV URL.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Unique identifier for the dataset.' },
          title: { type: 'string', description: 'Human-readable title for the dataset.' },
          description: { type: 'string', description: 'Description of the dataset.' },
          url: { type: 'string', description: 'CSV URL from which to fetch the data.' },
          type: { type: 'string', description: 'Dataset type, e.g., time-series.' },
          supportedViews: { type: 'array', items: { type: 'string' }, description: 'Array of views: graph, globe.' }
        },
        required: ['id', 'title', 'url', 'type', 'supportedViews'],
        additionalProperties: false
      }
    };
    const resp = await openai.chat.completions.create({
      model: chatModel,
      messages: messages,
      functions: [searchTool, plotTool, showTool, defineTool],
      function_call: 'auto'
    });
    // Extract reply / function‑call information
    const replyChoice = resp.choices?.[0] || {};
    const replyMessage = replyChoice.message || {};
    let reply = replyMessage.content || '';
    // If the model decided to call our show-on-globe tool, emit a globe directive
    if (replyMessage.function_call && replyMessage.function_call.name === 'show_dataset') {
      try {
        const args = JSON.parse(replyMessage.function_call.arguments || '{}');
        reply = '__GLOBE__' + JSON.stringify({ id: args.id });
      } catch (err) {
        console.error('Show dataset processing failed:', err);
        reply = 'Sorry, I couldn\'t show the dataset on the globe.';
      }
    // If the model decided to call our plotting tool, emit a plot directive
    } else if (replyMessage.function_call && replyMessage.function_call.name === 'plot_dataset') {
      try {
        const args = JSON.parse(replyMessage.function_call.arguments || '{}');
        reply = '__PLOT__' + JSON.stringify({ id: args.id, defaultRegion: args.defaultRegion, defaultYearRange: args.defaultYearRange });
      } catch (err) {
        console.error('Plot dataset processing failed:', err);
        reply = 'Sorry, I couldn\'t prepare the graph.';
      }
    // If the model decided to call our KB search tool, run it and optionally
    // make a follow‑up call so the assistant can incorporate the info.
    } else if (replyMessage.function_call && replyMessage.function_call.name === 'search_knowledge_base') {
      try {
        const args = JSON.parse(replyMessage.function_call.arguments || '{}');
        const kbResults = await owidSearch(args.query || '', args.options || {});
        // Provide the KB results back to the model so it can craft a final answer
        const followResp = await openai.chat.completions.create({
          model: chatModel,
          messages: [
            { role: 'user', content: prompt },
            { role: 'assistant', function_call: replyMessage.function_call },
            { role: 'function', name: 'search_knowledge_base', content: JSON.stringify(kbResults) }
          ]
        });

        const followChoice = followResp.choices?.[0] || {};
        reply = followChoice.message?.content || JSON.stringify(kbResults);
      } catch (err) {
        console.error('KB search processing failed:', err);
        reply = 'Sorry, I had trouble searching the knowledge base.';
      }
    }
    // If the model decided to call our dataset-definition tool, save it
    if (replyMessage.function_call && replyMessage.function_call.name === 'define_dataset') {
      try {
        const args = JSON.parse(replyMessage.function_call.arguments || '{}');
        // Prevent duplicate IDs
        if (STATIC_DATASETS.find(d => d.id === args.id) || db.get('datasets').find({ id: args.id }).value()) {
          reply = `Dataset ID '${args.id}' already exists.`;
        } else {
          const ds = { id: args.id, title: args.title, description: args.description, url: args.url, type: args.type, supportedViews: args.supportedViews };
          db.get('datasets').push(ds).write();
          reply = `New dataset '${args.title}' created and available in the selector.`;
        }
      } catch (err) {
        console.error('Define dataset processing failed:', err);
        reply = 'Sorry, I could not define the new dataset.';
      }
    }
    // Save to database
    const userEntry = db.get('users').find({ id: req.user.id });
    const userData = userEntry.value();
    const convs = userData.conversations || [];
    let conv = convs.find(c => c.id === conversationId);
    if (!conv) {
      const newId = conversationId || Date.now().toString();
      conv = { id: newId, createdAt: new Date().toISOString(), messages: [] };
      convs.push(conv);
    }
    const timestamp = new Date().toISOString();
    const userMsg = { sender: 'user', text: prompt, timestamp };
    const assistantMsg = { sender: 'assistant', text: reply, timestamp };
    conv.messages.push(userMsg, assistantMsg);
    userEntry.assign({ conversations: convs }).write();
    res.json({ reply, conversationId: conv.id, createdAt: conv.createdAt });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Responses API endpoint
const RESPONSES_MODEL = process.env.RESPONSES_MODEL || process.env.CHAT_MODEL || 'o4-mini-high';
app.post('/api/responses', authMiddleware, async (req, res) => {
  try {
    const { prompt, model: reqModel } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt is required' });
    // Determine API key
    let key = process.env.OPENAI_API_KEY;
    if (req.user.apiKeyEncrypted) {
      const bytes = CryptoJS.AES.decrypt(req.user.apiKeyEncrypted, CRYPTO_SECRET);
      const decrypted = bytes.toString(CryptoJS.enc.Utf8);
      if (decrypted) key = decrypted;
    }
    if (!key) return res.status(400).json({ error: 'OpenAI API key not configured' });
    // Select model
    const modelName = reqModel || RESPONSES_MODEL;
    const openaiClient = new OpenAI({ apiKey: key });
    // Call Responses API with function-calling tools
    const response = await openaiClient.responses.create({
      model: modelName,
      inputs: [{ role: 'user', content: prompt }],
      tools: [searchTool, plotTool, showTool, defineTool],
      function_call: { type: 'auto' }
    });
    res.json(response);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Scrape market cap data with fallback to FMP
app.get('/api/scrape/marketcap/:symbol', async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  const slug = symbolSlugMap[symbol] || symbol.toLowerCase();
  const url = `https://www.macrotrends.net/stocks/charts/${symbol}/${slug}/market-cap`;
  let series = [];
  // Try HTML table scrape
  try {
    const { data: html } = await axios.get(url);
    const $ = cheerio.load(html);
    $('table.historical_data_table.table tbody tr').each((i, el) => {
      const tds = $(el).find('td');
      const year = parseInt(tds.eq(0).text().trim());
      const valText = tds.eq(1).text().trim().replace(/[$,]/g, '');
      const value = parseFloat(valText);
      if (!isNaN(year) && !isNaN(value)) series.push({ year, value });
    });
    if (series.length) {
      series.sort((a, b) => a.year - b.year);
      return res.json(series);
    }
    console.warn(`Scrape returned no data for ${symbol}, falling back to FMP`);
  } catch (err) {
    console.error(`Scrape error for ${symbol}`, err);
  }
  // Fallback to Financial Modeling Prep API
  if (FMP_API_KEY === 'demo') {
    return res.status(400).json({ error: 'No valid FMP_API_KEY provided. Set FMP_API_KEY in .env to enable fallback.' });
  }
  try {
    const fmpRes = await axios.get(`${FMP_BASE_URL}/historical-market-capitalization/${symbol}`, {
      params: { apikey: FMP_API_KEY }
    });
    const fmpSeries = fmpRes.data
      .map(d => ({ year: +d.date.slice(0, 4), value: +d.marketCap }))
      .sort((a, b) => a.year - b.year);
    return res.json(fmpSeries);
  } catch (err) {
    console.error(`FMP fallback error for ${symbol}`, err);
    return res.status(500).json({ error: err.message });
  }
});

// Health check
app.get('/api/health', (req, res) => res.json({ ok: true }));

// Start server if run directly
if (require.main === module) {
  // Bind to localhost only to avoid permission errors on 0.0.0.0
  app.listen(PORT, '127.0.0.1')
    .on('listening', () => console.log(`Server listening on http://127.0.0.1:${PORT}`))
    .on('error', (err) => {
      console.error(`Failed to bind server on port ${PORT}: ${err.message}`);
      console.error('Try setting the PORT environment variable to a free port, e.g.: export PORT=5001');
      process.exit(1);
    });
}

// Export app for testing
module.exports = app;