/**
 * useSemanticSearch Hook
 *
 * Provides semantic search functionality using the backend embeddings API.
 * Falls back to fuzzy search if semantic search fails.
 *
 * Usage:
 *   const { search, results, isSearching, method } = useSemanticSearch();
 *   const results = await search('design patterns for React');
 */

import { useState, useCallback, useRef } from 'react';

const API_BASE = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:3000';

export const useSemanticSearch = (options = {}) => {
  const {
    debounceMs = 300,
    threshold = 0.3,
    limit = 20,
    autoFallback = true, // Fall back to fuzzy search if semantic fails
  } = options;

  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState(null);
  const [method, setMethod] = useState(null); // 'semantic' | 'fuzzy' | null

  const debounceTimer = useRef(null);
  const abortController = useRef(null);

  // Semantic search API call
  const semanticSearch = async (query, filters = {}) => {
    const response = await fetch(`${API_BASE}/api/semantic-search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        filters,
        limit,
        threshold,
      }),
      signal: abortController.current?.signal,
    });

    if (!response.ok) {
      throw new Error(`Semantic search failed: ${response.status}`);
    }

    return response.json();
  };

  // Fuzzy search API call (fallback)
  const fuzzySearch = async (query, filters = {}) => {
    const response = await fetch(`${API_BASE}/api/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        filters,
        limit,
      }),
      signal: abortController.current?.signal,
    });

    if (!response.ok) {
      throw new Error(`Fuzzy search failed: ${response.status}`);
    }

    return response.json();
  };

  // Main search function
  const search = useCallback(async (query, filters = {}) => {
    // Clear previous timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Abort previous request
    if (abortController.current) {
      abortController.current.abort();
    }

    // Handle empty query
    if (!query?.trim()) {
      setResults([]);
      setMethod(null);
      setError(null);
      return [];
    }

    return new Promise((resolve) => {
      debounceTimer.current = setTimeout(async () => {
        setIsSearching(true);
        setError(null);
        abortController.current = new AbortController();

        try {
          // Try semantic search first
          const semanticResult = await semanticSearch(query, filters);
          setResults(semanticResult.results);
          setMethod(semanticResult.method === 'openai' ? 'semantic-ai' : 'semantic-basic');
          resolve(semanticResult.results);
        } catch (semanticError) {
          if (semanticError.name === 'AbortError') {
            resolve([]);
            return;
          }

          console.warn('Semantic search failed:', semanticError.message);

          // Fall back to fuzzy search if enabled
          if (autoFallback) {
            try {
              const fuzzyResult = await fuzzySearch(query, filters);
              setResults(fuzzyResult.results);
              setMethod('fuzzy');
              resolve(fuzzyResult.results);
            } catch (fuzzyError) {
              if (fuzzyError.name === 'AbortError') {
                resolve([]);
                return;
              }
              setError(fuzzyError.message);
              setResults([]);
              resolve([]);
            }
          } else {
            setError(semanticError.message);
            setResults([]);
            resolve([]);
          }
        } finally {
          setIsSearching(false);
        }
      }, debounceMs);
    });
  }, [debounceMs, threshold, limit, autoFallback]);

  // Cancel ongoing search
  const cancel = useCallback(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    if (abortController.current) {
      abortController.current.abort();
    }
    setIsSearching(false);
  }, []);

  // Clear results
  const clear = useCallback(() => {
    setResults([]);
    setMethod(null);
    setError(null);
  }, []);

  return {
    search,
    cancel,
    clear,
    results,
    isSearching,
    error,
    method,
  };
};

export default useSemanticSearch;
