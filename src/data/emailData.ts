import { Email, CalendarEvent, MeetingRequest, UserPreferences } from '@/types/email';

export const dummyEmails: Email[] = [
  {
    id: 'email-1',
    threadId: 'thread-1',
    from: { name: 'Sarah Chen', email: 'sarah.chen@company.com' },
    to: ['you@example.com'],
    subject: 'Quick sync on Q1 roadmap - Can we meet this week?',
    snippet: 'Hi! I wanted to discuss the Q1 roadmap priorities. Are you free for a 30-min call this Thursday or Friday?',
    body: `Hi!

I wanted to discuss the Q1 roadmap priorities and get your input on the feature prioritization. Are you free for a 30-min call this Thursday or Friday afternoon?

Let me know what works best for you.

Best,
Sarah`,
    receivedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    isRead: false,
    isStarred: true,
    labels: ['inbox', 'work'],
    category: 'meeting',
    extractedData: {
      dates: ['Thursday', 'Friday'],
      people: ['Sarah Chen'],
      intent: 'Meeting request for roadmap discussion',
      priority: 'high',
    },
    suggestedActions: [
      { id: 'action-1', type: 'schedule-meeting', label: 'Schedule Meeting', description: 'Find available slots and reply' },
      { id: 'action-2', type: 'reply', label: 'Quick Reply', description: 'Draft a response' },
    ],
  },
  {
    id: 'email-2',
    threadId: 'thread-2',
    from: { name: 'Alex Kumar', email: 'alex@startup.io' },
    to: ['you@example.com'],
    subject: 'URGENT: Contract expires tomorrow - need signature',
    snippet: 'The vendor contract expires tomorrow at midnight. Please review and sign ASAP.',
    body: `Hi,

This is a reminder that the vendor contract expires tomorrow at midnight EST. I've attached the renewal documents for your review.

Please sign and return by end of day today if possible.

Thanks,
Alex`,
    receivedAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
    isRead: false,
    isStarred: false,
    labels: ['inbox', 'urgent'],
    category: 'deadline',
    extractedData: {
      dates: ['tomorrow', 'midnight', 'end of day today'],
      people: ['Alex Kumar'],
      intent: 'Urgent contract signature required',
      priority: 'high',
    },
    suggestedActions: [
      { id: 'action-3', type: 'create-task', label: 'Create Task', description: 'Add to tasks with deadline' },
      { id: 'action-4', type: 'reply', label: 'Acknowledge', description: 'Confirm receipt' },
    ],
  },
  {
    id: 'email-3',
    threadId: 'thread-3',
    from: { name: 'Marketing Team', email: 'marketing@newsletter.com' },
    to: ['you@example.com'],
    subject: 'Weekly digest: Top stories in tech',
    snippet: 'This week in tech: AI breakthroughs, startup funding rounds, and more...',
    body: `Your weekly tech digest is here!

Top Stories:
1. OpenAI announces new model capabilities
2. $50M Series B for productivity startup
3. Remote work trends in 2024

Click to read more...`,
    receivedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    isRead: true,
    isStarred: false,
    labels: ['inbox', 'newsletters'],
    category: 'low-priority',
    extractedData: {
      priority: 'low',
    },
  },
  {
    id: 'email-4',
    threadId: 'thread-4',
    from: { name: 'Jordan Lee', email: 'jordan.lee@design.co' },
    to: ['you@example.com'],
    subject: 'Re: Design feedback needed by Friday',
    snippet: 'Thanks for the quick review! I\'ve incorporated your suggestions. Could you take one more look?',
    body: `Hi!

Thanks for the quick review yesterday! I've incorporated your suggestions into the latest mockups.

Could you take one more look before I send to the client on Friday?

The updated Figma link: [link]

Cheers,
Jordan`,
    receivedAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
    isRead: false,
    isStarred: false,
    labels: ['inbox', 'design'],
    category: 'task',
    extractedData: {
      dates: ['Friday'],
      people: ['Jordan Lee'],
      intent: 'Design review request',
      priority: 'medium',
    },
    suggestedActions: [
      { id: 'action-5', type: 'create-task', label: 'Add Review Task', description: 'Review designs before Friday' },
      { id: 'action-6', type: 'reply', label: 'Reply', description: 'Confirm you\'ll review' },
    ],
  },
  {
    id: 'email-5',
    threadId: 'thread-5',
    from: { name: 'David Park', email: 'david.park@consulting.com' },
    to: ['you@example.com'],
    subject: 'Following up on our conversation',
    snippet: 'Just checking in on the proposal we discussed last week. Any updates on your end?',
    body: `Hi there,

I wanted to follow up on our conversation from last week about the consulting engagement.

Have you had a chance to review the proposal? Happy to jump on a call if you have any questions.

Best,
David`,
    receivedAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
    isRead: true,
    isStarred: false,
    labels: ['inbox'],
    category: 'follow-up',
    extractedData: {
      people: ['David Park'],
      intent: 'Follow-up on proposal',
      priority: 'medium',
    },
    suggestedActions: [
      { id: 'action-7', type: 'follow-up', label: 'Set Reminder', description: 'Follow up later this week' },
      { id: 'action-8', type: 'reply', label: 'Reply Now', description: 'Respond to follow-up' },
    ],
  },
];

export const dummyCalendarEvents: CalendarEvent[] = [
  {
    id: 'event-1',
    title: 'Team Standup',
    description: 'Daily sync with the product team',
    start: new Date(new Date().setHours(9, 0, 0, 0)),
    end: new Date(new Date().setHours(9, 30, 0, 0)),
    attendees: ['team@company.com'],
    status: 'confirmed',
  },
  {
    id: 'event-2',
    title: 'Product Review',
    description: 'Q1 feature review and planning',
    start: new Date(new Date().setHours(14, 0, 0, 0)),
    end: new Date(new Date().setHours(15, 0, 0, 0)),
    attendees: ['product@company.com', 'design@company.com'],
    meetingLink: 'https://meet.google.com/abc-defg-hij',
    status: 'confirmed',
  },
  {
    id: 'event-3',
    title: 'Focus Time',
    description: 'Deep work block',
    start: new Date(new Date().setHours(10, 0, 0, 0)),
    end: new Date(new Date().setHours(12, 0, 0, 0)),
    attendees: [],
    status: 'confirmed',
  },
];

export const dummyMeetingRequests: MeetingRequest[] = [
  {
    id: 'meeting-req-1',
    emailId: 'email-1',
    from: 'sarah.chen@company.com',
    subject: 'Q1 Roadmap Sync',
    suggestedSlots: [
      { start: new Date(new Date().setDate(new Date().getDate() + 1)), end: new Date(new Date().setDate(new Date().getDate() + 1)), score: 95 },
      { start: new Date(new Date().setDate(new Date().getDate() + 2)), end: new Date(new Date().setDate(new Date().getDate() + 2)), score: 85 },
    ],
    status: 'pending',
    duration: 30,
  },
];

export const defaultUserPreferences: UserPreferences = {
  workingHours: { start: '09:00', end: '18:00' },
  preferredMeetingDuration: 30,
  focusTimeBlocks: [{ start: '10:00', end: '12:00' }],
  autoLabelEmails: true,
  autoCreateTasks: false,
};
