const nodemailer = require('nodemailer');

// Gmail SMTP when credentials exist, otherwise MOCK mode (logs the email instead of sending).
function createMailer({ logger, user, pass, from }) {
  const mock = !(user && pass);
  const transport = mock ? null : nodemailer.createTransport({ service: 'gmail', auth: { user, pass } });
  return {
    mock,
    async send({ to, subject, html, text }) {
      if (mock) {
        logger.info({ to, subject, text }, '[MOCK EMAIL] not sent – Gmail credentials missing');
        return { mock: true, messageId: `mock-${Date.now()}` };
      }
      const info = await transport.sendMail({ from: from || user, to, subject, html, text });
      return { mock: false, messageId: info.messageId };
    },
  };
}

module.exports = { createMailer };
