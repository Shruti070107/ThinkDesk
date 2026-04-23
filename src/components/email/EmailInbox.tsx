import React, { useState, useEffect } from 'react';
import { Mail, Star, Clock, AlertTriangle, Users, ArrowRight, CheckCircle2, Calendar, ListTodo, Reply, Tag, Loader2, RefreshCw, AlertCircle, ServerOff } from 'lucide-react';
import { Email, EmailCategory } from '@/types/email';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface EmailInboxProps {
  emails: Email[];
  selectedEmail: Email | null;
  onSelectEmail: (email: Email) => void;
  onActionClick: (email: Email, actionType: string) => void;
  isLoading?: boolean;
  error?: Error | null;
  isBackendOffline?: boolean;
  isGmailNotConnected?: boolean;
  onRefresh?: () => void | Promise<void>;
  
  accounts?: string[];
  activeAccount?: string;
  onChangeAccount?: (account: string) => void;
  onAddAccount?: () => void;
}

const categoryConfig: Record<EmailCategory, { icon: React.ElementType; color: string; label: string }> = {
  meeting: { icon: Users, color: 'text-blue-500 bg-blue-500/10', label: 'Meeting' },
  task: { icon: ListTodo, color: 'text-purple-500 bg-purple-500/10', label: 'Task' },
  deadline: { icon: AlertTriangle, color: 'text-red-500 bg-red-500/10', label: 'Deadline' },
  'follow-up': { icon: Clock, color: 'text-orange-500 bg-orange-500/10', label: 'Follow-up' },
  'low-priority': { icon: Mail, color: 'text-muted-foreground bg-muted', label: 'Low Priority' },
  unclassified: { icon: Mail, color: 'text-muted-foreground bg-muted', label: 'Inbox' },
};

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  return `${diffDays}d ago`;
}

