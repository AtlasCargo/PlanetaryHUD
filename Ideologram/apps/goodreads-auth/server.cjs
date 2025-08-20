require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { OAuth } = require('oauth');
const { parseString } = require('xml2js');

const app = express();
app.use(cors());

const PORT = process.env.PORT || 4321;
const GOODREADS_KEY = process.env.GOODREADS_KEY;
const GOODREADS_SECRET = process.env.GOODREADS_SECRET;
const CALLBACK_URL = process.env.CALLBACK_URL || `http://localhost:${PORT}/auth/callback`;

if (!GOODREADS_KEY || !GOODREADS_SECRET) {
  console.warn('[goodreads-auth] Missing GOODREADS_KEY or GOODREADS_SECRET env vars.');
}

const REQUEST_TOKEN_URL = 'https://www.goodreads.com/oauth/request_token';
const ACCESS_TOKEN_URL = 'https://www.goodreads.com/oauth/access_token';
const AUTHORIZE_URL = 'https://www.goodreads.com/oauth/authorize';
const AUTH_USER_URL = 'https://www.goodreads.com/api/auth_user';
const REVIEW_LIST_URL = 'https://www.goodreads.com/review/list.xml';

const oauth = new OAuth(
  REQUEST_TOKEN_URL,
  ACCESS_TOKEN_URL,
  GOODREADS_KEY,
  GOODREADS_SECRET,
  '1.0',
  CALLBACK_URL,
  'HMAC-SHA1'
);

// Request token storage (ephemeral, in-memory)
const requestTokenSecrets = new Map(); // token -> secret
const redirectTargets = new Map(); // token -> redirect URL

app.get('/health', (_req, res) => res.json({ ok: true }));

app.get('/auth/start', (req, res) => {
  oauth.getOAuthRequestToken((err, token, tokenSecret) => {
    if (err) {
      console.error('[auth/start] request token error', err);
      return res.status(500).json({ error: 'request_token_failed' });
    }
    requestTokenSecrets.set(token, tokenSecret);
    const redirect = req.query.redirect && String(req.query.redirect);
    if (redirect) redirectTargets.set(token, redirect);
    const authorizeUrl = `${AUTHORIZE_URL}?oauth_token=${encodeURIComponent(token)}`;
    if (req.query.json === '1') return res.json({ authorizeUrl, oauth_token: token });
    return res.redirect(authorizeUrl);
  });
});

app.get('/auth/callback', (req, res) => {
  const { oauth_token, oauth_verifier } = req.query;
  if (!oauth_token || !oauth_verifier) return res.status(400).json({ error: 'missing_params' });
  const tokenSecret = requestTokenSecrets.get(oauth_token);
  if (!tokenSecret) return res.status(400).json({ error: 'unknown_oauth_token' });

  oauth.getOAuthAccessToken(oauth_token, tokenSecret, oauth_verifier, (err, accessToken, accessTokenSecret) => {
    if (err) {
      console.error('[auth/callback] access token error', err);
      return res.status(500).json({ error: 'access_token_failed' });
    }

    // Fetch user ID
    oauth.get(AUTH_USER_URL, accessToken, accessTokenSecret, (err2, data) => {
      if (err2) {
        console.error('[auth/callback] auth_user error', err2);
        return res.status(500).json({ error: 'auth_user_failed' });
      }
      parseString(data, { explicitArray: false }, (err3, obj) => {
        if (err3) {
          console.error('[auth/callback] xml parse error', err3);
          return res.status(500).json({ error: 'xml_parse_failed' });
        }
        try {
          const user = obj.GoodreadsResponse.user;
          const userId = user && (user.id || user['$']?.id || user['@id']);
          const storedRedirect = redirectTargets.get(oauth_token);
          if (storedRedirect) {
            redirectTargets.delete(oauth_token);
            requestTokenSecrets.delete(oauth_token);
            const target = new URL(storedRedirect);
            const hash = new URLSearchParams({ accessToken, accessTokenSecret, userId }).toString();
            return res.redirect(`${target.toString().replace(/[#?].*$/, '')}#${hash}`);
          }
          return res.json({ accessToken, accessTokenSecret, userId });
        } catch (e) {
          console.error('[auth/callback] user parse error', e);
          return res.status(500).json({ error: 'user_parse_failed' });
        }
      });
    });
  });
});

