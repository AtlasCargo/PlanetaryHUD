// server/__tests__/avatar.test.js
const fs = require('fs');
const path = require('path');

// Mock OpenAI Image API
jest.mock('openai', () => {
  const mCreateImage = jest.fn().mockResolvedValue({
    data: { data: [{ url: 'http://fake-avatar-url' }] }
  });
  const mOpenAIApi = jest.fn(() => ({ createImage: mCreateImage }));
  return { Configuration: jest.fn(), OpenAIApi: mOpenAIApi };
});

const app = require('../index');
const request = require('supertest');
// Start the server for testing (binds to ephemeral port)
let server;
// Start server on ephemeral port for testing
beforeAll(done => { server = app.listen(0, done); });
// Close server after tests
afterAll(() => server.close());
// Path to lowdb JSON store
const DB_PATH = path.join(__dirname, '..', 'db.json');

// Reset the database before each test
// Reset the database before each test
beforeEach(() => {
  fs.writeFileSync(DB_PATH, JSON.stringify({ users: [] }));
  // Clear any OPENAI_API_KEY in env
  delete process.env.OPENAI_API_KEY;
});

describe('Avatar generation endpoint', () => {
  it('should return 401 if not authenticated', async () => {
    const res = await request(server)
      .post('/api/avatar')
      .send({ prompt: 'Test' });
    expect(res.statusCode).toBe(401);
  });

  it('should return 400 if no API key configured', async () => {
    // Sign up a user
    const signupRes = await request(server)
      .post('/api/auth/signup')
      .send({ email: 'noapikey@user.com', password: 'password' });
    const token = signupRes.body.token;
    // Attempt to generate avatar without any API key
    const res = await request(server)
      .post('/api/avatar')
      .set('Authorization', `Bearer ${token}`)
      .send({ prompt: 'No key test' });
    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('error', 'OpenAI API key not configured');
  });

  it('should generate avatar when OPENAI_API_KEY is set', async () => {
    // Provide default API key
    process.env.OPENAI_API_KEY = 'sk-test';
    // Sign up a user
    const signupRes = await request(server)
      .post('/api/auth/signup')
      .send({ email: 'withkey@user.com', password: 'password' });
    const token = signupRes.body.token;
    // Generate avatar with custom prompt and model
    const res = await request(server)
      .post('/api/avatar')
      .set('Authorization', `Bearer ${token}`)
      .send({ prompt: 'Test Avatar', model: 'dall-e-mini' });
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('url', 'http://fake-avatar-url');
    // Persisted avatarUrl in database
    const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    const user = db.users.find(u => u.email === 'withkey@user.com');
    expect(user.avatarUrl).toBe('http://fake-avatar-url');
  });
});