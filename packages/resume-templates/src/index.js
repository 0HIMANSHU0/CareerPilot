// Pure rendering: the same structured resume data -> HTML for any template.
const { TEMPLATES, render } = require('./templates');

function renderResume(resumeData, templateId, options = {}) {
  if (!TEMPLATES[templateId]) throw new Error(`Unknown resume template: ${templateId}`);
  return render(templateId, resumeData, options);
}

const listTemplates = () => Object.entries(TEMPLATES).map(([id, t]) => ({ id, name: t.name }));

module.exports = { renderResume, listTemplates };
