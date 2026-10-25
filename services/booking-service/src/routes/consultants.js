const express = require('express');
const { z } = require('zod');
const { consultantProfileSchema, slotsQuerySchema, objectIdSchema } = require('@careerpilot/shared');
const { validate, requireAuth, requireRole, errors, escapeRegex } = require('@careerpilot/service-kit');
const { Consultant, Booking } = require('../models');

const router = express.Router();
router.use(requireAuth);

const SLOT_MS = 60 * 60 * 1000;

// Generate 60-minute UTC slots for a date from weekly availability, minus taken and past slots.
async function slotsFor(consultant, date) {
  const day = new Date(`${date}T00:00:00.000Z`);
  const windows = consultant.availability.filter((w) => w.dayOfWeek === day.getUTCDay());
  const starts = windows.flatMap((w) =>
    Array.from({ length: w.endHour - w.startHour }, (_, i) => new Date(day.getTime() + (w.startHour + i) * SLOT_MS)),
  );
  const taken = await Booking.find({
    consultantId: consultant._id,
    slotLocked: true,
    startTime: { $gte: day, $lt: new Date(day.getTime() + 24 * SLOT_MS) },
  }).select('startTime');
  const takenSet = new Set(taken.map((b) => b.startTime.getTime()));
  const now = Date.now();
  return [...new Set(starts.map((d) => d.getTime()))]
    .sort()
    .map((t) => ({ startTime: new Date(t).toISOString(), endTime: new Date(t + SLOT_MS).toISOString(), available: t > now && !takenSet.has(t) }));
}

router.get('/', validate({ query: z.object({ search: z.string().trim().max(60).optional() }) }), async (req, res) => {
  const filter = { active: true };
  if (req.query.search) filter.$or = ['name', 'headline', 'expertise'].map((f) => ({ [f]: new RegExp(escapeRegex(req.query.search), 'i') }));
  res.json({ items: await Consultant.find(filter).sort({ name: 1 }).limit(100) });
});

router.get('/me', requireRole('CONSULTANT'), async (req, res) => {
  res.json({ consultant: await Consultant.findOne({ userId: req.user.id }) });
});

// Consultants create/update their own profile; name/email come from the verified gateway token.
router.put('/me', requireRole('CONSULTANT'), validate({ body: consultantProfileSchema }), async (req, res) => {
  const consultant = await Consultant.findOneAndUpdate(
    { userId: req.user.id },
    { $set: { ...req.body, name: req.user.name, email: req.user.email } },
    { new: true, upsert: true, runValidators: true },
  );
  res.json({ consultant });
});

const idParam = validate({ params: z.object({ id: objectIdSchema }) });

router.get('/:id', idParam, async (req, res) => {
  const consultant = await Consultant.findOne({ _id: req.params.id, active: true });
  if (!consultant) throw errors.notFound('Consultant not found');
  res.json({ consultant });
});

router.get('/:id/slots', idParam, validate({ query: slotsQuerySchema }), async (req, res) => {
  const consultant = await Consultant.findOne({ _id: req.params.id, active: true });
  if (!consultant) throw errors.notFound('Consultant not found');
  res.json({ date: req.query.date, slots: await slotsFor(consultant, req.query.date) });
});

module.exports = { router, SLOT_MS };
