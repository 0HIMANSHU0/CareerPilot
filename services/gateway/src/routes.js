const express = require('express');
const { signInternalToken, INTERNAL_HEADER, requireAuth } = require('@careerpilot/service-kit');
const env = require('./config');
const services = require('./services');

const router = express.Router();
const byName = Object.fromEntries(services.map((s) => [s.name, s]));

async function callService(url, user, timeoutMs) {
  const res = await fetch(url, {
    headers: { [INTERNAL_HEADER]: signInternalToken(env.INTERNAL_SECRET, user) },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`Upstream responded ${res.status}`);
  return res.json();
}

const status = (r) => (r.status === 'fulfilled' ? { status: 'ok' } : { status: 'unavailable' });

// GET /api/health: gateway + each service's /health (never fails as a whole).
router.get('/health', async (req, res) => {
  const results = await Promise.allSettled(
    services.map((s) => fetch(`${s.target}/health`, { signal: AbortSignal.timeout(1500) }).then((r) => r.json())),
  );
  const out = {};
  services.forEach((s, i) => {
    const r = results[i];
    out[s.name] = r.status === 'fulfilled' && r.value.status === 'ok' ? { status: 'ok', db: r.value.db } : { status: 'unavailable' };
  });
  const allOk = Object.values(out).every((s) => s.status === 'ok');
  res.json({ status: allOk ? 'ok' : 'degraded', gateway: 'ok', services: out });
});

// GET /api/dashboard: aggregate stats in parallel; one slow/down service never blocks the rest.
router.get('/dashboard', requireAuth, async (req, res) => {
  const timeout = env.DASHBOARD_TIMEOUT_MS;
  const [ai, booking] = await Promise.allSettled([
    callService(`${byName.ai.target}/internal/stats`, req.user, timeout),
    callService(`${byName.booking.target}/internal/stats`, req.user, timeout),
  ]);
  const aiData = ai.status === 'fulfilled' ? ai.value : {};
  const bookingData = booking.status === 'fulfilled' ? booking.value : {};
  const results = [ai, booking];
  const failed = results.filter((r) => r.status === 'rejected').length;
  const body = {
    stats: {
      totalResumes: aiData.totalResumes ?? null,
      totalChats: aiData.totalChats ?? null,
      upcomingConsultations: bookingData.upcomingConsultations ?? null,
      completedConsultations: bookingData.completedConsultations ?? null,
    },
    services: { ai: status(ai), booking: status(booking) },
    partial: failed > 0 && failed < results.length,
  };
  if (failed === results.length) {
    return res.status(503).json({
      ...body,
      error: { code: 'SERVICE_UNAVAILABLE', message: 'Dashboard data is temporarily unavailable. Please try again shortly.' },
    });
  }
  res.json(body);
});

module.exports = router;
