/**
 * Gemma LLM Processor for Audio Note Transcription
 *
 * Uses local Gemma 3 4B model via node-llama-cpp to process raw voice transcripts.
 * Handles: filler word removal, formatting, proper capitalization, and content detection.
 */

const path = require('path');
const fs = require('fs');

const MODEL_PATH = '/Users/psagap/Library/Application Support/app.cotypist.Cotypist/Models/gemma-3-4b-pt.i1-Q4_K_M.gguf';

let llama = null;
let model = null;
let context = null;
let LlamaChatSession = null;
let isInitializing = false;
let initPromise = null;

/**
 * Initialize the Gemma model (lazy loading with singleton pattern)
 * Uses dynamic import because node-llama-cpp is an ESM module with top-level await
 */
async function initializeModel() {
  if (model) return; // Already initialized

  if (isInitializing) {
    // Wait for ongoing initialization
    await initPromise;
    return;
  }

  isInitializing = true;

  initPromise = (async () => {
    // Check if model file exists
    if (!fs.existsSync(MODEL_PATH)) {
      throw new Error(`Model file not found at: ${MODEL_PATH}`);
    }

    console.log('[GemmaProcessor] Loading Gemma 3 4B model...');
    const startTime = Date.now();

    try {
      // Dynamic import for ESM module with top-level await
      const llamaCpp = await import('node-llama-cpp');
      const getLlama = llamaCpp.getLlama;
      LlamaChatSession = llamaCpp.LlamaChatSession;

      llama = await getLlama();
      model = await llama.loadModel({ modelPath: MODEL_PATH });
      context = await model.createContext();

      const loadTime = Date.now() - startTime;
      console.log(`[GemmaProcessor] Model loaded in ${loadTime}ms`);
    } catch (error) {
      console.error('[GemmaProcessor] Failed to load model:', error);
      throw error;
    } finally {
      isInitializing = false;
    }
  })();

  await initPromise;
}

/**
 * Simple text cleanup without LLM
 * Based on modern voice dictation assistant principles
 * PRESERVES the original message as polished prose
 * Does NOT convert to bullet points - keeps natural speech flow
 */
function simpleCleanup(rawTranscript) {
  // Step 1: Remove filler words but KEEP the message intact
  let cleaned = removeFillerWords(rawTranscript);

  // Step 2: Remove trailing fluff ("and stuff", "or whatever", etc.)
  cleaned = removeTrailingFluff(cleaned);

  // Step 3: Fix common grammar issues from speech
  cleaned = fixCommonGrammar(cleaned);

  // Step 4: Clean up spacing and punctuation
  cleaned = cleanupPunctuation(cleaned);

  // Step 5: Add proper commas for lists in natural speech
  cleaned = addListCommas(cleaned);

  // Step 6: Capitalize sentences and proper nouns
  cleaned = capitalizeProperNouns(cleaned);
  cleaned = capitalizeSentences(cleaned);

  return cleaned;
}

/**
 * Remove trailing fluff phrases that don't add meaning
 */
function removeTrailingFluff(text) {
  const fluffPatterns = [
    /\s*and stuff\s*[.,]?\s*/gi,
    /\s*and things( like that)?\s*[.,]?\s*/gi,
    /\s*or whatever\s*[.,]?\s*/gi,
    /\s*or something( like that)?\s*[.,]?\s*/gi,
    /\s*you know what I mean\s*[.,]?\s*/gi,
    /\s*if that makes sense\s*[.,]?\s*/gi,
  ];

  let result = text;
  fluffPatterns.forEach(pattern => {
    result = result.replace(pattern, '. ');
  });

  return result.replace(/\.\s*\./g, '.').trim();
}

/**
 * Fix common grammar issues from spoken language
 */
