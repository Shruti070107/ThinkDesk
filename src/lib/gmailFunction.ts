/**
 * Gmail API Appwrite Function client
 * Calls the deployed Appwrite Function for all Gmail operations.
 * Uses body.action routing for Appwrite 1.9.x compatibility.
 */

const APPWRITE_ENDPOINT = import.meta.env.VITE_APPWRITE_ENDPOINT?.trim() || 'https://sgp.cloud.appwrite.io/v1';
const PROJECT_ID = import.meta.env.VITE_APPWRITE_PROJECT_ID || '69cee1350014aabd8f51';
const FUNCTION_ID = 'gmail-api';
const EXEC_URL = `${APPWRITE_ENDPOINT}/functions/${FUNCTION_ID}/executions`;

/** Call the Appwrite Gmail function with a specific action */
async function callFunction(
  action: string,
  method: 'GET' | 'POST' = 'GET',
  params?: Record<string, unknown>
): Promise<Response> {
  // Build the request body — use body.action for routing (Appwrite 1.9.x compat)
  const payload: Record<string, unknown> = {
    path: `/${action}`,   // Try req.path (works in some versions)
    method,
    action,               // Fallback: read in body.action
    ...params,
  };

  const response = await fetch(EXEC_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Appwrite-Project': PROJECT_ID,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Function call failed: ${response.status} - ${text}`);
  }

  const execution = await response.json();

  // Parse the function's response body
  const functionResponseBody = execution.responseBody || '{}';
  const functionStatusCode = execution.responseStatusCode || 200;

  return new Response(functionResponseBody, {
    status: functionStatusCode,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Get list of connected Gmail accounts */
export async function getGmailAccounts(): Promise<string[]> {
  const response = await callFunction('auth/accounts', 'GET');
  const data = await response.json();
  return data.accounts || [];
}

/** Get the Gmail OAuth URL from the Appwrite function */
export async function getGmailAuthUrl(redirectUrl?: string): Promise<string> {
  const response = await callFunction('auth/google', 'GET', { redirect: redirectUrl });
  const data = await response.json();
  if (data.authUrl) return data.authUrl;
  throw new Error('Could not get OAuth URL from function');
}

/** Fetch emails from Gmail via Appwrite Function */
export async function fetchGmailEmails(account?: string, limit = 20): Promise<unknown[]> {
  const params: Record<string, unknown> = { limit };
  if (account) params.account = account;

  const response = await callFunction('emails', 'GET', params);
  
  if (!response.ok) {
    let error: Record<string, string> = {};
    try { error = await response.json(); } catch { /* ignore */ }
    if (response.status === 401) {
      throw new Error('GMAIL_NOT_CONNECTED');
    }
    throw new Error(error.message || `Failed to fetch emails: ${response.status}`);
  }
  
  return response.json();
}

/** Send email via Appwrite Function */
export async function sendGmailEmail(params: {
  to: string;
  subject: string;
  body: string;
  account?: string;
}): Promise<void> {
  const response = await callFunction('emails/send', 'POST', params);
  if (!response.ok) {
    throw new Error('Failed to send email');
  }
}
