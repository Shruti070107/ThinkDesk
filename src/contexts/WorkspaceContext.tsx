import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { Page, Task, Goal, Block, Workspace } from '@/types/workspace';
import { CalendarEvent } from '@/types/email';
import { dummyWorkspace } from '@/data/dummyData';
import { useAppwriteAuth } from '@/contexts/AppwriteAuthContext';
import { getOrCreateWorkspace, saveWorkspace } from '@/services/appwriteWorkspaceService';

interface WorkspaceContextType {
  workspace: Workspace;
  currentPage: Page | null;
  isLoadingWorkspace: boolean;
  workspaceError: string | null;
  isRemoteWorkspace: boolean;
  setCurrentPage: (page: Page | null) => void;
  updatePage: (pageId: string, updates: Partial<Page>) => void;
  addPage: (page: Page) => void;
  deletePage: (pageId: string) => void;
  updateBlock: (pageId: string, blockId: string, updates: Partial<Block>) => void;
  addBlock: (pageId: string, block: Block, afterBlockId?: string) => void;
  deleteBlock: (pageId: string, blockId: string) => void;
  toggleTask: (taskId: string) => void;
  addTask: (task: Omit<Task, 'id'>) => void;
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  deleteTask: (taskId: string) => void;
  updateGoal: (goalId: string, updates: Partial<Goal>) => void;
  addEvent: (event: CalendarEvent) => void;
  updateEvent: (eventId: string, updates: Partial<CalendarEvent>) => void;
  deleteEvent: (eventId: string) => void;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user, isConfigured } = useAppwriteAuth();
  const userId = user?.$id;
  const [workspace, setWorkspace] = useState<Workspace>(dummyWorkspace);
  const [currentPage, setCurrentPage] = useState<Page | null>(dummyWorkspace.pages[0]);
  const [workspaceRowId, setWorkspaceRowId] = useState<string | null>(null);
  const [isLoadingWorkspace, setIsLoadingWorkspace] = useState(false);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const hasLoadedRemoteWorkspace = useRef(false);
  const skipNextSave = useRef(true);

  const isRemoteWorkspace = Boolean(isConfigured && userId && workspaceRowId);

  useEffect(() => {
    let isCancelled = false;

    if (!isConfigured || !userId) {
      setWorkspace(dummyWorkspace);
      setCurrentPage(dummyWorkspace.pages[0] || null);
      setWorkspaceRowId(null);
      setWorkspaceError(null);
      setIsLoadingWorkspace(false);
      hasLoadedRemoteWorkspace.current = false;
      skipNextSave.current = true;
      return;
    }

    setIsLoadingWorkspace(true);
    setWorkspaceError(null);

    getOrCreateWorkspace(userId, dummyWorkspace)
      .then(({ rowId, workspace: loadedWorkspace }) => {
        if (isCancelled) return;
        setWorkspace(loadedWorkspace);
        setCurrentPage(loadedWorkspace.pages[0] || null);
        setWorkspaceRowId(rowId);
        hasLoadedRemoteWorkspace.current = true;
        skipNextSave.current = true;
      })
      .catch(error => {
        if (isCancelled) return;
        const message = error instanceof Error ? error.message : 'Failed to load Appwrite workspace';
        setWorkspaceError(message);
        setWorkspace(dummyWorkspace);
        setCurrentPage(dummyWorkspace.pages[0] || null);
        setWorkspaceRowId(null);
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoadingWorkspace(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [isConfigured, userId]);

  useEffect(() => {
    if (!userId || !workspaceRowId || !hasLoadedRemoteWorkspace.current || isLoadingWorkspace) {
      return;
    }

    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }

    const saveTimer = window.setTimeout(() => {
      saveWorkspace(workspaceRowId, userId, workspace).catch(error => {
        const message = error instanceof Error ? error.message : 'Failed to save Appwrite workspace';
        setWorkspaceError(message);
      });
    }, 700);

    return () => window.clearTimeout(saveTimer);
  }, [workspace, workspaceRowId, userId, isLoadingWorkspace]);

  const findAndUpdatePage = (pages: Page[], pageId: string, updates: Partial<Page>): Page[] => {
    return pages.map(page => {
      if (page.id === pageId) {
        return { ...page, ...updates, updatedAt: new Date() };
      }
      if (page.children) {
        return { ...page, children: findAndUpdatePage(page.children, pageId, updates) };
      }
      return page;
    });
  };

  const updatePage = (pageId: string, updates: Partial<Page>) => {
    setWorkspace(prev => ({
      ...prev,
      pages: findAndUpdatePage(prev.pages, pageId, updates),
    }));
    if (currentPage?.id === pageId) {
      setCurrentPage(prev => prev ? { ...prev, ...updates } : null);
    }
  };

  const addPage = (page: Page) => {
    setWorkspace(prev => ({
      ...prev,
      pages: [...prev.pages, page],
    }));
  };

  const deletePage = (pageId: string) => {
    const filterPages = (pages: Page[]): Page[] => {
      return pages.filter(p => p.id !== pageId).map(p => ({
        ...p,
        children: p.children ? filterPages(p.children) : undefined,
      }));
    };
    setWorkspace(prev => ({
      ...prev,
      pages: filterPages(prev.pages),
    }));
    if (currentPage?.id === pageId) {
      setCurrentPage(workspace.pages[0] || null);
    }
  };

  const updateBlock = (pageId: string, blockId: string, updates: Partial<Block>) => {
    const updateBlocks = (blocks: Block[]): Block[] => {
      return blocks.map(block => {
        if (block.id === blockId) {
          return { ...block, ...updates };
        }
        if (block.children) {
          return { ...block, children: updateBlocks(block.children) };
        }
        return block;
      });
    };

    updatePage(pageId, {
      blocks: updateBlocks(currentPage?.blocks || []),
    });
  };

  const addBlock = (pageId: string, block: Block, afterBlockId?: string) => {
    const page = workspace.pages.find(p => p.id === pageId);
    if (!page) return;

    let newBlocks: Block[];
    if (afterBlockId) {
      const index = page.blocks.findIndex(b => b.id === afterBlockId);
      newBlocks = [
        ...page.blocks.slice(0, index + 1),
        block,
        ...page.blocks.slice(index + 1),
      ];
    } else {
      newBlocks = [...page.blocks, block];
    }

    updatePage(pageId, { blocks: newBlocks });
  };

  const deleteBlock = (pageId: string, blockId: string) => {
    const page = workspace.pages.find(p => p.id === pageId);
    if (!page) return;

    updatePage(pageId, {
      blocks: page.blocks.filter(b => b.id !== blockId),
    });
  };

  const toggleTask = (taskId: string) => {
    setWorkspace(prev => ({
      ...prev,
      tasks: prev.tasks.map(task =>
        task.id === taskId ? { ...task, completed: !task.completed, status: !task.completed ? 'done' : 'todo' } : task
      ),
    }));
  };

  const addTask = (task: Omit<Task, 'id'>) => {
    const newTask: Task = { ...task, id: `task-${Date.now()}` };
    setWorkspace(prev => ({ ...prev, tasks: [...prev.tasks, newTask] }));
  };

  const deleteTask = (taskId: string) => {
    setWorkspace(prev => ({ ...prev, tasks: prev.tasks.filter(t => t.id !== taskId) }));
  };

  const updateTask = (taskId: string, updates: Partial<Task>) => {
    setWorkspace(prev => ({
      ...prev,
      tasks: prev.tasks.map(task => {
        if (task.id === taskId) {
          const updatedTask = { ...task, ...updates };
          // Keep completed and status in sync
          if (updates.status && updates.status === 'done') updatedTask.completed = true;
          if (updates.status && updates.status !== 'done') updatedTask.completed = false;
          if (updates.completed === true) updatedTask.status = 'done';
          if (updates.completed === false && task.status === 'done') updatedTask.status = 'todo';
          return updatedTask;
        }
        return task;
      }),
    }));
  };

  const updateGoal = (goalId: string, updates: Partial<Goal>) => {
    setWorkspace(prev => ({
      ...prev,
      goals: prev.goals.map(goal =>
        goal.id === goalId ? { ...goal, ...updates } : goal
      ),
    }));
  };

  const addEvent = (event: CalendarEvent) => {
    setWorkspace(prev => ({
      ...prev,
      events: [...prev.events, event],
    }));
  };

  const updateEvent = (eventId: string, updates: Partial<CalendarEvent>) => {
    setWorkspace(prev => ({
      ...prev,
      events: prev.events.map(event =>
        event.id === eventId ? { ...event, ...updates } : event
      ),
    }));
  };

  const deleteEvent = (eventId: string) => {
    setWorkspace(prev => ({
      ...prev,
      events: prev.events.filter(event => event.id !== eventId),
    }));
  };

  return (
    <WorkspaceContext.Provider
      value={{
        workspace,
        currentPage,
        isLoadingWorkspace,
        workspaceError,
        isRemoteWorkspace,
        setCurrentPage,
        updatePage,
        addPage,
        deletePage,
        updateBlock,
        addBlock,
        deleteBlock,
        toggleTask,
        addTask,
        updateTask,
        deleteTask,
        updateGoal,
        addEvent,
        updateEvent,
        deleteEvent,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
}
