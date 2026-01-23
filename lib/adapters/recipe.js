/**
 * Recipe JSON-LD Adapter
 * Extracts recipe information from Schema.org Recipe type
 */

/**
 * Parse ISO 8601 duration to human readable
 * e.g., "PT30M" -> "30 min", "PT1H30M" -> "1h 30min"
 * @param {string} duration - ISO 8601 duration string
 * @returns {string|null} - Human readable duration
 */
function parseDuration(duration) {
  if (!duration) return null;

  // Handle "30 minutes" style strings
  if (/^\d+\s*min/i.test(duration)) {
    return duration;
  }

  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/i);
  if (!match) return duration;

  const hours = parseInt(match[1]) || 0;
  const minutes = parseInt(match[2]) || 0;
  const seconds = parseInt(match[3]) || 0;

  const parts = [];
  if (hours) parts.push(`${hours}h`);
  if (minutes) parts.push(`${minutes} min`);
  if (seconds && !hours && !minutes) parts.push(`${seconds}s`);

  return parts.join(' ') || null;
}

/**
 * Parse yield/servings string to number
 * e.g., "4 servings" -> 4, "Makes 12" -> 12
 * @param {string|number} yield - Yield string or number
 * @returns {string} - Normalized yield string
 */
function parseYield(yieldValue) {
  if (!yieldValue) return null;

  if (typeof yieldValue === 'number') {
    return `${yieldValue} servings`;
  }

  // Already formatted
  if (typeof yieldValue === 'string') {
    // Extract number if present
    const match = yieldValue.match(/(\d+)/);
    if (match) {
      const num = parseInt(match[1]);
      // If just a number, add "servings"
      if (yieldValue.trim() === match[0]) {
        return `${num} servings`;
      }
    }
    return yieldValue;
  }

  // Handle array (take first)
  if (Array.isArray(yieldValue)) {
    return parseYield(yieldValue[0]);
  }

  return null;
}

/**
 * Extract calorie count from nutrition info
 * @param {object} nutrition - Nutrition information object
 * @returns {string|null} - Calories string
 */
function parseCalories(nutrition) {
  if (!nutrition) return null;

  // Direct calories property
  let calories = nutrition.calories;

  // Sometimes in a nested structure
  if (!calories && nutrition.nutrition) {
    calories = nutrition.nutrition.calories;
  }

  if (!calories) return null;

  // Handle "400 calories" or "400 kcal" or just "400"
  if (typeof calories === 'string') {
    const match = calories.match(/(\d+)/);
    if (match) {
      return `${match[1]} cal`;
    }
    return calories;
  }

  if (typeof calories === 'number') {
    return `${calories} cal`;
  }

  return null;
}

/**
 * Extract recipe data from JSON-LD
 * @param {object} jsonLd - The JSON-LD object with @type: "Recipe"
 * @returns {object} - Normalized recipe data
 */
function extractRecipeFromJsonLd(jsonLd) {
  if (!jsonLd) return null;

  // Extract times
  const cookTime = parseDuration(jsonLd.cookTime);
  const prepTime = parseDuration(jsonLd.prepTime);
  const totalTime = parseDuration(jsonLd.totalTime);

  // Extract servings/yield
  const servings = parseYield(jsonLd.recipeYield);

  // Extract calories
  const calories = parseCalories(jsonLd.nutrition);

  // Extract rating
  const aggregateRating = jsonLd.aggregateRating;
  let rating = null;
  let ratingCount = null;

  if (aggregateRating) {
    rating = parseFloat(aggregateRating.ratingValue) || null;
    ratingCount = parseInt(aggregateRating.ratingCount) || parseInt(aggregateRating.reviewCount) || null;
  }

  // Extract author
  let author = jsonLd.author;
  if (Array.isArray(author)) {
    author = author.map(a => typeof a === 'object' ? a.name : a).join(', ');
  } else if (typeof author === 'object') {
    author = author.name;
  }

  // Extract image (can be string, array, or ImageObject)
  let image = jsonLd.image;
  if (Array.isArray(image)) {
    // Prefer landscape images for recipes
    image = image[0];
  }
  if (typeof image === 'object') {
    image = image.url || image.contentUrl;
  }

  // Extract ingredients (always an array)
  let ingredients = jsonLd.recipeIngredient || jsonLd.ingredients || [];
  if (!Array.isArray(ingredients)) {
    ingredients = [ingredients];
  }

  // Extract instructions
  let instructions = jsonLd.recipeInstructions || [];
  if (!Array.isArray(instructions)) {
    instructions = [instructions];
  }
  // Normalize instruction format
  instructions = instructions.map(inst => {
    if (typeof inst === 'string') return inst;
    if (inst['@type'] === 'HowToStep') return inst.text;
    if (inst['@type'] === 'HowToSection') {
      return {
        name: inst.name,
        steps: (inst.itemListElement || []).map(s => typeof s === 'string' ? s : s.text),
      };
    }
    return inst.text || inst.name || String(inst);
  });

  // Extract category/cuisine
  const category = jsonLd.recipeCategory;
  const cuisine = jsonLd.recipeCuisine;

  // Keywords for search/filtering
  let keywords = jsonLd.keywords;
  if (typeof keywords === 'string') {
    keywords = keywords.split(',').map(k => k.trim());
  }

  return {
    contentType: 'recipe',
    name: jsonLd.name,
    description: jsonLd.description,
    cookTime: cookTime,
    prepTime: prepTime,
    totalTime: totalTime,
    servings: servings,
    calories: calories,
    rating: rating,
    ratingCount: ratingCount,
    author: author,
    image: image,
    ingredients: ingredients,
    instructions: instructions,
    category: category,
    cuisine: cuisine,
    keywords: keywords,
    url: jsonLd.url,
    datePublished: jsonLd.datePublished,
  };
}

/**
 * Get display info for recipe card
 * @param {object} recipe - Recipe data object
 * @returns {object} - Display metadata
 */
function getRecipeDisplayInfo(recipe) {
  // Determine primary time to show
  const primaryTime = recipe.totalTime || recipe.cookTime || recipe.prepTime;

  // Determine difficulty (estimate based on time and ingredients)
  let difficulty = 'medium';
  const timeMinutes = parseTimeToMinutes(primaryTime);
  const ingredientCount = recipe.ingredients?.length || 0;

  if (timeMinutes < 30 && ingredientCount < 8) {
    difficulty = 'easy';
  } else if (timeMinutes > 90 || ingredientCount > 15) {
    difficulty = 'hard';
  }

  return {
    primaryTime,
    difficulty,
    ingredientCount,
    hasVideo: false, // Could be extended to detect video
  };
}

/**
 * Parse time string to minutes
 * @param {string} timeStr - Time string like "30 min" or "1h 30min"
 * @returns {number} - Total minutes
 */
function parseTimeToMinutes(timeStr) {
  if (!timeStr) return 0;

  let minutes = 0;

  const hourMatch = timeStr.match(/(\d+)\s*h/i);
  if (hourMatch) {
    minutes += parseInt(hourMatch[1]) * 60;
  }

  const minMatch = timeStr.match(/(\d+)\s*min/i);
  if (minMatch) {
    minutes += parseInt(minMatch[1]);
  }

  return minutes;
}

module.exports = {
  extractRecipeFromJsonLd,
  parseDuration,
  parseYield,
  parseCalories,
  getRecipeDisplayInfo,
  parseTimeToMinutes,
};
