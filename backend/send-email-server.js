/**
 * Express server to send emails via Gmail API OR SMTP
 * 
 * Supports TWO methods:
 * 1. Gmail API (OAuth) - Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET
 * 2. SMTP - Set SMTP_ENABLED=true, SMTP_USER, SMTP_PASS
 * 
 * Run: node backend/send-email-server.js
 * Then visit: http://localhost:8000/send-email
 */

require('dotenv').config();
const express = require('express');
const { google } = require('googleapis');
const { OAuth2Client } = require('google-auth-library');
const nodemailer = require('nodemailer');
const Imap = require('imap');
const { simpleParser } = require('mailparser');

const app = express();
app.use(express.json());

// Enable CORS for frontend
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Configuration
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:8000/api/auth/google/callback';

// SMTP Configuration
const SMTP_ENABLED = process.env.SMTP_ENABLED === 'true';
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587');
const SMTP_SECURE = process.env.SMTP_SECURE === 'true';
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;

// Determine which method to use
const USE_SMTP = SMTP_ENABLED && SMTP_USER && SMTP_PASS;
const USE_GMAIL_API = CLIENT_ID && CLIENT_SECRET && !USE_SMTP;

console.log(`\n📧 Email Method: ${USE_SMTP ? 'SMTP' : USE_GMAIL_API ? 'Gmail API (OAuth)' : 'NOT CONFIGURED'}`);
if (USE_SMTP) {
  console.log(`   SMTP Server: ${SMTP_HOST}:${SMTP_PORT}`);
  console.log(`   SMTP User: ${SMTP_USER}`);
} else if (USE_GMAIL_API) {
  console.log(`   Gmail API: OAuth required`);
} else {
  console.log(`   ⚠️  Please configure either SMTP or Gmail API in .env`);
}

// Gmail API setup
const oauth2Client = USE_GMAIL_API ? new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI) : null;

// In-memory token storage (use database in production)
let userTokens = {};

// SMTP transporter setup
let smtpTransporter = null;
if (USE_SMTP) {
  smtpTransporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE, // true for 465, false for other ports
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
  
  // Verify SMTP connection
  smtpTransporter.verify((error, success) => {
    if (error) {
      console.error('❌ SMTP connection failed:', error.message);
    } else {
      console.log('✅ SMTP connection verified');
    }
  });
}

// OAuth flow (for Gmail API - reading emails)
app.get('/api/auth/google', (req, res) => {
  // Allow OAuth even if SMTP is configured (for reading emails)
  if (!CLIENT_ID || !CLIENT_SECRET) {
    return res.status(400).send(`
      <html>
        <body>
          <h1>❌ Gmail API Not Configured</h1>
          <p>To read emails, you need to set up Gmail API OAuth:</p>
          <ol>
            <li>Go to <a href="https://console.cloud.google.com/">Google Cloud Console</a></li>
            <li>Enable Gmail API</li>
            <li>Create OAuth 2.0 credentials</li>
            <li>Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env</li>
          </ol>
          <p>See GMAIL_SEND_SETUP.md for detailed instructions.</p>
        </body>
      </html>
    `);
  }

  const oauth2ClientForRead = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
  
  const SCOPES = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.send',
  ];

  const authUrl = oauth2ClientForRead.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
  });

  res.redirect(authUrl);
});

