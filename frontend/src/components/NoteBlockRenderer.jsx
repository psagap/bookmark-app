import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';

/**
 * NoteBlockRenderer - Calm, readable note content display
 *
 * Design: Nunito font family with generous spacing
 * Supports markdown and HTML content
 *
 * Dynamic Scaling: Automatically adjusts typography based on content volume
 * - Light content (few blocks): Larger fonts, spacious layout
 * - Heavy content (many blocks): Compact fonts, tighter spacing
 */

// ============================================
// DYNAMIC TYPOGRAPHY SCALING SYSTEM
// ============================================

// Analyze content density for dynamic scaling
const analyzeContent = (blocks) => {
  if (!blocks || blocks.length === 0) {
    return { totalBlocks: 0, totalChars: 0, headingCount: 0, hasCode: false, hasList: false };
  }

  return {
    totalBlocks: blocks.length,
    totalChars: blocks.reduce((sum, b) => sum + (b.content?.length || 0), 0),
    headingCount: blocks.filter(b => ['heading1', 'heading2', 'heading3'].includes(b.type)).length,
    hasCode: blocks.some(b => b.type === 'code'),
    hasList: blocks.some(b => ['bullet', 'numbered', 'todo'].includes(b.type)),
  };
};

// Calculate scale factor based on content volume (1.0 = spacious, 0.65 = compact)
const calculateScale = (metrics) => {
  let scale = 1.0;

  // Reduce scale based on block count (each block after 3 reduces by 0.04)
  if (metrics.totalBlocks > 3) {
    scale -= 0.04 * Math.min(metrics.totalBlocks - 3, 10);
  }

  // Reduce scale based on character count
  if (metrics.totalChars > 150) scale -= 0.08;
  if (metrics.totalChars > 300) scale -= 0.08;
  if (metrics.totalChars > 500) scale -= 0.06;

  // Reduce scale for many headings (more than 2)
  if (metrics.headingCount > 2) {
    scale -= 0.04 * Math.min(metrics.headingCount - 2, 4);
  }

  // Clamp between 0.65 and 1.0
  return Math.max(0.65, Math.min(1.0, scale));
};

// Get scaled typography values based on scale factor
const getScaledTypography = (scale) => {
  // Base values at scale 1.0 - tuned to match 'mymind' reference
  const baseH1 = 2.8;       // rem - large, prominent titles
  const baseH2 = 2.0;       // rem
  const baseH3 = 1.5;       // rem
  const baseParagraph = 17; // px

  return {
    h1: {
      fontSize: `${(baseH1 * scale).toFixed(3)}rem`,
      minHeight: scale > 0.85 ? `${Math.round(92 * scale)}px` : 'auto',
      marginBottom: '0px',
      width: scale > 0.85 ? '411px' : 'auto',
    },
    h2: {
      fontSize: `${(baseH2 * scale).toFixed(3)}rem`,
      marginTop: '0px',
      marginBottom: '0px',
    },
    h3: {
      fontSize: `${(baseH3 * scale).toFixed(3)}rem`,
      marginTop: '0px',
      marginBottom: '0px',
    },
    paragraph: {
      fontSize: `${Math.round(baseParagraph * scale)}px`,
      lineHeight: scale > 0.85 ? 1.55 : scale > 0.75 ? 1.45 : 1.4,
    },
    list: {
      fontSize: `${Math.round(baseParagraph * scale)}px`,
      gap: '4px',
    },
    gap: '6px',
    wrapperPadding: '2px 0',
  };
};

// ============================================
// END DYNAMIC TYPOGRAPHY SCALING SYSTEM
// ============================================

// Detect if content is HTML
const isHtmlContent = (text) => {
  if (!text || typeof text !== 'string') return false;
  return /<[a-z][\s\S]*>/i.test(text);
};

