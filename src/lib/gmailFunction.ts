/**
 * Gmail Appwrite Function client.
 * Uses the authenticated Appwrite Web SDK so function executions inherit the
 * current user's Appwrite session and Google identity.
 */

import { ExecutionMethod } from 'appwrite';
import { appwriteConfig, appwriteFunctions } from '@/lib/appwrite';

const FUNCTION_ID = 'gmail-api';

type FunctionMethod = 'GET' | 'POST';

type FunctionPayload = Record<string, unknown>;

async function callFunction<T>(
  action: string,
  method: FunctionMethod = 'GET',
  params: FunctionPayload = {}
): Promise<T> {
  if (!appwriteConfig.isConfigured) {
    throw new Error('Appwrite is not configured. Gmail sync requires VITE_APPWRITE_* values.');
  }

  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === 'undefined' || value === null) {
      continue;
    }
    query.set(key, String(value));
  }

  const execution = await appwriteFunctions.createExecution({
    functionId: FUNCTION_ID,
    async: false,
    xpath: `/${action}${query.size > 0 ? `?${query.toString()}` : ''}`,
    method: method === 'GET' ? ExecutionMethod.GET : ExecutionMethod.POST,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action,
      method,
      query: params,
      ...params,
    }),
  });

  const status = execution.responseStatusCode || 200;
  const responseBody = execution.responseBody || '{}';

  let payload: unknown;
  try {
    payload = JSON.parse(responseBody);
  } catch {
    payload = { message: responseBody };
  }

  if (status >= 400) {
    const message =
      payload && typeof payload === 'object' && 'message' in payload
        ? String(payload.message)
        : `Function call failed with status ${status}`;

    const error = new Error(message) as Error & { status?: number };
    error.status = status;
    throw error;
  }

  return payload as T;
}

/** Get list of Gmail identities connected to the current Appwrite user. */
export async function getGmailAccounts(): Promise<string[]> {
  const data = await callFunction<{ accounts?: string[] }>('auth/accounts', 'GET');
  return Array.isArray(data.accounts) ? data.accounts : [];
}

/** Fetch emails from Gmail via the Appwrite Function. */
export async function fetchGmailEmails(account?: string, limit = 20): Promise<unknown[]> {
  try {
    const data = await callFunction<unknown[]>('emails', 'GET', { account, limit });
    return Array.isArray(data) ? data : [];
  } catch (error) {
    if (error instanceof Error) {
      const status = (error as Error & { status?: number }).status;
      if (status === 401 || status === 403) {
        throw new Error('GMAIL_NOT_CONNECTED');
      }
    }
    throw error;
  }
}

/** Send email via the Appwrite Gmail function. */
export async function sendGmailEmail(params: {
  to: string;
  subject: string;
  body: string;
  account?: string;
}): Promise<void> {
  await callFunction('emails/send', 'POST', params);
}
