const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // Proxy WebSocket and REST calls through the CRA dev server to the backend.
  // This avoids CORS + credential issues when running the dev server on a
  // different port than the Spring Boot backend.
  app.use(
    '/ws',
    createProxyMiddleware({
      target: 'http://localhost:8080',
      changeOrigin: true,
      ws: true,
    })
  );

  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://localhost:8080',
      changeOrigin: true,
    })
  );
};
