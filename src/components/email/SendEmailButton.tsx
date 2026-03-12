/**
 * Simple component to send an email
 * Can be used anywhere in the app
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Mail, Loader2, CheckCircle2 } from 'lucide-react';
import { emailService } from '@/services/emailService';
import { toast } from 'sonner';

interface SendEmailButtonProps {
  to: string;
  subject?: string;
  body?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
}

export function SendEmailButton({ 
  to, 
  subject = 'hii', 
  body = 'hii',
  variant = 'default',
  size = 'default'
}: SendEmailButtonProps) {
  const [isSending, setIsSending] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleSend = async () => {
    if (!to) {
      toast.error('Please provide a recipient email address');
      return;
    }

    setIsSending(true);
    setIsSent(false);

    try {
      await emailService.sendEmail(to, subject, body);
      setIsSent(true);
      toast.success(`Email sent to ${to}`);
      
      // Reset after 3 seconds
      setTimeout(() => {
        setIsSent(false);
      }, 3000);
    } catch (error) {
      console.error('Error sending email:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to send email');
    } finally {
      setIsSending(false);
    }
  };

  if (isSent) {
    return (
      <Button variant={variant} size={size} disabled>
        <CheckCircle2 className="h-4 w-4 mr-2" />
        Sent!
      </Button>
    );
  }

  return (
    <Button 
      variant={variant} 
      size={size}
      onClick={handleSend}
      disabled={isSending}
    >
      {isSending ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Sending...
        </>
      ) : (
        <>
          <Mail className="h-4 w-4 mr-2" />
          Send Email
        </>
      )}
    </Button>
  );
}

/**
 * Quick send email function (can be called from anywhere)
 */
export async function quickSendEmail(to: string, subject: string = 'hii', body: string = 'hii') {
  try {
    await emailService.sendEmail(to, subject, body);
    toast.success(`Email sent to ${to}`);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    toast.error(error instanceof Error ? error.message : 'Failed to send email');
    return false;
  }
}
