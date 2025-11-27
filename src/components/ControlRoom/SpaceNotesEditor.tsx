import { useCallback, useEffect, useRef } from 'react';
import { LexicalComposer, InitialConfigType } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { ListNode, ListItemNode } from '@lexical/list';
import { CodeNode } from '@lexical/code';
import { LinkNode } from '@lexical/link';
import { HorizontalRuleNode } from '@lexical/react/LexicalHorizontalRuleNode';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { TRANSFORMERS } from '@lexical/markdown';
import type { EditorState } from 'lexical';
import { spacesActions } from '@/stores/spaces.store';
import { cn } from '@/lib/utils';

interface SpaceNotesEditorProps {
  spaceId: string;
  initialContent?: string;
}

const theme = {
  ltr: 'text-left',
  rtl: 'text-right',
  paragraph: 'mb-1 text-sm leading-relaxed',
  heading: {
    h1: 'text-xl font-bold mb-2',
    h2: 'text-lg font-semibold mb-2',
    h3: 'text-base font-semibold mb-1',
  },
  quote: 'border-l-2 border-border pl-3 italic text-muted-foreground',
  list: {
    ul: 'list-disc list-inside ml-2',
    ol: 'list-decimal list-inside ml-2',
    listitem: 'mb-0.5',
  },
  text: {
    bold: 'font-bold',
    italic: 'italic',
    underline: 'underline',
    strikethrough: 'line-through',
    code: 'bg-muted px-1 py-0.5 rounded text-xs font-mono',
  },
};

const nodes = [HeadingNode, QuoteNode, ListNode, ListItemNode, CodeNode, LinkNode, HorizontalRuleNode];

export function SpaceNotesEditor({ spaceId, initialContent }: SpaceNotesEditorProps) {
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const editorConfig: InitialConfigType = {
    namespace: `space-notes-${spaceId}`,
    theme,
    nodes,
    editorState: initialContent || undefined,
    onError: (error: Error) => {
      console.error('Lexical error:', error);
    },
  };

  // Debounced save
  const handleChange = useCallback(
    (editorState: EditorState) => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        const json = JSON.stringify(editorState.toJSON());
        spacesActions.setSpaceNotesContent(spaceId, json);
      }, 500);
    },
    [spaceId]
  );

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return (
    <LexicalComposer initialConfig={editorConfig}>
      <div className="relative flex-1 flex flex-col min-h-0">
        <RichTextPlugin
          contentEditable={
            <ContentEditable
              className={cn(
                'flex-1 outline-none overflow-y-auto p-2',
                'text-sm text-foreground',
                'focus:outline-none'
              )}
              aria-placeholder="Write notes, ideas, or anything..."
            />
          }
          placeholder={
            <div className="absolute top-2 left-2 text-sm text-muted-foreground pointer-events-none">
              Write notes... (use # for headings, - for lists)
            </div>
          }
          ErrorBoundary={LexicalErrorBoundary}
        />
        <HistoryPlugin />
        <ListPlugin />
        <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
        <OnChangePlugin onChange={handleChange} ignoreSelectionChange />
      </div>
    </LexicalComposer>
  );
}
