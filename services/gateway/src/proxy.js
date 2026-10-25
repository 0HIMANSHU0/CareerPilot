const { createProxyMiddleware } = require('http-proxy-middleware');
const { signInternalToken, INTERNAL_HEADER } = require('@careerpilot/service-kit');
const env = require('./config');

// Forward /api/<prefix>/* to the owning service as /<prefix>/*, attaching a signed internal token.
function serviceProxy(service, logger) {
  return createProxyMiddleware({
    target: service.target,
    pathFilter: service.prefixes,
    pathRewrite: { '^/api': '' },
    changeOrigin: true,
    proxyTimeout: env.PROXY_TIMEOUT_MS,
    on: {
      proxyReq(proxyReq, req) {
        proxyReq.setHeader(INTERNAL_HEADER, signInternalToken(env.INTERNAL_SECRET, req.user));
        proxyReq.setHeader('x-request-id', String(req.id));
      },
      error(err, req, res) {
        logger.warn({ err: err.message, service: service.name }, 'Downstream service unavailable');
        if (res.headersSent || typeof res.writeHead !== 'function') return res.end?.();
        res.writeHead(503, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            error: {
              code: 'SERVICE_UNAVAILABLE',
              service: service.name,
              message: `The ${service.label} service is temporarily unavailable. Please try again shortly.`,
            },
          }),
        );
      },
    },
  });
}

module.exports = { serviceProxy };
