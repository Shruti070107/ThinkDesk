import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { PageEditor } from '@/components/editor/PageEditor';
import { AIAssistant } from '@/components/ai/AIAssistant';
import { EmailInbox } from '@/components/email/EmailInbox';
import { AccountManager } from '@/components/email/AccountManager';
import { CalendarView } from '@/components/calendar/CalendarView';
import { MeetingScheduler } from '@/components/meeting/MeetingScheduler';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { KanbanBoard } from '@/components/workspace/KanbanBoard';
import { ReplyEmailDialog } from '@/components/email/ReplyEmailDialog';
import { dummyEmails, dummyMeetingRequests } from '@/data/emailData';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { Email, TimeSlot, CalendarEvent } from '@/types/email';
import { toast } from 'sonner';
import { useEmails } from '@/hooks/useEmails';

export type ViewType = 'dashboard' | 'pages' | 'inbox' | 'calendar' | 'scheduler' | 'kanban' | 'accounts';

export function WorkspaceLayout() {
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [schedulerEmail, setSchedulerEmail] = useState<Email | null>(null);
  const [replyEmail, setReplyEmail] = useState<Email | null>(null);
  
  const [accounts, setAccounts] = useState<string[]>([]);
  const [activeAccount, setActiveAccount] = useState<string | undefined>();
  
  const { workspace, addEvent, isLoadingWorkspace, workspaceError } = useWorkspace();
  const { emails: realEmails, isLoading: emailsLoading, error: emailsError, refetch: refetchEmails } = useEmails(activeAccount);

  useEffect(() => {
    if (workspaceError) {
      toast.error(`Appwrite sync issue: ${workspaceError}`);
    }
  }, [workspaceError]);

  // Fetch accounts on mount
  useEffect(() => {
    import('@/services/emailService').then(({ emailService }) => {
      emailService.getAccounts().then(accs => {
        setAccounts(accs);
        if (accs.length > 0) {
          setActiveAccount(current => current || accs[0]);
        }
      });
    });
  }, []);

  // Handle cross-window message from OAuth popup
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'GMAIL_AUTH_SUCCESS' && event.data.email) {
        setAccounts(prev => Array.from(new Set([...prev, event.data.email])));
        setActiveAccount(event.data.email);
        toast.success(`Connected account: ${event.data.email}`);
        refetchEmails();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [refetchEmails]);

  const handleAddAccount = async () => {
    try {
      const { emailService } = await import('@/services/emailService');
      const url = await emailService.connectGmail();
      // Open popup for OAuth to prevent losing React state
      window.open(url, 'GmailAuth', 'width=600,height=700');
    } catch (e) {
      toast.error('Failed to initiate login');
    }
  };
  
  // Use real emails if available, otherwise fall back to dummy emails
  const emails = realEmails.length > 0 ? realEmails : dummyEmails;
  
  // Auto-refresh emails every 5 seconds (handled by React Query)
  // Emails will automatically update in the inbox

  const handleEmailAction = (email: Email, actionType: string) => {
    if (actionType === 'schedule-meeting') {
      setSchedulerEmail(email);
      setCurrentView('scheduler');
    } else if (actionType === 'create-task') {
      toast.success('Task created from email');
    } else if (actionType === 'reply') {
      setReplyEmail(email);
    }
  };

  const handleScheduleMeeting = (slot: TimeSlot, message: string) => {
    toast.success('Meeting scheduled and reply sent!');
    setSchedulerEmail(null);
    setCurrentView('inbox');
  };

  const handleCreateEvent = (eventData: Omit<CalendarEvent, 'id'>) => {
    const newEvent: CalendarEvent = {
      ...eventData,
      id: `event-${Date.now()}`,
    };
    addEvent(newEvent);
    toast.success(`Event "${newEvent.title}" created successfully`);
  };

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <Dashboard
            emails={emails}
            events={workspace.events}
            tasks={workspace.tasks}
            goals={workspace.goals}
            meetingRequests={dummyMeetingRequests}
            onNavigate={(view) => setCurrentView(view as ViewType)}
          />
        );
      case 'inbox':
        return (
          <EmailInbox
            emails={emails}
            selectedEmail={selectedEmail}
            onSelectEmail={setSelectedEmail}
            onActionClick={handleEmailAction}
            isLoading={emailsLoading}
            error={emailsError}
            accounts={accounts}
            activeAccount={activeAccount}
            onChangeAccount={setActiveAccount}
            onAddAccount={handleAddAccount}
            onRefresh={async () => {
              try {
                await refetchEmails();
              } catch (error) {
                console.error('Error refreshing emails:', error);
              }
            }}
          />
        );
      case 'calendar':
        return (
          <CalendarView
            events={workspace.events}
            onCreateEvent={handleCreateEvent}
            onEventClick={(event) => toast.info(`Event: ${event.title}`)}
          />
        );
      case 'kanban':
        return <KanbanBoard />;
      case 'scheduler':
        return (
          <MeetingScheduler
            meetingRequest={dummyMeetingRequests[0] || null}
            email={schedulerEmail || undefined}
            onSchedule={handleScheduleMeeting}
            onDecline={() => { setCurrentView('inbox'); toast.info('Meeting declined'); }}
            onClose={() => setCurrentView('inbox')}
          />
        );
      case 'accounts':
        return (
          <AccountManager
            accounts={accounts}
            activeAccount={activeAccount}
            onChangeAccount={account => {
              setActiveAccount(account);
              toast.success(`Switched to ${account}`);
            }}
            onAccountsChange={setAccounts}
          />
        );
      case 'pages':
      default:
        return <PageEditor onOpenAI={() => setIsAIOpen(true)} />;
    }
  };

  if (isLoadingWorkspace) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background text-sm text-muted-foreground">
        Loading workspace from Appwrite...
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <Sidebar 
        onOpenAI={() => setIsAIOpen(true)} 
        currentView={currentView}
        onChangeView={setCurrentView}
      />
      <main className="flex-1 overflow-hidden">
        {renderContent()}
      </main>
      <AIAssistant isOpen={isAIOpen} onClose={() => setIsAIOpen(false)} />
      
      <ReplyEmailDialog 
        email={replyEmail} 
        activeAccount={activeAccount}
        onClose={() => setReplyEmail(null)} 
      />
    </div>
  );
}
