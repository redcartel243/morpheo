const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/api/proxy', // Match requests starting with /api/proxy
    createProxyMiddleware({
      target: 'http://localhost:8000', // Your backend server address
      changeOrigin: true,
      pathRewrite: {
        '^/api/proxy' : '', // Rewrite the path: remove /api/proxy before forwarding
      },
      onProxyReq: (proxyReq, req, res) => {
        // Log the request being proxied (optional, for debugging)
        console.log(`[Proxy] Forwarding request: ${req.method} ${req.path} -> ${proxyReq.host}${proxyReq.path}`);
      },
      onError: (err, req, res) => {
        console.error('[Proxy] Error:', err);
        // Optional: Send a custom error response
        // res.writeHead(500, {
        //   'Content-Type': 'text/plain',
        // });
        // res.end('Proxy error occurred.');
      }
    })
  );
}; 