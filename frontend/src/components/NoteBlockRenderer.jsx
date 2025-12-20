import React from 'react';
import { cn } from '@/lib/utils';

/**
 * NoteBlockRenderer - Read-only renderer for note blocks
 * Handles both markdown and HTML content
 */

// Detect if content is HTML
const isHtmlContent = (text) => {
  if (!text || typeof text !== 'string') return false;
  // Check for common HTML tags
  return /<[a-z][\s\S]*>/i.test(text);
};

// Parse HTML to blocks (supports TipTap HTML output)
const parseHtmlToBlocks = (html) => {
  if (!html) return [];

  // Create a temporary DOM element to parse HTML
  const temp = document.createElement('div');
  temp.innerHTML = html;

  const blocks = [];
  let blockId = 0;

  const processNode = (node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent.trim();
      if (text) {
        blocks.push({ id: `block-${blockId++}`, type: 'paragraph', content: text });
      }
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return;

    const tagName = node.tagName.toLowerCase();

    switch (tagName) {
      case 'h1':
        blocks.push({ id: `block-${blockId++}`, type: 'heading1', content: node.textContent.trim() });
        break;
      case 'h2':
        blocks.push({ id: `block-${blockId++}`, type: 'heading2', content: node.textContent.trim() });
        break;
      case 'h3':
        blocks.push({ id: `block-${blockId++}`, type: 'heading3', content: node.textContent.trim() });
        break;
      case 'blockquote':
        blocks.push({ id: `block-${blockId++}`, type: 'blockquote', content: node.textContent.trim() });
        break;
      case 'ul':
        // Check if it's a TipTap task list
        const isTaskList = node.getAttribute('data-type') === 'taskList';
        Array.from(node.children).forEach(li => {
          if (li.tagName.toLowerCase() === 'li') {
            // Check if it's a todo item (TipTap style or checkbox style)
            const isTodoItem = li.getAttribute('data-type') === 'taskItem' || li.getAttribute('data-checked') !== null;
            const checkbox = li.querySelector('input[type="checkbox"]');

            if (isTaskList || isTodoItem || checkbox) {
              const isChecked = li.getAttribute('data-checked') === 'true' || (checkbox && checkbox.checked);
              // Get text content excluding the checkbox
              let content = '';
              const textContainer = li.querySelector('div, p') || li;
              content = textContainer.textContent.trim();

              blocks.push({
                id: `block-${blockId++}`,
                type: 'todo',
                content,
                checked: isChecked
              });
            } else {
              blocks.push({ id: `block-${blockId++}`, type: 'bullet', content: li.textContent.trim() });
            }
          }
        });
        break;
      case 'ol':
        Array.from(node.children).forEach((li, index) => {
          if (li.tagName.toLowerCase() === 'li') {
            blocks.push({ id: `block-${blockId++}`, type: 'numbered', content: li.textContent.trim(), number: index + 1 });
          }
        });
        break;
      case 'pre':
        // Handle code blocks - TipTap wraps code in pre > code
        const codeElement = node.querySelector('code');
        blocks.push({ id: `block-${blockId++}`, type: 'code', content: codeElement?.textContent || node.textContent });
        break;
      case 'code':
        // Inline code - skip if inside pre
        if (node.parentElement?.tagName.toLowerCase() !== 'pre') {
          blocks.push({ id: `block-${blockId++}`, type: 'code', content: node.textContent });
        }
        break;
      case 'hr':
        blocks.push({ id: `block-${blockId++}`, type: 'divider', content: '' });
        break;
      case 'p':
      case 'div':
        const text = node.textContent.trim();
        if (text) {
          blocks.push({ id: `block-${blockId++}`, type: 'paragraph', content: text });
        }
        break;
      case 'br':
        // Skip line breaks
        break;
      case 'span':
        // Handle inline tags specially
        if (node.classList.contains('inline-tag')) {
          const tagText = node.textContent.trim();
          if (tagText) {
            blocks.push({ id: `block-${blockId++}`, type: 'tag', content: tagText });
          }
        } else {
          const spanText = node.textContent.trim();
          if (spanText) {
            blocks.push({ id: `block-${blockId++}`, type: 'paragraph', content: spanText });
          }
        }
        break;
      default:
        // For other elements, try to extract text content
        const defaultText = node.textContent.trim();
        if (defaultText) {
          blocks.push({ id: `block-${blockId++}`, type: 'paragraph', content: defaultText });
        }
    }
  };

  // Process all child nodes
  Array.from(temp.childNodes).forEach(processNode);

  // Merge consecutive paragraphs that might be the same content
  const mergedBlocks = [];
  blocks.forEach((block, index) => {
    // Skip empty blocks (except dividers)
    if (!block.content && block.type !== 'divider') return;

    // Avoid duplicate consecutive content
    const lastBlock = mergedBlocks[mergedBlocks.length - 1];
    if (lastBlock && lastBlock.type === block.type && lastBlock.content === block.content) {
      return;
    }

    mergedBlocks.push(block);
  });

  return mergedBlocks;
};

