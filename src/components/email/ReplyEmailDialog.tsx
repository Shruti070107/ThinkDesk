import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Email } from '@/types/email';
import { emailService } from '@/services/emailService';
import { toast } from 'sonner';
import { Loader2, Mail } from 'lucide-react';

interface ReplyEmailDialogProps {
  email: Email | null;
  activeAccount?: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ReplyEmailDialog({ email, activeAccount, onClose, onSuccess }: ReplyEmailDialogProps) {
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (email) {
      setTo(email.from.email);
      setSubject(email.subject.toLowerCase().startsWith('re:') ? email.subject : `Re: ${email.subject}`);
      setBody(`\n\n\n--- On ${email.receivedAt.toLocaleString()}, ${email.from.name} wrote: ---\n> ${email.snippet}`);
    }
  }, [email]);

  const handleSend = async () => {
    if (!to || !subject || !body) {
      toast.error('Please fill out all fields');
      return;
    }

    setIsSending(true);
    try {
      await emailService.sendEmail(to, subject, body, activeAccount);
      toast.success('Reply sent successfully!');
      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to send reply:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to send reply');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={!!email} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Reply to Email
          </DialogTitle>
          <DialogDescription>
            Compose your reply below. It will be sent via your configured email provider.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="to" className="text-right">
              To
            </Label>
            <Input
              id="to"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="col-span-3"
              disabled
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="subject" className="text-right">
              Subject
            </Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="body" className="text-right pt-2">
              Message
            </Label>
            <Textarea
              id="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="col-span-3 min-h-[200px]"
              placeholder="Type your reply here..."
              autoFocus
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSending}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={isSending || !body.trim()}>
            {isSending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Send Reply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
