const test = require('node:test');
const assert = require('node:assert');
const { renderResume } = require('../src');

const data = {
  personal: { fullName: 'Asha <Rao>', title: 'Engineer', email: 'asha@example.com', links: [] },
  summary: 'Builds things.',
  education: [],
  experience: [{ company: 'Acme', title: 'SDE', current: true, startDate: '2021', highlights: ['Shipped X'] }],
  skills: ['Node.js', 'React'],
  projects: [],
  certifications: [],
  achievements: [],
};

test('renders both templates from the same data with semantic headings', () => {
  for (const id of ['modern-professional', 'ats-classic']) {
    const html = renderResume(data, id);
    assert.match(html, /<h1>Asha &lt;Rao&gt;<\/h1>/);
    assert.match(html, /<h2 id="experience-title">Experience<\/h2>/);
    assert.doesNotMatch(html, /id="projects"/);
  }
});

test('rejects unknown templates', () => {
  assert.throws(() => renderResume(data, 'nope'));
});
