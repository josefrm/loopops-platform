import {
  $isListNode,
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  REMOVE_LIST_COMMAND,
} from '@lexical/list';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $createHeadingNode,
  $createQuoteNode,
  $isHeadingNode,
  $isQuoteNode,
  HeadingTagType,
} from '@lexical/rich-text';
import { mergeRegister } from '@lexical/utils';
import {
  $createParagraphNode,
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_LOW,
  FORMAT_TEXT_COMMAND,
  SELECTION_CHANGE_COMMAND,
} from 'lexical';
import { useCallback, useEffect, useState } from 'react';

// Lucide icons
import { Bold, Italic, List, ListOrdered, Underline } from 'lucide-react';

type BlockType = 'paragraph' | 'h1' | 'h2' | 'h3' | 'quote' | 'ul' | 'ol';

export function ToolbarPlugin() {
  const [editor] = useLexicalComposerContext();

  // Format states
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [blockType, setBlockType] = useState<BlockType>('paragraph');

  const $updateToolbar = useCallback(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      // Update text format states
      setIsBold(selection.hasFormat('bold'));
      setIsItalic(selection.hasFormat('italic'));
      setIsUnderline(selection.hasFormat('underline'));

      // Update block type
      const anchorNode = selection.anchor.getNode();
      const element =
        anchorNode.getKey() === 'root'
          ? anchorNode
          : anchorNode.getTopLevelElementOrThrow();

      const elementKey = element.getKey();
      const elementDOM = editor.getElementByKey(elementKey);

      if (elementDOM !== null) {
        if ($isListNode(element)) {
          const parentList = element;
          const type = parentList.getListType();
          setBlockType(type === 'bullet' ? 'ul' : 'ol');
        } else {
          const type = element.getType();
          if (type in blockTypeToBlockName) {
            setBlockType(type as keyof typeof blockTypeToBlockName);
          }
          if ($isHeadingNode(element)) {
            const tag = element.getTag();
            if (tag === 'h1' || tag === 'h2' || tag === 'h3') {
              setBlockType(tag);
            }
          }
        }
      }
    }
  }, [editor]);

  useEffect(() => {
    return mergeRegister(
      editor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => {
          $updateToolbar();
        });
      }),
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        () => {
          $updateToolbar();
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
    );
  }, [editor, $updateToolbar]);

  const formatText = (format: 'bold' | 'italic' | 'underline') => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, format);
  };

  const formatParagraph = () => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        const anchorNode = selection.anchor.getNode();
        const element = anchorNode.getTopLevelElementOrThrow();

        if ($isHeadingNode(element) || $isQuoteNode(element)) {
          const paragraph = $createParagraphNode();
          paragraph.append(...element.getChildren());
          element.replace(paragraph);
        }
      }
    });
  };

  const formatHeading = (headingSize: HeadingTagType) => {
    if (blockType !== headingSize) {
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          const anchorNode = selection.anchor.getNode();
          const element = anchorNode.getTopLevelElementOrThrow();

          const heading = $createHeadingNode(headingSize);
          heading.append(...element.getChildren());
          element.replace(heading);
        }
      });
    }
  };

  const formatQuote = () => {
    if (blockType !== 'quote') {
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          const anchorNode = selection.anchor.getNode();
          const element = anchorNode.getTopLevelElementOrThrow();

          const quote = $createQuoteNode();
          quote.append(...element.getChildren());
          element.replace(quote);
        }
      });
    }
  };

  const formatBulletList = () => {
    if (blockType !== 'ul') {
      editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
    } else {
      editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined);
    }
  };

  const formatNumberedList = () => {
    if (blockType !== 'ol') {
      editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
    } else {
      editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined);
    }
  };

  const handleElementTypeChange = (value: string) => {
    switch (value) {
      case 'paragraph':
        formatParagraph();
        break;
      case 'h1':
      case 'h2':
      case 'h3':
        formatHeading(value as HeadingTagType);
        break;
      case 'quote':
        formatQuote();
        break;
    }
  };

  return (
    <div className="flex items-center gap-loop-2">
      {/* Element Type Selector */}
      <select
        value={blockType}
        onChange={(e) => handleElementTypeChange(e.target.value)}
        className="px-loop-2 py-loop-1 text-sm border border-neutral-grayscale-30 rounded-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-accent-50"
      >
        <option value="paragraph">Paragraph</option>
        <option value="h1">Heading 1</option>
        <option value="h2">Heading 2</option>
        <option value="h3">Heading 3</option>
        <option value="quote">Quote</option>
      </select>

      <div className="w-px h-loop-4 bg-neutral-grayscale-30" />

      {/* Format Buttons */}
      <button
        onClick={() => formatText('bold')}
        className={`flex items-center justify-center w-loop-6 h-loop-6 text-neutral-grayscale-60 hover:text-neutral-grayscale-90 hover:bg-neutral-grayscale-20 rounded-sm transition-colors ${
          isBold ? 'bg-neutral-grayscale-20 text-neutral-grayscale-90' : ''
        }`}
        title="Bold"
        aria-label="Format Bold"
      >
        <Bold size={14} />
      </button>

      <button
        onClick={() => formatText('italic')}
        className={`flex items-center justify-center w-loop-6 h-loop-6 text-neutral-grayscale-60 hover:text-neutral-grayscale-90 hover:bg-neutral-grayscale-20 rounded-sm transition-colors ${
          isItalic ? 'bg-neutral-grayscale-20 text-neutral-grayscale-90' : ''
        }`}
        title="Italic"
        aria-label="Format Italic"
      >
        <Italic size={14} />
      </button>

      <button
        onClick={() => formatText('underline')}
        className={`flex items-center justify-center w-loop-6 h-loop-6 text-neutral-grayscale-60 hover:text-neutral-grayscale-90 hover:bg-neutral-grayscale-20 rounded-sm transition-colors ${
          isUnderline ? 'bg-neutral-grayscale-20 text-neutral-grayscale-90' : ''
        }`}
        title="Underline"
        aria-label="Format Underline"
      >
        <Underline size={14} />
      </button>

      <div className="w-px h-loop-4 bg-neutral-grayscale-30" />

      {/* List Buttons */}
      <button
        onClick={formatBulletList}
        className={`flex items-center justify-center w-loop-6 h-loop-6 text-neutral-grayscale-60 hover:text-neutral-grayscale-90 hover:bg-neutral-grayscale-20 rounded-sm transition-colors ${
          blockType === 'ul'
            ? 'bg-neutral-grayscale-20 text-neutral-grayscale-90'
            : ''
        }`}
        title="Bullet List"
        aria-label="Bullet List"
      >
        <List size={14} />
      </button>

      <button
        onClick={formatNumberedList}
        className={`flex items-center justify-center w-loop-6 h-loop-6 text-neutral-grayscale-60 hover:text-neutral-grayscale-90 hover:bg-neutral-grayscale-20 rounded-sm transition-colors ${
          blockType === 'ol'
            ? 'bg-neutral-grayscale-20 text-neutral-grayscale-90'
            : ''
        }`}
        title="Numbered List"
        aria-label="Numbered List"
      >
        <ListOrdered size={14} />
      </button>
    </div>
  );
}

// Helper mapping for block types
const blockTypeToBlockName = {
  paragraph: 'Paragraph',
  h1: 'Heading 1',
  h2: 'Heading 2',
  h3: 'Heading 3',
  quote: 'Quote',
};
