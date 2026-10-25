const express = require('express');
const mongoose = require('mongoose');
const { BOOKING_STATUS } = require('@careerpilot/shared/constants');
const { requireAuth } = require('@careerpilot/service-kit');

const router = express.Router();

// Dashboard counts for the caller. Backed by the { userId, status, startTime } index in Phase 3.
router.get('/stats', requireAuth, async (req, res) => {
  const userId = new mongoose.Types.ObjectId(req.user.id);
  const bookings = mongoose.connection.db.collection('bookings');
  const [upcomingConsultations, completedConsultations] = await Promise.all([
    bookings.countDocuments({ userId, status: BOOKING_STATUS.CONFIRMED, startTime: { $gte: new Date() } }),
    bookings.countDocuments({ userId, status: BOOKING_STATUS.COMPLETED }),
  ]);
  res.json({ upcomingConsultations, completedConsultations });
});

module.exports = router;
