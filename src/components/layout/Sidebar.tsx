import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Plus, Search, Settings, Moon, Sun, Sparkles, FileText, Target, Mail, Calendar, LayoutDashboard, LogOut } from 'lucide-react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useAppwriteAuth } from '@/contexts/AppwriteAuthContext';
import { Page } from '@/types/workspace';
import { cn } from '@/lib/utils';
import { ViewType } from '@/components/workspace/WorkspaceLayout';
import { SettingsModal } from '@/components/layout/SettingsModal';

interface SidebarProps {
  onOpenAI: () => void;
  currentView: ViewType;
  onChangeView: (view: ViewType) => void;
}

function PageItem({ page, level = 0 }: { page: Page; level?: number }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const { currentPage, setCurrentPage } = useWorkspace();
  const hasChildren = page.children && page.children.length > 0;
  const isActive = currentPage?.id === page.id;

  return (
    <div className="animate-in">
      <div
        className={cn('sidebar-item group', isActive && 'sidebar-item-active')}
        style={{ paddingLeft: `${8 + level * 12}px` }}
        onClick={() => setCurrentPage(page)}
      >
        {hasChildren ? (
          <button onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }} className="p-0.5 hover:bg-sidebar-accent rounded">
            {isExpanded ? <ChevronDown className="h-3 w-3 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 text-muted-foreground" />}
          </button>
        ) : <div className="w-4" />}
        <span className="text-base">{page.icon || '📄'}</span>
        <span className="truncate flex-1">{page.title}</span>
      </div>
      {hasChildren && isExpanded && page.children!.map(child => <PageItem key={child.id} page={child} level={level + 1} />)}
    </div>
  );
}

export function Sidebar({ onOpenAI, currentView, onChangeView }: SidebarProps) {
  const { workspace, addPage, isRemoteWorkspace } = useWorkspace();
  const { user, isConfigured, logout } = useAppwriteAuth();
  const { theme, toggleTheme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);

  const handleAddPage = () => {
    addPage({
      id: `page-${Date.now()}`,
      title: 'Untitled',
      icon: '📄',
      blocks: [{ id: `block-${Date.now()}`, type: 'heading1', content: 'Untitled' }, { id: `block-${Date.now() + 1}`, type: 'text', content: '' }],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  };

  const filteredPages = searchQuery ? workspace.pages.filter(page => page.title.toLowerCase().includes(searchQuery.toLowerCase())) : workspace.pages;

  const navItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'inbox', icon: Mail, label: 'Email Inbox' },
    { id: 'kanban', icon: Target, label: 'Task Board' },
    { id: 'calendar', icon: Calendar, label: 'Calendar' },
    { id: 'pages', icon: FileText, label: 'Pages' },
  ];

  return (
    <aside className="w-60 h-screen bg-sidebar border-r border-sidebar-border flex flex-col">
      <div className="p-3 border-b border-sidebar-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
              <Sparkles className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="font-semibold text-sm">ThinkDesk AI</span>
          </div>
          <button onClick={toggleTheme} className="p-1.5 rounded-md hover:bg-sidebar-accent transition-colors">
            {theme === 'light' ? <Moon className="h-4 w-4 text-muted-foreground" /> : <Sun className="h-4 w-4 text-muted-foreground" />}
          </button>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-8 pr-3 py-1.5 text-sm bg-sidebar-accent rounded-md border-0 focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground" />
        </div>
      </div>

      <div className="px-3 py-2">
        <button onClick={onOpenAI} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-violet-500/10 to-indigo-500/10 hover:from-violet-500/20 hover:to-indigo-500/20 border border-violet-500/20 transition-all">
          <Sparkles className="h-4 w-4 text-violet-500" />
          <span className="text-sm font-medium ai-gradient-text">AI Assistant</span>
        </button>
      </div>

      <div className="px-3 py-2">
        <div className="text-xs font-medium text-muted-foreground mb-1 px-2">Navigation</div>
        {navItems.map(item => (
          <div key={item.id} className={cn('sidebar-item', currentView === item.id && 'sidebar-item-active')} onClick={() => onChangeView(item.id as ViewType)}>
            <item.icon className="h-4 w-4 text-muted-foreground" />
            <span>{item.label}</span>
          </div>
        ))}
      </div>

      {currentView === 'pages' && (
        <div className="flex-1 overflow-y-auto px-1.5 py-2">
          <div className="flex items-center justify-between px-2 mb-1">
            <span className="text-xs font-medium text-muted-foreground">Pages</span>
            <button onClick={handleAddPage} className="p-1 rounded hover:bg-sidebar-accent transition-colors">
              <Plus className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </div>
          {filteredPages.map(page => <PageItem key={page.id} page={page} />)}
        </div>
      )}

      <div className="p-3 border-t border-sidebar-border">
        {isConfigured && user && (
          <div className="mb-2 rounded-lg border border-sidebar-border bg-sidebar-accent/50 p-2">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-xs font-medium">{user.name || user.email}</p>
                <p className="text-[11px] text-muted-foreground">
                  {isRemoteWorkspace ? 'Appwrite synced' : 'Appwrite local fallback'}
                </p>
              </div>
              <button
                onClick={() => logout()}
                className="p-1.5 rounded-md hover:bg-sidebar-accent transition-colors"
                title="Sign out"
              >
                <LogOut className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </div>
          </div>
        )}
        <button className="sidebar-item w-full" onClick={() => setSettingsOpen(true)}>
          <Settings className="h-4 w-4 text-muted-foreground" />
          <span>Settings</span>
        </button>
      </div>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </aside>
  );
}
