// Ensure test mode patches are active
process.env.NODE_ENV = 'test';
const app = require('../index');
const request = require('supertest');
let server;
beforeAll(done => { server = app.listen(0, done); });
afterAll(() => server && server.close());
jest.mock('axios');
const axios = require('axios');

describe('Ideologram enrichment endpoints', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('OpenLibrary enrichment returns metadata and axes on success', async () => {
    // Mock Open Library calls
    axios.get.mockImplementation((url) => {
      if (url.includes('/search.json')) {
        return Promise.resolve({ data: { docs: [{ key: '/works/OL123W', edition_key: ['OL456M'] }] } });
      }
      if (url.includes('/books/OL456M.json')) {
        return Promise.resolve({ data: { subjects: ['capitalism', 'conservatism'] } });
      }
      if (url.includes('/works/OL123W.json')) {
        return Promise.resolve({ data: { subjects: ['free market'], subject_people: [], subject_places: [], subject_times: [], description: 'desc' } });
      }
      return Promise.resolve({ data: {} });
    });

    const res = await request(server)
      .post('/api/ideologram/enrich/openlibrary')
      .send({ book: { title: 'The Road to Serfdom', author: 'Hayek' } });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('metadata');
    expect(res.body).toHaveProperty('inferredAxes');
    expect(Object.keys(res.body.inferredAxes).length).toBeGreaterThan(0);
  });

  test('OpenLibrary enrichment falls back when remote fails', async () => {
    axios.get.mockRejectedValue(new Error('network')); // force failure
    const res = await request(server)
      .post('/api/ideologram/enrich/openlibrary')
      .send({ book: { title: 'Communist Manifesto' } });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('metadata');
    expect(res.body).toHaveProperty('inferredAxes');
  });

  test('Wikidata enrichment returns axes or fallback', async () => {
    // First path: find by title
    axios.get.mockImplementation((url, opts) => {
      if (String(url).includes('w/api.php')) {
        return Promise.resolve({ data: { search: [{ id: 'Q123' }] } });
      }
      if (String(url).includes('sparql')) {
        return Promise.resolve({ data: { results: { bindings: [
          { genreLabel: { value: 'libertarianism' } },
          { subjectLabel: { value: 'capitalism' } },
        ] } } });
      }
      return Promise.resolve({ data: {} });
    });
    const ok = await request(server)
      .post('/api/ideologram/enrich/wikidata')
      .send({ book: { title: 'Atlas Shrugged' } });
    expect(ok.status).toBe(200);
    expect(ok.body).toHaveProperty('inferredAxes');

    // Failure path
    axios.get.mockRejectedValue(new Error('blocked'));
    const fb = await request(server)
      .post('/api/ideologram/enrich/wikidata')
      .send({ book: { title: 'Unknown' } });
    expect(fb.status).toBe(200);
    expect(fb.body).toHaveProperty('inferredAxes');
  });
});


