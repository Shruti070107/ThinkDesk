import React, { useState } from 'react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { KanbanSquare, Plus, Clock, CheckCircle2, Circle, GripVertical, ChevronDown, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';

type ColumnStatus = 'todo' | 'in-progress' | 'done';
type Priority = 'low' | 'medium' | 'high';

const COLUMNS = [
  { id: 'todo' as ColumnStatus,        title: 'To Do',       icon: Circle,       color: 'text-slate-500',  bg: 'bg-slate-50 dark:bg-slate-900/20',  border: 'border-slate-200 dark:border-slate-700' },
  { id: 'in-progress' as ColumnStatus, title: 'In Progress', icon: Clock,        color: 'text-blue-500',   bg: 'bg-blue-50 dark:bg-blue-900/20',    border: 'border-blue-200 dark:border-blue-700' },
  { id: 'done' as ColumnStatus,        title: 'Done',        icon: CheckCircle2, color: 'text-green-500',  bg: 'bg-green-50 dark:bg-green-900/20',  border: 'border-green-200 dark:border-green-700' },
];

const PRIORITY_COLORS: Record<Priority | string, string> = {
  high:   'bg-red-100 text-red-700 border-red-200',
  medium: 'bg-orange-100 text-orange-700 border-orange-200',
  low:    'bg-blue-100 text-blue-700 border-blue-200',
};

