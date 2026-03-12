import { CalendarEvent } from './email';

export type BlockType = 'text' | 'heading1' | 'heading2' | 'heading3' | 'todo' | 'toggle' | 'code' | 'divider' | 'quote';

export interface Block {
  id: string;
  type: BlockType;
  content: string;
  checked?: boolean;
  children?: Block[];
  language?: string;
}

export interface Page {
  id: string;
  title: string;
  icon?: string;
  coverImage?: string;
  blocks: Block[];
  children?: Page[];
  parentId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  status?: 'todo' | 'in-progress' | 'done';
  dueDate?: Date;
  pageId?: string;
  goalId?: string;
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  progress: number;
  tasks: Task[];
  dueDate?: Date;
}

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface Workspace {
  pages: Page[];
  tasks: Task[];
  goals: Goal[];
  events: CalendarEvent[];
}
