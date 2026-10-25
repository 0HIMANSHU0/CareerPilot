const express = require('express');
const { z } = require('zod');
const sanitizeHtml = require('sanitize-html');
const { createResumeSchema, updateResumeSchema, generateResumeSchema, resumeDataSchema, resumeTemplateIdSchema, objectIdSchema } = require('@careerpilot/shared');
const { validate, requireRole, errors } = require('@careerpilot/service-kit');
const { renderResume, listTemplates } = require('@careerpilot/resume-templates');
const { Resume, ResumeVersion } = require('../models/resume');
const llm = require('../llm');
const { aiLimiter } = require('../limits');
const sample = require('../sample-resume');

const router = express.Router();
router.use(requireRole('USER', 'ADMIN'));

const MAX_VERSIONS = 30;
const idParam = validate({ params: z.object({ id: objectIdSchema }) });
const templateQuery = validate({ query: z.object({ template: resumeTemplateIdSchema.optional() }) });

// Summary comes from the Tiptap editor as HTML: allow only basic formatting tags.
const cleanData = (data) => ({
  ...data,
  summary: sanitizeHtml(data.summary || '', { allowedTags: ['p', 'strong', 'em', 'ul', 'ol', 'li', 'br'], allowedAttributes: {} }),
});

const sendHtml = (res, html) => res.type('html').set('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'").send(html);

async function ownResume(req) {
  const resume = await Resume.findOne({ _id: req.params.id, userId: req.user.id, deletedAt: null });
  if (!resume) throw errors.notFound('Resume not found');
  return resume;
}

async function snapshot(resume, note) {
  await ResumeVersion.create({
    resumeId: resume._id, userId: resume.userId, version: resume.version,
    title: resume.title, templateId: resume.templateId, data: resume.data, note,
  });
  const stale = await ResumeVersion.find({ resumeId: resume._id }).sort({ version: -1 }).skip(MAX_VERSIONS).select('_id');
  if (stale.length) await ResumeVersion.deleteMany({ _id: { $in: stale.map((v) => v._id) } });
}

router.get('/templates', (req, res) => res.json({ items: listTemplates() }));
router.get('/templates/sample', templateQuery, (req, res) =>
  sendHtml(res, renderResume(sample, req.query.template || 'modern-professional', { summaryIsHtml: true })),
);

router.get('/', async (req, res) => {
  const items = await Resume.find({ userId: req.user.id, deletedAt: null }).sort({ updatedAt: -1 }).select('-data').limit(100);
  res.json({ items });
});

router.post('/', validate({ body: createResumeSchema }), async (req, res) => {
  const resume = await Resume.create({ ...req.body, data: cleanData(req.body.data), userId: req.user.id });
  await snapshot(resume, 'Created');
  res.status(201).json({ resume });
});

router.get('/:id', idParam, async (req, res) => res.json({ resume: await ownResume(req) }));

// Autosave target: updates in place without creating a version.
router.patch('/:id', idParam, validate({ body: updateResumeSchema }), async (req, res) => {
  const resume = await ownResume(req);
  if (req.body.title !== undefined) resume.title = req.body.title;
  if (req.body.templateId !== undefined) resume.templateId = req.body.templateId;
  if (req.body.data !== undefined) resume.data = cleanData(req.body.data);
  await resume.save();
  res.json({ resume });
});

router.delete('/:id', idParam, async (req, res) => {
  const resume = await ownResume(req);
  resume.deletedAt = new Date();
  await resume.save();
  res.status(204).end();
});

router.post('/:id/duplicate', idParam, async (req, res) => {
  const src = await ownResume(req);
  const copy = await Resume.create({ userId: req.user.id, title: `${src.title} (copy)`.slice(0, 120), templateId: src.templateId, data: src.data });
  await snapshot(copy, `Duplicated from "${src.title}"`);
  res.status(201).json({ resume: copy });
});

router.get('/:id/versions', idParam, async (req, res) => {
  const resume = await ownResume(req);
  const items = await ResumeVersion.find({ resumeId: resume._id }).sort({ version: -1 }).select('-data');
  res.json({ items });
});

router.post('/:id/versions', idParam, validate({ body: z.object({ note: z.string().trim().max(120).optional() }) }), async (req, res) => {
  const resume = await ownResume(req);
  resume.version += 1;
  await resume.save();
  await snapshot(resume, req.body.note || 'Saved version');
  res.status(201).json({ resume });
});

router.post('/:id/versions/:version/restore', validate({ params: z.object({ id: objectIdSchema, version: z.coerce.number().int().min(1) }) }), async (req, res) => {
  const resume = await ownResume(req);
  const v = await ResumeVersion.findOne({ resumeId: resume._id, version: req.params.version });
  if (!v) throw errors.notFound('Version not found');
  Object.assign(resume, { title: v.title, templateId: v.templateId, data: v.data, version: resume.version + 1 });
  await resume.save();
  await snapshot(resume, `Restored v${v.version}`);
  res.json({ resume });
});

router.get('/:id/render', idParam, templateQuery, async (req, res) => {
  const resume = await ownResume(req);
  sendHtml(res, renderResume(resume.data, req.query.template || resume.templateId, { summaryIsHtml: true }));
});

// AI generation: structured data in -> structured data out (validated), never raw HTML.
const PROMPTS = {
  summary: 'Write a 3-4 sentence professional summary. Return {"summary": "<p>...</p>"} using only <p> and <strong>.',
  experience: 'Rewrite each experience\'s highlights as 2-5 concise, quantified, action-verb bullets. Keep company/title/dates unchanged. Return {"experience": [...]} with the same item order and shape.',
  full: 'Improve the summary (HTML <p>/<strong> only), experience highlights, skills (deduplicated, max 20) and achievements. Keep personal info, dates and facts unchanged; do not invent employers or degrees. Return the full resume JSON with the same shape.',
};

function mockGenerate(target, data, role) {
  const summary = `<p><strong>[MOCK AI]</strong> ${data.personal.title || role || 'Professional'} with experience across ${(data.skills || []).slice(0, 4).join(', ') || 'modern tools'}, focused on measurable impact and collaboration.</p>`;
  const experience = (data.experience || []).map((e) => ({
    ...e,
    highlights: (e.highlights.length ? e.highlights : [`Delivered key initiatives as ${e.title}`]).map((h) => `${h.replace(/\.$/, '')} (impact quantified)`),
  }));
  if (target === 'summary') return { summary };
  if (target === 'experience') return { experience };
  return { ...data, summary, experience };
}

router.post('/ai/generate', aiLimiter, validate({ body: generateResumeSchema }), async (req, res) => {
  const { target, targetRole, data } = req.body;
  const result = await llm.completeJSON(
    [
      { role: 'system', content: 'You are an expert resume writer producing ATS-friendly content. Respond with JSON only, no prose, no markdown fences.' },
      { role: 'user', content: `${PROMPTS[target]}\nTarget role: ${targetRole || data.personal.title || 'not specified'}\nResume JSON:\n${JSON.stringify(data)}` },
    ],
    () => mockGenerate(target, data, targetRole),
  );
  const merged = target === 'full' ? result : { ...data, ...result };
  const parsed = resumeDataSchema.safeParse(merged);
  if (!parsed.success) throw errors.badRequest('The AI returned content in an unexpected format. Please try again.');
  res.json({ data: cleanData(parsed.data), mock: llm.MOCK });
});

module.exports = router;