// Parse markdown to blocks
const parseMarkdownToBlocks = (text) => {
  if (!text) return [];

  // If already an array of blocks, return as is
  if (Array.isArray(text)) return text;

  const lines = text.split('\n');
  const blocks = [];
  let blockId = 0;
  let inCodeBlock = false;
  let codeContent = [];

  lines.forEach((line) => {
    // Handle code blocks (multi-line)
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        // End of code block
        blocks.push({ id: `block-${blockId++}`, type: 'code', content: codeContent.join('\n') });
        codeContent = [];
        inCodeBlock = false;
      } else {
        // Start of code block
        inCodeBlock = true;
      }
      return;
    }

    if (inCodeBlock) {
      codeContent.push(line);
      return;
    }

    // Detect headings
    if (line.startsWith('### ')) {
      blocks.push({ id: `block-${blockId++}`, type: 'heading3', content: line.slice(4) });
    } else if (line.startsWith('## ')) {
      blocks.push({ id: `block-${blockId++}`, type: 'heading2', content: line.slice(3) });
    } else if (line.startsWith('# ')) {
      blocks.push({ id: `block-${blockId++}`, type: 'heading1', content: line.slice(2) });
    }
    // Detect blockquotes
    else if (line.startsWith('> ')) {
      blocks.push({ id: `block-${blockId++}`, type: 'blockquote', content: line.slice(2) });
    } else if (line.startsWith('>')) {
      blocks.push({ id: `block-${blockId++}`, type: 'blockquote', content: line.slice(1) });
    }
    // Detect todos
    else if (line.startsWith('- [ ] ') || line.startsWith('[ ] ')) {
      blocks.push({ id: `block-${blockId++}`, type: 'todo', content: line.replace(/^-?\s*\[\s*\]\s*/, ''), checked: false });
    } else if (line.startsWith('- [x] ') || line.startsWith('[x] ')) {
      blocks.push({ id: `block-${blockId++}`, type: 'todo', content: line.replace(/^-?\s*\[x\]\s*/i, ''), checked: true });
    }
    // Detect bullets
    else if (line.startsWith('- ') || line.startsWith('• ')) {
      blocks.push({ id: `block-${blockId++}`, type: 'bullet', content: line.slice(2) });
    }
    // Default to paragraph
    else if (line.trim()) {
      blocks.push({ id: `block-${blockId++}`, type: 'paragraph', content: line });
    }
  });

  // Handle unclosed code block
  if (inCodeBlock && codeContent.length > 0) {
    blocks.push({ id: `block-${blockId++}`, type: 'code', content: codeContent.join('\n') });
  }

  return blocks;
};

// Parse content to blocks (auto-detect format)
const parseTextToBlocks = (content) => {
  if (!content) return [];
  if (Array.isArray(content)) return content;

  if (isHtmlContent(content)) {
    return parseHtmlToBlocks(content);
  }
  return parseMarkdownToBlocks(content);
};

// Render a single block
const RenderBlock = ({ block, compact }) => {
  switch (block.type) {
    case 'heading1':
      return (
        <h1 className={cn(
          "font-bold text-gruvbox-fg",
          compact ? "text-lg" : "text-2xl"
        )}>
          {block.content}
        </h1>
      );

    case 'heading2':
      return (
        <h2 className={cn(
          "font-semibold text-gruvbox-fg",
          compact ? "text-base" : "text-xl"
        )}>
          {block.content}
        </h2>
      );

    case 'heading3':
      return (
        <h3 className={cn(
          "font-medium text-gruvbox-fg",
          compact ? "text-sm" : "text-lg"
        )}>
          {block.content}
        </h3>
      );

    case 'todo':
      return (
        <div className="flex items-start gap-2">
          <div className={cn(
            "mt-0.5 w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center",
            block.checked
              ? "bg-gruvbox-yellow border-gruvbox-yellow"
              : "border-gruvbox-fg-muted/40"
          )}>
            {block.checked && (
              <svg className="w-3 h-3 text-gruvbox-bg-darkest" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
          <span className={cn(
            "text-sm text-gruvbox-fg flex-1",
            block.checked && "line-through text-gruvbox-fg-muted"
          )}>
            {block.content}
          </span>
        </div>
      );

    case 'bullet':
      return (
        <div className="flex items-start gap-2">
          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-gruvbox-fg-muted flex-shrink-0" />
          <span className="text-sm text-gruvbox-fg flex-1">
            {block.content}
          </span>
        </div>
      );

    case 'numbered':
      return (
        <div className="flex items-start gap-2">
          <span className="text-sm text-gruvbox-fg-muted flex-shrink-0 w-5 text-right">
            {block.number}.
          </span>
          <span className="text-sm text-gruvbox-fg flex-1">
            {block.content}
          </span>
        </div>
      );

    case 'code':
      return (
        <pre className="font-mono text-sm text-gruvbox-aqua bg-gruvbox-bg-dark/50 rounded p-2 overflow-x-auto whitespace-pre-wrap break-words">
          {block.content || ' '}
        </pre>
      );

    case 'blockquote':
      return (
        <div className="border-l-2 border-gruvbox-yellow/50 pl-3 py-1 text-sm text-gruvbox-fg-muted italic">
          {block.content}
        </div>
      );

    case 'divider':
      return (
        <hr className="border-none h-px bg-gruvbox-bg-lighter/50 my-2" />
      );

    case 'tag':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gruvbox-yellow/20 text-gruvbox-yellow">
          {block.content}
        </span>
      );

    default: // paragraph
      if (!block.content) return null;
      return (
        <p className="text-sm text-gruvbox-fg leading-relaxed">
          {block.content}
        </p>
      );
  }
};

// Main component
const NoteBlockRenderer = ({ content, compact = false, className }) => {
  const blocks = parseTextToBlocks(content);

  if (blocks.length === 0) return null;

  return (
    <div className={cn("space-y-1", className)}>
      {blocks.map((block) => (
        <div key={block.id} className="py-0.5">
          <RenderBlock block={block} compact={compact} />
        </div>
      ))}
    </div>
  );
};

export { NoteBlockRenderer, parseTextToBlocks };
export default NoteBlockRenderer;
