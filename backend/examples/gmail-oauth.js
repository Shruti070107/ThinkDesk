/**
 * Gmail OAuth 2.0 Implementation Example
 * 
 * This example shows how to implement Gmail OAuth flow in Node.js/Express
 */

const express = require('express');
const { google } = require('googleapis');
const { OAuth2Client } = require('google-auth-library');

const router = express.Router();

// OAuth 2.0 Client Configuration
const oauth2Client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI // e.g., 'http://localhost:3000/api/auth/google/callback'
);

// Required Gmail scopes
const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.modify',
];

/**
 * Step 1: Initiate OAuth flow
 * Redirect user to Google OAuth consent screen
 */
router.get('/auth/google', (req, res) => {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent', // Force consent screen to get refresh token
  });
  
  res.redirect(authUrl);
});

/**
 * Step 2: Handle OAuth callback
 * Exchange authorization code for tokens
 */
router.get('/auth/google/callback', async (req, res) => {
  const { code } = req.query;
  
  if (!code) {
    return res.status(400).json({ error: 'No authorization code provided' });
  }
  
  try {
    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    
    // Store tokens securely (in database, encrypted)
    // In production, save to database with user ID
    const userId = req.session.userId; // Get from session/auth
    await saveTokens(userId, tokens);
    
    // Set tokens for this session
    oauth2Client.setCredentials(tokens);
    
    res.redirect(`${process.env.FRONTEND_URL}/dashboard?connected=true`);
  } catch (error) {
    console.error('Error getting tokens:', error);
    res.status(500).json({ error: 'Failed to authenticate' });
  }
});

/**
 * Step 3: Get Gmail service instance
 */
function getGmailService(userId) {
  return new Promise(async (resolve, reject) => {
    try {
      // Retrieve tokens from database
      const tokens = await getTokens(userId);
      
      oauth2Client.setCredentials(tokens);
      
      // Refresh token if expired
      if (tokens.expiry_date && tokens.expiry_date < Date.now()) {
        const { credentials } = await oauth2Client.refreshAccessToken();
        await saveTokens(userId, credentials);
        oauth2Client.setCredentials(credentials);
      }
      
      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
      resolve(gmail);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Fetch emails from Gmail
 */
async function fetchEmails(userId, maxResults = 50) {
  try {
    const gmail = await getGmailService(userId);
    
    // List messages
    const response = await gmail.users.messages.list({
      userId: 'me',
      maxResults,
      q: 'in:inbox', // Only inbox emails
    });
    
    const messages = response.data.messages || [];
    
    // Fetch full message details
    const emails = await Promise.all(
      messages.map(async (msg) => {
        const message = await gmail.users.messages.get({
          userId: 'me',
          id: msg.id,
          format: 'full',
        });
        
        return parseGmailMessage(message.data);
      })
    );
    
    return emails;
  } catch (error) {
    console.error('Error fetching emails:', error);
    throw error;
  }
}

/**
 * Parse Gmail message to our Email format
 */
function parseGmailMessage(gmailMessage) {
  const headers = gmailMessage.payload.headers;
  const getHeader = (name) => headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || '';
  
  // Decode email body
  const body = decodeEmailBody(gmailMessage.payload);
  
  return {
    id: gmailMessage.id,
    threadId: gmailMessage.threadId,
    from: {
      name: extractName(getHeader('From')),
      email: extractEmail(getHeader('From')),
    },
    to: getHeader('To').split(',').map(extractEmail),
    subject: getHeader('Subject'),
    snippet: gmailMessage.snippet,
    body: body,
    receivedAt: new Date(parseInt(gmailMessage.internalDate)),
    isRead: !gmailMessage.labelIds?.includes('UNREAD'),
    isStarred: gmailMessage.labelIds?.includes('STARRED'),
    labels: gmailMessage.labelIds || [],
    category: 'unclassified', // Will be set by AI processing
  };
}

/**
 * Decode email body from Gmail format
 */
function decodeEmailBody(payload) {
  if (payload.body?.data) {
    return Buffer.from(payload.body.data, 'base64').toString('utf-8');
  }
  
  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        return Buffer.from(part.body.data, 'base64').toString('utf-8');
      }
      if (part.mimeType === 'text/html' && part.body?.data) {
        // For HTML emails, you might want to strip HTML tags
        return Buffer.from(part.body.data, 'base64').toString('utf-8');
      }
    }
  }
  
  return '';
}

/**
 * Extract name from "Name <email@example.com>" format
 */
function extractName(fromString) {
  const match = fromString.match(/^(.+?)\s*<.+>$/);
  return match ? match[1].replace(/['"]/g, '') : fromString;
}

/**
 * Extract email from "Name <email@example.com>" format
 */
function extractEmail(fromString) {
  const match = fromString.match(/<(.+?)>/);
  return match ? match[1] : fromString;
}

/**
 * Set up Gmail push notifications (webhooks)
 */
async function setupGmailPushNotifications(userId, webhookUrl) {
  try {
    const gmail = await getGmailService(userId);
    
    // Watch for mailbox changes
    const response = await gmail.users.watch({
      userId: 'me',
      requestBody: {
        topicName: process.env.GOOGLE_PUBSUB_TOPIC, // Pub/Sub topic
        labelIds: ['INBOX'],
      },
    });
    
    // Store subscription details
    await saveSubscription(userId, {
      historyId: response.data.historyId,
      expiration: response.data.expiration,
    });
    
    return response.data;
  } catch (error) {
    console.error('Error setting up push notifications:', error);
    throw error;
  }
}

/**
 * Handle Gmail push notification
 * This endpoint receives POST requests from Google Pub/Sub
 */
router.post('/webhooks/gmail', async (req, res) => {
  try {
    // Verify the request is from Google
    // (In production, verify the Pub/Sub message signature)
    
    const message = req.body.message;
    const data = JSON.parse(Buffer.from(message.data, 'base64').toString());
    
    // Get user ID from subscription
    const userId = await getUserIdFromSubscription(data.subscription);
    
    // Fetch new emails
    const emails = await fetchNewEmails(userId, data.historyId);
    
    // Process and forward to frontend via WebSocket
    await forwardEmailsToFrontend(userId, emails);
    
    res.status(200).send('OK');
  } catch (error) {
    console.error('Error handling webhook:', error);
    res.status(500).send('Error');
  }
});

// Database helper functions (implement based on your DB)
async function saveTokens(userId, tokens) {
  // Save to database, encrypted
  // Example: await db.users.update({ userId }, { tokens: encrypt(tokens) });
}

async function getTokens(userId) {
  // Retrieve from database, decrypt
  // Example: const user = await db.users.findOne({ userId });
  // return decrypt(user.tokens);
}

async function saveSubscription(userId, subscription) {
  // Save subscription details
}

async function getUserIdFromSubscription(subscription) {
  // Get user ID from subscription
}

async function fetchNewEmails(userId, historyId) {
  // Fetch emails since historyId
  const gmail = await getGmailService(userId);
  const response = await gmail.users.history.list({
    userId: 'me',
    startHistoryId: historyId,
  });
  
  // Process history and return new emails
  return [];
}

async function forwardEmailsToFrontend(userId, emails) {
  // Send to frontend via WebSocket
  // Example: wsServer.sendToUser(userId, { type: 'new_emails', emails });
}

module.exports = router;