function EmailListItem({ 
  email, 
  isSelected, 
  onClick 
}: { 
  email: Email; 
  isSelected: boolean; 
  onClick: () => void;
}) {
  const CategoryIcon = categoryConfig[email.category].icon;
  
  return (
    <div
      onClick={onClick}
      className={cn(
        'group px-4 py-3 border-b border-border cursor-pointer transition-all',
        'hover:bg-accent/50',
        isSelected && 'bg-accent border-l-2 border-l-primary',
        !email.isRead && 'bg-primary/5'
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-1">
          <div className={cn(
            'w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold',
            'bg-gradient-to-br from-violet-500 to-indigo-500 text-white'
          )}>
            {email.from.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <span className={cn(
              'text-sm truncate',
              !email.isRead && 'font-semibold'
            )}>
              {email.from.name}
            </span>
            <span className="text-xs text-muted-foreground flex-shrink-0">
              {formatRelativeTime(email.receivedAt)}
            </span>
          </div>
          
          <div className={cn(
            'text-sm truncate mb-1',
            !email.isRead ? 'font-medium text-foreground' : 'text-muted-foreground'
          )}>
            {email.subject}
          </div>
          
          <div className="text-xs text-muted-foreground truncate mb-2">
            {email.snippet}
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className={cn('text-xs gap-1', categoryConfig[email.category].color)}>
              <CategoryIcon className="h-3 w-3" />
              {categoryConfig[email.category].label}
            </Badge>
            {email.isStarred && <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />}
            {email.extractedData?.priority === 'high' && (
              <Badge variant="destructive" className="text-xs">Urgent</Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function EmailDetail({ 
  email, 
  onActionClick 
}: { 
  email: Email; 
  onActionClick: (actionType: string) => void;
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h2 className="text-lg font-semibold mb-1">{email.subject}</h2>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{email.from.name}</span>
              <span>&lt;{email.from.email}&gt;</span>
            </div>
          </div>
          <span className="text-sm text-muted-foreground">
            {email.receivedAt.toLocaleString()}
          </span>
        </div>
        
        {/* AI Insights */}
        {email.extractedData && (
          <div className="bg-gradient-to-r from-violet-500/10 to-indigo-500/10 rounded-lg p-3 border border-violet-500/20 mb-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-5 h-5 rounded bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center">
                <Tag className="h-3 w-3 text-white" />
              </div>
              <span className="text-sm font-medium">AI Insights</span>
            </div>
            
            {/* Insights List */}
            {email.extractedData.insights && email.extractedData.insights.length > 0 && (
              <div className="space-y-1 mb-2">
                {email.extractedData.insights.map((insight, idx) => (
                  <div key={idx} className="text-xs text-muted-foreground">
                    {insight}
                  </div>
                ))}
              </div>
            )}
            
            {/* Extracted Data */}
            <div className="grid grid-cols-2 gap-2 text-xs mt-2 pt-2 border-t border-violet-500/20">
              {email.extractedData.intent && (
                <div>
                  <span className="text-muted-foreground">Intent:</span>{' '}
                  <span className="font-medium">{email.extractedData.intent}</span>
                </div>
              )}
              {email.extractedData.dates && email.extractedData.dates.length > 0 && (
                <div>
                  <span className="text-muted-foreground">Dates:</span>{' '}
                  <span className="font-medium">{email.extractedData.dates.slice(0, 2).join(', ')}</span>
                </div>
              )}
              {email.extractedData.people && email.extractedData.people.length > 0 && (
                <div>
                  <span className="text-muted-foreground">People:</span>{' '}
                  <span className="font-medium">{email.extractedData.people.slice(0, 2).join(', ')}</span>
                </div>
              )}
              {email.extractedData.priority && (
                <div>
                  <span className="text-muted-foreground">Priority:</span>{' '}
                  <Badge variant={email.extractedData.priority === 'high' ? 'destructive' : 'secondary'} className="text-xs ml-1">
                    {email.extractedData.priority}
                  </Badge>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Body */}
      <ScrollArea className="flex-1 p-4">
        <div className="whitespace-pre-wrap text-sm leading-relaxed">
          {email.body}
        </div>
      </ScrollArea>
      
      {/* Actions */}
      {email.suggestedActions && email.suggestedActions.length > 0 && (
        <div className="p-4 border-t border-border bg-muted/30">
          <div className="text-xs font-medium text-muted-foreground mb-3">SUGGESTED ACTIONS</div>
          <div className="flex flex-wrap gap-2">
            {email.suggestedActions.map(action => (
              <Button
                key={action.id}
                variant="outline"
                size="sm"
                onClick={() => onActionClick(action.type)}
                className="gap-2"
              >
                {action.type === 'schedule-meeting' && <Calendar className="h-4 w-4" />}
                {action.type === 'create-task' && <ListTodo className="h-4 w-4" />}
                {action.type === 'reply' && <Reply className="h-4 w-4" />}
                {action.type === 'follow-up' && <Clock className="h-4 w-4" />}
                {action.label}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function EmailInbox({ 
  emails, 
  selectedEmail, 
  onSelectEmail, 
  onActionClick, 
  isLoading = false, 
  error, 
  isBackendOffline = false,
  isGmailNotConnected = false,
  onRefresh,
  accounts = [],
  activeAccount,
  onChangeAccount,
  onAddAccount
}: EmailInboxProps) {
  const [filter, setFilter] = useState<EmailCategory | 'all'>('all');
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  
  // Update last refresh time when emails change
  useEffect(() => {
    if (!isLoading && emails.length > 0) {
      setLastRefresh(new Date());
    }
  }, [emails, isLoading]);
  
  const filteredEmails = filter === 'all' 
    ? emails 
    : emails.filter(e => e.category === filter);
  
  // Sort emails by receivedAt date (newest first) to ensure correct order
  const sortedEmails = [...filteredEmails].sort((a, b) => {
    const dateA = a.receivedAt instanceof Date ? a.receivedAt.getTime() : new Date(a.receivedAt).getTime();
    const dateB = b.receivedAt instanceof Date ? b.receivedAt.getTime() : new Date(b.receivedAt).getTime();
    return dateB - dateA; // Descending order (newest first)
  });
  
  const unreadCount = emails.filter(e => !e.isRead).length;
  const meetingCount = emails.filter(e => e.category === 'meeting').length;
  const urgentCount = emails.filter(e => e.extractedData?.priority === 'high').length;
  
  return (
    <div className="flex h-full bg-background">
      {/* Email List */}
      <div className="w-96 border-r border-border flex flex-col">
        {/* Filter Bar */}
        <div className="p-3 border-b border-border">
          <div className="flex items-center gap-2 mb-3">
            <Mail className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Inbox</h2>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="ml-auto">{unreadCount} new</Badge>
            )}
            {isLoading && (
              <Loader2 className="h-4 w-4 ml-auto animate-spin text-muted-foreground" />
            )}
          </div>
          
          {/* Account Switcher */}
          {accounts.length > 0 && onChangeAccount && onAddAccount && (
            <div className="mb-3">
              <Select value={activeAccount || accounts[0]} onValueChange={(val) => {
                if (val === 'add_account') onAddAccount();
                else onChangeAccount(val);
              }}>
                <SelectTrigger className="w-full text-xs h-8">
                  <SelectValue placeholder="Select Account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map(email => (
                    <SelectItem key={email} value={email} className="text-xs">{email}</SelectItem>
                  ))}
                  <SelectItem value="add_account" className="text-xs text-primary font-medium">+ Add Account</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          
          {/* Refresh Status */}
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            <span>Auto-refresh enabled</span>
            {onRefresh && (
              <Button
                variant="ghost"
                size="sm"
                onClick={async (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  try {
                    await onRefresh();
                    toast.success('Refreshed', {
                      description: 'Emails updated successfully',
                      duration: 2000,
                    });
                  } catch (error) {
                    console.error('Error refreshing emails:', error);
                    toast.error('Failed to refresh', {
                      description: 'Could not update emails. Please try again.',
                      duration: 3000,
                    });
                  }
                }}
                disabled={isLoading}
                className="h-6 px-2"
                type="button"
              >
                <RefreshCw className={cn("h-3 w-3", isLoading && "animate-spin")} />
              </Button>
            )}
          </div>
          
          {lastRefresh && (
            <div className="text-xs text-muted-foreground mb-2">
              Last updated: {lastRefresh.toLocaleTimeString()}
            </div>
          )}
          
          {isBackendOffline && (
            <Alert className="mb-2 border-amber-500/30 bg-amber-500/10">
              <ServerOff className="h-4 w-4 text-amber-500" />
              <AlertDescription className="text-xs text-amber-700 dark:text-amber-400">
                <strong>Gmail sync unavailable.</strong> The inbox sync service could not be reached.
                Refresh the page or check the Appwrite Gmail function deployment.
              </AlertDescription>
            </Alert>
          )}
          {isGmailNotConnected && !isBackendOffline && (
            <Alert className="mb-2 border-blue-500/30 bg-blue-500/10">
              <Mail className="h-4 w-4 text-blue-500" />
              <AlertDescription className="text-xs text-blue-700 dark:text-blue-400">
                <strong>Gmail not connected.</strong> Sign in with Google, or connect a Gmail account to sync emails automatically.
              </AlertDescription>
            </Alert>
          )}
          {error && (
            <Alert variant="destructive" className="mb-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                {error.message || 'Failed to load emails'}
              </AlertDescription>
            </Alert>
          )}
          <div className="flex gap-1 overflow-x-auto pb-1">
            <Button
              variant={filter === 'all' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setFilter('all')}
              className="text-xs"
            >
              All
            </Button>
            <Button
              variant={filter === 'meeting' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setFilter('meeting')}
              className="text-xs gap-1"
            >
              <Users className="h-3 w-3" />
              Meetings {meetingCount > 0 && `(${meetingCount})`}
            </Button>
            <Button
              variant={filter === 'deadline' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setFilter('deadline')}
              className="text-xs gap-1"
            >
              <AlertTriangle className="h-3 w-3" />
              Urgent {urgentCount > 0 && `(${urgentCount})`}
            </Button>
            <Button
              variant={filter === 'task' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setFilter('task')}
              className="text-xs"
            >
              Tasks
            </Button>
          </div>
        </div>
        
        {/* Email List */}
        <ScrollArea className="flex-1">
          {isLoading && emails.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
              <Loader2 className="h-8 w-8 mb-2 animate-spin" />
              <span className="text-sm">Loading emails from Gmail...</span>
            </div>
          ) : isGmailNotConnected && emails.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full px-6 py-10 text-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center mb-4">
                <Mail className="h-8 w-8 text-white" />
              </div>
              <p className="text-base font-semibold mb-1">Sign In With Google to Sync Gmail</p>
              <p className="text-sm text-muted-foreground mb-4">Google sign-in now connects Gmail in the same Appwrite consent flow. Use the button below only if you signed in another way or want to add another inbox.</p>
              {onAddAccount && (
                <button
                  onClick={onAddAccount}
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-violet-500 text-white text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  Connect Gmail Account
                </button>
              )}
            </div>
          ) : isBackendOffline && emails.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full px-6 py-10 text-center text-muted-foreground">
              <ServerOff className="h-12 w-12 mb-4 opacity-40" />
              <p className="text-sm font-medium mb-1">Gmail Sync Not Available</p>
              <p className="text-xs text-muted-foreground mb-4">ThinkDesk could not reach the configured Gmail sync service.</p>
            </div>
          ) : filteredEmails.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
              <CheckCircle2 className="h-8 w-8 mb-2" />
              <span className="text-sm">All caught up!</span>
            </div>
          ) : (
            sortedEmails.map(email => (
              <EmailListItem
                key={email.id}
                email={email}
                isSelected={selectedEmail?.id === email.id}
                onClick={() => onSelectEmail(email)}
              />
            ))
          )}
        </ScrollArea>
      </div>
      
      {/* Email Detail */}
      <div className="flex-1">
        {selectedEmail ? (
          <EmailDetail 
            email={selectedEmail} 
            onActionClick={(type) => onActionClick(selectedEmail, type)} 
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <Mail className="h-12 w-12 mb-3 opacity-50" />
            <span className="text-sm">Select an email to view</span>
          </div>
        )}
      </div>
    </div>
  );
}
