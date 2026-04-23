import { Account, Client } from 'node-appwrite';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

function decodeBase64(data) {
  if (!data) return '';
  const normalized = data.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(normalized, 'base64').toString('utf-8');
}

function decodeEmailBody(payload) {
  if (!payload) return '';

  if (payload.body?.data) {
    return decodeBase64(payload.body.data);
  }

  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        return decodeBase64(part.body.data);
      }
    }

    for (const part of payload.parts) {
      if (part.mimeType === 'text/html' && part.body?.data) {
        return decodeBase64(part.body.data);
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
  const getHeader = (name) =>
    headers.find(header => header.name.toLowerCase() === name.toLowerCase())?.value || '';

  const extractEmail = (value) => {
    const match = value.match(/<(.+)>/);
    return match ? match[1] : value.trim();
  };

  const extractName = (value) => {
    const match = value.match(/^(.+?)\s*</);
    return match ? match[1].replace(/"/g, '').trim() : '';
  };

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
    to: getHeader('To')
      .split(',')
      .map(extractEmail)
      .filter(Boolean),
    subject,
    snippet,
    body,
    receivedAt: new Date(parseInt(gmailMessage.internalDate || '0', 10)).toISOString(),
    isRead: !gmailMessage.labelIds?.includes('UNREAD'),
    isStarred: gmailMessage.labelIds?.includes('STARRED') || false,
    labels: gmailMessage.labelIds || [],
    category,
  };
}

function getCorsHeaders() {
  const frontendUrl = process.env.FRONTEND_URL || '*';
  return {
    'Access-Control-Allow-Origin': frontendUrl,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

function getBody(req) {
  try {
    return req.bodyJson || {};
  } catch {
    return {};
  }
}

function getNormalizedHeaders(req) {
  const headers = req.headers || {};
  return Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value])
  );
}

function getRequestDetails(req) {
  let path = req.path || '/';
  let method = req.method || 'GET';
  let query = req.query || {};
  let body = getBody(req);

  if ((path === '/' || path === '') && body.action) {
    path = `/${body.action}`;
    method = body.method || method;
    query = { ...query, ...(body.query || {}) };
  }

  return { path, method, query, body };
}

function getAuthErrorMessage(account) {
  if (!account) {
    return 'Connect a Google account through Appwrite to sync Gmail.';
  }

  return `Reconnect ${account} through Appwrite Google sign-in to restore Gmail sync.`;
}

function isGoogleAuthError(err) {
  const status = err?.code || err?.status || err?.response?.status;
  return status === 401 || status === 403;
}

async function loadGoogleContext(req) {
  const headers = getNormalizedHeaders(req);
  const endpoint =
    process.env.APPWRITE_ENDPOINT ||
    process.env.APPWRITE_FUNCTION_API_ENDPOINT ||
    'https://sgp.cloud.appwrite.io/v1';
  const projectId =
    process.env.APPWRITE_PROJECT_ID || process.env.APPWRITE_FUNCTION_PROJECT_ID || '';
  const userJwt = headers['x-appwrite-user-jwt'];

  if (!projectId || !userJwt) {
    const error = new Error('Appwrite user session not found. Please sign in with Google first.');
    error.statusCode = 401;
    throw error;
  }

  const client = new Client().setEndpoint(endpoint).setProject(projectId).setJWT(userJwt);
  const account = new Account(client);

  const [user, identities, currentSession] = await Promise.all([
    account.get(),
    account.listIdentities(),
    account.getSession('current').catch(() => null),
  ]);

  const googleIdentities = identities.identities.filter(
    identity =>
      identity.provider?.toLowerCase() === 'google' &&
      identity.providerEmail &&
      identity.providerAccessToken
  );

  return { account, user, currentSession, googleIdentities };
}

function selectGoogleIdentity(context, requestedEmail) {
  const requested = requestedEmail?.toLowerCase().trim();

  if (requested) {
    return (
      context.googleIdentities.find(
        identity => identity.providerEmail.toLowerCase() === requested
      ) || null
    );
  }

  if (context.currentSession?.provider?.toLowerCase() === 'google') {
    const byProviderUid = context.googleIdentities.find(
      identity => identity.providerUid === context.currentSession.providerUid
    );

    if (byProviderUid) {
      return byProviderUid;
    }
  }

  if (context.user?.email) {
    const byUserEmail = context.googleIdentities.find(
      identity => identity.providerEmail.toLowerCase() === context.user.email.toLowerCase()
    );

    if (byUserEmail) {
      return byUserEmail;
    }
  }

  return context.googleIdentities[0] || null;
}

async function refreshCurrentGoogleIdentity(context, targetIdentity) {
  if (!context.currentSession || context.currentSession.provider?.toLowerCase() !== 'google') {
    return null;
  }

  if (
    targetIdentity &&
    targetIdentity.providerUid !== context.currentSession.providerUid &&
    targetIdentity.providerEmail.toLowerCase() !== (context.user?.email || '').toLowerCase()
  ) {
    return null;
  }

  await context.account.updateSession('current');
  const refreshed = await context.account.listIdentities();
  return refreshed.identities.filter(
    identity =>
      identity.provider?.toLowerCase() === 'google' &&
      identity.providerEmail &&
      identity.providerAccessToken
  );
}

