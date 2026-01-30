import { ListItemNode, ListNode } from '@lexical/list';
import {
  $convertFromMarkdownString,
  $convertToMarkdownString,
  BOLD_ITALIC_STAR,
  BOLD_ITALIC_UNDERSCORE,
  BOLD_STAR,
  BOLD_UNDERSCORE,
  HEADING,
  INLINE_CODE,
  ITALIC_STAR,
  ITALIC_UNDERSCORE,
  ORDERED_LIST,
  QUOTE,
  STRIKETHROUGH,
  UNORDERED_LIST,
} from '@lexical/markdown';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { $getRoot, COMMAND_PRIORITY_LOW, PASTE_COMMAND } from 'lexical';
import React, { useEffect } from 'react';

// Custom transformers that only include nodes we have registered (excludes CodeNode)
const MARKDOWN_TRANSFORMERS = [
  HEADING,
  QUOTE,
  ORDERED_LIST,
  UNORDERED_LIST,
  BOLD_ITALIC_STAR,
  BOLD_ITALIC_UNDERSCORE,
  BOLD_STAR,
  BOLD_UNDERSCORE,
  INLINE_CODE,
  ITALIC_STAR,
  ITALIC_UNDERSCORE,
  STRIKETHROUGH,
];

interface MindspaceEditorProps {
  onContentChange?: (content: string) => void;
  placeholder?: string;
  toolbarSlot: React.ReactNode;
  readOnly?: boolean;
  initialContent?: string;
}

// Auto Focus Plugin
function AutoFocusPlugin() {
  const [editor] = useLexicalComposerContext();

  React.useEffect(() => {
    editor.focus();
  }, [editor]);

  return null;
}

// Initial Content Plugin - loads markdown content on mount or when initialContent changes
function InitialContentPlugin({ initialContent }: { initialContent?: string }) {
  const [editor] = useLexicalComposerContext();
  const previousContentRef = React.useRef<string | undefined>(undefined);

  useEffect(() => {
    // Load content if it's different from the previous content
    if (
      initialContent !== undefined &&
      initialContent !== previousContentRef.current
    ) {
      previousContentRef.current = initialContent;
      editor.update(() => {
        // Clear existing content first
        const root = $getRoot();
        root.clear();
        // Load new markdown content
        $convertFromMarkdownString(initialContent, MARKDOWN_TRANSFORMERS);
      });
    }
  }, [editor, initialContent]);

  return null;
}

// Markdown Paste Plugin - handles pasting markdown content
function MarkdownPastePlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerCommand(
      PASTE_COMMAND,
      (event: ClipboardEvent) => {
        const clipboardData = event.clipboardData;
        if (!clipboardData) return false;

        const text = clipboardData.getData('text/plain');

        // Check if the pasted text looks like markdown
        const markdownPatterns = [
          /^#{1,6}\s/m, // Headers
          /^\*\s|\s|\+\s/m, // Unordered lists
          /^\d+\.\s/m, // Ordered lists
          /\*\*[^*]+\*\*/, // Bold
          /\*[^*]+\*/, // Italic
          /^>\s/m, // Blockquotes
          /`[^`]+`/, // Inline code
          /\[.+\]\(.+\)/, // Links
        ];

        const looksLikeMarkdown = markdownPatterns.some((pattern) =>
          pattern.test(text),
        );

        if (looksLikeMarkdown && text.trim()) {
          event.preventDefault();

          editor.update(() => {
            $convertFromMarkdownString(text, MARKDOWN_TRANSFORMERS);
          });

          return true;
        }

        return false;
      },
      COMMAND_PRIORITY_LOW,
    );
  }, [editor]);

  return null;
}

// Content Change Plugin - exports content as markdown
function ContentChangePlugin({
  onContentChange,
}: {
  onContentChange?: (content: string) => void;
}) {
  const onChange = (editorState: any) => {
    editorState.read(() => {
      const markdown = $convertToMarkdownString(MARKDOWN_TRANSFORMERS);
      onContentChange?.(markdown);
    });
  };

  return <OnChangePlugin onChange={onChange} />;
}

export const MindspaceEditor: React.FC<MindspaceEditorProps> = ({
  onContentChange,
  placeholder = 'Start writing...',
  toolbarSlot,
  readOnly = false,
  initialContent,
}) => {
  const editorConfig = {
    namespace: 'MindspaceEditor',
    editable: !readOnly,
    theme: {
      heading: {
        h1: 'text-2xl font-bold text-neutral-grayscale-90 mb-loop-4',
        h2: 'text-xl font-semibold text-neutral-grayscale-90 mb-loop-3',
        h3: 'text-lg font-medium text-neutral-grayscale-90 mb-loop-2',
      },
      text: {
        bold: 'font-bold',
        italic: 'italic',
        underline: 'underline',
      },
      paragraph:
        'text-base text-neutral-grayscale-80 mb-loop-2 leading-relaxed',
      quote:
        'text-base text-neutral-grayscale-70 mb-loop-2 pl-loop-4 border-l-4 border-brand-accent-50 italic',
      list: {
        nested: {
          listitem: 'list-none',
        },
        ol: 'list-decimal ml-loop-4 text-base',
        ul: 'list-disc ml-loop-4 text-base',
        listitem: 'mb-loop-1 text-base text-neutral-grayscale-80',
      },
      link: 'text-brand-accent-50 underline hover:text-brand-accent-60',
    },
    nodes: [HeadingNode, QuoteNode, ListNode, ListItemNode],
    onError: (error: Error) => {
      console.error('Lexical Error:', error);
    },
  };

  return (
    <LexicalComposer initialConfig={editorConfig}>
      {/* Render toolbar slot as-is */}
      {toolbarSlot}

      {/* Editor Content */}
      <div className="flex-1 overflow-hidden mt-loop-2 relative">
        <RichTextPlugin
          contentEditable={
            <ContentEditable
              className={`flex-1 outline-none px-loop-8 py-loop-4 overflow-y-auto min-h-full focus:outline-none h-full ${
                readOnly ? 'cursor-default bg-neutral-grayscale-10' : ''
              }`}
              style={{ minHeight: '200px' }}
              aria-placeholder={placeholder}
              placeholder={
                <div className="absolute top-loop-4 left-loop-8 text-neutral-grayscale-50 text-base pointer-events-none">
                  {placeholder}
                </div>
              }
            />
          }
          ErrorBoundary={LexicalErrorBoundary}
        />
      </div>

      {/* Plugins */}
      <HistoryPlugin />
      <ListPlugin />
      <MarkdownShortcutPlugin transformers={MARKDOWN_TRANSFORMERS} />
      <MarkdownPastePlugin />
      <InitialContentPlugin initialContent={initialContent} />
      {!readOnly && <AutoFocusPlugin />}
      <ContentChangePlugin onContentChange={onContentChange} />
    </LexicalComposer>
  );
};
