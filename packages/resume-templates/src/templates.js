const { escapeHtml, contactLine, document } = require('./utils');
const sections = require('./sections');

// ATS Classic: single column, system serif font, no colours or graphics.
const ATS_CSS = `body{margin:0;background:#fff;color:#000;font-family:Georgia,"Times New Roman",serif;font-size:11pt;line-height:1.4}
.resume{max-width:780px;margin:0 auto;padding:32px}
h1{font-size:20pt;margin:0}header p{margin:4px 0}
h2{font-size:12pt;text-transform:uppercase;border-bottom:1px solid #000;margin:18px 0 8px;padding-bottom:2px}
h3{font-size:11pt;margin:8px 0 2px}.meta{margin:0 0 4px;font-style:italic}ul{margin:4px 0 0 18px;padding:0}a{color:#000}`;

// Modern Professional: accent colour header, sans-serif, still single-column and semantic.
const MODERN_CSS = `body{margin:0;background:#fff;color:#1e293b;font-family:"Helvetica Neue",Arial,sans-serif;font-size:10.5pt;line-height:1.5}
.resume{max-width:800px;margin:0 auto;padding:0 0 32px}
header{background:#0f172a;color:#f8fafc;padding:28px 36px}header h1{margin:0;font-size:22pt;letter-spacing:-.5px}
header .title{margin:4px 0 8px;color:#93c5fd;font-weight:600}header .contact{margin:0;font-size:9.5pt;color:#cbd5e1}header a{color:#bfdbfe}
section{padding:0 36px}h2{font-size:11pt;letter-spacing:1.5px;text-transform:uppercase;color:#2563eb;margin:22px 0 8px;border-bottom:2px solid #dbeafe;padding-bottom:4px}
h3{font-size:10.5pt;margin:10px 0 0}.meta{margin:0 0 4px;color:#64748b;font-size:9.5pt}ul{margin:4px 0 0 18px;padding:0}a{color:#2563eb}`;

function header(personal) {
  return `<header><h1>${escapeHtml(personal.fullName)}</h1>` +
    (personal.title ? `<p class="title">${escapeHtml(personal.title)}</p>` : '') +
    `<p class="contact">${contactLine(personal)}</p></header>`;
}

const TEMPLATES = {
  'modern-professional': { name: 'Modern Professional', css: MODERN_CSS },
  'ats-classic': { name: 'ATS Classic', css: ATS_CSS },
};

function render(templateId, data, options) {
  const template = TEMPLATES[templateId];
  return document(`${data.personal.fullName} – Resume`, template.css, header(data.personal) + sections.body(data, options));
}

module.exports = { TEMPLATES, render };
