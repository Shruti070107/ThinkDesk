/**
 * EmailInbox component integrated with real email API
 * This is an example of how to update the existing EmailInbox to use real data
 */

import React, { useState, useEffect } from 'react';
import { useEmails, useEmailWebSocket } from '@/hooks/useEmails';
import { EmailInbox } from './EmailInbox';
import { Button } from '@/components/ui/button';
import { Mail, Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

/**
 * Wrapper component that fetches real emails and passes to EmailInbox
 */
export function EmailInboxWithRealData() {
  const { emails, isLoading, error, markAsRead, toggleStar } = useEmails();
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null);
  
  // Set up WebSocket for real-time updates
  // Replace with actual user ID from auth context
  const userId = 'user-123'; // Get from auth context
  useEmailWebSocket(userId);
  
  // Mark email as read when selected
  useEffect(() => {
    if (selectedEmail) {
      markAsRead(selectedEmail);
    }
  }, [selectedEmail, markAsRead]);
  
  const handleEmailAction = (emailId: string, actionType: string) => {
    switch (actionType) {
      case 'star':
        toggleStar(emailId);
        break;
      case 'read':
        markAsRead(emailId);
        break;
      default:
        console.log('Action:', actionType, 'for email:', emailId);
    }
  };
  
  if (isLoading && emails.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-primary" />
          <p className="text-sm text-muted-foreground">Loading emails...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load emails. Please check your connection and try again.
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  const selectedEmailData = emails.find(e => e.id === selectedEmail) || null;
  
  return (
    <EmailInbox
      emails={emails}
      selectedEmail={selectedEmailData}
      onSelectEmail={(email) => setSelectedEmail(email.id)}
      onActionClick={(email, actionType) => handleEmailAction(email.id, actionType)}
    />
  );
}

/**
 * Alternative: Update existing WorkspaceLayout to use real emails
 * 
 * In WorkspaceLayout.tsx, replace:
 * 
 * import { dummyEmails } from '@/data/emailData';
 * 
 * With:
 * 
 * import { useEmails } from '@/hooks/useEmails';
 * 
 * And in the component:
 * 
 * const { emails, isLoading } = useEmails();
 * 
 * Then pass `emails` instead of `dummyEmails` to components
 */
