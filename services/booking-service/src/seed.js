// Seeds consultant profiles for the consultant accounts created by auth-service's seed.
// The user ids are the fixed ids used there (services share no code or database, only these constants).
const mongoose = require('mongoose');
const env = require('./config');
const { Consultant } = require('./models');

const weekdays = (startHour, endHour) => [1, 2, 3, 4, 5].map((dayOfWeek) => ({ dayOfWeek, startHour, endHour }));

const consultants = [
  {
    userId: '650000000000000000000002', name: 'Riya Sharma', email: 'riya.consultant@careerpilot.dev',
    headline: 'Engineering career coach, ex-FAANG hiring manager',
    bio: 'Helped 300+ engineers land senior roles. Resume teardown, system design interview prep and offer negotiation.',
    expertise: ['Engineering', 'Interviews', 'Negotiation'], hourlyRate: 2500, availability: weekdays(4, 12),
  },
  {
    userId: '650000000000000000000003', name: 'Arjun Mehta', email: 'arjun.consultant@careerpilot.dev',
    headline: 'Product & leadership coach',
    bio: 'Former Director of Product. Career transitions into PM, leadership coaching and promotion planning.',
    expertise: ['Product', 'Leadership', 'Career switch'], hourlyRate: 3500,
    availability: [...weekdays(10, 14), { dayOfWeek: 6, startHour: 4, endHour: 8 }],
  },
];

async function main() {
  await mongoose.connect(env.MONGO_URI);
  await Consultant.syncIndexes();
  for (const c of consultants) {
    await Consultant.updateOne({ userId: c.userId }, { $set: { ...c, active: true } }, { upsert: true });
    console.log(`Seeded consultant ${c.email}`);
  }
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
