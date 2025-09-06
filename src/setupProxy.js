const { createProxyMiddleware } = require('http-proxy-middleware');

console.log('🔧 setupProxy.js is loading...');

module.exports = function (app) {
  console.log('🔧 Setting up proxy middleware...');
  
  const target = 'http://127.0.0.1:5999';
  console.log('🎯 Target backend:', target);
  
  // Only proxy specific API routes
  app.use('/api/ideologram', createProxyMiddleware({
    target,
    changeOrigin: true,
    logLevel: 'debug',
    onProxyReq: (proxyReq, req, res) => {
      console.log('🔄 Proxying ideologram:', req.method, req.path, '->', target + req.path);
    },
    onError: (err, req, res) => {
      console.error('❌ Proxy error:', err.message);
    }
  }));
  
  console.log('✅ Proxy middleware configured for /api/ideologram ->', target);
};
