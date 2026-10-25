const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { z } = require('zod');
const { loadEnv } = require('@careerpilot/service-kit');

module.exports = loadEnv(
  z.object({
    PORT: z.coerce.number(),
    AUTH_SERVICE_URL: z.string().url(),
    AI_SERVICE_URL: z.string().url(),
    BOOKING_SERVICE_URL: z.string().url(),
    JWT_ACCESS_SECRET: z.string().min(32),
    INTERNAL_SECRET: z.string().min(32),
    CORS_ORIGINS: z.string().transform((v) => v.split(',').map((o) => o.trim())),
    TRUST_PROXY: z.coerce.number(),
    PROXY_TIMEOUT_MS: z.coerce.number(),
    DASHBOARD_TIMEOUT_MS: z.coerce.number(),
  }),
);
