/**
 * Email Service
 * Handles email API calls and data transformation
 */

import { Email, EmailCategory } from '@/types/email';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface EmailServiceConfig {
  apiUrl?: string;
  pollingInterval?: number;
}

class EmailService {
  private apiUrl: string;
  private pollingInterval: number;

  constructor(config: EmailServiceConfig = {}) {
    this.apiUrl = config.apiUrl || API_BASE_URL;
    this.pollingInterval = config.pollingInterval || 5000; // 5 seconds
  }

  /**
   * Fetch emails from API
   */
  async fetchEmails(account?: string): Promise<Email[]> {
    try {
      const url = new URL(`${this.apiUrl}/api/emails`);
      if (account) {
        url.searchParams.append('account', account);
      }
      
      const response = await fetch(url.toString(), {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch emails: ${response.statusText}`);
      }

      const data = await response.json();
      return this.normalizeEmails(data);
    } catch (error) {
      console.error('Error fetching emails:', error);
      throw error;
    }
  }

  /**
   * Normalize email data from API to our Email type
   */
  private normalizeEmails(data: any[]): Email[] {
    return data.map((email: any) => ({
      id: email.id,
      threadId: email.threadId || email.id,
      from: {
        name: email.from?.name || email.from_name || 'Unknown',
        email: email.from?.email || email.from_email || '',
      },
      to: Array.isArray(email.to) ? email.to : [email.to || ''],
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

  /**
   * Mark email as read
   */
  async markAsRead(emailId: string): Promise<void> {
    const response = await fetch(`${this.apiUrl}/api/emails/${emailId}/read`, {
      method: 'POST',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to mark email as read');
    }
  }

  /**
   * Toggle star on email
   */
  async toggleStar(emailId: string): Promise<void> {
    const response = await fetch(`${this.apiUrl}/api/emails/${emailId}/star`, {
      method: 'POST',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to toggle star');
    }
  }

  /**
   * Send email
   */
  async sendEmail(to: string, subject: string, body: string, account?: string): Promise<void> {
    const response = await fetch(`${this.apiUrl}/api/emails/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ to, subject, body, account }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || 'Failed to send email');
    }
  }

  /**
   * Get email by ID
   */
  async getEmail(emailId: string): Promise<Email> {
    const response = await fetch(`${this.apiUrl}/api/emails/${emailId}`, {
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch email');
    }

    const data = await response.json();
    return this.normalizeEmails([data])[0];
  }

  /**
   * Search emails
   */
  async searchEmails(query: string): Promise<Email[]> {
    const response = await fetch(
      `${this.apiUrl}/api/emails/search?q=${encodeURIComponent(query)}`,
      {
        credentials: 'include',
      }
    );

    if (!response.ok) {
      throw new Error('Failed to search emails');
    }

    const data = await response.json();
    return this.normalizeEmails(data);
  }

  /**
   * Connect Gmail account (OAuth)
   */
  async connectGmail(): Promise<string> {
    const response = await fetch(`${this.apiUrl}/api/auth/google`, {
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to initiate Gmail connection');
    }

    const data = await response.json();
    return data.auth_url;
  }

  /**
   * Get authenticated accounts
   */
  async getAccounts(): Promise<string[]> {
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

// Export singleton instance
export const emailService = new EmailService();

// Export class for custom instances
export default EmailService;