app.get('/api/auth/google/callback', async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).send('No authorization code provided');
  }

  try {
    const oauth2ClientForRead = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
    const { tokens } = await oauth2ClientForRead.getToken(code);
    userTokens['default'] = tokens;
    
    res.send(`
      <html>
        <body>
          <h1>✅ Gmail Connected Successfully!</h1>
          <p>You can now read and send emails.</p>
          <p><a href="/api/emails?limit=10">View Last 10 Emails</a></p>
          <p><a href="/send-email">Send Test Email</a></p>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Error getting tokens:', error);
    res.status(500).send('Failed to authenticate: ' + error.message);
  }
});

// Fetch emails endpoint (supports both IMAP and Gmail API)
app.get('/api/emails', async (req, res) => {
  const limit = parseInt(req.query.limit || '50');
  
  console.log(`📧 Fetching emails from ${SMTP_USER || 'Gmail API'}...`);
  console.log(`   Limit: ${limit} emails`);
  console.log(`   Method: ${USE_SMTP ? 'IMAP' : USE_GMAIL_API ? 'Gmail API' : 'Not configured'}`);
  
  try {
    let emails = [];

    if (USE_SMTP && SMTP_USER && SMTP_PASS) {
      // Use IMAP to fetch emails (works with app password)
      console.log(`   Connecting to IMAP: imap.gmail.com:993`);
      emails = await fetchEmailsViaIMAP(SMTP_USER, SMTP_PASS, limit);
      console.log(`   ✅ Fetched ${emails.length} emails from ${SMTP_USER}`);
    } else if (USE_GMAIL_API) {
      // Use Gmail API (requires OAuth)
      const tokens = userTokens['default'];
      if (!tokens) {
        return res.status(401).json({ 
          error: 'Not authenticated', 
          message: 'Please visit /api/auth/google first to authenticate',
          authUrl: '/api/auth/google'
        });
      }

      const oauth2ClientForRead = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
      oauth2ClientForRead.setCredentials(tokens);
      
      // Refresh token if needed
      if (tokens.expiry_date && tokens.expiry_date < Date.now()) {
        const { credentials } = await oauth2ClientForRead.refreshAccessToken();
        userTokens['default'] = credentials;
        oauth2ClientForRead.setCredentials(credentials);
      }

      const gmail = google.gmail({ version: 'v1', auth: oauth2ClientForRead });

      // List messages
      const response = await gmail.users.messages.list({
        userId: 'me',
        maxResults: limit,
        q: 'in:inbox',
      });

      const messages = response.data.messages || [];
      
      // Fetch full message details
      emails = await Promise.all(
        messages.map(async (msg) => {
          const message = await gmail.users.messages.get({
            userId: 'me',
            id: msg.id,
            format: 'full',
          });
          
          return parseGmailMessage(message.data);
        })
      );
    } else {
      return res.status(500).json({ 
        error: 'Email not configured', 
        message: 'Please configure either SMTP or Gmail API in .env' 
      });
    }

    console.log(`   ✅ Returning ${emails.length} emails to frontend`);
    res.json(emails);
  } catch (error) {
    console.error('❌ Error fetching emails:', error.message);
    console.error('   Stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to fetch emails', 
      message: error.message 
    });
  }
});

// Fetch emails via IMAP
function fetchEmailsViaIMAP(user, password, limit) {
  return new Promise((resolve, reject) => {
    const imap = new Imap({
      user: user,
      password: password,
      host: 'imap.gmail.com',
      port: 993,
      tls: true,
      tlsOptions: { rejectUnauthorized: false }
    });

    imap.once('ready', () => {
      imap.openBox('INBOX', false, (err, box) => {
        if (err) {
          imap.end();
          reject(err);
          return;
        }

        // Fetch last N messages
        imap.search(['ALL'], (err, results) => {
          if (err) {
            imap.end();
            reject(err);
            return;
          }

          if (!results || results.length === 0) {
            imap.end();
            resolve([]);
            return;
          }

          // Get last N messages
          const uids = results.slice(-limit).reverse();
          
          const fetch = imap.fetch(uids, {
            bodies: '',
            struct: true
          });

          const emails = [];
          let processed = 0;

          fetch.on('message', (msg, seqno) => {
            let emailData = {
              id: seqno.toString(),
              threadId: seqno.toString(),
              from: { name: '', email: '' },
              to: [],
              subject: '',
              snippet: '',
              body: '',
              receivedAt: new Date(),
              isRead: false,
              isStarred: false,
              labels: [],
              category: 'unclassified'
            };

            msg.on('body', (stream, info) => {
              simpleParser(stream, (err, parsed) => {
                if (err) {
                  console.error('Error parsing email:', err);
                  processed++;
                  if (processed === uids.length) {
                    imap.end();
                    resolve(emails);
                  }
                  return;
                }

                // Extract name and email
                const fromValue = parsed.from?.value?.[0] || parsed.from;
                emailData.from = {
                  name: fromValue?.name || parsed.from?.text?.match(/^(.+?)\s*</)?.[1]?.replace(/"/g, '') || '',
                  email: fromValue?.address || parsed.from?.text?.match(/<(.+)>/)?.[1] || parsed.from?.text || ''
                };
                
                emailData.to = parsed.to?.value?.map(t => t.address) || [parsed.to?.text] || [];
                emailData.subject = parsed.subject || '(No Subject)';
                emailData.body = parsed.text || parsed.html || '';
                emailData.snippet = emailData.body.substring(0, 150).replace(/\n/g, ' ');
                emailData.receivedAt = parsed.date || new Date();
                emailData.isRead = !parsed.flags?.has('\\Seen');
                emailData.isStarred = parsed.flags?.has('\\Flagged');

                emails.push(emailData);
                processed++;

                if (processed === uids.length) {
                  imap.end();
                  resolve(emails);
                }
              });
            });

            msg.once('attributes', (attrs) => {
              emailData.id = attrs.uid.toString();
              emailData.threadId = attrs.uid.toString();
            });
          });

          fetch.once('error', (err) => {
            imap.end();
            reject(err);
          });
        });
      });
    });

    imap.once('error', (err) => {
      reject(err);
    });

    imap.connect();
  });
}

// Helper function to parse Gmail message
function parseGmailMessage(gmailMessage) {
  const headers = gmailMessage.payload.headers;
  const getHeader = (name) => headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || '';
  
  // Extract name and email from "Name <email@example.com>" format
  const extractEmail = (str) => {
    const match = str.match(/<(.+)>/);
    return match ? match[1] : str.trim();
  };
  
  const extractName = (str) => {
    const match = str.match(/^(.+?)\s*</);
    return match ? match[1].replace(/"/g, '') : '';
  };
  
  // Decode email body
  const body = decodeEmailBody(gmailMessage.payload);
  
  return {
    id: gmailMessage.id,
    threadId: gmailMessage.threadId,
    from: {
      name: extractName(getHeader('From')) || 'Unknown',
      email: extractEmail(getHeader('From')),
    },
    to: getHeader('To').split(',').map(extractEmail),
    subject: getHeader('Subject') || '(No Subject)',
    snippet: gmailMessage.snippet || '',
    body: body,
    receivedAt: new Date(parseInt(gmailMessage.internalDate)),
    isRead: !gmailMessage.labelIds?.includes('UNREAD'),
    isStarred: gmailMessage.labelIds?.includes('STARRED'),
    labels: gmailMessage.labelIds || [],
    category: 'unclassified',
  };
}

// Helper function to decode email body
function decodeEmailBody(payload) {
  let body = '';
  
  if (payload.body && payload.body.data) {
    body = Buffer.from(payload.body.data, 'base64').toString('utf-8');
  } else if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body && part.body.data) {
        body = Buffer.from(part.body.data, 'base64').toString('utf-8');
        break;
      } else if (part.mimeType === 'text/html' && part.body && part.body.data) {
        body = Buffer.from(part.body.data, 'base64').toString('utf-8');
      }
    }
  }
  
  return body || '';
}

// Send email endpoint (supports both SMTP and Gmail API)
app.post('/api/emails/send', async (req, res) => {
  const { to, subject, body } = req.body;

  if (!to || !subject || !body) {
    return res.status(400).json({ error: 'Missing required fields: to, subject, body' });
  }

  try {
    let result;

    if (USE_SMTP) {
      // Send via SMTP
      result = await smtpTransporter.sendMail({
        from: SMTP_USER,
        to: to,
        subject: subject,
        text: body,
      });

      res.json({ 
        success: true, 
        messageId: result.messageId,
        method: 'SMTP',
        message: `Email sent to ${to}` 
      });
    } else if (USE_GMAIL_API) {
      // Send via Gmail API
      const tokens = userTokens['default'];
      if (!tokens) {
        return res.status(401).json({ 
          error: 'Not authenticated. Please visit /api/auth/google first' 
        });
      }

      oauth2Client.setCredentials(tokens);
      
      // Refresh token if needed
      if (tokens.expiry_date && tokens.expiry_date < Date.now()) {
        const { credentials } = await oauth2Client.refreshAccessToken();
        userTokens['default'] = credentials;
        oauth2Client.setCredentials(credentials);
      }

      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

      // Create email message
      const message = [
        `To: ${to}`,
        `Subject: ${subject}`,
        'Content-Type: text/plain; charset=utf-8',
        '',
        body,
      ].join('\n');

      // Encode message
      const encodedMessage = Buffer.from(message)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const response = await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedMessage,
        },
      });

      res.json({ 
        success: true, 
        messageId: response.data.id,
        method: 'Gmail API',
        message: `Email sent to ${to}` 
      });
    } else {
      return res.status(500).json({ 
        error: 'Email not configured', 
        message: 'Please configure either SMTP or Gmail API in .env' 
      });
    }
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ 
      error: 'Failed to send email', 
      message: error.message 
    });
  }
});

// Quick send endpoint (GET for easy testing)
app.get('/api/send-email', async (req, res) => {
  const { to = 'gahoyeb362@feanzier.com', subject = 'Test Email', body = 'This is a test email from ThinkDesk!' } = req.query;

  try {
    let result;

    if (USE_SMTP) {
      result = await smtpTransporter.sendMail({
        from: SMTP_USER,
        to: to,
        subject: subject,
        text: body,
      });

      res.send(`
        <html>
          <body>
            <h1>✅ Email Sent Successfully via SMTP!</h1>
            <p>To: ${to}</p>
            <p>Subject: ${subject}</p>
            <p>Body: ${body}</p>
            <p>Message ID: ${result.messageId}</p>
            <p><a href="/send-email">Send Another</a></p>
          </body>
        </html>
      `);
    } else if (USE_GMAIL_API) {
      const tokens = userTokens['default'];
      if (!tokens) {
        return res.redirect('/api/auth/google');
      }

      oauth2Client.setCredentials(tokens);
      
      if (tokens.expiry_date && tokens.expiry_date < Date.now()) {
        const { credentials } = await oauth2Client.refreshAccessToken();
        userTokens['default'] = credentials;
        oauth2Client.setCredentials(credentials);
      }

      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

      const message = [
        `To: ${to}`,
        `Subject: ${subject}`,
        'Content-Type: text/plain; charset=utf-8',
        '',
        body,
      ].join('\n');

      const encodedMessage = Buffer.from(message)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const response = await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedMessage,
        },
      });

      res.send(`
        <html>
          <body>
            <h1>✅ Email Sent Successfully via Gmail API!</h1>
            <p>To: ${to}</p>
            <p>Subject: ${subject}</p>
            <p>Body: ${body}</p>
            <p>Message ID: ${response.data.id}</p>
            <p><a href="/send-email">Send Another</a></p>
          </body>
        </html>
      `);
    } else {
      res.status(500).send(`
        <html>
          <body>
            <h1>❌ Email Not Configured</h1>
            <p>Please configure either SMTP or Gmail API in .env</p>
            <p>See SMTP_GUIDE.md for instructions</p>
          </body>
        </html>
      `);
    }
  } catch (error) {
    res.status(500).send(`
      <html>
        <body>
          <h1>❌ Error Sending Email</h1>
          <p>${error.message}</p>
          ${USE_GMAIL_API ? '<p><a href="/api/auth/google">Re-authenticate</a></p>' : ''}
          <p><a href="/send-email">Try Again</a></p>
        </body>
      </html>
    `);
  }
});

// Simple HTML page
app.get('/send-email', (req, res) => {
  const method = USE_SMTP ? 'SMTP' : USE_GMAIL_API ? 'Gmail API' : 'Not Configured';
  res.send(`
    <html>
      <head>
        <title>Send Email</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
          .button { background: #4285f4; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 10px 0; }
          .button:hover { background: #357ae8; }
          .info { background: #f0f0f0; padding: 15px; border-radius: 4px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <h1>📧 Send Email</h1>
        <div class="info">
          <strong>Method:</strong> ${method}<br>
          ${USE_SMTP ? `<strong>SMTP User:</strong> ${SMTP_USER}` : ''}
          ${USE_GMAIL_API ? '<strong>Status:</strong> OAuth required' : ''}
        </div>
        <p>Click the button below to send a test email:</p>
        <a href="/api/send-email?to=gahoyeb362@feanzier.com&subject=Test Email&body=This is a test email from ThinkDesk!" class="button">Send Test Email</a>
        ${USE_GMAIL_API ? '<p><a href="/api/auth/google">Connect Gmail (if not connected)</a></p>' : ''}
        ${!USE_SMTP && !USE_GMAIL_API ? '<p><strong>⚠️ Please configure SMTP or Gmail API in .env</strong></p>' : ''}
      </body>
    </html>
  `);
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`\n🚀 Email server running on http://localhost:${PORT}`);
  console.log(`\n📧 To send email:`);
  if (USE_SMTP) {
    console.log(`   ✅ SMTP configured - Ready to send!`);
    console.log(`   Visit: http://localhost:${PORT}/send-email`);
  } else if (USE_GMAIL_API) {
    console.log(`   1. First visit: http://localhost:${PORT}/api/auth/google`);
    console.log(`   2. Complete OAuth flow`);
    console.log(`   3. Then visit: http://localhost:${PORT}/api/send-email`);
  } else {
    console.log(`   ⚠️  Email not configured!`);
    console.log(`   Configure SMTP or Gmail API in .env`);
    console.log(`   See SMTP_GUIDE.md for instructions`);
  }
  console.log(`\n   Or visit: http://localhost:${PORT}/send-email\n`);
});
