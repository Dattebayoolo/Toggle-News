import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    open: false,
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
        configure: (proxy) => {
          // The API is a separate process (server/). When it is not running yet,
          // answer with a clean 503 instead of dumping ECONNREFUSED stack traces,
          // so the Live Wire rail can show its offline state.
          proxy.on('error', (err, req, res) => {
            if (res && !res.headersSent && typeof res.writeHead === 'function') {
              res.writeHead(503, { 'Content-Type': 'application/json' });
              res.end(
                JSON.stringify({
                  error: 'api_unreachable',
                  message: 'Toggle News API is not reachable on http://localhost:8787 — run "npm start" in the server/ folder.'
                })
              );
            }
          });
        },
      },
      // Toggle Account SSO lives on the news server too (it owns the session
      // cookies), so the browser keeps a single origin (:5173) throughout the
      // sign-in redirect chain.
      '/auth': {
        target: 'http://localhost:8787',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', (err, req, res) => {
            if (res && !res.headersSent && typeof res.writeHead === 'function') {
              res.writeHead(503, { 'Content-Type': 'application/json' });
              res.end(
                JSON.stringify({
                  error: 'auth_unreachable',
                  message: 'The Toggle News server (which brokers Toggle Account sign-in) is not running on http://localhost:8787.'
                })
              );
            }
          });
        },
      },
    },
  },
});
