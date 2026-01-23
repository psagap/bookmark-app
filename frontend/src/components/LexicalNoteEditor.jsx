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
import { HorizontalRuleNode } from '@lexical/react/LexicalHorizontalRuleNode';
import { HorizontalRulePlugin } from '@lexical/react/LexicalHorizontalRulePlugin';
import {
  $getRoot,
  $getSelection,
  $isRangeSelection,
  $createParagraphNode,
  $createTextNode,
  $getNearestNodeFromDOMNode,
  COMMAND_PRIORITY_LOW,
  COMMAND_PRIORITY_HIGH,
  KEY_ENTER_COMMAND,
  PASTE_COMMAND,
  INDENT_CONTENT_COMMAND,
  OUTDENT_CONTENT_COMMAND,
  KEY_TAB_COMMAND,
  KEY_BACKSPACE_COMMAND,
} from 'lexical';
import { HeadingNode, QuoteNode, $createHeadingNode, $createQuoteNode } from '@lexical/rich-text';
import { ListNode, ListItemNode, $createListNode, $createListItemNode, $isListItemNode, $isListNode } from '@lexical/list';
import { CodeNode, CodeHighlightNode, $isCodeNode } from '@lexical/code';
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
import { $createHorizontalRuleNode, $isHorizontalRuleNode } from '@lexical/react/LexicalHorizontalRuleNode';
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
  hr: 'lexical-hr',
};

