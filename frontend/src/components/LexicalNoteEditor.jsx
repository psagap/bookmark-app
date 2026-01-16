import React, { useEffect, useCallback, useState } from 'react';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { AutoFocusPlugin } from '@lexical/react/LexicalAutoFocusPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $getRoot,
  $getSelection,
  $isRangeSelection,
  $createParagraphNode,
  $createTextNode,
  COMMAND_PRIORITY_LOW,
  COMMAND_PRIORITY_HIGH,
  KEY_ENTER_COMMAND,
  PASTE_COMMAND,
  INDENT_CONTENT_COMMAND,
  OUTDENT_CONTENT_COMMAND,
  KEY_TAB_COMMAND,
} from 'lexical';
import { HeadingNode, QuoteNode, $createHeadingNode, $createQuoteNode } from '@lexical/rich-text';
import { ListNode, ListItemNode, $createListNode, $createListItemNode, $isListItemNode } from '@lexical/list';
import { CodeNode, CodeHighlightNode } from '@lexical/code';
import { LinkNode, AutoLinkNode } from '@lexical/link';
import {
  TRANSFORMERS,
  HEADING,
  QUOTE,
  UNORDERED_LIST,
  ORDERED_LIST,
  CODE,
  $convertFromMarkdownString,
} from '@lexical/markdown';
import { $generateHtmlFromNodes, $generateNodesFromDOM } from '@lexical/html';
import { cn } from '@/lib/utils';

// ============================================================================
// THEME - Brand-aligned styling
// ============================================================================
const editorTheme = {
  root: 'lexical-editor-root',
  paragraph: 'lexical-paragraph',
  heading: {
    h1: 'lexical-heading-h1',
    h2: 'lexical-heading-h2',
    h3: 'lexical-heading-h3',
  },
  list: {
    nested: {
      listitem: 'lexical-nested-listitem',
    },
    ol: 'lexical-list-ol',
    ul: 'lexical-list-ul',
    listitem: 'lexical-listitem',
  },
  quote: 'lexical-quote',
  code: 'lexical-code',
  codeHighlight: {
    atrule: 'lexical-tokenAttr',
    attr: 'lexical-tokenAttr',
    boolean: 'lexical-tokenProperty',
    builtin: 'lexical-tokenSelector',
    cdata: 'lexical-tokenComment',
    char: 'lexical-tokenSelector',
    class: 'lexical-tokenFunction',
    'class-name': 'lexical-tokenFunction',
    comment: 'lexical-tokenComment',
    constant: 'lexical-tokenProperty',
    deleted: 'lexical-tokenProperty',
    doctype: 'lexical-tokenComment',
    entity: 'lexical-tokenOperator',
    function: 'lexical-tokenFunction',
    important: 'lexical-tokenVariable',
    inserted: 'lexical-tokenSelector',
    keyword: 'lexical-tokenAttr',
    namespace: 'lexical-tokenVariable',
    number: 'lexical-tokenProperty',
    operator: 'lexical-tokenOperator',
    prolog: 'lexical-tokenComment',
    property: 'lexical-tokenProperty',
    punctuation: 'lexical-tokenPunctuation',
    regex: 'lexical-tokenVariable',
    selector: 'lexical-tokenSelector',
    string: 'lexical-tokenSelector',
    symbol: 'lexical-tokenProperty',
    tag: 'lexical-tokenProperty',
    url: 'lexical-tokenOperator',
    variable: 'lexical-tokenVariable',
  },
  text: {
    bold: 'lexical-text-bold',
    italic: 'lexical-text-italic',
    underline: 'lexical-text-underline',
    strikethrough: 'lexical-text-strikethrough',
    code: 'lexical-text-code',
  },
  link: 'lexical-link',
};

// ============================================================================
// PLACEHOLDER COMPONENT
// ============================================================================
function Placeholder() {
  return (
    <div className="lexical-placeholder">
      Start writing your note...
    </div>
  );
}

// ============================================================================
// CONTENT EXTRACTOR PLUGIN
// ============================================================================
function ContentExtractorPlugin({ onContentChange }) {
  const [editor] = useLexicalComposerContext();

  const extractContent = useCallback(() => {
    editor.getEditorState().read(() => {
      const root = $getRoot();
      const textContent = root.getTextContent();

      // Generate HTML
      const htmlString = $generateHtmlFromNodes(editor, null);

      // Generate JSON state for lossless round-trip
      const editorStateJson = editor.getEditorState().toJSON();

      onContentChange({
        text: textContent,
        html: htmlString,
        json: editorStateJson,
      });
    });
  }, [editor, onContentChange]);

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      extractContent();
    });
  }, [editor, extractContent]);

  return null;
}

// ============================================================================
// INITIAL CONTENT LOADER PLUGIN
// ============================================================================
function InitialContentPlugin({ initialContent }) {
  const [editor] = useLexicalComposerContext();
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    if (initialContent && !hasLoaded) {
      // Prefer JSON state for lossless round-trip (preserves nested lists, formatting)
      if (initialContent.json) {
        try {
          const editorState = editor.parseEditorState(initialContent.json);
          editor.setEditorState(editorState);
          setHasLoaded(true);
          return;
        } catch (e) {
          console.warn('Failed to parse JSON editor state, falling back to HTML/text:', e);
        }
      }

      // Fallback: load from HTML or text
      editor.update(() => {
        const root = $getRoot();
        root.clear();

        // If HTML content, parse it
        if (initialContent.html) {
          const parser = new DOMParser();
          const dom = parser.parseFromString(initialContent.html, 'text/html');
          const nodes = $generateNodesFromDOM(editor, dom);
          root.append(...nodes);
        } else if (initialContent.text) {
          // Plain text - split by newlines and create paragraphs
          const lines = initialContent.text.split('\n');
          lines.forEach((line, index) => {
            const paragraph = $createParagraphNode();
            if (line) {
              paragraph.append($createTextNode(line));
            }
            root.append(paragraph);
          });
        }
      });
      setHasLoaded(true);
    }
  }, [editor, initialContent, hasLoaded]);

  return null;
}

