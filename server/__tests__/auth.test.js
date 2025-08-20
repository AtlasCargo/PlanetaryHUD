// server/__tests__/auth.test.js
const fs = require('fs');
const path = require('path');
// Load app first so test-transport patches apply before supertest loads
const app = require('../index');
const request = require('supertest');
let server;
beforeAll(done => { server = app.listen(0, done); });
afterAll(() => server && server.close());

// Use a fresh db.json for each test
const DB_PATH = path.join(__dirname, '..', 'db.json');
beforeEach(() => {
  fs.writeFileSync(DB_PATH, JSON.stringify({ users: [] }));
});

describe('Auth endpoints', () => {
  it('should sign up a new user', async () => {
    const res = await request(server)
      .post('/api/auth/signup')
      .send({ email: 'test@example.com', password: 'password123' });
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user).toMatchObject({ email: 'test@example.com' });
  });

  it('should not sign up with existing email', async () => {
    await request(server).post('/api/auth/signup').send({ email: 'a@b.com', password: 'pass' });
    const res = await request(server)
      .post('/api/auth/signup')
      .send({ email: 'a@b.com', password: 'pass2' });
    expect(res.statusCode).toBe(400);
  });

  it('should login existing user', async () => {
    await request(server).post('/api/auth/signup').send({ email: 'u@u.com', password: 'pass' });
    const res = await request(server)
      .post('/api/auth/login')
      .send({ email: 'u@u.com', password: 'pass' });
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('token');
  });
});