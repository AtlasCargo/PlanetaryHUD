const { createProxyMiddleware } = require('http-proxy-middleware');

console.log('🔧 setupProxy.js is loading...');

module.exports = function (app) {
  console.log('🔧 Setting up proxy middleware...');
  
  const target = process.env.PORT_API ? `http://127.0.0.1:${process.env.PORT_API}` : 'http://127.0.0.1:5999';
  console.log('🎯 Target backend:', target);
  
  // Test if this function is being called
  console.log('📝 App object keys:', Object.keys(app));
  
  app.use('/api', createProxyMiddleware({
    target,
    changeOrigin: true,
    logLevel: 'debug',
    onProxyReq: (proxyReq, req, res) => {
      console.log('🔄 Proxying:', req.method, req.path, '->', target + req.path);
    },
    onError: (err, req, res) => {
      console.error('❌ Proxy error:', err.message);
    }
  }));
  
  console.log('✅ Proxy middleware configured for /api ->', target);
  
  // Add a test route to see if the proxy is working
  app.get('/api/test', (req, res) => {
    console.log('🧪 Test route hit');
    res.json({ message: 'Proxy is working!' });
  });
};