// ============================================================================
// CUSTOM HORIZONTAL RULE TRANSFORMER
// Converts `---`, `***`, or `___` to a horizontal rule
// ============================================================================
const HORIZONTAL_RULE = {
  dependencies: [HorizontalRuleNode],
  export: (node) => {
    return $isHorizontalRuleNode(node) ? '---' : null;
  },
  regExp: /^(---|\*\*\*|___)\s?$/,
  replace: (parentNode, _children, _match, isImport) => {
    const hrNode = $createHorizontalRuleNode();
    parentNode.replace(hrNode);
    if (isImport) {
      hrNode.selectNext();
    }
  },
  type: 'element',
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
      // Helper to move cursor to beginning after content loads
      const moveCursorToStart = () => {
        editor.update(() => {
          const root = $getRoot();
          const firstChild = root.getFirstChild();
          if (firstChild) {
            firstChild.selectStart();
          }
        });
      };

      // Prefer JSON state for lossless round-trip (preserves nested lists, formatting)
      if (initialContent.json) {
        try {
          const editorState = editor.parseEditorState(initialContent.json);
          editor.setEditorState(editorState);
          setHasLoaded(true);
          // Move cursor to start after state is loaded
          setTimeout(moveCursorToStart, 0);
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

        // Move cursor to start
        const firstChild = root.getFirstChild();
        if (firstChild) {
          firstChild.selectStart();
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
// LIST BACKSPACE PLUGIN
// Handles backspace at the beginning of a list item:
// - If indented: decrease indent first
// - If not indented: convert to paragraph (remove bullet)
// ============================================================================
function ListBackspacePlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    const removeListener = editor.registerCommand(
      KEY_BACKSPACE_COMMAND,
      (event) => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) return false;

        // Only handle if cursor is collapsed (no text selected)
        if (!selection.isCollapsed()) return false;

        const anchorNode = selection.anchor.getNode();
        const anchorOffset = selection.anchor.offset;

        // Find the list item node
        let listItem = anchorNode;
        while (listItem && !$isListItemNode(listItem)) {
          listItem = listItem.getParent();
        }

        if (!$isListItemNode(listItem)) return false;

        // Check if we're at the very beginning of the list item's text content
        // We need to check if the anchor is at offset 0 and it's the first text node
        const listItemChildren = listItem.getChildren();
        const firstChild = listItemChildren[0];

        // If the first child is the anchor node (or contains it) and offset is 0
        let isAtStart = false;
        if (anchorOffset === 0) {
          if (anchorNode === firstChild) {
            isAtStart = true;
          } else if (firstChild && anchorNode.getParent() === firstChild && anchorOffset === 0) {
            isAtStart = true;
          } else {
            // Check if anchor is a descendant of first child at position 0
            let current = anchorNode;
            while (current && current !== listItem) {
              const parent = current.getParent();
              if (parent) {
                const siblings = parent.getChildren();
                if (siblings[0] !== current) {
                  break;
                }
              }
              if (current === firstChild) {
                isAtStart = true;
                break;
              }
              current = parent;
            }
          }
        }

        if (!isAtStart) return false;

        // We're at the beginning of a list item
        event.preventDefault();

        editor.update(() => {
          const currentIndent = listItem.getIndent();

          if (currentIndent > 0) {
            // Decrease indent first
            listItem.setIndent(currentIndent - 1);
          } else {
            // Convert list item to paragraph
            const listNode = listItem.getParent();

            // Get all children of the list item (the text content)
            const children = listItem.getChildren();

            // Create a new paragraph with the content
            const paragraph = $createParagraphNode();
            children.forEach(child => {
              paragraph.append(child);
            });

            // Insert paragraph before the list
            if ($isListNode(listNode)) {
              const listParent = listNode.getParent();
              if (listParent) {
                // Get siblings in the list
                const listItems = listNode.getChildren();
                const itemIndex = listItems.indexOf(listItem);

                if (listItems.length === 1) {
                  // This is the only item, replace the entire list with paragraph
                  listNode.replace(paragraph);
                } else if (itemIndex === 0) {
                  // First item - insert paragraph before list
                  listNode.insertBefore(paragraph);
                  listItem.remove();
                } else {
                  // Middle or last item - insert paragraph after previous items
                  // Split the list: items before stay, current becomes paragraph, items after become new list
                  listNode.insertAfter(paragraph);

                  // Move remaining items after current to a new list
                  const remainingItems = listItems.slice(itemIndex + 1);
                  if (remainingItems.length > 0) {
                    const newList = $createListNode(listNode.getListType());
                    remainingItems.forEach(item => {
                      newList.append(item);
                    });
                    paragraph.insertAfter(newList);
                  }

                  listItem.remove();
                }
              }
            }

            // Move cursor to the paragraph
            paragraph.selectStart();
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
// CODE BLOCK EXIT PLUGIN
// Allows clicking outside code blocks to exit them
// ============================================================================
function CodeBlockExitPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    const rootElement = editor.getRootElement();
    if (!rootElement) return;

    const handleClick = (event) => {
      const target = event.target;

      // Check if click target is inside a code block element
      const isInsideCodeBlock = target.closest('.lexical-code');
      if (isInsideCodeBlock) return; // Clicking inside code block - do nothing

      // Check if current selection is inside a code node
      editor.getEditorState().read(() => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) return;

        const anchorNode = selection.anchor.getNode();

        // Walk up the tree to find if we're inside a CodeNode
        let current = anchorNode;
        let codeNode = null;
        while (current !== null) {
          if ($isCodeNode(current)) {
            codeNode = current;
            break;
          }
          current = current.getParent();
        }

        if (codeNode) {
          // We're in a code block but clicked outside it
          // Create a new paragraph after the code block
          editor.update(() => {
            const paragraph = $createParagraphNode();
            codeNode.insertAfter(paragraph);
            paragraph.selectStart();
          });
        }
      });
    };

    rootElement.addEventListener('click', handleClick);

    return () => {
      rootElement.removeEventListener('click', handleClick);
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
      HorizontalRuleNode,
    ],
  };

  // Custom transformers for markdown shortcuts
  const markdownTransformers = [
    HEADING,
    QUOTE,
    UNORDERED_LIST,
    ORDERED_LIST,
    CODE,
    HORIZONTAL_RULE,
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
        <HorizontalRulePlugin />
        <TabIndentPlugin />
        <ListBackspacePlugin />
        <CodeBlockExitPlugin />
        <MarkdownShortcutPlugin transformers={markdownTransformers} />
        <MarkdownPastePlugin transformers={markdownTransformers} />
        <ContentExtractorPlugin onContentChange={onContentChange} />
        {initialContent && <InitialContentPlugin initialContent={initialContent} />}
      </div>
    </LexicalComposer>
  );
};

export default LexicalNoteEditor;
