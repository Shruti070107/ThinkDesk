export type EmailCategory = 'meeting' | 'task' | 'deadline' | 'follow-up' | 'low-priority' | 'unclassified';

export interface Email {
  id: string;
  threadId: string;
  from: {
    name: string;
    email: string;
  };
  to: string[];
  subject: string;
  snippet: string;
  body: string;
  receivedAt: Date;
  isRead: boolean;
  isStarred: boolean;
  labels: string[];
  category: EmailCategory;
  extractedData?: {
    dates?: string[];
    people?: string[];
    intent?: string;
    priority?: 'high' | 'medium' | 'low';
    category?: EmailCategory;
    insights?: string[];
  };
  suggestedActions?: SuggestedAction[];
}

export interface SuggestedAction {
  id: string;
  type: 'reply' | 'create-task' | 'schedule-meeting' | 'add-to-calendar' | 'follow-up';
  label: string;
  description: string;
  data?: Record<string, unknown>;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start: Date;
  end: Date;
  attendees: string[];
  location?: string;
  meetingLink?: string;
  emailId?: string;
  status: 'confirmed' | 'tentative' | 'cancelled';
}

export interface TimeSlot {
  start: Date;
  end: Date;
  score: number; // 0-100 based on preference matching
}

export interface MeetingRequest {
  id: string;
  emailId: string;
  from: string;
  subject: string;
  proposedTimes?: Date[];
  suggestedSlots?: TimeSlot[];
  status: 'pending' | 'scheduled' | 'declined';
  duration: number; // minutes
}

export interface UserPreferences {
  workingHours: {
    start: string; // HH:mm
    end: string;
  };
  preferredMeetingDuration: number;
  focusTimeBlocks: { start: string; end: string }[];
  autoLabelEmails: boolean;
  autoCreateTasks: boolean;
}
