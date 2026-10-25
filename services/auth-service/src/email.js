const { createMailer, createLogger } = require('@careerpilot/service-kit');
const env = require('./config');

const mailer = createMailer({ logger: createLogger('auth-mailer'), user: env.GMAIL_USER, pass: env.GMAIL_APP_PASSWORD });

const layout = (title, body, url, cta) =>
  `<div style="font-family:Arial,sans-serif;max-width:520px"><h2>${title}</h2><p>${body}</p>` +
  `<p><a href="${url}" style="background:#2563eb;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">${cta}</a></p>` +
  `<p style="color:#64748b;font-size:12px">If you did not request this, ignore this email.</p></div>`;

// Returns the link only in MOCK mode so the flow can be completed locally without an inbox.
async function sendLink({ to, subject, title, body, path, token, cta }) {
  const url = `${env.APP_URL}${path}?token=${encodeURIComponent(token)}`;
  await mailer.send({ to, subject, html: layout(title, body, url, cta), text: `${body}\n${url}` });
  return mailer.mock ? url : undefined;
}

module.exports = { mailer, sendLink };
