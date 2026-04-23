import { Client, Databases, ID, Query } from 'node-appwrite';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
];

function decodeEmailBody(payload) {
  if (!payload) return '';
  if (payload.body?.data) {
    return Buffer.from(payload.body.data, 'base64').toString('utf-8');
  }
  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        return Buffer.from(part.body.data, 'base64').toString('utf-8');
      }
    }
    for (const part of payload.parts) {
      if (part.mimeType === 'text/html' && part.body?.data) {
        return Buffer.from(part.body.data, 'base64').toString('utf-8');
      }
      if (part.parts) {
        const nested = decodeEmailBody(part);
        if (nested) return nested;
      }
    }
  }
  return '';
}

function parseGmailMessage(gmailMessage) {
  const headers = gmailMessage.payload?.headers || [];
  const getHeader = (name) => headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || '';
  const extractEmail = (str) => { const m = str.match(/<(.+)>/); return m ? m[1] : str.trim(); };
  const extractName = (str) => { const m = str.match(/^(.+?)\s*</); return m ? m[1].replace(/"/g, '').trim() : ''; };

  const body = decodeEmailBody(gmailMessage.payload);
  const subject = getHeader('Subject') || '(No Subject)';
  const snippet = gmailMessage.snippet || '';
  const text = `${subject} ${snippet}`.toLowerCase();

  let category = 'unclassified';
  if (/meeting|call|schedule|zoom|teams|calendar|appointment/.test(text)) category = 'meeting';
  else if (/urgent|asap|deadline|critical/.test(text)) category = 'deadline';
  else if (/task|todo|action|follow.?up/.test(text)) category = 'task';

  return {
    id: gmailMessage.id,
    threadId: gmailMessage.threadId,
    from: {
      name: extractName(getHeader('From')) || 'Unknown',
      email: extractEmail(getHeader('From')),
    },
    to: getHeader('To').split(',').map(extractEmail),
    subject,
    snippet,
    body,
    receivedAt: new Date(parseInt(gmailMessage.internalDate)).toISOString(),
    isRead: !gmailMessage.labelIds?.includes('UNREAD'),
    isStarred: gmailMessage.labelIds?.includes('STARRED') || false,
    labels: gmailMessage.labelIds || [],
    category,
  };
}

export default async ({ req, res, log, error }) => {
  const {
    GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI,
    APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_API_KEY,
    APPWRITE_DATABASE_ID, FRONTEND_URL,
  } = process.env;

  const DATABASE_ID = APPWRITE_DATABASE_ID || 'thinkdesk';
  const TOKENS_COLLECTION = 'gmail_tokens';

  const client = new Client()
    .setEndpoint(APPWRITE_ENDPOINT || 'https://sgp.cloud.appwrite.io/v1')
    .setProject(APPWRITE_PROJECT_ID)
    .setKey(APPWRITE_API_KEY);

  const db = new Databases(client);

  // Detect routing: use req.path if available, otherwise fall back to body.action
  // Appwrite Cloud 1.9.x may not pass req.path correctly via executions API
  let path = req.path || '/';
  let method = req.method || 'GET';
  let query = req.query || {};
  let body = {};
  
  try {
    body = req.bodyJson || {};
  } catch (e) {
    // empty body is fine for GET requests
  }

  // If path is '/' (default), check body for action routing (compatibility mode)
  if ((path === '/' || path === '') && body.action) {
    path = '/' + body.action;
    method = body.method || method;
    query = { ...query, ...(body.query || {}) };
    // Remove action from body to avoid confusion
    const { action: _, method: __, query: ___, ...rest } = body;
    body = rest;
  }

  log(`Gmail function: ${method} ${path}`);

  const cors = {
    'Access-Control-Allow-Origin': FRONTEND_URL || '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (method === 'OPTIONS') return res.send('', 204, cors);

  const createOAuth2 = () => new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI);

  const getToken = async (email) => {
    try {
      const docs = await db.listDocuments(DATABASE_ID, TOKENS_COLLECTION, [Query.equal('email', email), Query.limit(1)]);
      if (!docs.documents.length) return null;
      const d = docs.documents[0];
      return { access_token: d.access_token, refresh_token: d.refresh_token, expiry_date: d.expiry_date, token_type: d.token_type || 'Bearer', $id: d.$id };
    } catch (e) { error('getToken: ' + e.message); return null; }
  };

  const saveToken = async (email, tokens) => {
    const data = {
      email,
      access_token: tokens.access_token || '',
      refresh_token: tokens.refresh_token || '',
      expiry_date: tokens.expiry_date || 0,
      token_type: tokens.token_type || 'Bearer',
    };
    try {
      const existing = await db.listDocuments(DATABASE_ID, TOKENS_COLLECTION, [Query.equal('email', email), Query.limit(1)]);
      if (existing.documents.length > 0) {
        await db.updateDocument(DATABASE_ID, TOKENS_COLLECTION, existing.documents[0].$id, data);
      } else {
        await db.createDocument(DATABASE_ID, TOKENS_COLLECTION, ID.unique(), data);
      }
    } catch (e) { error('saveToken: ' + e.message); throw e; }
  };

  try {
    // GET /auth/google — Start OAuth
    if (path.startsWith('/auth/google') && !path.includes('/callback')) {
      if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
        return res.json({ error: 'Google OAuth not configured' }, 500, cors);
      }
      const oauth2 = createOAuth2();
      const authUrl = oauth2.generateAuthUrl({
        access_type: 'offline',
        scope: GOOGLE_SCOPES,
        prompt: 'consent',
        state: encodeURIComponent(query.redirect || FRONTEND_URL || ''),
      });
      // Return the auth URL as JSON so the frontend can open it
      return res.json({ authUrl, type: 'oauth_redirect' }, 200, cors);
    }

    // GET /auth/google/callback — Handle OAuth Callback
    if (path.includes('/auth/google/callback')) {
      const code = query.code;
      if (!code) return res.json({ error: 'missing code' }, 400, cors);

      const oauth2 = createOAuth2();
      const { tokens } = await oauth2.getToken(code);
      oauth2.setCredentials(tokens);

      const oauth2info = google.oauth2({ auth: oauth2, version: 'v2' });
      const userInfo = await oauth2info.userinfo.get();
      const emailAddress = userInfo.data.email;

      if (!emailAddress) return res.json({ error: 'no email' }, 400, cors);

      await saveToken(emailAddress, tokens);
      log(`Tokens saved for ${emailAddress}`);

      const redirectBack = query.state ? decodeURIComponent(query.state) : (FRONTEND_URL || '');

      return res.send(`
        <html><body>
          <h1>✅ Gmail Connected!</h1>
          <p>Connected: <strong>${emailAddress}</strong></p>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'GMAIL_AUTH_SUCCESS', email: '${emailAddress}' }, '*');
              setTimeout(() => window.close(), 1000);
            } else if ('${redirectBack}') {
              window.location.href = '${redirectBack}';
            }
          </script>
        </body></html>
      `, 200, { 'Content-Type': 'text/html' });
    }

    // GET /auth/accounts — List connected accounts
    if (path.includes('/auth/accounts')) {
      const docs = await db.listDocuments(DATABASE_ID, TOKENS_COLLECTION, [Query.limit(100)]);
      return res.json({ accounts: docs.documents.map(d => d.email) }, 200, cors);
    }

    // GET /emails — Fetch emails
    if (path === '/emails' || path.endsWith('/emails')) {
      const limit = parseInt(query.limit || body.limit || '20');
      const account = query.account || body.account;

      let tokenEmail = account;
      if (!tokenEmail) {
        const docs = await db.listDocuments(DATABASE_ID, TOKENS_COLLECTION, [Query.limit(1)]);
        if (!docs.documents.length) {
          return res.json({ error: 'Not authenticated', message: 'Connect a Gmail account first', authUrl: '/auth/google' }, 401, cors);
        }
        tokenEmail = docs.documents[0].email;
      }

      const tokenData = await getToken(tokenEmail);
      if (!tokenData) return res.json({ error: 'No token', message: `No token for ${tokenEmail}` }, 401, cors);

      const oauth2 = createOAuth2();
      oauth2.setCredentials(tokenData);

      if (tokenData.expiry_date && tokenData.expiry_date < Date.now()) {
        const { credentials } = await oauth2.refreshAccessToken();
        await saveToken(tokenEmail, { ...tokenData, ...credentials });
        oauth2.setCredentials(credentials);
      }

      const gmail = google.gmail({ version: 'v1', auth: oauth2 });
      const listResp = await gmail.users.messages.list({ userId: 'me', maxResults: limit, q: 'in:inbox' });
      const messages = listResp.data.messages || [];

      const emails = await Promise.all(
        messages.map(async (msg) => {
          const full = await gmail.users.messages.get({ userId: 'me', id: msg.id, format: 'full' });
          return parseGmailMessage(full.data);
        })
      );

      emails.sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime());
      return res.json(emails, 200, cors);
    }

    // POST /emails/send — Send email
    if (path.includes('/emails/send')) {
      const { to, subject, body: emailBody, account } = { ...body, ...query };
      if (!to || !subject || !emailBody) return res.json({ error: 'Missing: to, subject, body' }, 400, cors);

      let tokenEmail = account;
      if (!tokenEmail) {
        const docs = await db.listDocuments(DATABASE_ID, TOKENS_COLLECTION, [Query.limit(1)]);
        if (!docs.documents.length) return res.json({ error: 'Not authenticated' }, 401, cors);
        tokenEmail = docs.documents[0].email;
      }

      const tokenData = await getToken(tokenEmail);
      if (!tokenData) return res.json({ error: 'No token' }, 401, cors);

      const oauth2 = createOAuth2();
      oauth2.setCredentials(tokenData);
      const gmail = google.gmail({ version: 'v1', auth: oauth2 });

      const rawMessage = Buffer.from([`To: ${to}`, `Subject: ${subject}`, 'Content-Type: text/plain; charset=utf-8', '', emailBody].join('\n'))
        .toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

      await gmail.users.messages.send({ userId: 'me', requestBody: { raw: rawMessage } });
      return res.json({ success: true }, 200, cors);
    }

    // Health check / accounts at root with action param
    if (path === '/') {
      return res.json({ 
        status: 'ok', 
        message: 'Gmail API Function is running. Pass action in body: auth/accounts, emails, emails/send, auth/google',
        version: '2.0'
      }, 200, cors);
    }

    return res.json({ error: 'Not found', path }, 404, cors);

  } catch (e) {
    error('Function error: ' + e.message);
    return res.json({ error: 'Internal server error', message: e.message }, 500, cors);
  }
};
