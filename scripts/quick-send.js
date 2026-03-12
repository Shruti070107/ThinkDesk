/**
 * Quick email sender - sends "hii" to diyowen947@jparksky.com
 * 
 * This is a simplified version that requires you to have completed OAuth
 * 
 * Usage: node scripts/quick-send.js
 */

require('dotenv').config();
const { google } = require('googleapis');
const { OAuth2Client } = require('google-auth-library');

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('❌ Error: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set in .env');
  process.exit(1);
}

const oauth2Client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET);

// Email details
const TO_EMAIL = 'diyowen947@jparksky.com';
const SUBJECT = 'hii';
const BODY = 'hii';

async function sendEmail() {
  // Check if we have tokens
  if (!process.env.GOOGLE_ACCESS_TOKEN) {
    console.error('❌ Error: No access token found.');
    console.log('\nYou need to complete OAuth flow first.');
    console.log('Option 1: Use the backend OAuth endpoint');
    console.log('Option 2: Run: node scripts/send-email.js');
    console.log('\nTo get tokens:');
    console.log('1. Visit: http://localhost:8000/api/auth/google');
    console.log('2. Complete OAuth flow');
    console.log('3. Save the tokens to .env');
    process.exit(1);
  }

  // Set credentials
  oauth2Client.setCredentials({
    access_token: process.env.GOOGLE_ACCESS_TOKEN,
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
  });

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  // Create email message
  const message = [
    `To: ${TO_EMAIL}`,
    `Subject: ${SUBJECT}`,
    'Content-Type: text/plain; charset=utf-8',
    '',
    BODY,
  ].join('\n');

  // Encode message
  const encodedMessage = Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  try {
    console.log(`📧 Sending email to ${TO_EMAIL}...`);
    
    const response = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage,
      },
    });

    console.log('✅ Email sent successfully!');
    console.log('Message ID:', response.data.id);
    console.log(`📬 Sent "${SUBJECT}" to ${TO_EMAIL}`);
  } catch (error) {
    console.error('❌ Error sending email:', error.message);
    
    if (error.code === 401) {
      console.log('\n⚠️  Token expired. You need to refresh your access token.');
      console.log('Run the OAuth flow again to get new tokens.');
    } else if (error.response) {
      console.error('Details:', JSON.stringify(error.response.data, null, 2));
    }
    
    process.exit(1);
  }
}

sendEmail().catch(console.error);
