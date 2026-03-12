import React, { useState } from 'react';
import { Calendar, Clock, Users, Send, Check, X, Sparkles, Mail, Video, MapPin } from 'lucide-react';
import { MeetingRequest, TimeSlot, Email } from '@/types/email';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface MeetingSchedulerProps {
  meetingRequest: MeetingRequest | null;
  email?: Email;
  onSchedule: (slot: TimeSlot, message: string) => void;
  onDecline: () => void;
  onClose: () => void;
}

function formatSlotTime(slot: TimeSlot): string {
  const options: Intl.DateTimeFormatOptions = { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  };
  return slot.start.toLocaleString('en-US', options);
}

function generateReplyDraft(selectedSlots: TimeSlot[], senderName: string): string {
  if (selectedSlots.length === 0) return '';
  
  const slotStrings = selectedSlots.map(s => formatSlotTime(s)).join('\n• ');
  
  return `Hi ${senderName.split(' ')[0]},

Thanks for reaching out! I'd be happy to meet.

Here are some times that work for me:
• ${slotStrings}

Let me know which works best for you, and I'll send over a calendar invite.

Best regards`;
}

export function MeetingScheduler({ meetingRequest, email, onSchedule, onDecline, onClose }: MeetingSchedulerProps) {
  const [selectedSlots, setSelectedSlots] = useState<TimeSlot[]>([]);
  const [replyMessage, setReplyMessage] = useState('');
  const [step, setStep] = useState<'select' | 'compose' | 'confirm'>('select');
  
  // Generate suggested slots (in real app, this would come from calendar API)
  const suggestedSlots: TimeSlot[] = meetingRequest?.suggestedSlots || [
    { 
      start: new Date(new Date().setDate(new Date().getDate() + 1)), 
      end: new Date(new Date().setDate(new Date().getDate() + 1)), 
      score: 95 
    },
    { 
      start: new Date(new Date().setDate(new Date().getDate() + 2)), 
      end: new Date(new Date().setDate(new Date().getDate() + 2)), 
      score: 88 
    },
    { 
      start: new Date(new Date().setDate(new Date().getDate() + 3)), 
      end: new Date(new Date().setDate(new Date().getDate() + 3)), 
      score: 75 
    },
  ];
  
  const handleSlotToggle = (slot: TimeSlot) => {
    setSelectedSlots(prev => {
      const exists = prev.some(s => s.start.getTime() === slot.start.getTime());
      if (exists) {
        return prev.filter(s => s.start.getTime() !== slot.start.getTime());
      }
      return [...prev, slot].slice(0, 3); // Max 3 slots
    });
  };
  
  const handleContinue = () => {
    if (step === 'select' && selectedSlots.length > 0) {
      const draft = generateReplyDraft(selectedSlots, email?.from.name || 'there');
      setReplyMessage(draft);
      setStep('compose');
    } else if (step === 'compose') {
      setStep('confirm');
    }
  };
  
  const handleSchedule = () => {
    if (selectedSlots.length > 0) {
      onSchedule(selectedSlots[0], replyMessage);
    }
  };
  
  if (!meetingRequest && !email) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Meeting to Schedule</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Select a meeting request email to start scheduling.
        </p>
        <Button variant="outline" onClick={onClose}>Close</Button>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div>
              <h2 className="font-semibold">AI Meeting Scheduler</h2>
              <p className="text-xs text-muted-foreground">Powered by ThinkDesk AI</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Progress Steps */}
        <div className="flex items-center gap-2 mt-4">
          {['Select Times', 'Compose Reply', 'Confirm'].map((label, index) => {
            const stepNum = index + 1;
            const currentStep = step === 'select' ? 1 : step === 'compose' ? 2 : 3;
            const isActive = stepNum === currentStep;
            const isComplete = stepNum < currentStep;
            
            return (
              <React.Fragment key={label}>
                <div className={cn(
                  'flex items-center gap-2 text-sm',
                  isActive && 'text-primary font-medium',
                  isComplete && 'text-green-500',
                  !isActive && !isComplete && 'text-muted-foreground'
                )}>
                  <div className={cn(
                    'w-6 h-6 rounded-full flex items-center justify-center text-xs',
                    isActive && 'bg-primary text-primary-foreground',
                    isComplete && 'bg-green-500 text-white',
                    !isActive && !isComplete && 'bg-muted'
                  )}>
                    {isComplete ? <Check className="h-3 w-3" /> : stepNum}
                  </div>
                  <span className="hidden sm:inline">{label}</span>
                </div>
                {index < 2 && (
                  <div className={cn(
                    'flex-1 h-0.5 rounded',
                    isComplete ? 'bg-green-500' : 'bg-muted'
                  )} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
      
      {/* Content */}
      <ScrollArea className="flex-1 p-4">
        {/* Original Email Context */}
        {email && (
          <Card className="mb-4 bg-muted/30">
            <CardHeader className="p-3">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm">Meeting Request</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="text-sm">
                <span className="font-medium">{email.from.name}</span>
                <span className="text-muted-foreground"> • {email.subject}</span>
              </div>
            </CardContent>
          </Card>
        )}
        
        {step === 'select' && (
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">AI-Suggested Time Slots</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Based on your calendar availability and preferences. Select up to 3 options.
              </p>
            </div>
            
            <div className="space-y-2">
              {suggestedSlots.map((slot, index) => {
                const isSelected = selectedSlots.some(s => s.start.getTime() === slot.start.getTime());
                return (
                  <Card
                    key={index}
                    className={cn(
                      'cursor-pointer transition-all',
                      isSelected 
                        ? 'border-primary bg-primary/5' 
                        : 'hover:border-primary/50'
                    )}
                    onClick={() => handleSlotToggle(slot)}
                  >
                    <CardContent className="p-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          'w-8 h-8 rounded-full flex items-center justify-center',
                          isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'
                        )}>
                          {isSelected ? <Check className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                        </div>
                        <div>
                          <div className="font-medium text-sm">{formatSlotTime(slot)}</div>
                          <div className="text-xs text-muted-foreground">
                            {meetingRequest?.duration || 30} min • {slot.score}% availability match
                          </div>
                        </div>
                      </div>
                      <Badge variant={slot.score >= 90 ? 'default' : 'secondary'} className="text-xs">
                        {slot.score >= 90 ? 'Best' : slot.score >= 80 ? 'Good' : 'Available'}
                      </Badge>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
        
        {step === 'compose' && (
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">Draft Reply</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Review and customize your response before sending.
              </p>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium mb-1.5 block">To</label>
                <Input value={email?.from.email || ''} readOnly className="bg-muted" />
              </div>
              
              <div>
                <label className="text-sm font-medium mb-1.5 block">Subject</label>
                <Input value={`Re: ${email?.subject || ''}`} readOnly className="bg-muted" />
              </div>
              
              <div>
                <label className="text-sm font-medium mb-1.5 block">Message</label>
                <Textarea
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  rows={10}
                  className="resize-none"
                />
              </div>
            </div>
          </div>
        )}
        
        {step === 'confirm' && (
          <div className="space-y-4">
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                <Check className="h-8 w-8 text-green-500" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Ready to Send</h3>
              <p className="text-sm text-muted-foreground">
                Your reply will be sent and a calendar event will be created.
              </p>
            </div>
            
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">To:</span>
                  <span>{email?.from.email}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Proposed times:</span>
                  <span>{selectedSlots.length} options</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Duration:</span>
                  <span>{meetingRequest?.duration || 30} minutes</span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </ScrollArea>
      
      {/* Footer Actions */}
      <div className="p-4 border-t border-border flex items-center justify-between">
        <Button variant="ghost" onClick={step === 'select' ? onClose : () => setStep(step === 'compose' ? 'select' : 'compose')}>
          {step === 'select' ? 'Cancel' : 'Back'}
        </Button>
        
        <div className="flex items-center gap-2">
          {step === 'confirm' ? (
            <>
              <Button variant="outline" onClick={onDecline} className="gap-2">
                <X className="h-4 w-4" />
                Decline
              </Button>
              <Button onClick={handleSchedule} className="gap-2">
                <Send className="h-4 w-4" />
                Send & Schedule
              </Button>
            </>
          ) : (
            <Button 
              onClick={handleContinue} 
              disabled={step === 'select' && selectedSlots.length === 0}
              className="gap-2"
            >
              Continue
              <Check className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
