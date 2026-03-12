import React from 'react';
import { Mail, Calendar, ListTodo, Users, Clock, AlertTriangle, TrendingUp, Sparkles, CheckCircle2, ArrowRight } from 'lucide-react';
import { Email, CalendarEvent, MeetingRequest } from '@/types/email';
import { Task, Goal } from '@/types/workspace';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';

interface DashboardProps {
  emails: Email[];
  events: CalendarEvent[];
  tasks: Task[];
  goals: Goal[];
  meetingRequests: MeetingRequest[];
  onNavigate: (view: string) => void;
}

function StatCard({ icon: Icon, label, value, trend, color }: { 
  icon: React.ElementType; 
  label: string; 
  value: string | number; 
  trend?: string;
  color: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', color)}>
            <Icon className="h-5 w-5" />
          </div>
          {trend && (
            <Badge variant="secondary" className="text-xs gap-1">
              <TrendingUp className="h-3 w-3" />
              {trend}
            </Badge>
          )}
        </div>
        <div className="mt-3">
          <div className="text-2xl font-bold">{value}</div>
          <div className="text-sm text-muted-foreground">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmailPreviewCard({ email, onClick }: { email: Email; onClick: () => void }) {
  return (
    <div 
      onClick={onClick}
      className="flex items-start gap-3 p-3 rounded-lg hover:bg-accent/50 cursor-pointer transition-colors"
    >
      <div className={cn(
        'w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0',
        'bg-gradient-to-br from-violet-500 to-indigo-500 text-white'
      )}>
        {email.from.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className={cn('text-sm truncate', !email.isRead && 'font-semibold')}>
            {email.from.name}
          </span>
          <span className="text-xs text-muted-foreground flex-shrink-0">
            {new Date(email.receivedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
          </span>
        </div>
        <div className="text-sm text-muted-foreground truncate">{email.subject}</div>
      </div>
    </div>
  );
}

function TaskItem({ task }: { task: Task }) {
  return (
    <div className="flex items-center gap-3 p-2">
      <div className={cn(
        'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0',
        task.completed ? 'bg-green-500 border-green-500' : 'border-muted-foreground/50'
      )}>
        {task.completed && <CheckCircle2 className="h-3 w-3 text-white" />}
      </div>
      <div className="flex-1 min-w-0">
        <span className={cn('text-sm', task.completed && 'line-through text-muted-foreground')}>
          {task.title}
        </span>
      </div>
      <Badge 
        variant={task.priority === 'high' ? 'destructive' : task.priority === 'medium' ? 'default' : 'secondary'}
        className="text-xs capitalize"
      >
        {task.priority}
      </Badge>
    </div>
  );
}

function EventPreview({ event }: { event: CalendarEvent }) {
  const startTime = new Date(event.start).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  const endTime = new Date(event.end).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/50">
      <div className="w-1 h-12 rounded-full bg-gradient-to-b from-blue-500 to-indigo-500" />
      <div className="flex-1">
        <div className="font-medium text-sm">{event.title}</div>
        <div className="text-xs text-muted-foreground flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {startTime} - {endTime}
        </div>
      </div>
    </div>
  );
}

export function Dashboard({ emails, events, tasks, goals, meetingRequests, onNavigate }: DashboardProps) {
  const unreadEmails = emails.filter(e => !e.isRead);
  const urgentEmails = emails.filter(e => e.extractedData?.priority === 'high');
  const pendingMeetings = meetingRequests.filter(m => m.status === 'pending');
  const todayEvents = events.filter(e => {
    const eventDate = new Date(e.start);
    return eventDate.toDateString() === new Date().toDateString();
  });
  const activeTasks = tasks.filter(t => !t.completed);
  
  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? 'Good morning' : currentHour < 17 ? 'Good afternoon' : 'Good evening';
  
  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{greeting}! 👋</h1>
          <p className="text-muted-foreground">
            Here's what needs your attention today.
          </p>
        </div>
        <Button variant="outline" className="gap-2" onClick={() => onNavigate('inbox')}>
          <Mail className="h-4 w-4" />
          Open Inbox
        </Button>
      </div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          icon={Mail} 
          label="Unread emails" 
          value={unreadEmails.length} 
          color="bg-blue-500/10 text-blue-500"
        />
        <StatCard 
          icon={Calendar} 
          label="Today's meetings" 
          value={todayEvents.length} 
          color="bg-purple-500/10 text-purple-500"
        />
        <StatCard 
          icon={ListTodo} 
          label="Active tasks" 
          value={activeTasks.length} 
          color="bg-green-500/10 text-green-500"
        />
        <StatCard 
          icon={Users} 
          label="Pending requests" 
          value={pendingMeetings.length}
          color="bg-orange-500/10 text-orange-500"
        />
      </div>
      
      {/* AI Insights */}
      {urgentEmails.length > 0 && (
        <Card className="border-red-500/30 bg-red-500/5">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-red-500" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-red-600 dark:text-red-400">
                {urgentEmails.length} urgent email{urgentEmails.length > 1 ? 's' : ''} need attention
              </h3>
              <p className="text-sm text-muted-foreground">
                AI detected time-sensitive messages that require your response.
              </p>
            </div>
            <Button variant="destructive" size="sm" onClick={() => onNavigate('inbox')}>
              View Now
            </Button>
          </CardContent>
        </Card>
      )}
      
      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Inbox Preview */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Recent Emails
                </CardTitle>
                <CardDescription>AI-triaged inbox overview</CardDescription>
              </div>
              <Button variant="ghost" size="sm" className="gap-1" onClick={() => onNavigate('inbox')}>
                View all <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[280px]">
              {unreadEmails.length > 0 ? (
                <div className="space-y-1">
                  {unreadEmails.slice(0, 5).map(email => (
                    <EmailPreviewCard 
                      key={email.id} 
                      email={email} 
                      onClick={() => onNavigate('inbox')} 
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <CheckCircle2 className="h-8 w-8 mb-2" />
                  <span>All caught up!</span>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
        
        {/* Today's Schedule */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Today
                </CardTitle>
                <CardDescription>Your schedule</CardDescription>
              </div>
              <Button variant="ghost" size="sm" className="gap-1" onClick={() => onNavigate('calendar')}>
                View <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[280px]">
              {todayEvents.length > 0 ? (
                <div className="space-y-2">
                  {todayEvents.map(event => (
                    <EventPreview key={event.id} event={event} />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <Calendar className="h-8 w-8 mb-2 opacity-50" />
                  <span>No meetings today</span>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
      
      {/* Goals & Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Tasks */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ListTodo className="h-5 w-5" />
                  Tasks
                </CardTitle>
                <CardDescription>{activeTasks.length} remaining</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px]">
              {activeTasks.length > 0 ? (
                <div className="space-y-1">
                  {activeTasks.slice(0, 6).map(task => (
                    <TaskItem key={task.id} task={task} />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <CheckCircle2 className="h-8 w-8 mb-2" />
                  <span>All tasks complete!</span>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
        
        {/* Goals Progress */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Goals
                </CardTitle>
                <CardDescription>Track your progress</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px]">
              <div className="space-y-4">
                {goals.map(goal => (
                  <div key={goal.id} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{goal.title}</span>
                      <span className="text-muted-foreground">{goal.progress}%</span>
                    </div>
                    <Progress value={goal.progress} className="h-2" />
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