// Export read shelf as normalized BookInput[] (paginated)
app.get('/export/read', (req, res) => {
  const { accessToken, accessTokenSecret, userId } = req.query;
  if (!accessToken || !accessTokenSecret || !userId) return res.status(400).json({ error: 'missing_tokens_or_userId' });
  const shelf = (req.query.shelf || 'read').toString();
  const per_page = Number(req.query.per_page || 200);
  const page = Number(req.query.page || 1);

  const url = `${REVIEW_LIST_URL}?v=2&id=${encodeURIComponent(userId)}&shelf=${encodeURIComponent(shelf)}&per_page=${per_page}&page=${page}`;

  oauth.get(url, accessToken, accessTokenSecret, (err, data) => {
    if (err) {
      console.error('[export/read] fetch error', err);
      return res.status(500).json({ error: 'fetch_failed' });
    }
    parseString(data, { explicitArray: false }, (err2, obj) => {
      if (err2) {
        console.error('[export/read] xml parse error', err2);
        return res.status(500).json({ error: 'xml_parse_failed' });
      }
      try {
        const gr = obj.GoodreadsResponse || {};
        const reviewsNode = gr.reviews || {};
        const reviewList = [].concat(reviewsNode.review || []).filter(Boolean);
        const books = reviewList.map((r) => normalizeReview(r));
        const total = Number(reviewsNode['@total'] || reviewsNode.total || books.length) || books.length;
        const parsedPerPage = Number(reviewsNode['@per_page'] || reviewsNode.per_page || per_page) || per_page;
        const currentPage = Number(reviewsNode['@page'] || reviewsNode.page || page) || page;
        return res.json({ books, paging: { total, perPage: parsedPerPage, page: currentPage } });
      } catch (e) {
        console.error('[export/read] normalize error', e);
        return res.status(500).json({ error: 'normalize_failed' });
      }
    });
  });
});

function normalizeReview(r) {
  const book = r.book || {};
  const title = (book.title || '').toString().trim();
  const author = extractAuthor(book.authors);
  const rating = toNumber(r.rating);
  const isbn = (book.isbn13 || book.isbn || '').toString().trim();
  const year = toNumber(book.work && (book.work.original_publication_year || book.work.original_publication_year?._));
  const dateRead = parseDateToISO(r.read_at);
  const shelves = extractShelves(r.shelves);
  return { title, author, rating, isbn, year, dateRead, representative: 1, shelves, source: 'goodreads' };
}

function extractAuthor(authors) {
  if (!authors) return undefined;
  if (Array.isArray(authors.author)) {
    return authors.author.map((a) => a.name).filter(Boolean).join(', ');
  }
  if (authors.author && authors.author.name) return authors.author.name;
  return undefined;
}

function extractShelves(shelvesNode) {
  if (!shelvesNode) return [];
  const items = [].concat(shelvesNode.shelf || []).filter(Boolean);
  return items.map((s) => (s.name || s['@name'] || '').toString().trim().toLowerCase()).filter(Boolean);
}

function toNumber(s) {
  if (s == null) return undefined;
  const n = Number(String(s).trim());
  return Number.isFinite(n) ? n : undefined;
}

function parseDateToISO(s) {
  if (!s) return undefined;
  const t = String(s).trim();
  if (!t) return undefined;
  const d = new Date(t);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return undefined;
}

app.listen(PORT, () => {
  console.log(`[goodreads-auth] Listening on http://localhost:${PORT}`);
});