export function KanbanBoard() {
  const { workspace, updateTask, addTask, deleteTask } = useWorkspace();
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<ColumnStatus | null>(null);

  // Dialog state
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    title: '',
    priority: 'medium' as Priority,
    status: 'todo' as ColumnStatus,
    dueDate: '',
  });

  // Normalise all tasks so they all have a status
  const tasks = workspace.tasks.map(t => ({
    ...t,
    status: (t.status as ColumnStatus) || (t.completed ? 'done' : 'todo'),
  }));

  /* ─── drag handlers ─── */
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, id: string) => {
    setDraggingId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('taskId', id);
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    setDragOverCol(null);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, colId: ColumnStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverCol(colId);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, colId: ColumnStatus) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('taskId');
    if (id) {
      updateTask(id, { status: colId });
      toast.success(`Task moved to ${COLUMNS.find(c => c.id === colId)?.title}`);
    }
    setDraggingId(null);
    setDragOverCol(null);
  };

  /* ─── quick-move via dropdown ─── */
  const moveTask = (id: string, status: ColumnStatus) => {
    updateTask(id, { status });
    toast.success(`Task moved to ${COLUMNS.find(c => c.id === status)?.title}`);
  };

  /* ─── add task ─── */
  const handleAddTask = () => {
    if (!form.title.trim()) {
      toast.error('Task title is required');
      return;
    }

    addTask({
      title: form.title.trim(),
      priority: form.priority,
      status: form.status,
      completed: form.status === 'done',
      dueDate: form.dueDate ? new Date(form.dueDate) : undefined,
      pageId: workspace.pages[0]?.id || '',
    });

    toast.success(`Task "${form.title.trim()}" added to ${COLUMNS.find(c => c.id === form.status)?.title}!`);
    setForm({ title: '', priority: 'medium', status: 'todo', dueDate: '' });
    setShowAdd(false);
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="p-6 border-b border-border flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <KanbanSquare className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Task Board</h1>
            <p className="text-sm text-muted-foreground">Drag cards or use the quick-move dropdown.</p>
          </div>
        </div>
        <Button onClick={() => setShowAdd(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Task
        </Button>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-x-auto p-6">
        <div className="flex gap-6 h-full min-w-max pb-4">
          {COLUMNS.map(col => {
            const ColIcon = col.icon;
            const colTasks = tasks.filter(t => t.status === col.id);
            const isOver = dragOverCol === col.id;

            return (
              <div
                key={col.id}
                className={`flex flex-col w-80 rounded-xl border transition-colors ${col.border} ${isOver ? 'ring-2 ring-primary/40 bg-primary/5' : col.bg}`}
                onDragOver={e => handleDragOver(e, col.id)}
                onDragLeave={() => setDragOverCol(null)}
                onDrop={e => handleDrop(e, col.id)}
              >
                {/* Column Header */}
                <div className="p-4 flex items-center justify-between border-b border-border/50">
                  <div className={`flex items-center gap-2 font-medium ${col.color}`}>
                    <ColIcon className="h-4 w-4" />
                    <span className="text-foreground">{col.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="rounded-full px-2 py-0.5 text-xs font-normal">
                      {colTasks.length}
                    </Badge>
                    <button
                      onClick={() => { setForm(f => ({ ...f, status: col.id })); setShowAdd(true); }}
                      className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      title={`Add task to ${col.title}`}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Cards */}
                <div className="flex-1 p-3 space-y-3 overflow-y-auto">
                  {colTasks.map(task => (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={e => handleDragStart(e, task.id)}
                      onDragEnd={handleDragEnd}
                      className={`bg-card border border-border rounded-lg p-3 shadow-sm cursor-grab active:cursor-grabbing hover:border-primary/50 hover:shadow-md transition-all group relative select-none ${draggingId === task.id ? 'opacity-50 scale-95' : ''}`}
                    >
                      <GripVertical className="h-4 w-4 text-muted-foreground/40 absolute left-1 top-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      
                      {/* Delete button */}
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          deleteTask(task.id);
                          toast.success('Task deleted');
                        }}
                        className="absolute right-2 top-2 w-5 h-5 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        title="Delete task"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>

                      <div className="pl-4 pr-4">
                        <p className="font-medium text-sm leading-snug mb-3">{task.title}</p>
                        <div className="flex items-center justify-between gap-2">
                          <Badge
                            variant="outline"
                            className={`text-[10px] px-1.5 py-0 font-medium ${PRIORITY_COLORS[task.priority] ?? PRIORITY_COLORS.medium}`}
                          >
                            {task.priority?.toUpperCase()}
                          </Badge>
                          <div className="flex items-center gap-2">
                            {task.dueDate && (
                              <span className="text-[10px] text-muted-foreground">
                                {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                              </span>
                            )}
                            <div className="relative pointer-events-auto">
                              <select
                                value={task.status}
                                onClick={e => e.stopPropagation()}
                                onChange={e => { e.stopPropagation(); moveTask(task.id, e.target.value as ColumnStatus); }}
                                className={`appearance-none text-[10px] pl-2 pr-5 py-0.5 rounded border cursor-pointer outline-none font-medium transition-colors
                                  ${task.status === 'todo'        ? 'bg-slate-100 text-slate-700 border-slate-300' : ''}
                                  ${task.status === 'in-progress' ? 'bg-blue-100 text-blue-700 border-blue-300' : ''}
                                  ${task.status === 'done'        ? 'bg-green-100 text-green-700 border-green-300' : ''}`}
                              >
                                <option value="todo">To Do</option>
                                <option value="in-progress">In Progress</option>
                                <option value="done">Done</option>
                              </select>
                              <ChevronDown className="h-2.5 w-2.5 absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none text-current opacity-60" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {colTasks.length === 0 && (
                    <div
                      className={`h-24 rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-1 text-xs text-muted-foreground transition-colors cursor-pointer hover:border-primary/50 hover:text-primary ${isOver ? 'border-primary bg-primary/5' : 'border-border/40'}`}
                      onClick={() => { setForm(f => ({ ...f, status: col.id })); setShowAdd(true); }}
                    >
                      {isOver ? <span>Drop here</span> : <><Plus className="h-4 w-4 opacity-50" /><span>Add a task</span></>}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Task Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add New Task
            </DialogTitle>
            <DialogDescription>Fill in the details to create a new task on the board.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            {/* Title */}
            <div className="grid gap-1.5">
              <Label htmlFor="task-title">Task Title <span className="text-destructive">*</span></Label>
              <Input
                id="task-title"
                placeholder="e.g. Design landing page mockup"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && handleAddTask()}
                autoFocus
              />
            </div>

            {/* Priority */}
            <div className="grid gap-1.5">
              <Label htmlFor="task-priority">Priority</Label>
              <select
                id="task-priority"
                value={form.priority}
                onChange={e => setForm(f => ({ ...f, priority: e.target.value as Priority }))}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="low">🟢 Low</option>
                <option value="medium">🟡 Medium</option>
                <option value="high">🔴 High</option>
              </select>
            </div>

            {/* Column */}
            <div className="grid gap-1.5">
              <Label htmlFor="task-status">Add to Column</Label>
              <select
                id="task-status"
                value={form.status}
                onChange={e => setForm(f => ({ ...f, status: e.target.value as ColumnStatus }))}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="todo">To Do</option>
                <option value="in-progress">In Progress</option>
                <option value="done">Done</option>
              </select>
            </div>

            {/* Due Date */}
            <div className="grid gap-1.5">
              <Label htmlFor="task-due">Due Date <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input
                id="task-due"
                type="date"
                value={form.dueDate}
                onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={handleAddTask} disabled={!form.title.trim()}>
              <Plus className="h-4 w-4 mr-1" />
              Create Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