async function createGmailClient(context, requestedEmail) {
  let identity = selectGoogleIdentity(context, requestedEmail);

  if (!identity) {
    const error = new Error('Connect a Google account through Appwrite to sync Gmail.');
    error.statusCode = 401;
    throw error;
  }

  const oauth2 = new OAuth2Client();
  oauth2.setCredentials({
    access_token: identity.providerAccessToken,
  });

  let gmail = google.gmail({ version: 'v1', auth: oauth2 });

  try {
    await gmail.users.getProfile({ userId: 'me' });
    return { gmail, identity };
  } catch (err) {
    if (!isGoogleAuthError(err)) {
      throw err;
    }

    const refreshedIdentities = await refreshCurrentGoogleIdentity(context, identity);
    if (!refreshedIdentities) {
      const error = new Error(getAuthErrorMessage(identity.providerEmail));
      error.statusCode = 401;
      throw error;
    }

    const refreshedContext = {
      ...context,
      googleIdentities: refreshedIdentities,
    };
    identity = selectGoogleIdentity(refreshedContext, requestedEmail);

    if (!identity) {
      const error = new Error('Connect a Google account through Appwrite to sync Gmail.');
      error.statusCode = 401;
      throw error;
    }

    oauth2.setCredentials({
      access_token: identity.providerAccessToken,
    });
    gmail = google.gmail({ version: 'v1', auth: oauth2 });
    await gmail.users.getProfile({ userId: 'me' });
    return { gmail, identity };
  }
}

export default async ({ req, res, log, error }) => {
  const cors = getCorsHeaders();
  const { path, method, query, body } = getRequestDetails(req);

  log(`Gmail function: ${method} ${path}`);

  if (method === 'OPTIONS') {
    return res.send('', 204, cors);
  }

  try {
    if (path === '/' || path === '') {
      return res.json(
        {
          status: 'ok',
          message: 'Gmail API Function is running.',
          version: '3.0',
        },
        200,
        cors
      );
    }

    if (path.startsWith('/auth/google')) {
      return res.json(
        {
          error: 'Legacy endpoint removed',
          message:
            'Use Appwrite Google sign-in from the frontend. Gmail sync now uses Appwrite identities automatically.',
        },
        410,
        cors
      );
    }

    if (path.includes('/auth/accounts')) {
      const context = await loadGoogleContext(req);
      const accounts = Array.from(
        new Set(context.googleIdentities.map(identity => identity.providerEmail))
      ).sort((left, right) => left.localeCompare(right));

      return res.json({ accounts }, 200, cors);
    }

    if (path === '/emails' || path.endsWith('/emails')) {
      const limit = parseInt(query.limit || body.limit || '20', 10);
      const requestedAccount = query.account || body.account;
      const context = await loadGoogleContext(req);
      const { gmail } = await createGmailClient(context, requestedAccount);

      const listResp = await gmail.users.messages.list({
        userId: 'me',
        maxResults: Number.isNaN(limit) ? 20 : limit,
        q: 'in:inbox',
      });

      const messages = listResp.data.messages || [];
      const emails = await Promise.all(
        messages.map(async message => {
          const full = await gmail.users.messages.get({
            userId: 'me',
            id: message.id,
            format: 'full',
          });
          return parseGmailMessage(full.data);
        })
      );

      emails.sort(
        (left, right) =>
          new Date(right.receivedAt).getTime() - new Date(left.receivedAt).getTime()
      );

      return res.json(emails, 200, cors);
    }

    if (path.includes('/emails/send')) {
      const { to, subject, body: emailBody, account: requestedAccount } = {
        ...body,
        ...query,
      };

      if (!to || !subject || !emailBody) {
        return res.json({ error: 'Missing: to, subject, body' }, 400, cors);
      }

      const context = await loadGoogleContext(req);
      const { gmail } = await createGmailClient(context, requestedAccount);

      const rawMessage = Buffer.from(
        [
          `To: ${to}`,
          `Subject: ${subject}`,
          'Content-Type: text/plain; charset=utf-8',
          '',
          emailBody,
        ].join('\n')
      )
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      await gmail.users.messages.send({
        userId: 'me',
        requestBody: { raw: rawMessage },
      });

      return res.json({ success: true }, 200, cors);
    }

    return res.json({ error: 'Not found', path }, 404, cors);
  } catch (err) {
    const statusCode = err?.statusCode || err?.code || err?.status || err?.response?.status;
    const message = err instanceof Error ? err.message : 'Internal server error';

    if (statusCode && statusCode >= 400 && statusCode < 500) {
      error(`Function auth error: ${message}`);
      return res.json({ error: 'Request failed', message }, statusCode, cors);
    }

    error(`Function error: ${message}`);
    return res.json({ error: 'Internal server error', message }, 500, cors);
  }
};
