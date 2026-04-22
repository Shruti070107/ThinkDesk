import { Models } from 'appwrite';
import { appwriteConfig, appwriteTablesDB, ID, Permission, Query, Role } from '@/lib/appwrite';
import { CalendarEvent } from '@/types/email';
import { Block, Goal, Page, Task, Workspace } from '@/types/workspace';

const WORKSPACE_SCHEMA_VERSION = 1;

interface WorkspaceRow extends Models.Row {
  ownerId: string;
  name: string;
  schemaVersion: number;
  pages: string;
  tasks: string;
  goals: string;
  events: string;
}

export interface LoadedWorkspace {
  rowId: string;
  workspace: Workspace;
}

function toDate(value?: Date | string | null) {
  if (!value) return undefined;
  return value instanceof Date ? value : new Date(value);
}

function reviveBlocks(blocks: Block[] = []): Block[] {
  return blocks.map(block => ({
    ...block,
    children: block.children ? reviveBlocks(block.children) : undefined,
  }));
}

function revivePages(pages: Page[] = []): Page[] {
  return pages.map(page => ({
    ...page,
    createdAt: toDate(page.createdAt) || new Date(),
    updatedAt: toDate(page.updatedAt) || new Date(),
    blocks: reviveBlocks(page.blocks),
    children: page.children ? revivePages(page.children) : undefined,
  }));
}

function reviveTasks(tasks: Task[] = []): Task[] {
  return tasks.map(task => ({
    ...task,
    dueDate: toDate(task.dueDate),
  }));
}

function reviveGoals(goals: Goal[] = []): Goal[] {
  return goals.map(goal => ({
    ...goal,
    dueDate: toDate(goal.dueDate),
    tasks: reviveTasks(goal.tasks),
  }));
}

function reviveEvents(events: CalendarEvent[] = []): CalendarEvent[] {
  return events.map(event => ({
    ...event,
    start: toDate(event.start) || new Date(),
    end: toDate(event.end) || new Date(),
  }));
}

function reviveWorkspace(workspace: Workspace): Workspace {
  return {
    pages: revivePages(workspace.pages),
    tasks: reviveTasks(workspace.tasks),
    goals: reviveGoals(workspace.goals),
    events: reviveEvents(workspace.events),
  };
}

function parseJsonField<T>(value: string | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function rowToWorkspace(row: WorkspaceRow): Workspace {
  return reviveWorkspace({
    pages: parseJsonField<Page[]>(row.pages, []),
    tasks: parseJsonField<Task[]>(row.tasks, []),
    goals: parseJsonField<Goal[]>(row.goals, []),
    events: parseJsonField<CalendarEvent[]>(row.events, []),
  });
}

function workspaceToDocument(ownerId: string, workspace: Workspace) {
  return {
    ownerId,
    name: 'Default workspace',
    schemaVersion: WORKSPACE_SCHEMA_VERSION,
    pages: JSON.stringify(workspace.pages),
    tasks: JSON.stringify(workspace.tasks),
    goals: JSON.stringify(workspace.goals),
    events: JSON.stringify(workspace.events),
  };
}

function assertAppwriteConfigured() {
  if (!appwriteConfig.isConfigured) {
    throw new Error('Appwrite is not configured. Add the VITE_APPWRITE_* values to your .env file.');
  }
}

export async function getOrCreateWorkspace(ownerId: string, seedWorkspace: Workspace): Promise<LoadedWorkspace> {
  assertAppwriteConfigured();

  const rows = await appwriteTablesDB.listRows<WorkspaceRow>({
    databaseId: appwriteConfig.databaseId,
    tableId: appwriteConfig.workspacesTableId,
    queries: [Query.equal('ownerId', ownerId), Query.limit(1)],
    total: false,
  });

  const existing = rows.rows[0];
  if (existing) {
    return {
      rowId: existing.$id,
      workspace: rowToWorkspace(existing),
    };
  }

  const created = await appwriteTablesDB.createRow<WorkspaceRow>({
    databaseId: appwriteConfig.databaseId,
    tableId: appwriteConfig.workspacesTableId,
    rowId: ID.unique(),
    data: workspaceToDocument(ownerId, seedWorkspace),
    permissions: [
      Permission.read(Role.user(ownerId)),
      Permission.update(Role.user(ownerId)),
      Permission.delete(Role.user(ownerId)),
    ],
  });

  return {
    rowId: created.$id,
    workspace: rowToWorkspace(created),
  };
}

export async function saveWorkspace(rowId: string, ownerId: string, workspace: Workspace) {
  assertAppwriteConfigured();

  await appwriteTablesDB.updateRow({
    databaseId: appwriteConfig.databaseId,
    tableId: appwriteConfig.workspacesTableId,
    rowId,
    data: workspaceToDocument(ownerId, workspace),
  });
}
