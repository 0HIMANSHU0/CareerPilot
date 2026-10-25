const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { z } = require('zod');
const { loadEnv } = require('@careerpilot/service-kit');

module.exports = loadEnv(
  z.object({
    PORT: z.coerce.number(),
    MONGO_URI: z.string().min(1),
    INTERNAL_SECRET: z.string().min(32),
    JWT_ACCESS_SECRET: z.string().min(32),
    ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().positive(),
    REFRESH_TOKEN_TTL_SECONDS: z.coerce.number().int().positive(),
    BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(14),
    COOKIE_SECURE: z.enum(['true', 'false']).transform((v) => v === 'true'),
    APP_URL: z.string().url(),
    // Optional: emails (reset / verification) run in MOCK mode without these.
    GMAIL_USER: z.string().optional(),
    GMAIL_APP_PASSWORD: z.string().optional(),
  }),
);