function fixCommonGrammar(text) {
  let result = text;

  // "how you doing" → "how are you doing"
  result = result.replace(/\bhow you doing\b/gi, 'how are you doing');

  // "what you doing" → "what are you doing"
  result = result.replace(/\bwhat you doing\b/gi, 'what are you doing');

  // "I gotta" → "I have to" / "I need to"
  result = result.replace(/\bi gotta\b/gi, 'I need to');
  result = result.replace(/\bi've gotta\b/gi, 'I need to');

  // "gonna" → "going to"
  result = result.replace(/\bgonna\b/gi, 'going to');

  // "wanna" → "want to"
  result = result.replace(/\bwanna\b/gi, 'want to');

  // "kinda" → "kind of"
  result = result.replace(/\bkinda\b/gi, 'kind of');

  // "sorta" → "sort of"
  result = result.replace(/\bsorta\b/gi, 'sort of');

  // "lemme" → "let me"
  result = result.replace(/\blemme\b/gi, 'let me');

  // "gimme" → "give me"
  result = result.replace(/\bgimme\b/gi, 'give me');

  // Remove redundant "like" as a filler before items
  // "groceries like Nutella" → "groceries, Nutella"
  // "get like milk" → "get milk"
  result = result.replace(/\b(groceries|stuff|things|items)\s+like\s+/gi, '$1, ');
  result = result.replace(/\b(get|buy|grab|need)\s+like\s+/gi, '$1 ');
  result = result.replace(/,\s*like,\s*/gi, ', ');
  result = result.replace(/,\s*like\s+/gi, ', ');

  // "to go get" → "to get" (only when followed by noun-like word)
  result = result.replace(/\bto go get\b/gi, 'to get');

  // "to go to the" → "to go to the" (keep this, it's correct)
  // Don't replace "to go to" alone as it breaks sentences

  return result;
}

/**
 * Remove filler words while preserving the message
 * Conservative approach - only remove clear fillers, not words with legitimate uses
 */
function removeFillerWords(text) {
  let cleaned = text;

  // Multi-word fillers (safe to remove)
  const multiWordFillers = [
    /\b(you know)[,.]?\s*/gi,
    /\b(i mean)[,.]?\s*/gi,
    /\b(kind of)\s+(?=like|sort|you|i|we|they|um|uh)/gi,  // Only when followed by more fillers
    /\b(sort of)\s+(?=like|kind|you|i|we|they|um|uh)/gi,
    /\b(okay so)[,.]?\s*/gi,
    /\b(so like)[,.]?\s*/gi,
    /\b(that's pretty much it)[,.]?\s*/gi,
    /\b(pretty much it)[,.]?\s*/gi,
  ];

  // Pure fillers (always safe to remove)
  const pureFillers = [
    /\b(um|uh|umm|uhh)\b[,.]?\s*/gi,
    /\b(basically)\b[,.]?\s*/gi,
    /\b(literally)\b[,.]?\s*/gi,
    /\b(honestly)\b[,.]?\s*/gi,
    /\b(obviously)\b[,.]?\s*/gi,
  ];

  // Apply multi-word fillers
  multiWordFillers.forEach(pattern => {
    cleaned = cleaned.replace(pattern, ' ');
  });

  // Apply pure fillers
  pureFillers.forEach(pattern => {
    cleaned = cleaned.replace(pattern, ' ');
  });

  // Clean up any resulting double spaces
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  // Apply sentence-start fillers (only at start of text, after other fillers removed)
  cleaned = cleaned.replace(/^(well|so|anyway|alright|okay)[,.]?\s+/i, '');

  // Apply after-punctuation fillers (keep the punctuation)
  cleaned = cleaned.replace(/([.!?])\s+(well|so|anyway|alright|okay)[,.]?\s+/gi, '$1 ');

  // Clean up awkward sentence starts after filler removal
  // "And I guess" at start -> "I guess"
  cleaned = cleaned.replace(/^(and|but)\s+/i, '');

  // Final cleanup
  cleaned = cleaned.trim();

  return cleaned;
}

/**
 * Clean up spacing and punctuation
 */
function cleanupPunctuation(text) {
  let cleaned = text;

  // Remove multiple spaces
  cleaned = cleaned.replace(/\s+/g, ' ');

  // Remove space before punctuation
  cleaned = cleaned.replace(/\s+([.,!?])/g, '$1');

  // Remove duplicate punctuation
  cleaned = cleaned.replace(/([.,!?])\s*([.,!?])/g, '$1');

  // Remove leading/trailing punctuation weirdness
  cleaned = cleaned.replace(/^[,.\s]+/, '');
  cleaned = cleaned.replace(/[,\s]+$/, '');

  // Ensure proper spacing after punctuation
  cleaned = cleaned.replace(/([.,!?])([A-Za-z])/g, '$1 $2');

  return cleaned.trim();
}

/**
 * Add Oxford comma to natural speech lists ONLY after shopping/action verbs
 * Very conservative - only matches clear list patterns like "get milk bread and eggs"
 * Does NOT modify general prose
 */
function addListCommas(text) {
  let result = text;

  // ONLY add commas after explicit shopping/action verbs
  // Pattern: "get/buy/pick up/grab/need [some] item1 item2 and item3"
  // This is conservative and won't match general prose
  const nonListWords = ['to', 'go', 'the', 'and', 'or', 'for', 'with', 'from', 'into', 'at', 'on', 'in', 'up', 'out', 'it', 'them', 'this', 'that', 'some', 'a', 'an', 'my', 'your', 'our', 'their'];

  // Pattern for 3 items: "get milk bread and eggs"
  result = result.replace(
    /\b(get|buy|pick up|grab|need|getting|buying|grabbing)\s+(?:some\s+)?([a-z]+)\s+([a-z]+)\s+and\s+([a-z]+)\b/gi,
    (match, verb, a, b, c) => {
      if (nonListWords.includes(a.toLowerCase()) || nonListWords.includes(b.toLowerCase()) || nonListWords.includes(c.toLowerCase())) {
        return match; // Not a list, don't modify
      }
      return `${verb} ${a}, ${b}, and ${c}`;
    }
  );

  // Pattern for 4 items: "get milk bread eggs and cheese"
  result = result.replace(
    /\b(get|buy|pick up|grab|need|getting|buying|grabbing)\s+(?:some\s+)?([a-z]+)\s+([a-z]+)\s+([a-z]+)\s+and\s+([a-z]+)\b/gi,
    (match, verb, a, b, c, d) => {
      if (nonListWords.includes(a.toLowerCase()) || nonListWords.includes(b.toLowerCase()) || nonListWords.includes(c.toLowerCase()) || nonListWords.includes(d.toLowerCase())) {
        return match;
      }
      return `${verb} ${a}, ${b}, ${c}, and ${d}`;
    }
  );

  // Add Oxford comma to existing comma-separated lists missing it
  // Pattern: "X, Y, Z and W" → "X, Y, Z, and W"
  // Only matches when there's already at least one comma (indicates a list)
  result = result.replace(
    /,\s*([a-z]+)\s+and\s+([a-z]+)\b/gi,
    (match, beforeAnd, afterAnd) => {
      // Only add Oxford comma if the words look like list items (short nouns)
      if (beforeAnd.length < 15 && afterAnd.length < 15) {
        return `, ${beforeAnd}, and ${afterAnd}`;
      }
      return match;
    }
  );

  // Handle "X, and Y and Z" → "X, Y, and Z" (fix double-and in lists)
  result = result.replace(
    /,\s*and\s+([a-z]+)\s+and\s+([a-z]+)\b/gi,
    (match, a, b) => {
      if (a.length < 15 && b.length < 15) {
        return `, ${a}, and ${b}`;
      }
      return match;
    }
  );

  // Handle "X and Y and Z" → "X, Y, and Z" (no preceding comma)
  result = result.replace(
    /\b([a-z]+)\s+and\s+([a-z]+)\s+and\s+([a-z]+)\b/gi,
    (match, a, b, c) => {
      // Only apply if words look like list items
      if (a.length < 12 && b.length < 12 && c.length < 12 &&
          !nonListWords.includes(a.toLowerCase()) &&
          !nonListWords.includes(b.toLowerCase()) &&
          !nonListWords.includes(c.toLowerCase())) {
        return `${a}, ${b}, and ${c}`;
      }
      return match;
    }
  );

  return result;
}

/**
 * Capitalize common proper nouns and brand names
 */
function capitalizeProperNouns(text) {
  const properNouns = [
    'nutella', 'coca-cola', 'pepsi', 'starbucks', 'mcdonald', 'walmart',
    'amazon', 'google', 'apple', 'microsoft', 'facebook', 'instagram',
    'twitter', 'netflix', 'spotify', 'uber', 'lyft', 'airbnb'
  ];

  let result = text;

  properNouns.forEach(noun => {
    const regex = new RegExp(`\\b${noun}\\b`, 'gi');
    result = result.replace(regex, noun.charAt(0).toUpperCase() + noun.slice(1));
  });

  return result;
}

/**
 * Capitalize the first letter of each sentence
 */
function capitalizeSentences(text) {
  if (!text) return text;

  // Capitalize first letter of the text
  let result = text.charAt(0).toUpperCase() + text.slice(1);

  // Capitalize after sentence-ending punctuation
  result = result.replace(/([.!?])\s+([a-z])/g, (match, punct, letter) => {
    return punct + ' ' + letter.toUpperCase();
  });

  // Capitalize "I" when it's a standalone word
  result = result.replace(/\bi\b/g, 'I');

  // Ensure the text ends with proper punctuation
  if (result && !result.match(/[.!?]$/)) {
    result += '.';
  }

  return result;
}

// Legacy functions removed - using new simpleCleanup approach that preserves context

/**
 * Build the prompt for transcript processing
 * Based on modern voice dictation assistant principles
 */
function buildPrompt(rawTranscript) {
  return `Polish this voice transcript into clear, natural prose. Remove fillers (um, uh, like, you know, basically, so), fix grammar, keep the speaker's voice. Output ONLY the polished text, no bullet points.

"${rawTranscript}"

Polished:`;
}

/**
 * Detect the format type of the processed text
 */
function detectFormat(text, rawTranscript) {
  const lowercaseRaw = rawTranscript.toLowerCase();

  if (lowercaseRaw.includes('send an email') || lowercaseRaw.includes('write to') ||
      lowercaseRaw.includes('subject') || lowercaseRaw.includes('dear ') ||
      text.includes('Subject:')) {
    return 'email';
  }

  if (lowercaseRaw.includes('meeting notes') || lowercaseRaw.includes('action items') ||
      lowercaseRaw.includes('discussed') || lowercaseRaw.includes('attendees')) {
    return 'meeting';
  }

  if (lowercaseRaw.includes('first') && lowercaseRaw.includes('second') ||
      lowercaseRaw.includes('need to buy') || lowercaseRaw.includes('shopping list') ||
      text.includes('•') || text.includes('- ')) {
    return 'list';
  }

  if (lowercaseRaw.includes(' said ') || lowercaseRaw.includes(' asked ') ||
      lowercaseRaw.includes(' told me') || text.includes('"')) {
    return 'conversation';
  }

  return 'general';
}

/**
 * Process a raw transcript - uses simple cleanup by default, LLM optional
 * @param {string} rawTranscript - The raw transcript from speech recognition
 * @param {Object} options - Processing options
 * @param {boolean} options.useLLM - Whether to use the full LLM (slower but better)
 * @returns {Promise<Object>} - Processed result with polished text and metadata
 */
async function processTranscript(rawTranscript, options = {}) {
  if (!rawTranscript || rawTranscript.trim().length === 0) {
    throw new Error('Empty transcript provided');
  }

  const startTime = Date.now();
  const useLLM = options.useLLM === true; // Default to simple cleanup

  // Use simple cleanup (fast, no LLM)
  if (!useLLM) {
    console.log('[GemmaProcessor] Using simple cleanup (fast mode)...');
    const polishedText = simpleCleanup(rawTranscript);
    const processingTime = Date.now() - startTime;
    const detectedFormat = detectFormat(polishedText, rawTranscript);

    return {
      success: true,
      polishedText,
      detectedFormat,
      processingTimeMs: processingTime,
      modelUsed: 'simple-cleanup'
    };
  }

  // Use full LLM processing (slower but smarter)
  console.log('[GemmaProcessor] Using LLM processing (slow mode)...');
  await initializeModel();

  let localContext = null;
  try {
    // Create a fresh context for each request to avoid "No sequences left" error
    localContext = await model.createContext();

    const session = new LlamaChatSession({
      contextSequence: localContext.getSequence()
    });

    const prompt = buildPrompt(rawTranscript);

    console.log('[GemmaProcessor] Processing transcript with LLM...');

    // Set timeout for processing (90 seconds max for LLM)
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Processing timeout exceeded (90s)')), 90000);
    });

    const responsePromise = session.prompt(prompt);

    const response = await Promise.race([responsePromise, timeoutPromise]);

    const polishedText = response.trim();
    const processingTime = Date.now() - startTime;
    const detectedFormat = detectFormat(polishedText, rawTranscript);

    console.log(`[GemmaProcessor] Processing complete in ${processingTime}ms, format: ${detectedFormat}`);

    return {
      success: true,
      polishedText,
      detectedFormat,
      processingTimeMs: processingTime,
      modelUsed: 'gemma-3-4b'
    };
  } catch (error) {
    console.error('[GemmaProcessor] LLM processing error, falling back to simple cleanup:', error);
    // Fallback to simple cleanup on error
    const polishedText = simpleCleanup(rawTranscript);
    const processingTime = Date.now() - startTime;
    const detectedFormat = detectFormat(polishedText, rawTranscript);

    return {
      success: true,
      polishedText,
      detectedFormat,
      processingTimeMs: processingTime,
      modelUsed: 'simple-cleanup-fallback'
    };
  } finally {
    // Clean up the local context after use
    if (localContext) {
      try {
        await localContext.dispose();
      } catch (e) {
        console.error('[GemmaProcessor] Failed to dispose context:', e);
      }
    }
  }
}

/**
 * Check if the model is available and can be loaded
 */
async function checkModelAvailable() {
  const exists = fs.existsSync(MODEL_PATH);
  return {
    available: exists,
    modelPath: MODEL_PATH,
    initialized: model !== null
  };
}

/**
 * Shutdown and clean up the model
 */
async function shutdownModel() {
  console.log('[GemmaProcessor] Shutting down model...');

  try {
    if (context) {
      await context.dispose();
      context = null;
    }
    if (model) {
      await model.dispose();
      model = null;
    }
    if (llama) {
      await llama.dispose();
      llama = null;
    }
    console.log('[GemmaProcessor] Model shut down successfully');
  } catch (error) {
    console.error('[GemmaProcessor] Shutdown error:', error);
  }
}

// Clean shutdown on process exit
process.on('SIGINT', async () => {
  await shutdownModel();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await shutdownModel();
  process.exit(0);
});

module.exports = {
  processTranscript,
  initializeModel,
  shutdownModel,
  checkModelAvailable
};
