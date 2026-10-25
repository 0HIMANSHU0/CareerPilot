// Idempotent seed: creates the only ADMIN plus sample accounts. Run: npm run seed
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { z } = require('zod');
const { ROLES } = require('@careerpilot/shared/constants');
const { loadEnv } = require('@careerpilot/service-kit');
const env = require('./config');
const User = require('./models/User');

const seedEnv = loadEnv(
  z.object({
    SEED_ADMIN_EMAIL: z.string().email(),
    SEED_ADMIN_PASSWORD: z.string().min(8),
    SEED_DEMO_PASSWORD: z.string().min(8),
  }),
);

// Fixed ids so booking-service's seed can create matching consultant profiles without calling this service.
const accounts = [
  { _id: '650000000000000000000001', name: 'Platform Admin', email: seedEnv.SEED_ADMIN_EMAIL, role: ROLES.ADMIN, password: seedEnv.SEED_ADMIN_PASSWORD },
  { _id: '650000000000000000000002', name: 'Riya Sharma', email: 'riya.consultant@careerpilot.dev', role: ROLES.CONSULTANT, password: seedEnv.SEED_DEMO_PASSWORD, profile: { headline: 'Engineering career coach, ex-FAANG hiring manager' } },
  { _id: '650000000000000000000003', name: 'Arjun Mehta', email: 'arjun.consultant@careerpilot.dev', role: ROLES.CONSULTANT, password: seedEnv.SEED_DEMO_PASSWORD, profile: { headline: 'Product & leadership coach' } },
  { _id: '650000000000000000000004', name: 'Rahul Verma', email: 'rahul.user@careerpilot.dev', role: ROLES.USER, password: seedEnv.SEED_DEMO_PASSWORD, phone: '+91 98765 43210', profile: { headline: 'Full-stack developer, 3 YOE' } },
];

async function main() {
  await mongoose.connect(env.MONGO_URI);
  for (const { password, ...data } of accounts) {
    const passwordHash = await bcrypt.hash(password, env.BCRYPT_ROUNDS);
    // Re-create so the fixed _id is guaranteed even if an older seed used random ids.
    await User.deleteOne({ email: data.email, _id: { $ne: data._id } });
    await User.updateOne({ _id: data._id }, { $set: { ...data, passwordHash, emailVerified: true } }, { upsert: true });
    console.log(`Seeded ${data.role.padEnd(10)} ${data.email}`);
  }
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
