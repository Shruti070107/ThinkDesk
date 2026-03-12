/**
 * Quick test script to send email
 */

require('dotenv').config();
const nodemailer = require('nodemailer');

const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;

if (!SMTP_USER || !SMTP_PASS) {
  console.error('❌ SMTP credentials not found in .env');
  process.exit(1);
}

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
});

async function sendEmail() {
  try {
    console.log('📧 Sending email...');
    console.log('From:', SMTP_USER);
    console.log('To: gahoyeb362@feanzier.com');
    console.log('Subject: hii');
    console.log('Body: hii');
    console.log('');

    const result = await transporter.sendMail({
      from: SMTP_USER,
      to: 'gahoyeb362@feanzier.com',
      subject: 'hii',
      text: 'hii',
    });

    console.log('✅ Email sent successfully!');
    console.log('Message ID:', result.messageId);
    console.log('Response:', result.response);
  } catch (error) {
    console.error('❌ Error sending email:', error.message);
    if (error.response) {
      console.error('Response:', error.response);
    }
    process.exit(1);
  }
}

sendEmail();

