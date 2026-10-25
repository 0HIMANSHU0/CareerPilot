const express = require('express');
const mongoose = require('mongoose');
const { requireAuth } = require('@careerpilot/service-kit');

const router = express.Router();

// Called only by the gateway's dashboard aggregator. Counts are always scoped to the caller.
// Collections are created by the chat/resume models in Phase 2; counts are 0 until then.
router.get('/stats', requireAuth, async (req, res) => {
  const userId = new mongoose.Types.ObjectId(req.user.id);
  const db = mongoose.connection.db;
  const [totalResumes, totalChats] = await Promise.all([
    db.collection('resumes').countDocuments({ userId, deletedAt: null }),
    db.collection('chatsessions').countDocuments({ userId }),
  ]);
  res.json({ totalResumes, totalChats });
});

module.exports = router;
