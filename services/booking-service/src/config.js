const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { z } = require('zod');
const { loadEnv } = require('@careerpilot/service-kit');

// Provider keys are optional: each provider falls back to MOCK mode when its keys are missing.
module.exports = loadEnv(
  z.object({
    PORT: z.coerce.number(),
    MONGO_URI: z.string().min(1),
    INTERNAL_SECRET: z.string().min(32),
    APP_ORIGINS: z.string().transform((v) => v.split(',').map((o) => o.trim().replace(/\/$/, ''))),
    PAYMENT_HOLD_MINUTES: z.coerce.number().int().positive(),
    STRIPE_SECRET_KEY: z.string().optional(),
    STRIPE_WEBHOOK_SECRET: z.string().optional(),
    GOOGLE_SERVICE_ACCOUNT_JSON: z.string().optional(),
    GOOGLE_CALENDAR_ID: z.string().optional(),
    GMAIL_USER: z.string().optional(),
    GMAIL_APP_PASSWORD: z.string().optional(),
  }),
);