// ============================================================================
// MARKDOWN PASTE PLUGIN
// Converts pasted markdown text to rich text
// ============================================================================
function MarkdownPastePlugin({ transformers }) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    // Check if text looks like markdown
    const looksLikeMarkdown = (text) => {
      const markdownPatterns = [
        /^#{1,6}\s+/m,           // Headings: # ## ### etc
        /^\s*[-*+]\s+/m,         // Unordered lists: - * +
        /^\s*\d+\.\s+/m,         // Ordered lists: 1. 2. etc
        /^\s*>\s+/m,             // Blockquotes: >
        /```[\s\S]*```/,         // Code blocks: ```code```
        /`[^`]+`/,               // Inline code: `code`
        /\*\*[^*]+\*\*/,         // Bold: **text**
        /\*[^*]+\*/,             // Italic: *text*
        /__[^_]+__/,             // Bold: __text__
        /_[^_]+_/,               // Italic: _text_
        /\[([^\]]+)\]\(([^)]+)\)/, // Links: [text](url)
      ];

      return markdownPatterns.some(pattern => pattern.test(text));
    };

    const removeListener = editor.registerCommand(
      PASTE_COMMAND,
      (event) => {
        const clipboardData = event instanceof ClipboardEvent ? event.clipboardData : null;
        if (!clipboardData) return false;

        const text = clipboardData.getData('text/plain');

        // Only process if it looks like markdown
        if (!text || !looksLikeMarkdown(text)) {
          return false; // Let default paste handling take over
        }

        // Prevent default paste
        event.preventDefault();

        // Convert markdown to Lexical nodes
        editor.update(() => {
          const selection = $getSelection();

          if ($isRangeSelection(selection)) {
            // Delete selected content first
            selection.removeText();
          }

          // Convert markdown string to nodes and insert
          $convertFromMarkdownString(text, transformers);
        });

        return true; // We handled the paste
      },
      COMMAND_PRIORITY_HIGH
    );

    return () => {
      removeListener();
    };
  }, [editor, transformers]);

  return null;
}

// ============================================================================
// TAB INDENT PLUGIN
// Indents the entire list item (bullet + text move together) without nesting
// ============================================================================
function TabIndentPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    const removeListener = editor.registerCommand(
      KEY_TAB_COMMAND,
      (event) => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) return false;

        event.preventDefault();

        editor.update(() => {
          const nodes = selection.getNodes();

          for (const node of nodes) {
            // Find the list item node
            let listItem = node;
            while (listItem && !$isListItemNode(listItem)) {
              listItem = listItem.getParent();
            }

            if ($isListItemNode(listItem)) {
              // Get current indent and adjust
              const currentIndent = listItem.getIndent();
              if (event.shiftKey) {
                // Shift+Tab: decrease indent (min 0)
                listItem.setIndent(Math.max(0, currentIndent - 1));
              } else {
                // Tab: increase indent (max 7 levels)
                listItem.setIndent(Math.min(7, currentIndent + 1));
              }
            } else {
              // For non-list content, just insert a tab character
              selection.insertText('\t');
              break;
            }
          }
        });

        return true;
      },
      COMMAND_PRIORITY_HIGH
    );

    return () => {
      removeListener();
    };
  }, [editor]);

  return null;
}

// ============================================================================
// MAIN EDITOR COMPONENT
// ============================================================================
const LexicalNoteEditor = ({
  initialContent = null,
  onContentChange = () => {},
  className = '',
  placeholder = 'Start writing your note...',
}) => {
  const initialConfig = {
    namespace: 'NoteEditor',
    theme: editorTheme,
    onError: (error) => {
      console.error('Lexical error:', error);
    },
    nodes: [
      HeadingNode,
      QuoteNode,
      ListNode,
      ListItemNode,
      CodeNode,
      CodeHighlightNode,
      LinkNode,
      AutoLinkNode,
    ],
  };

  // Custom transformers for markdown shortcuts
  const markdownTransformers = [
    HEADING,
    QUOTE,
    UNORDERED_LIST,
    ORDERED_LIST,
    CODE,
    ...TRANSFORMERS,
  ];

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className={cn('lexical-editor-container', className)}>
        <RichTextPlugin
          contentEditable={
            <ContentEditable
              className="lexical-content-editable"
              aria-placeholder={placeholder}
            />
          }
          placeholder={<Placeholder />}
          ErrorBoundary={LexicalErrorBoundary}
        />
        <HistoryPlugin />
        <AutoFocusPlugin />
        <ListPlugin />
        <TabIndentPlugin />
        <MarkdownShortcutPlugin transformers={markdownTransformers} />
        <MarkdownPastePlugin transformers={markdownTransformers} />
        <ContentExtractorPlugin onContentChange={onContentChange} />
        {initialContent && <InitialContentPlugin initialContent={initialContent} />}
      </div>
    </LexicalComposer>
  );
};

export default LexicalNoteEditor;
