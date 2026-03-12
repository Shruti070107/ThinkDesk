import React from 'react';
import { Plus, MoreHorizontal, MessageSquare } from 'lucide-react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { BlockEditor } from './BlockEditor';
import { Block, BlockType } from '@/types/workspace';
import { cn } from '@/lib/utils';

interface PageEditorProps {
  onOpenAI: () => void;
}

export function PageEditor({ onOpenAI }: PageEditorProps) {
  const { currentPage, updatePage, addBlock } = useWorkspace();

  if (!currentPage) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-center text-muted-foreground">
          <p>Select a page to get started</p>
        </div>
      </div>
    );
  }

  const handleAddBlock = (type: BlockType = 'text') => {
    const newBlock: Block = {
      id: `block-${Date.now()}`,
      type,
      content: '',
    };
    addBlock(currentPage.id, newBlock);
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updatePage(currentPage.id, { title: e.target.value });
  };

  return (
    <div className="flex-1 overflow-y-auto bg-background">
      <div className="max-w-3xl mx-auto px-16 py-12">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <span className="text-5xl cursor-pointer hover:scale-110 transition-transform">
              {currentPage.icon || '📄'}
            </span>
          </div>
          <input
            type="text"
            value={currentPage.title}
            onChange={handleTitleChange}
            className="text-4xl font-bold bg-transparent border-none focus:outline-none w-full placeholder:text-muted-foreground/40"
            placeholder="Untitled"
          />
          <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
            <span>
              Updated {currentPage.updatedAt.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
            <button
              onClick={onOpenAI}
              className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-muted transition-colors"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span>Ask AI</span>
            </button>
          </div>
        </div>

        {/* Blocks */}
        <div className="space-y-1 pl-8">
          {currentPage.blocks.map((block) => (
            <BlockEditor key={block.id} block={block} pageId={currentPage.id} />
          ))}
        </div>

        {/* Add Block Button */}
        <div className="mt-4 pl-8">
          <button
            onClick={() => handleAddBlock('text')}
            className="flex items-center gap-2 px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted rounded-md transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Add a block</span>
          </button>
        </div>

        {/* Block Type Menu */}
        <div className="mt-8 pl-8">
          <div className="text-xs font-medium text-muted-foreground mb-2">Quick add</div>
          <div className="flex flex-wrap gap-2">
            {[
              { type: 'text' as BlockType, label: 'Text', icon: 'Aa' },
              { type: 'heading1' as BlockType, label: 'H1', icon: 'H₁' },
              { type: 'heading2' as BlockType, label: 'H2', icon: 'H₂' },
              { type: 'todo' as BlockType, label: 'Todo', icon: '☐' },
              { type: 'quote' as BlockType, label: 'Quote', icon: '❝' },
              { type: 'code' as BlockType, label: 'Code', icon: '</>' },
              { type: 'divider' as BlockType, label: 'Divider', icon: '—' },
            ].map(({ type, label, icon }) => (
              <button
                key={type}
                onClick={() => handleAddBlock(type)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm bg-muted hover:bg-muted/80 rounded-md transition-colors"
              >
                <span className="font-mono text-xs text-muted-foreground">{icon}</span>
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
