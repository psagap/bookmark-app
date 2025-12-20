/**
 * Tag Extraction Utility
 * Extracts hashtags (#tag) from note content
 */

/**
 * Extract hashtags from content (handles both plain text and HTML)
 * @param {string} content - The note content (plain text or HTML)
 * @returns {string[]} Array of unique tag names (without #)
 */
export function extractTagsFromContent(content) {
  if (!content || typeof content !== 'string') {
    return [];
  }

  // Strip HTML tags if content is HTML
  let textContent = content;
  if (content.includes('<')) {
    // Create a temporary DOM element to extract text
    const temp = document.createElement('div');
    temp.innerHTML = content;
    textContent = temp.textContent || temp.innerText || '';
  }

  // Extract hashtags using regex
  const tagRegex = /#[\w-]+/g;
  const matches = textContent.match(tagRegex);
  
  if (!matches) {
    return [];
  }

  // Remove # and get unique tags
  const tags = matches.map(tag => tag.slice(1).toLowerCase());
  const uniqueTags = [...new Set(tags)];

  return uniqueTags;
}

/**
 * Extract tags and return with their positions in the content
 * Useful for highlighting tags in the editor
 * @param {string} content - The note content
 * @returns {Array<{tag: string, start: number, end: number}>}
 */
export function extractTagsWithPositions(content) {
  if (!content || typeof content !== 'string') {
    return [];
  }

  const tagRegex = /#[\w-]+/g;
  const tags = [];
  let match;

  while ((match = tagRegex.exec(content)) !== null) {
    tags.push({
      tag: match[0].slice(1).toLowerCase(),
      start: match.index,
      end: match.index + match[0].length
    });
  }

  return tags;
}

export default extractTagsFromContent;

