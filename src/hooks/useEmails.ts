/**
 * React hook for fetching and managing emails.
 * Uses the Appwrite Gmail Function whenever Appwrite is configured and only
 * falls back to the legacy local backend for older local setups.
 */

import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { appwriteConfig } from '@/lib/appwrite';
import { fetchGmailEmails, sendGmailEmail } from '@/lib/gmailFunction';
import { Email } from '@/types/email';

const LEGACY_API_BASE_URL = import.meta.env.VITE_API_URL?.trim() || 'http://localhost:8000';
const LEGACY_WS_URL = import.meta.env.VITE_WS_URL?.trim() || 'ws://localhost:8000';
const USE_APPWRITE_GMAIL = appwriteConfig.isConfigured;

type RawEmail = {
  id?: string;
  threadId?: string;
  from?: { name?: string; email?: string };
  to?: string[] | string;
  subject?: string;
  snippet?: string;
  body?: string;
  receivedAt?: string | Date;
  isRead?: boolean;
  isStarred?: boolean;
  labels?: string[];
  category?: Email['category'];
  extractedData?: Email['extractedData'];
  suggestedActions?: Email['suggestedActions'];
};

function toEmail(email: RawEmail): Email {
  return {
    id: email.id || '',
    threadId: email.threadId || email.id || '',
    from: {
      name: email.from?.name || 'Unknown',
      email: email.from?.email || '',
    },
    to: Array.isArray(email.to) ? email.to : email.to ? [email.to] : [],
    subject: email.subject || '(No Subject)',
    snippet: email.snippet || '',
    body: email.body || '',
    receivedAt: new Date(email.receivedAt || Date.now()),
    isRead: email.isRead ?? false,
    isStarred: email.isStarred ?? false,
    labels: Array.isArray(email.labels) ? email.labels : [],
    category: email.category || 'unclassified',
    extractedData: email.extractedData,
    suggestedActions: email.suggestedActions,
  };
}

async function legacyFetch(path: string, init?: RequestInit) {
  const response = await fetch(`${LEGACY_API_BASE_URL}${path}`, {
    credentials: 'include',
    ...init,
  });

  if (!response.ok) {
    throw new Error(`Legacy email backend request failed: ${response.status}`);
  }

  return response;
}

/**
 * Check if the legacy local backend server is available.
 */
export async function isBackendAvailable(): Promise<boolean> {
  if (USE_APPWRITE_GMAIL) return false;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    const response = await fetch(`${LEGACY_API_BASE_URL}/api/auth/accounts`, {
      credentials: 'include',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    const contentType = response.headers.get('content-type') || '';
    return contentType.includes('application/json');
  } catch {
    return false;
  }
}

async function fetchEmails(activeAccount?: string): Promise<Email[]> {
  if (USE_APPWRITE_GMAIL) {
    try {
      const data = await fetchGmailEmails(activeAccount, 20);
      return Array.isArray(data) ? data.map(email => toEmail(email as RawEmail)) : [];
    } catch (error) {
      if (error instanceof Error && error.message === 'GMAIL_NOT_CONNECTED') {
        throw new Error('GMAIL_NOT_CONNECTED');
      }
      throw error;
    }
  }

  try {
    const url = new URL(`${LEGACY_API_BASE_URL}/api/emails`);
    url.searchParams.append('limit', '20');
    if (activeAccount) {
      url.searchParams.append('account', activeAccount);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    const response = await fetch(url.toString(), {
      credentials: 'include',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      throw new Error('BACKEND_OFFLINE');
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage =
        errorData.message || errorData.error || `HTTP ${response.status}: ${response.statusText}`;
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return Array.isArray(data) ? data.map(email => toEmail(email as RawEmail)) : [];
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('BACKEND_OFFLINE');
    }
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('BACKEND_OFFLINE');
    }
    throw error;
  }
}

async function markEmailAsRead(emailId: string): Promise<void> {
  if (USE_APPWRITE_GMAIL) {
    return;
  }

  await legacyFetch(`/api/emails/${emailId}/read`, { method: 'POST' });
}

async function toggleEmailStar(emailId: string): Promise<void> {
  if (USE_APPWRITE_GMAIL) {
    return;
  }

  await legacyFetch(`/api/emails/${emailId}/star`, { method: 'POST' });
}

async function sendEmail(params: {
  to: string;
  subject: string;
  body: string;
  account?: string;
}): Promise<void> {
  if (USE_APPWRITE_GMAIL) {
    await sendGmailEmail(params);
    return;
  }

  await legacyFetch('/api/emails/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });
}

export function useEmails(activeAccount?: string) {
  const queryClient = useQueryClient();

  const {
    data: emails = [],
    isLoading,
    error,
    refetch,
  } = useQuery<Email[]>({
    queryKey: ['emails', activeAccount],
    queryFn: () => fetchEmails(activeAccount),
    refetchInterval: query => {
      const message = query.state.error instanceof Error ? query.state.error.message : '';
      if (message === 'BACKEND_OFFLINE' || message === 'GMAIL_NOT_CONNECTED') {
        return false;
      }
      return USE_APPWRITE_GMAIL ? 30000 : 5000;
    },
    staleTime: USE_APPWRITE_GMAIL ? 20000 : 3000,
    retry: (failureCount, queryError) => {
      const message = queryError instanceof Error ? queryError.message : '';
      if (message === 'BACKEND_OFFLINE' || message === 'GMAIL_NOT_CONNECTED') {
        return false;
      }
      return failureCount < 2;
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: markEmailAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emails', activeAccount] });
    },
  });

  const toggleStarMutation = useMutation({
    mutationFn: toggleEmailStar,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emails', activeAccount] });
    },
  });

  const sendEmailMutation = useMutation({
    mutationFn: sendEmail,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emails', activeAccount] });
    },
  });

  const isBackendOffline = error instanceof Error && error.message === 'BACKEND_OFFLINE';
  const isGmailNotConnected = error instanceof Error && error.message === 'GMAIL_NOT_CONNECTED';

  return {
    emails,
    isLoading,
    error: isBackendOffline || isGmailNotConnected ? null : error,
    isBackendOffline,
    isGmailNotConnected,
    refetch,
    markAsRead: markAsReadMutation.mutate,
    toggleStar: toggleStarMutation.mutate,
    sendEmail: sendEmailMutation.mutate,
    isSending: sendEmailMutation.isPending,
  };
}

export function useEmailWebSocket(userId?: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId || USE_APPWRITE_GMAIL) return;

    const ws = new WebSocket(`${LEGACY_WS_URL}/ws/emails/${userId}`);

    ws.onopen = () => {
      console.log('WebSocket connected for email updates');
    };

    ws.onmessage = event => {
      const data = JSON.parse(event.data);

      if (data.type === 'new_emails') {
        queryClient.setQueryData<Email[]>(['emails'], (oldEmails = []) => {
          const newEmails = Array.isArray(data.emails)
            ? data.emails.map((email: RawEmail) => toEmail(email))
            : [];

          const existingIds = new Set(oldEmails.map(email => email.id));
          const uniqueNewEmails = newEmails.filter(email => !existingIds.has(email.id));

          return [...uniqueNewEmails, ...oldEmails];
        });
      }

      if (data.type === 'email_updated') {
        queryClient.setQueryData<Email[]>(['emails'], (oldEmails = []) =>
          oldEmails.map(email =>
            email.id === data.email.id ? toEmail(data.email as RawEmail) : email
          )
        );
      }
    };

    ws.onerror = wsError => {
      console.error('WebSocket error:', wsError);
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
    };

    return () => {
      ws.close();
    };
  }, [queryClient, userId]);
}
