const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function (app) {
  // Explicitly proxy browser navigations too (CRA's package proxy skips HTML).
  app.use('/api', createProxyMiddleware({
    target: 'http://localhost:3001',
    changeOrigin: true,
  }));
};
