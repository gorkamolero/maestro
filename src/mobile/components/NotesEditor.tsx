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
import { api } from '../lib/api';

interface NotesEditorProps {
  spaceId: string;
  initialContent?: string;
}

const theme = {
  ltr: 'text-left',
  rtl: 'text-right',
  paragraph: 'mb-1 text-[13px] leading-relaxed text-[--text-primary]',
  heading: {
    h1: 'text-base font-bold mb-2 text-[--text-primary]',
    h2: 'text-[15px] font-semibold mb-2 text-[--text-primary]',
    h3: 'text-[14px] font-semibold mb-1 text-[--text-primary]',
  },
  quote: 'border-l-2 border-white/20 pl-3 italic text-[--text-secondary]',
  list: {
    ul: 'list-disc list-inside ml-2',
    ol: 'list-decimal list-inside ml-2',
    listitem: 'mb-0.5 text-[13px]',
  },
  text: {
    bold: 'font-bold',
    italic: 'italic',
    underline: 'underline',
    strikethrough: 'line-through',
    code: 'bg-white/[0.08] px-1 py-0.5 rounded text-[11px] font-mono',
  },
};

const nodes = [
  HeadingNode,
  QuoteNode,
  ListNode,
  ListItemNode,
  CodeNode,
  LinkNode,
  HorizontalRuleNode,
];

export function NotesEditor({ spaceId, initialContent }: NotesEditorProps) {
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const editorConfig: InitialConfigType = {
    namespace: `mobile-notes-${spaceId}`,
    theme,
    nodes,
    editorState: initialContent || undefined,
    onError: (error: Error) => {
      console.error('Lexical error:', error);
    },
  };

  // Debounced save via API
  const handleChange = useCallback(
    (editorState: EditorState) => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(async () => {
        const json = JSON.stringify(editorState.toJSON());
        try {
          await api.put(`/api/spaces/${spaceId}/notes`, { content: json });
        } catch (err) {
          console.error('Failed to save notes:', err);
        }
      }, 800);
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
              className="flex-1 min-h-0 outline-none overflow-y-auto py-2 text-[13px] focus:outline-none"
              aria-placeholder="Write notes..."
            />
          }
          placeholder={
            <div
              className="absolute top-2 left-0 text-[13px] pointer-events-none"
              style={{ color: 'rgba(255,255,255,0.3)' }}
            >
              Notes... (# heading, - list, **bold**)
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
