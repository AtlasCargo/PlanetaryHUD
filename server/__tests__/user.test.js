// server/__tests__/user.test.js
const fs = require('fs');
const path = require('path');
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
});

describe('User endpoints', () => {
  it('should return 401 for unauthorized GET /api/user', async () => {
    const res = await request(server).get('/api/user');
    expect(res.statusCode).toBe(401);
  });

  it('should sign up and GET current user', async () => {
    // Sign up a new user
    const signupRes = await request(server)
      .post('/api/auth/signup')
      .send({ email: 'test@user.com', password: 'password' });
    expect(signupRes.statusCode).toBe(200);
    const token = signupRes.body.token;
    // GET user
    const res = await request(server)
      .get('/api/user')
      .set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      email: 'test@user.com',
      avatarUrl: null,
      hasApiKey: false
    });
  });

  it('should update avatarUrl and apiKey via PUT /api/user', async () => {
    // Sign up a user
    const signupRes = await request(server)
      .post('/api/auth/signup')
      .send({ email: 'user2@example.com', password: 'password' });
    const token = signupRes.body.token;
    const newAvatar = 'http://avatar.test/image.png';
    const newApiKey = 'sk-test-api-key';
    // Update settings
    const putRes = await request(server)
      .put('/api/user')
      .set('Authorization', `Bearer ${token}`)
      .send({ avatarUrl: newAvatar, apiKey: newApiKey });
    expect(putRes.statusCode).toBe(200);
    expect(putRes.body).toHaveProperty('avatarUrl', newAvatar);
    // GET user to verify hasApiKey and avatarUrl
    const res2 = await request(server)
      .get('/api/user')
      .set('Authorization', `Bearer ${token}`);
    expect(res2.body).toMatchObject({
      email: 'user2@example.com',
      avatarUrl: newAvatar,
      hasApiKey: true
    });
  });
});