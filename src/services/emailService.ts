/**
 * Email Service
 * Uses the Appwrite Gmail Function whenever Appwrite is configured and only
 * falls back to the legacy local backend for older local setups.
 */

import { appwriteConfig } from '@/lib/appwrite';
import { fetchGmailEmails, getGmailAccounts, sendGmailEmail } from '@/lib/gmailFunction';
import { Email, EmailCategory } from '@/types/email';

const LEGACY_API_BASE_URL = import.meta.env.VITE_API_URL?.trim() || 'http://localhost:8000';
const USE_APPWRITE_GMAIL = appwriteConfig.isConfigured;

export interface EmailServiceConfig {
  apiUrl?: string;
  pollingInterval?: number;
}

type NormalizedEmailInput = {
  id?: string;
  threadId?: string;
  from?: { name?: string; email?: string };
  from_name?: string;
  from_email?: string;
  to?: string[] | string;
  subject?: string;
  snippet?: string;
  body?: string;
  receivedAt?: string | Date;
  received_at?: string | Date;
  isRead?: boolean;
  is_read?: boolean;
  isStarred?: boolean;
  is_starred?: boolean;
  labels?: string[];
  category?: EmailCategory;
  extractedData?: Email['extractedData'];
  extracted_data?: Email['extractedData'];
  suggestedActions?: Email['suggestedActions'];
  suggested_actions?: Email['suggestedActions'];
};

class EmailService {
  private apiUrl: string;
  private pollingInterval: number;

  constructor(config: EmailServiceConfig = {}) {
    this.apiUrl = config.apiUrl || LEGACY_API_BASE_URL;
    this.pollingInterval = config.pollingInterval || 5000;
  }

  async fetchEmails(account?: string): Promise<Email[]> {
    if (USE_APPWRITE_GMAIL) {
      const data = await fetchGmailEmails(account, 20);
      return this.normalizeEmails(Array.isArray(data) ? (data as NormalizedEmailInput[]) : []);
    }

    try {
      const url = new URL(`${this.apiUrl}/api/emails`);
      if (account) url.searchParams.append('account', account);
      const response = await fetch(url.toString(), {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error(`Failed to fetch emails: ${response.statusText}`);
      const data = await response.json();
      return this.normalizeEmails(data as NormalizedEmailInput[]);
    } catch (error) {
      console.error('Error fetching emails:', error);
      throw error;
    }
  }

  private normalizeEmails(data: NormalizedEmailInput[]): Email[] {
    return data.map(email => ({
      id: email.id || '',
      threadId: email.threadId || email.id || '',
      from: {
        name: email.from?.name || email.from_name || 'Unknown',
        email: email.from?.email || email.from_email || '',
      },
      to: Array.isArray(email.to) ? email.to : email.to ? [email.to] : [],
      subject: email.subject || '(No Subject)',
      snippet: email.snippet || email.body?.substring(0, 100) || '',
      body: email.body || '',
      receivedAt: new Date(email.receivedAt || email.received_at || Date.now()),
      isRead: email.isRead ?? email.is_read ?? false,
      isStarred: email.isStarred ?? email.is_starred ?? false,
      labels: Array.isArray(email.labels) ? email.labels : [],
      category: (email.category || 'unclassified') as EmailCategory,
      extractedData: email.extractedData || email.extracted_data,
      suggestedActions: email.suggestedActions || email.suggested_actions,
    }));
  }

  async markAsRead(emailId: string): Promise<void> {
    if (USE_APPWRITE_GMAIL) {
      return;
    }

    const response = await fetch(`${this.apiUrl}/api/emails/${emailId}/read`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to mark email as read');
  }

  async toggleStar(emailId: string): Promise<void> {
    if (USE_APPWRITE_GMAIL) {
      return;
    }

    const response = await fetch(`${this.apiUrl}/api/emails/${emailId}/star`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to toggle star');
  }

  async sendEmail(to: string, subject: string, body: string, account?: string): Promise<void> {
    if (USE_APPWRITE_GMAIL) {
      await sendGmailEmail({ to, subject, body, account });
      return;
    }

    const response = await fetch(`${this.apiUrl}/api/emails/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ to, subject, body, account }),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || 'Failed to send email');
    }
  }

  async getEmail(emailId: string): Promise<Email> {
    if (USE_APPWRITE_GMAIL) {
      const emails = await this.fetchEmails();
      const email = emails.find(item => item.id === emailId);
      if (!email) {
        throw new Error('Email not found');
      }
      return email;
    }

    const response = await fetch(`${this.apiUrl}/api/emails/${emailId}`, {
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to fetch email');
    const data = await response.json();
    return this.normalizeEmails([data as NormalizedEmailInput])[0];
  }

  async searchEmails(query: string): Promise<Email[]> {
    if (USE_APPWRITE_GMAIL) {
      const emails = await this.fetchEmails();
      const normalizedQuery = query.toLowerCase();
      return emails.filter(email =>
        [email.subject, email.snippet, email.body, email.from.name, email.from.email]
          .join(' ')
          .toLowerCase()
          .includes(normalizedQuery)
      );
    }

    const response = await fetch(
      `${this.apiUrl}/api/emails/search?q=${encodeURIComponent(query)}`,
      { credentials: 'include' }
    );
    if (!response.ok) throw new Error('Failed to search emails');
    const data = await response.json();
    return this.normalizeEmails(data as NormalizedEmailInput[]);
  }

  async getAccounts(): Promise<string[]> {
    if (USE_APPWRITE_GMAIL) {
      try {
        return await getGmailAccounts();
      } catch {
        return [];
      }
    }

    try {
      const response = await fetch(`${this.apiUrl}/api/auth/accounts`, {
        credentials: 'include',
      });
      if (!response.ok) return [];
      const data = await response.json();
      return data.accounts || [];
    } catch {
      return [];
    }
  }
}

export const emailService = new EmailService();

export default EmailService;