// Strip hashtags from text
const stripHashtags = (text) => {
  if (!text || typeof text !== 'string') return text;
  return text.replace(/#[\w-]+/g, '').replace(/\s+/g, ' ').trim();
};

// Parse inline markdown patterns (bold, italic, code, links)
const parseInlineMarkdown = (text) => {
  if (!text || typeof text !== 'string') return text;

  // Clean up stray markdown heading markers mid-text (## Something -> Something)
  // But preserve # at start of text (could be intentional heading that wasn't parsed)
  let result = text
    .replace(/\s###\s+/g, ' ')
    .replace(/\s##\s+/g, ' ')
    .replace(/\s#\s+/g, ' ');

  // Clean up mid-text bullet points (- something -> • something)
  result = result.replace(/\s-\s+/g, ' • ');

  // Convert **bold** to <strong>
  result = result.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  // Convert *italic* to <em> (but not if it's a bullet *)
  result = result.replace(/(?<!\s)\*([^*\s][^*]*)\*/g, '<em>$1</em>');

  // Convert `code` to <code>
  result = result.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');

  // Convert [text](url) to links
  result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="inline-link">$1</a>');

  // Clean up any remaining markdown artifacts
  result = result.replace(/\[\s*\]/g, ''); // Empty brackets []

  return result;
};

// Render text with inline formatting
const InlineFormattedText = ({ text }) => {
  const parsed = parseInlineMarkdown(stripHashtags(text));
  return <span dangerouslySetInnerHTML={{ __html: parsed }} />;
};

// Check if text is ALL CAPS (for detecting section headers)
const isAllCaps = (text) => {
  if (!text || text.length < 3) return false;
  const letters = text.replace(/[^a-zA-Z]/g, '');
  if (letters.length < 3) return false;
  return letters === letters.toUpperCase();
};

// Check if text looks like a label/header (e.g., "Concept:", "Duration:")
const isLabelHeader = (text) => {
  if (!text) return false;
  // Match patterns like "Word:" or "Two Words:" at the start
  return /^[A-Z][a-zA-Z]*(\s[A-Z]?[a-zA-Z]*)?\s*:/.test(text);
};

// Detect markdown patterns in text content
// This handles Lexical HTML where markdown syntax wasn't converted to native elements
const detectMarkdownType = (text) => {
  if (!text || typeof text !== 'string') return { type: 'paragraph', content: text };

  const trimmed = text.trim();

  // Check for horizontal rule patterns (---, ***, ___, ———, –––, etc.)
  // Includes ASCII dashes, em-dashes, en-dashes, and underscores
  if (/^[-–—]{3,}$/.test(trimmed) || /^[*]{3,}$/.test(trimmed) || /^[_]{3,}$/.test(trimmed)) {
    return { type: 'divider', content: '' };
  }

  // Check for unicode horizontal lines (━, ─, ═, ▬, etc.)
  if (/^[━─═▬―]+$/.test(trimmed) && trimmed.length >= 3) {
    return { type: 'divider', content: '' };
  }

  // Check for heading patterns (# ## ###)
  if (trimmed.startsWith('### ')) {
    return { type: 'heading3', content: trimmed.slice(4) };
  }
  if (trimmed.startsWith('## ')) {
    return { type: 'heading2', content: trimmed.slice(3) };
  }
  if (trimmed.startsWith('# ')) {
    return { type: 'heading1', content: trimmed.slice(2) };
  }

  // Check for ALL CAPS text (likely a section header) - treat as h2
  if (isAllCaps(trimmed) && trimmed.length > 3 && trimmed.length < 100) {
    return { type: 'heading2', content: trimmed };
  }

  // Check for label-style headers like "Concept:" or "Duration:" - treat as h3
  if (isLabelHeader(trimmed) && trimmed.length < 80) {
    return { type: 'heading3', content: trimmed };
  }

  // Check for blockquote (> text)
  if (trimmed.startsWith('> ')) {
    return { type: 'blockquote', content: trimmed.slice(2) };
  }
  if (trimmed.startsWith('>')) {
    return { type: 'blockquote', content: trimmed.slice(1).trim() };
  }

  // Check for todo items (- [ ] or - [x] or [ ] or [x])
  if (trimmed.startsWith('- [ ] ') || trimmed.startsWith('[ ] ')) {
    return { type: 'todo', content: trimmed.replace(/^-?\s*\[\s*\]\s*/, ''), checked: false };
  }
  if (trimmed.match(/^-?\s*\[x\]\s*/i)) {
    return { type: 'todo', content: trimmed.replace(/^-?\s*\[x\]\s*/i, ''), checked: true };
  }

  // Check for bullet points (- text, • text, * text)
  // Also handle indented bullets (tab + - text)
  if (trimmed.match(/^[\t\s]*[-•*]\s+/)) {
    const indentMatch = trimmed.match(/^([\t\s]*)/);
    const indentLevel = indentMatch ? Math.floor(indentMatch[1].length / 2) : 0;
    const content = trimmed.replace(/^[\t\s]*[-•*]\s+/, '');
    return { type: 'bullet', content, indentLevel };
  }

  // Check for numbered lists (1. text, 2. text, etc.)
  const numberedMatch = trimmed.match(/^(\d+)\.\s+(.+)/);
  if (numberedMatch) {
    return { type: 'numbered', content: numberedMatch[2], number: parseInt(numberedMatch[1], 10) };
  }

  // Check for code blocks (``` or indented with 4 spaces)
  if (trimmed.startsWith('```')) {
    return { type: 'code-fence', content: trimmed };
  }

  // Default to paragraph
  return { type: 'paragraph', content: trimmed };
};

// Parse HTML to blocks - handles Lexical's HTML structure with <br> tags
const parseHtmlToBlocks = (html) => {
  if (!html) return [];

  const temp = document.createElement('div');
  temp.innerHTML = html;

  const blocks = [];
  let blockId = 0;
  let numberedListCounter = 0;

  // Helper to add a block with markdown detection
  const addBlock = (text, forceType = null) => {
    if (!text) return;
    const trimmed = text.trim();
    if (!trimmed) return;

    if (forceType) {
      blocks.push({ id: `block-${blockId++}`, type: forceType, content: trimmed });
      return;
    }

    const detected = detectMarkdownType(trimmed);

    if (detected.type === 'numbered') {
      numberedListCounter++;
      detected.number = numberedListCounter;
    } else if (detected.type !== 'numbered') {
      numberedListCounter = 0;
    }

    blocks.push({ id: `block-${blockId++}`, ...detected });
  };

  // Extract text content from a node, preserving structure info
  const extractLineContent = (node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      return { text: node.textContent, isBold: false, isItalic: false, isCode: false };
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return null;

    const tag = node.tagName.toLowerCase();
    const text = node.textContent.trim();

    if (tag === 'strong' || tag === 'b') {
      return { text, isBold: true, isItalic: false, isCode: false };
    }
    if (tag === 'em' || tag === 'i') {
      return { text, isBold: false, isItalic: true, isCode: false };
    }
    if (tag === 'code') {
      return { text, isBold: false, isItalic: false, isCode: true };
    }

    return { text, isBold: false, isItalic: false, isCode: false };
  };

  // Process a paragraph that may contain <br> tags
  const processParagraph = (pNode) => {
    const children = Array.from(pNode.childNodes);
    let currentLine = [];
    let currentLineIsBold = false;

    const flushLine = () => {
      if (currentLine.length === 0) return;

      const lineText = currentLine.map(c => c.text).join('').trim();
      if (!lineText) {
        currentLine = [];
        currentLineIsBold = false;
        return;
      }

      // Check if the entire line is bold (like section headers)
      const allBold = currentLine.every(c => c.isBold || !c.text.trim());
      const anyBold = currentLine.some(c => c.isBold && c.text.trim());

      // If line is ALL bold and looks like a header, treat as heading
      if (allBold && anyBold && lineText.length < 80) {
        // Check if it's ALL CAPS - treat as h2
        if (isAllCaps(lineText)) {
          addBlock(lineText, 'heading2');
        } else if (lineText.match(/^\[.*\].*$/)) {
          // Bracketed headers like [HOOK] (0:00-0:03) - treat as h3
          addBlock(lineText, 'heading3');
        } else if (isLabelHeader(lineText)) {
          // Label-style like "Concept:" - treat as h3
          addBlock(lineText, 'heading3');
        } else {
          // Other bold lines - treat as h3
          addBlock(lineText, 'heading3');
        }
      } else {
        // Regular line - use markdown detection
        addBlock(lineText);
      }

      currentLine = [];
      currentLineIsBold = false;
    };

    children.forEach(child => {
      if (child.nodeType === Node.ELEMENT_NODE && child.tagName.toLowerCase() === 'br') {
        flushLine();
        return;
      }

      const content = extractLineContent(child);
      if (content && content.text) {
        currentLine.push(content);
        if (content.isBold) currentLineIsBold = true;
      }
    });

    flushLine();
  };

  const processNode = (node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent.trim();
      if (text) addBlock(text);
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return;

    const tagName = node.tagName.toLowerCase();

    // Handle Lexical code blocks - <code class="lexical-code"> (block-level, not inline)
    if (tagName === 'code' && node.classList.contains('lexical-code')) {
      blocks.push({ id: `block-${blockId++}`, type: 'code', content: node.textContent });
      numberedListCounter = 0;
      return;
    }

    switch (tagName) {
      case 'h1':
        blocks.push({ id: `block-${blockId++}`, type: 'heading1', content: node.textContent.trim() });
        numberedListCounter = 0;
        break;
      case 'h2':
        blocks.push({ id: `block-${blockId++}`, type: 'heading2', content: node.textContent.trim() });
        numberedListCounter = 0;
        break;
      case 'h3':
        blocks.push({ id: `block-${blockId++}`, type: 'heading3', content: node.textContent.trim() });
        numberedListCounter = 0;
        break;
      case 'blockquote':
        blocks.push({ id: `block-${blockId++}`, type: 'blockquote', content: node.textContent.trim() });
        numberedListCounter = 0;
        break;
      case 'ul': {
        const isTaskList = node.getAttribute('data-type') === 'taskList';
        const processListItems = (ul) => {
          Array.from(ul.children).forEach(li => {
            if (li.tagName.toLowerCase() === 'li') {
              // Check for nested list
              const nestedList = li.querySelector('ul, ol');
              if (nestedList) {
                processListItems(nestedList);
                return;
              }

              const isTodoItem = li.getAttribute('data-type') === 'taskItem' || li.getAttribute('data-checked') !== null;
              const checkbox = li.querySelector('input[type="checkbox"]');

              if (isTaskList || isTodoItem || checkbox) {
                const isChecked = li.getAttribute('data-checked') === 'true' || (checkbox && checkbox.checked);
                const textContainer = li.querySelector('div, p, span') || li;
                blocks.push({
                  id: `block-${blockId++}`,
                  type: 'todo',
                  content: textContainer.textContent.trim(),
                  checked: isChecked
                });
              } else {
                blocks.push({ id: `block-${blockId++}`, type: 'bullet', content: li.textContent.trim() });
              }
            }
          });
        };
        processListItems(node);
        numberedListCounter = 0;
        break;
      }
      case 'ol': {
        let counter = 0;
        const processOlItems = (ol) => {
          Array.from(ol.children).forEach(li => {
            if (li.tagName.toLowerCase() === 'li') {
              const nestedList = li.querySelector('ul, ol');
              if (nestedList) {
                processOlItems(nestedList);
                return;
              }
              counter++;
              blocks.push({ id: `block-${blockId++}`, type: 'numbered', content: li.textContent.trim(), number: counter });
            }
          });
        };
        processOlItems(node);
        numberedListCounter = 0;
        break;
      }
      case 'pre': {
        const codeElement = node.querySelector('code');
        blocks.push({ id: `block-${blockId++}`, type: 'code', content: codeElement?.textContent || node.textContent });
        numberedListCounter = 0;
        break;
      }
      case 'code':
        // Handle code inside <pre> (already handled by 'pre' case) or inline code
        // Block-level code with lexical-code class is handled before the switch
        if (node.parentElement?.tagName.toLowerCase() !== 'pre' && !node.classList.contains('lexical-code')) {
          // This is inline code - treat as part of text, not a separate block
          // Skip as it should be rendered inline with surrounding text
        }
        break;
      case 'hr':
        blocks.push({ id: `block-${blockId++}`, type: 'divider', content: '' });
        numberedListCounter = 0;
        break;
      case 'p':
      case 'div': {
        // Check if paragraph contains <br> tags (multiple lines)
        if (node.querySelector('br')) {
          processParagraph(node);
        } else {
          const text = node.textContent.trim();
          if (text) addBlock(text);
        }
        break;
      }
      default: {
        const text = node.textContent.trim();
        if (text) addBlock(text);
      }
    }
  };

  Array.from(temp.childNodes).forEach(processNode);

  // Filter empty and dedupe
  const mergedBlocks = [];
  blocks.forEach((block) => {
    if (!block.content && block.type !== 'divider') return;
    const lastBlock = mergedBlocks[mergedBlocks.length - 1];
    if (lastBlock && lastBlock.type === block.type && lastBlock.content === block.content) return;
    mergedBlocks.push(block);
  });

  return mergedBlocks;
};

// Parse markdown to blocks
const parseMarkdownToBlocks = (text) => {
  if (!text) return [];
  if (Array.isArray(text)) return text;

  const lines = text.split('\n');
  const blocks = [];
  let blockId = 0;
  let inCodeBlock = false;
  let codeContent = [];

  lines.forEach((line) => {
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        blocks.push({ id: `block-${blockId++}`, type: 'code', content: codeContent.join('\n') });
        codeContent = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      return;
    }

    if (inCodeBlock) {
      codeContent.push(line);
      return;
    }

    // Check for horizontal rules (---, ***, ___)
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      blocks.push({ id: `block-${blockId++}`, type: 'divider', content: '' });
    } else if (line.startsWith('### ')) {
      blocks.push({ id: `block-${blockId++}`, type: 'heading3', content: line.slice(4) });
    } else if (line.startsWith('## ')) {
      blocks.push({ id: `block-${blockId++}`, type: 'heading2', content: line.slice(3) });
    } else if (line.startsWith('# ')) {
      blocks.push({ id: `block-${blockId++}`, type: 'heading1', content: line.slice(2) });
    } else if (line.startsWith('> ')) {
      blocks.push({ id: `block-${blockId++}`, type: 'blockquote', content: line.slice(2) });
    } else if (line.startsWith('>')) {
      blocks.push({ id: `block-${blockId++}`, type: 'blockquote', content: line.slice(1) });
    } else if (line.startsWith('- [ ] ') || line.startsWith('[ ] ')) {
      blocks.push({ id: `block-${blockId++}`, type: 'todo', content: line.replace(/^-?\s*\[\s*\]\s*/, ''), checked: false });
    } else if (line.startsWith('- [x] ') || line.startsWith('[x] ')) {
      blocks.push({ id: `block-${blockId++}`, type: 'todo', content: line.replace(/^-?\s*\[x\]\s*/i, ''), checked: true });
    } else if (line.startsWith('- ') || line.startsWith('• ')) {
      blocks.push({ id: `block-${blockId++}`, type: 'bullet', content: line.slice(2) });
    } else if (line.trim()) {
      blocks.push({ id: `block-${blockId++}`, type: 'paragraph', content: line });
    }
  });

  if (inCodeBlock && codeContent.length > 0) {
    blocks.push({ id: `block-${blockId++}`, type: 'code', content: codeContent.join('\n') });
  }

  return blocks;
};

// Parse content to blocks
const parseTextToBlocks = (content) => {
  if (!content) return [];
  if (Array.isArray(content)) return content;
  if (isHtmlContent(content)) return parseHtmlToBlocks(content);
  return parseMarkdownToBlocks(content);
};

// Render a single block with dynamic scaling
const RenderBlock = ({ block, compact, typography }) => {
  const t = typography; // Shorthand for scaled typography values

  switch (block.type) {
    case 'heading1':
      return (
        <h1
          className="zen-block-h1"
          style={{
            width: t.h1.width,
            maxWidth: '100%',
            minHeight: t.h1.minHeight,
            fontSize: compact ? `calc(${t.h1.fontSize} * 0.78)` : t.h1.fontSize,
            fontWeight: 800,
            fontFamily: "var(--note-font-family, 'Inter', -apple-system, BlinkMacSystemFont, sans-serif)",
            color: '#ffffff',
            letterSpacing: '-0.025em',
            lineHeight: 1.2,
            margin: `0 0 ${t.h1.marginBottom} 0`,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <InlineFormattedText text={block.content} />
        </h1>
      );

    case 'heading2':
      return (
        <h2
          className="zen-block-h2"
          style={{
            fontSize: compact ? `calc(${t.h2.fontSize} * 0.77)` : t.h2.fontSize,
            fontWeight: 600,
            fontFamily: "var(--note-font-family, 'Inter', -apple-system, BlinkMacSystemFont, sans-serif)",
            color: '#f4f4f5',
            letterSpacing: '-0.02em',
            lineHeight: 1.3,
            margin: `${t.h2.marginTop} 0 ${t.h2.marginBottom} 0`,
          }}
        >
          <InlineFormattedText text={block.content} />
        </h2>
      );

    case 'heading3':
      return (
        <h3
          className="zen-block-h3"
          style={{
            fontSize: compact ? `calc(${t.h3.fontSize} * 0.8)` : t.h3.fontSize,
            fontWeight: 600,
            fontFamily: "var(--note-font-family, 'Inter', -apple-system, BlinkMacSystemFont, sans-serif)",
            color: 'rgba(244, 244, 245, 0.9)',
            letterSpacing: '-0.01em',
            lineHeight: 1.4,
            margin: `${t.h3.marginTop} 0 ${t.h3.marginBottom} 0`,
          }}
        >
          <InlineFormattedText text={block.content} />
        </h3>
      );

    case 'todo': {
      if (!block.content) return null;
      return (
        <div className="zen-block-todo">
          <div className={cn(
            "zen-block-checkbox",
            block.checked && "zen-block-checkbox--checked"
          )}>
            {block.checked && (
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
          <span
            className={cn(
              "zen-block-todo-text",
              block.checked && "zen-block-todo-text--done"
            )}
            style={{ fontSize: t.list.fontSize, lineHeight: t.paragraph.lineHeight }}
          >
            <InlineFormattedText text={block.content} />
          </span>
        </div>
      );
    }

    case 'bullet': {
      if (!block.content) return null;
      const indentLevel = block.indentLevel || 0;
      return (
        <div
          className="zen-block-bullet"
          style={{
            marginLeft: indentLevel > 0 ? `${indentLevel * 20}px` : undefined,
          }}
        >
          <span className={cn(
            "zen-block-bullet-dot",
            indentLevel > 0 && "zen-block-bullet-dot--nested"
          )} />
          <span
            className="zen-block-bullet-text"
            style={{ fontSize: t.list.fontSize, lineHeight: t.paragraph.lineHeight }}
          >
            <InlineFormattedText text={block.content} />
          </span>
        </div>
      );
    }

    case 'numbered': {
      if (!block.content) return null;
      return (
        <div className="zen-block-numbered">
          <span className="zen-block-number" style={{ fontSize: t.list.fontSize }}>{block.number}.</span>
          <span
            className="zen-block-numbered-text"
            style={{ fontSize: t.list.fontSize, lineHeight: t.paragraph.lineHeight }}
          >
            <InlineFormattedText text={block.content} />
          </span>
        </div>
      );
    }

    case 'code':
      return (
        <pre className="zen-block-code">
          {block.content || ' '}
        </pre>
      );

    case 'blockquote': {
      if (!block.content) return null;
      return (
        <div
          className="zen-block-quote"
          style={{ fontSize: t.paragraph.fontSize, lineHeight: t.paragraph.lineHeight }}
        >
          <InlineFormattedText text={block.content} />
        </div>
      );
    }

    case 'divider':
      return <hr className="zen-block-divider" />;

    case 'tag':
      return null; // Tags rendered in pills section

    default: // paragraph
      if (!block.content) return null;
      return (
        <p
          className="zen-block-paragraph"
          style={{ fontSize: t.paragraph.fontSize, lineHeight: t.paragraph.lineHeight }}
        >
          <InlineFormattedText text={block.content} />
        </p>
      );
  }
};

// Main component
const NoteBlockRenderer = ({ content, compact = false, className }) => {
  const blocks = parseTextToBlocks(content);

  // Calculate dynamic typography based on content volume
  const typography = useMemo(() => {
    const metrics = analyzeContent(blocks);
    const scale = calculateScale(metrics);
    return getScaledTypography(scale);
  }, [blocks]);

  if (blocks.length === 0) return null;

  return (
    <>
      <div className={cn("zen-blocks", className)} style={{ gap: typography.gap }}>
        {blocks.map((block) => (
          <div key={block.id} className="zen-block-wrapper" style={{ padding: typography.wrapperPadding }}>
            <RenderBlock block={block} compact={compact} typography={typography} />
          </div>
        ))}
      </div>

      <style>{`
        /* ===================================
           ZEN BLOCKS - Calm Note Rendering
           Font: Nunito (300, 400, 600, 700)
           Uses CSS theme variables for brand consistency
           =================================== */

        .zen-blocks {
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding-left: 8px;
        }

        .zen-block-wrapper {
          padding: 0;
        }

        /* Reset any nested p/div margins inside blocks */
        .zen-blocks p,
        .zen-blocks div {
          margin: 0;
          padding: 0;
        }

        /* Headings - Clear visual hierarchy with MyMind polish */
        .zen-block-h1 {
          font-family: var(--note-font-family, 'Inter', -apple-system, BlinkMacSystemFont, sans-serif);
          font-weight: 800;
          letter-spacing: -0.03em;
          color: #ffffff;
          line-height: 1.2;
          margin: 0 0 0.625rem 0;
          font-size: 1.6rem;
        }

        .zen-block-h2 {
          font-family: var(--note-font-family, 'Inter', -apple-system, BlinkMacSystemFont, sans-serif);
          font-weight: 600;
          letter-spacing: -0.025em;
          color: #f4f4f5;
          line-height: 1.3;
          margin: 0.75rem 0 0.5rem 0;
          font-size: 1.35rem;
        }

        .zen-block-h3 {
          font-family: var(--note-font-family, 'Inter', -apple-system, BlinkMacSystemFont, sans-serif);
          font-weight: 600;
          letter-spacing: -0.01em;
          color: rgba(244, 244, 245, 0.9);
          line-height: 1.4;
          margin: 0.5rem 0 0.25rem 0;
          font-size: 1.15rem;
        }

        /* Paragraph */
        .zen-block-paragraph {
          font-family: var(--note-font-family, 'Inter', -apple-system, sans-serif);
          font-size: 16px;
          font-weight: 400;
          line-height: 1.55;
          color: var(--theme-fg-muted, rgba(244, 244, 245, 0.7));
          margin: 0 0 0.35rem 0;
        }

        /* Todo */
        .zen-block-todo {
          display: flex;
          align-items: flex-start;
          gap: 10px;
        }

        .zen-block-checkbox {
          margin-top: 3px;
          width: 16px;
          height: 16px;
          border-radius: 4px;
          border: 1.5px solid rgba(161, 161, 170, 0.35);
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s ease;
        }

        .zen-block-checkbox--checked {
          background: var(--theme-primary, #f59e0b);
          border-color: var(--theme-primary, #f59e0b);
          color: #18181b;
        }

        .zen-block-todo-text {
          font-family: var(--note-font-family, 'Inter', -apple-system, sans-serif);
          font-size: 16px;
          font-weight: 400;
          line-height: 1.55;
          color: var(--theme-fg, rgba(244, 244, 245, 0.85));
          flex: 1;
        }

        .zen-block-todo-text--done {
          text-decoration: line-through;
          color: var(--theme-fg-muted, rgba(161, 161, 170, 0.5));
        }

        /* Bullet - Circle style like MyMind */
        .zen-block-bullet {
          display: flex;
          align-items: flex-start;
          gap: 10px;
        }

        .zen-block-bullet-dot {
          margin-top: 6px;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--theme-primary, #e8594f);
          border: none;
          opacity: 0.9;
          flex-shrink: 0;
        }

        .zen-block-bullet-dot--nested {
          width: 6px;
          height: 6px;
          background: transparent;
          border: 1.5px solid var(--theme-primary, #e8594f);
          opacity: 0.8;
        }

        .zen-block-bullet-text {
          font-family: var(--note-font-family, 'Inter', -apple-system, sans-serif);
          font-size: 16px;
          font-weight: 400;
          line-height: 1.6;
          color: var(--theme-fg, rgba(244, 244, 245, 0.85));
          flex: 1;
        }

        /* Numbered */
        .zen-block-numbered {
          display: flex;
          align-items: flex-start;
          gap: 10px;
        }

        .zen-block-number {
          font-family: var(--note-font-family, 'Inter', -apple-system, sans-serif);
          font-size: 15px;
          font-weight: 600;
          color: var(--theme-primary, #e8594f);
          opacity: 0.85;
          flex-shrink: 0;
          min-width: 18px;
          text-align: right;
        }

        .zen-block-numbered-text {
          font-family: var(--note-font-family, 'Inter', -apple-system, sans-serif);
          font-size: 16px;
          font-weight: 400;
          line-height: 1.6;
          color: var(--theme-fg, rgba(244, 244, 245, 0.85));
          flex: 1;
        }

        /* Code - High visibility across all themes */
        .zen-block-code {
          font-family: 'JetBrains Mono', 'SF Mono', monospace;
          font-size: 12px;
          line-height: 1.6;
          color: #e2e8f0;
          background: rgba(15, 23, 42, 0.85);
          border: 1px solid rgba(148, 163, 184, 0.15);
          border-radius: 8px;
          padding: 10px 12px;
          margin: 6px 0;
          overflow-x: auto;
          white-space: pre-wrap;
          word-break: break-word;
          box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.2);
        }

        /* Blockquote */
        .zen-block-quote {
          font-family: 'Georgia', 'Playfair Display', serif;
          font-size: 16px;
          font-weight: 400;
          font-style: italic;
          line-height: 1.7;
          color: var(--theme-fg-muted, rgba(244, 244, 245, 0.65));
          border-left: 3px solid var(--theme-primary, #f59e0b);
          padding-left: 14px;
          margin: 6px 0;
          background: rgba(255, 255, 255, 0.02);
          padding: 10px 14px;
          border-radius: 0 8px 8px 0;
        }

        /* Divider - Subtle gray like MyMind */
        .zen-block-divider {
          border: none;
          height: 1px;
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(255, 255, 255, 0.08) 10%,
            rgba(255, 255, 255, 0.12) 50%,
            rgba(255, 255, 255, 0.08) 90%,
            transparent 100%
          );
          margin: 16px 0;
        }

        /* Inline formatting */
        .zen-blocks strong {
          font-weight: 600;
          color: var(--theme-fg, rgba(244, 244, 245, 0.95));
        }

        .zen-blocks em {
          font-style: italic;
          color: var(--theme-fg, rgba(244, 244, 245, 0.9));
        }

        .zen-blocks .inline-code {
          font-family: 'JetBrains Mono', 'SF Mono', monospace;
          font-size: 0.85em;
          background: rgba(0, 0, 0, 0.25);
          padding: 0.15em 0.4em;
          border-radius: 4px;
          color: var(--theme-primary, #f59e0b);
        }

        .zen-blocks .inline-link {
          color: var(--theme-primary, #f59e0b);
          text-decoration: underline;
          text-underline-offset: 2px;
          text-decoration-color: rgba(245, 158, 11, 0.4);
        }

        .zen-blocks .inline-link:hover {
          text-decoration-color: var(--theme-primary, #f59e0b);
        }
      `}</style>
    </>
  );
};

export { NoteBlockRenderer, parseTextToBlocks };
export default NoteBlockRenderer;
