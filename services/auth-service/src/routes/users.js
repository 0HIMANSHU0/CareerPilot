const express = require('express');
const { z } = require('zod');
const { updateProfileSchema, paginationQuerySchema } = require('@careerpilot/shared');
const { ROLES } = require('@careerpilot/shared/constants');
const { validate, requireAuth, requireRole, errors, escapeRegex, buildSort, paginate } = require('@careerpilot/service-kit');
const User = require('../models/User');

const router = express.Router();

router.get('/me', requireAuth, async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) throw errors.notFound('User not found');
  res.json({ user });
});

// Only whitelisted fields can be changed (email/role are not editable here).
router.patch('/me', requireAuth, validate({ body: updateProfileSchema }), async (req, res) => {
  const { name, phone, profile } = req.body;
  const set = {};
  if (name !== undefined) set.name = name;
  if (phone !== undefined) set.phone = phone;
  if (profile) for (const [k, v] of Object.entries(profile)) set[`profile.${k}`] = v;
  const user = await User.findByIdAndUpdate(req.user.id, { $set: set }, { new: true, runValidators: true });
  if (!user) throw errors.notFound('User not found');
  res.json({ user });
});

// Admin user listing with server-side pagination / search / role filter.
const listQuery = paginationQuerySchema.extend({ role: z.enum(Object.values(ROLES)).optional() });
router.get('/', requireRole(ROLES.ADMIN), validate({ query: listQuery }), async (req, res) => {
  const { page, limit, search, sort, role } = req.query;
  const filter = {};
  if (role) filter.role = role;
  if (search) filter.$or = [{ name: new RegExp(escapeRegex(search), 'i') }, { email: new RegExp(escapeRegex(search), 'i') }];
  res.json(await paginate(User, filter, { page, limit, sort: buildSort(sort, ['createdAt', 'name', 'email']) }));
});

module.exports = router;
