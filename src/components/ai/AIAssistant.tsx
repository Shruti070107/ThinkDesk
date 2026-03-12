import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Sparkles, Loader2, Lightbulb, ListTodo, Target, FileText } from 'lucide-react';
import { AIMessage } from '@/types/workspace';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { cn } from '@/lib/utils';

interface AIAssistantProps {
  isOpen: boolean;
  onClose: () => void;
}

const quickActions = [
  { icon: Lightbulb, label: 'Generate daily plan', prompt: 'Create a daily plan for today based on my goals and tasks' },
  { icon: ListTodo, label: 'Break down goals', prompt: 'Help me break down my current goals into actionable tasks' },
  { icon: Target, label: 'Prioritize tasks', prompt: 'Help me prioritize my pending tasks' },
  { icon: FileText, label: 'Summarize notes', prompt: 'Summarize the key points from my current page' },
];

const demoResponses: Record<string, string> = {
  'Create a daily plan for today based on my goals and tasks': `Here's your optimized daily plan based on your goals:

**Morning Focus Block (9:00 - 12:00)**
1. 🔴 Review PRs by Wednesday *(High Priority)*
2. 📝 Continue MVP development work
3. 📖 30-minute reading session

**Afternoon Sprint (1:00 - 5:00)**
4. 📋 Update documentation
5. 🧪 Start beta testing preparations

**Evening Wind-down**
6. 🧘 Evening meditation
7. 📓 Journal reflection

*This plan aligns with your Q1 MVP launch goal (65% complete) and reading goal (8% complete).*`,

  'Help me break down my current goals into actionable tasks': `Let me break down your goals into actionable tasks:

**Goal: Launch MVP by Q1** (65% complete)
- [ ] Complete remaining frontend features
- [ ] Set up CI/CD pipeline
- [ ] Write unit tests for core components
- [ ] Create user onboarding flow
- [ ] Prepare beta launch checklist

**Goal: Read 24 Books This Year** (8% complete)
- [ ] Finish current book this week
- [ ] Create reading list for next month
- [ ] Schedule 30-min daily reading blocks
- [ ] Join a book club for accountability

**Goal: Build Consistent Habits** (40% complete)
- [ ] Define morning routine checklist
- [ ] Set up habit tracking in this workspace
- [ ] Create evening review ritual
- [ ] Identify habit triggers and rewards`,

  'Help me prioritize my pending tasks': `Based on urgency and importance, here's your prioritized task list:

**🔴 High Priority (Do First)**
1. Review PRs by Wednesday - *Deadline approaching*
2. MVP development - *Critical for Q1 goal*

**🟡 Medium Priority (Schedule)**
3. Update documentation - *Important but flexible*
4. Beta testing preparations - *Depends on MVP*

**🟢 Lower Priority (When Possible)**
5. Read for 30 minutes - *Personal goal, flexible timing*

**Pro Tips:**
- Block 2 hours tomorrow morning for PR reviews
- Pair documentation with testing prep
- Use reading as an end-of-day reward`,

  'Summarize the key points from my current page': `Here's a summary of your current page:

**Getting Started - Key Points**

📌 **Main Purpose:** Personal productivity hub for organizing thoughts, tracking tasks, and achieving goals.

📌 **Quick Tips Covered:**
- Use / command for block types
- AI assistant available for smart suggestions
- Nested pages help organization

📌 **Notable Quote:**
> "The secret of getting ahead is getting started." — Mark Twain

**Suggested Actions:**
1. Complete the remaining onboarding todos
2. Explore the AI assistant features
3. Create your first nested page structure`,
};

export function AIAssistant({ isOpen, onClose }: AIAssistantProps) {
  const [messages, setMessages] = useState<AIMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Hi! I\'m your AI assistant. I can help you plan your day, break down goals, prioritize tasks, and summarize your notes. What would you like to work on?',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { workspace, currentPage } = useWorkspace();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (content: string = input) => {
    if (!content.trim() || isLoading) return;

    const userMessage: AIMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Simulate AI response
    setTimeout(() => {
      const response = demoResponses[content.trim()] || 
        `I understand you want to: "${content}"\n\nBased on your workspace, here are some thoughts:\n\n• You have ${workspace.tasks.filter(t => !t.completed).length} pending tasks\n• ${workspace.goals.length} active goals to track\n• Your current page is "${currentPage?.title || 'Unknown'}"\n\nWould you like me to help you with any of these specifically?`;

      const assistantMessage: AIMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 1500);
  };

  const handleQuickAction = (prompt: string) => {
    handleSend(prompt);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-background border-l border-border shadow-xl z-50 flex flex-col animate-slide-in">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg ai-gradient flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">AI Assistant</h3>
            <p className="text-xs text-muted-foreground">Powered by AI</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-md hover:bg-muted transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              'flex',
              message.role === 'user' ? 'justify-end' : 'justify-start'
            )}
          >
            <div
              className={cn(
                'max-w-[85%] rounded-2xl px-4 py-2.5 text-sm',
                message.role === 'user'
                  ? 'bg-primary text-primary-foreground rounded-br-md'
                  : 'bg-muted rounded-bl-md'
              )}
            >
              <div className="whitespace-pre-wrap">{message.content}</div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      {messages.length <= 2 && (
        <div className="px-4 pb-2">
          <div className="text-xs font-medium text-muted-foreground mb-2">Quick actions</div>
          <div className="grid grid-cols-2 gap-2">
            {quickActions.map((action) => (
              <button
                key={action.label}
                onClick={() => handleQuickAction(action.prompt)}
                className="flex items-center gap-2 p-2.5 text-left text-sm bg-muted hover:bg-muted/80 rounded-lg transition-colors"
              >
                <action.icon className="h-4 w-4 text-violet-500 flex-shrink-0" />
                <span className="line-clamp-1">{action.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-2 bg-muted rounded-xl px-4 py-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask AI anything..."
            className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-muted-foreground"
            disabled={isLoading}
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading}
            className={cn(
              'p-1.5 rounded-lg transition-colors',
              input.trim() && !isLoading
                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                : 'text-muted-foreground'
            )}
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        <p className="text-xs text-center text-muted-foreground mt-2">
          AI responses are simulated for demo purposes
        </p>
      </div>
    </div>
  );
}
