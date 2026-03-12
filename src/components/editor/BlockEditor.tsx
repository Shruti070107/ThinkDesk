import React, { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { GripVertical, Plus, Trash2, Check } from 'lucide-react';
import { Block, BlockType } from '@/types/workspace';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { cn } from '@/lib/utils';

interface BlockEditorProps {
  block: Block;
  pageId: string;
}

const blockTypeStyles: Record<BlockType, string> = {
  text: 'text-base',
  heading1: 'text-3xl font-bold',
  heading2: 'text-2xl font-semibold',
  heading3: 'text-xl font-medium',
  todo: 'text-base',
  toggle: 'text-base font-medium',
  code: 'font-mono text-sm bg-muted p-3 rounded-md',
  divider: '',
  quote: 'text-lg italic border-l-2 border-muted-foreground/30 pl-4 text-muted-foreground',
};

export function BlockEditor({ block, pageId }: BlockEditorProps) {
  const { updateBlock, addBlock, deleteBlock } = useWorkspace();
  const [content, setContent] = useState(block.content);
  const [isEditing, setIsEditing] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setContent(block.content);
  }, [block.content]);

  const handleBlur = () => {
    setIsEditing(false);
    if (content !== block.content) {
      updateBlock(pageId, block.id, { content });
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleBlur();
      const newBlock: Block = {
        id: `block-${Date.now()}`,
        type: 'text',
        content: '',
      };
      addBlock(pageId, newBlock, block.id);
    }

    if (e.key === 'Backspace' && content === '' && block.type !== 'heading1') {
      e.preventDefault();
      deleteBlock(pageId, block.id);
    }
  };

  const handleToggleCheck = () => {
    updateBlock(pageId, block.id, { checked: !block.checked });
  };

  if (block.type === 'divider') {
    return (
      <div className="block-wrapper py-2 group">
        <div className="block-handle">
          <GripVertical className="h-4 w-4 text-muted-foreground/50" />
        </div>
        <hr className="border-border" />
      </div>
    );
  }

  return (
    <div className="block-wrapper group relative">
      <div className="block-handle flex items-center gap-0.5">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="p-0.5 rounded hover:bg-muted transition-colors"
        >
          <Plus className="h-4 w-4 text-muted-foreground/50" />
        </button>
        <div className="cursor-grab p-0.5 rounded hover:bg-muted transition-colors">
          <GripVertical className="h-4 w-4 text-muted-foreground/50" />
        </div>
      </div>

      <div className="flex items-start gap-2">
        {block.type === 'todo' && (
          <button
            onClick={handleToggleCheck}
            className={cn(
              'mt-1 w-4 h-4 rounded border flex items-center justify-center transition-colors',
              block.checked
                ? 'bg-primary border-primary'
                : 'border-border hover:border-muted-foreground'
            )}
          >
            {block.checked && <Check className="h-3 w-3 text-primary-foreground" />}
          </button>
        )}

        <div className="flex-1">
          {isEditing ? (
            <textarea
              ref={inputRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              className={cn(
                'w-full bg-transparent resize-none focus:outline-none',
                blockTypeStyles[block.type],
                block.checked && 'line-through text-muted-foreground'
              )}
              autoFocus
              rows={1}
              style={{ minHeight: '1.5em' }}
            />
          ) : (
            <div
              onClick={() => setIsEditing(true)}
              className={cn(
                'cursor-text min-h-[1.5em]',
                blockTypeStyles[block.type],
                block.checked && 'line-through text-muted-foreground',
                !content && 'text-muted-foreground/50'
              )}
            >
              {content || getPlaceholder(block.type)}
            </div>
          )}
        </div>

        <button
          onClick={() => deleteBlock(pageId, block.id)}
          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 hover:text-destructive transition-all"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function getPlaceholder(type: BlockType): string {
  switch (type) {
    case 'heading1':
      return 'Heading 1';
    case 'heading2':
      return 'Heading 2';
    case 'heading3':
      return 'Heading 3';
    case 'todo':
      return 'To-do';
    case 'quote':
      return 'Quote';
    case 'code':
      return 'Code';
    default:
      return 'Type something...';
  }
}
