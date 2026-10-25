// Section markup shared by all templates; templates differ only in header + CSS.
const { escapeHtml, dateRange, section, list } = require('./utils');

function experience(items) {
  const html = (items || [])
    .map(
      (e) => `<article class="entry"><h3>${escapeHtml(e.title)}, ${escapeHtml(e.company)}</h3>` +
        `<p class="meta">${[escapeHtml(e.location), dateRange(e.startDate, e.endDate, e.current)].filter(Boolean).join(' | ')}</p>` +
        `${list(e.highlights)}</article>`,
    )
    .join('');
  return section('experience', 'Experience', html);
}

function education(items) {
  const html = (items || [])
    .map(
      (e) => `<article class="entry"><h3>${escapeHtml(e.degree)}${e.field ? `, ${escapeHtml(e.field)}` : ''}</h3>` +
        `<p class="meta">${[escapeHtml(e.institution), dateRange(e.startDate, e.endDate), escapeHtml(e.grade)].filter(Boolean).join(' | ')}</p></article>`,
    )
    .join('');
  return section('education', 'Education', html);
}

function projects(items) {
  const html = (items || [])
    .map(
      (p) => `<article class="entry"><h3>${escapeHtml(p.name)}</h3>` +
        (p.description ? `<p>${escapeHtml(p.description)}</p>` : '') +
        (p.technologies?.length ? `<p class="meta">Technologies: ${p.technologies.map(escapeHtml).join(', ')}</p>` : '') +
        (p.url ? `<p class="meta"><a href="${escapeHtml(p.url)}">${escapeHtml(p.url)}</a></p>` : '') +
        `</article>`,
    )
    .join('');
  return section('projects', 'Projects', html);
}

function certifications(items) {
  return section(
    'certifications',
    'Certifications',
    list((items || []).map((c) => [c.name, c.issuer, c.date].filter(Boolean).join(' – '))),
  );
}

// Summary may contain sanitized editor HTML (Phase 2); plain text is escaped.
function summary(text, isHtml) {
  if (!text) return '';
  return section('summary', 'Professional Summary', isHtml ? text : `<p>${escapeHtml(text)}</p>`);
}

function body(data, options = {}) {
  return [
    summary(data.summary, options.summaryIsHtml),
    experience(data.experience),
    education(data.education),
    section('skills', 'Skills', data.skills?.length ? `<p>${data.skills.map(escapeHtml).join(', ')}</p>` : ''),
    projects(data.projects),
    certifications(data.certifications),
    section('achievements', 'Achievements', list(data.achievements)),
  ].join('');
}

module.exports = { body };
