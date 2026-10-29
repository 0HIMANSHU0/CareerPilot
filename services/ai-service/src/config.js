const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { z } = require('zod');
const { loadEnv } = require('@careerpilot/service-kit');

module.exports = loadEnv(
  z.object({
    PORT: z.coerce.number(),
    MONGO_URI: z.string().min(1),
    INTERNAL_SECRET: z.string().min(32),
    // Optional: when the key is missing, the LLM client runs in MOCK mode.
    EMERGENT_LLM_KEY: z.string().optional(),
    LLM_BASE_URL: z.string().url(),
    LLM_MODEL: z.string().min(1),
    LLM_TIMEOUT_MS: z.coerce.number().int().positive(),
    LLM_MAX_RETRIES: z.coerce.number().int().min(0).max(5),
    GEMINI_API_KEY: z.string().optional(),
    CHAT_CONTEXT_MESSAGES: z.coerce.number().int().min(2).max(100),
    AI_RATE_LIMIT_PER_MINUTE: z.coerce.number().int().positive(),
  }),
);
