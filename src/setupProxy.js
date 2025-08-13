const { createProxyMiddleware } = require('http-proxy-middleware');

// Proxy React dev server requests to the Express backend during development.
// - /api -> backend API
// - /fintech -> static FinTech assets (feedback_loop_simulator.html)
// Backend default port is 5999 (see server/index.js)
module.exports = function (app) {
  const target = process.env.BACKEND_URL || 'http://127.0.0.1:5999';

  app.use(
    ['/api', '/fintech'],
    createProxyMiddleware({
      target,
      changeOrigin: true,
      ws: true,
      logLevel: 'warn',
    })
  );
};
