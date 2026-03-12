/**
 * React Hook for fetching and managing emails
 * Integrates with backend API and provides real-time updates
 */

import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Email } from '@/types/email';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * Fetch emails from backend API
 */
async function fetchEmails(activeAccount?: string): Promise<Email[]> {
  try {
    const url = new URL(`${API_BASE_URL}/api/emails`);
    url.searchParams.append('limit', '10');
    if (activeAccount) {
      url.searchParams.append('account', activeAccount);
    }

    const response = await fetch(url.toString(), {
      credentials: 'include', // Include cookies for auth
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.message || errorData.error || `HTTP ${response.status}: ${response.statusText}`;
      throw new Error(errorMessage);
    }
    
    const data = await response.json();
    
    // Convert date strings to Date objects
    return data.map((email: any) => ({
      ...email,
      receivedAt: new Date(email.receivedAt),
    }));
  } catch (error) {
    // Handle network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Cannot connect to backend server. Make sure the backend is running on port 8000.');
    }
    throw error;
  }
}

/**
 * Mark email as read
 */
async function markEmailAsRead(emailId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/emails/${emailId}/read`, {
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
async function toggleEmailStar(emailId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/emails/${emailId}/star`, {
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
async function sendEmail(params: { to: string; subject: string; body: string; account?: string }): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/emails/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(params),
  });
  
  if (!response.ok) {
    throw new Error('Failed to send email');
  }
}

/**
 * Hook to fetch and manage emails
 */
export function useEmails(activeAccount?: string) {
  const queryClient = useQueryClient();
  
  // Fetch emails with automatic refetching
  const {
    data: emails = [],
    isLoading,
    error,
    refetch,
  } = useQuery<Email[]>({
    queryKey: ['emails', activeAccount],
    queryFn: () => fetchEmails(activeAccount),
    refetchInterval: 5000, // Refetch every 5 seconds
    staleTime: 3000, // Consider data stale after 3 seconds
  });
  
  // Mark email as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: markEmailAsRead,
    onSuccess: () => {
      // Invalidate and refetch emails
      queryClient.invalidateQueries({ queryKey: ['emails', activeAccount] });
    },
  });
  
  // Toggle star mutation
  const toggleStarMutation = useMutation({
    mutationFn: toggleEmailStar,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emails', activeAccount] });
    },
  });
  
  // Send email mutation
  const sendEmailMutation = useMutation({
    mutationFn: sendEmail,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emails', activeAccount] });
    },
  });
  
  return {
    emails,
    isLoading,
    error,
    refetch,
    markAsRead: markAsReadMutation.mutate,
    toggleStar: toggleStarMutation.mutate,
    sendEmail: sendEmailMutation.mutate,
    isSending: sendEmailMutation.isPending,
  };
}

/**
 * Hook for real-time email updates via WebSocket
 */
export function useEmailWebSocket(userId?: string) {
  const queryClient = useQueryClient();
  
  // Set up WebSocket connection
  useEffect(() => {
    if (!userId) return;
    
    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8000';
    const ws = new WebSocket(`${wsUrl}/ws/emails/${userId}`);
    
    ws.onopen = () => {
      console.log('WebSocket connected for email updates');
    };
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'new_emails') {
        // Update React Query cache with new emails
        queryClient.setQueryData<Email[]>(['emails'], (oldEmails = []) => {
          const newEmails = data.emails.map((email: any) => ({
            ...email,
            receivedAt: new Date(email.receivedAt),
          }));
          
          // Merge new emails, avoiding duplicates
          const existingIds = new Set(oldEmails.map(e => e.id));
          const uniqueNewEmails = newEmails.filter((e: Email) => !existingIds.has(e.id));
          
          return [...uniqueNewEmails, ...oldEmails];
        });
      }
      
      if (data.type === 'email_updated') {
        // Update specific email in cache
        queryClient.setQueryData<Email[]>(['emails'], (oldEmails = []) => {
          return oldEmails.map(email => 
            email.id === data.email.id 
              ? { ...data.email, receivedAt: new Date(data.email.receivedAt) }
              : email
          );
        });
      }
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    ws.onclose = () => {
      console.log('WebSocket disconnected, reconnecting...');
      // Reconnect after 3 seconds
      setTimeout(() => {
        // Reconnect logic would go here
      }, 3000);
    };
    
    return () => {
      ws.close();
    };
  }, [userId, queryClient]);
}
