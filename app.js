// emailService.js – minimalist Express backend for bulk email (v3 – logs recipients)
//---------------------------------------------------------------------
//  Install requirements:
//    npm install express cors nodemailer
//---------------------------------------------------------------------
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const process = require('process');

const GMAIL_EMAIL_ACCOUNT = process.env['GMAIL_EMAIL_ACCOUNT']
const GMAIL_APP_PASSWORD = process.env['GMAIL_APP_PASSWORD']

const app = express();
app.use(cors());
app.use(express.json());

//---------------------------------------------------------------------
//  Static SMTP credentials (Gmail example) – replace with your provider
//---------------------------------------------------------------------
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: GMAIL_EMAIL_ACCOUNT, //Example Gmail account -> 'text@gmail.com'
    pass: GMAIL_APP_PASSWORD  //Example Gmail App password -> 'jdbe fioe oefd djbe'
  },
  tls: { rejectUnauthorized: false }
});

// Fail fast if SMTP creds are bad
transporter.verify(err => {
  if (err) {
    console.error('✖  Email transporter error:', err.message);
  } else {
    console.log('✔  Email transporter is ready to send');
  }
});

//---------------------------------------------------------------------
//  POST /sendmail – accepts either of the two payload shapes described
//---------------------------------------------------------------------
app.post('/sendmail', async (req, res) => {
  try {
    const { users } = req.body;
    const meta       = req.body.email || {};

    const subject = req.body.subject || meta.subject;
    const rawText = req.body.text    || meta.text;
    const rawHtml = req.body.html    || meta.html;
    const from    = meta.from        || 'HealthCoverage <projectsiot9@gmail.com>';

    // -- Validation ---------------------------------------------------
    if (!Array.isArray(users) || users.length === 0) {
      return res.status(400).json({ error: 'A non‑empty "users" array is required.' });
    }
    if (!subject || (!rawText && !rawHtml)) {
      return res.status(400).json({ error: 'Email "subject" and body ("text" or "html") are required.' });
    }

    // Detect HTML in text fallback
    const looksLikeHtml = rawText && /<[^>]+>/.test(rawText.trim());
    const html = rawHtml || (looksLikeHtml ? rawText : undefined);
    const text = html ? undefined : rawText;

    // -- Build email ---------------------------------------------------
    const mailOptions = {
      from,
      to: users.join(','),
      subject,
      text,
      html
    };

    // Log recipients before sending
    console.log(`→ Sending email to: ${users.join(', ')}`);

    // -- Send ----------------------------------------------------------
    const info = await transporter.sendMail(mailOptions);

    // Log Nodemailer response details
    console.log(`✔  Email sent. Accepted: ${info.accepted.join(', ') || 'none'} | Rejected: ${info.rejected.join(', ') || 'none'}`);

    return res.status(200).json({ message: 'Emails sent successfully', messageId: info.messageId });

  } catch (err) {
    console.error('Email send error:', err);
    return res.status(500).json({ error: 'Internal server error while sending email.' });
  }
});

//---------------------------------------------------------------------
//  Server bootstrap
//---------------------------------------------------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Gmail Email App Credentials: ${GMAIL_EMAIL_ACCOUNT} ${GMAIL_APP_PASSWORD}`);
  console.log(`📨  Email service listening on port ${PORT}`);
});
