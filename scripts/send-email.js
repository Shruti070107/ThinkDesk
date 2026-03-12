/**
 * Quick script to send an email via Gmail API
 * 
 * Usage: node scripts/send-email.js
 * 
 * Make sure you have:
 * 1. Completed OAuth flow and have tokens stored
 * 2. Or run this after setting up OAuth
 */

require('dotenv').config();
const { google } = require('googleapis');
const { OAuth2Client } = require('google-auth-library');
const readline = require('readline');

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:8000/api/auth/google/callback';

const oauth2Client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

// Email details
const TO_EMAIL = 'diyowen947@jparksky.com';
const SUBJECT = 'hii';
const BODY = 'hii';

/**
 * Get authorization URL for OAuth
 */
function getAuthUrl() {
  const SCOPES = [
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.readonly',
  ];

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
  });
}

/**
 * Exchange code for tokens
 */
async function getTokensFromCode(code) {
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

/**
 * Send email using Gmail API
 */
async function sendEmail(tokens, to, subject, body) {
  oauth2Client.setCredentials(tokens);
  
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
  
  // Create email message
  const message = [
    `To: ${to}`,
    `Subject: ${subject}`,
    'Content-Type: text/plain; charset=utf-8',
    '',
    body,
  ].join('\n');
  
  // Encode message in base64url format
  const encodedMessage = Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  
  try {
    const response = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage,
      },
    });
    
    console.log('✅ Email sent successfully!');
    console.log('Message ID:', response.data.id);
    return response.data;
  } catch (error) {
    console.error('❌ Error sending email:', error.message);
    if (error.response) {
      console.error('Details:', error.response.data);
    }
    throw error;
  }
}

/**
 * Main function
 */
async function main() {
  console.log('📧 Gmail Email Sender\n');
  
  // Check if tokens are provided via environment or need OAuth
  let tokens = null;
  
  // Try to get tokens from environment (if stored)
  if (process.env.GOOGLE_ACCESS_TOKEN && process.env.GOOGLE_REFRESH_TOKEN) {
    tokens = {
      access_token: process.env.GOOGLE_ACCESS_TOKEN,
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
    };
    console.log('Using tokens from environment...\n');
  } else {
    console.log('⚠️  No tokens found. You need to authenticate first.\n');
    console.log('Step 1: Visit this URL to authorize:');
    console.log(getAuthUrl());
    console.log('\nStep 2: After authorization, you\'ll be redirected.');
    console.log('Step 3: Copy the "code" parameter from the URL.');
    console.log('\nOr run the OAuth flow through your backend first.\n');
    
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    
    return new Promise((resolve) => {
      rl.question('Enter the authorization code (or press Enter to exit): ', async (code) => {
        rl.close();
        
        if (!code) {
          console.log('Exiting...');
          resolve();
          return;
        }
        
        try {
          tokens = await getTokensFromCode(code);
          console.log('✅ Tokens obtained!');
          console.log('\n💡 Save these to .env for future use:');
          console.log(`GOOGLE_ACCESS_TOKEN=${tokens.access_token}`);
          console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`);
          console.log('');
        } catch (error) {
          console.error('❌ Error getting tokens:', error.message);
          resolve();
          return;
        }
        
        // Send email
        try {
          await sendEmail(tokens, TO_EMAIL, SUBJECT, BODY);
        } catch (error) {
          console.error('Failed to send email');
        }
        
        resolve();
      });
    });
  }
  
  // Send email if we have tokens
  if (tokens) {
    try {
      await sendEmail(tokens, TO_EMAIL, SUBJECT, BODY);
    } catch (error) {
      console.error('Failed to send email');
    }
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { sendEmail, getAuthUrl };
