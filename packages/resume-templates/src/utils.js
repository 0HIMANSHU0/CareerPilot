function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function dateRange(start, end, current) {
  const to = current ? 'Present' : end;
  return [start, to].filter(Boolean).map(escapeHtml).join(' – ');
}

// Wrap a section only when it has content, so empty sections are omitted.
function section(id, title, inner) {
  if (!inner) return '';
  return `<section id="${id}" aria-labelledby="${id}-title"><h2 id="${id}-title">${escapeHtml(title)}</h2>${inner}</section>`;
}

function list(items) {
  const clean = (items || []).filter(Boolean);
  if (!clean.length) return '';
  return `<ul>${clean.map((i) => `<li>${escapeHtml(i)}</li>`).join('')}</ul>`;
}

function contactLine(personal) {
  const parts = [personal.email, personal.phone, personal.location].filter(Boolean).map(escapeHtml);
  const links = (personal.links || []).map((l) => `<a href="${escapeHtml(l.url)}">${escapeHtml(l.label)}</a>`);
  return [...parts, ...links].join(' | ');
}

function document(title, css, body) {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(
    title,
  )}</title><style>${css}</style></head><body><main class="resume">${body}</main></body></html>`;
}

module.exports = { escapeHtml, dateRange, section, list, contactLine, document };
