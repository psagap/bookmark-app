import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Loader2, ExternalLink } from 'lucide-react';

/**
 * TweetEmbed component - Official X/Twitter embed using oEmbed API + widgets.js
 *
 * Two rendering paths:
 * 1. Primary: Fetch oEmbed HTML from server, inject, then hydrate with twttr.widgets.load()
 * 2. Fallback: Use twttr.widgets.createTweet() factory method
 *
 * Features:
 * - Lazy loading with IntersectionObserver
 * - Proper hydration after DOM insertion
 * - Graceful handling of protected/deleted posts
 * - Dark theme to match our UI
 */
const TweetEmbed = ({ tweetUrl, theme = 'dark', onLoad, onError }) => {
    const containerRef = useRef(null);
    const observerRef = useRef(null);
    const [status, setStatus] = useState('idle'); // idle, loading, loaded, error
    const [errorMessage, setErrorMessage] = useState(null);
    const [oembedHtml, setOembedHtml] = useState(null);
    const hasHydrated = useRef(false);

    // Extract tweet ID from URL for factory method fallback
    const getTweetId = (url) => {
        const match = url.match(/(?:twitter|x)\.com\/\w+\/status\/(\d+)/);
        return match ? match[1] : null;
    };

    // Hydrate the embed after HTML is in DOM
    const hydrateEmbed = useCallback(() => {
        if (!containerRef.current || hasHydrated.current) return;

        const doHydrate = () => {
            if (window.twttr && window.twttr.widgets) {
                hasHydrated.current = true;
                window.twttr.widgets.load(containerRef.current).then(() => {
                    setStatus('loaded');
                    onLoad?.();
                }).catch((err) => {
                    console.error('Widget hydration failed:', err);
                    // Try factory method as fallback
                    tryFactoryMethod();
                });
            } else {
                // widgets.js not ready, retry
                setTimeout(doHydrate, 100);
            }
        };

        doHydrate();
    }, [onLoad]);

    // Factory method fallback (createTweet)
    const tryFactoryMethod = useCallback(() => {
        const tweetId = getTweetId(tweetUrl);
        if (!tweetId || !containerRef.current) {
            setStatus('error');
            setErrorMessage('Could not load tweet');
            onError?.('Invalid tweet');
            return;
        }

        // Clear container for factory method
        containerRef.current.innerHTML = '';

        const createWidget = () => {
            if (window.twttr && window.twttr.widgets) {
                window.twttr.widgets.createTweet(
                    tweetId,
                    containerRef.current,
                    {
                        theme: theme,
                        dnt: true,
                        align: 'center',
                        conversation: 'none'
                    }
                ).then((el) => {
                    if (el) {
                        setStatus('loaded');
                        onLoad?.();
                    } else {
                        // Tweet might be deleted or protected
                        setStatus('error');
                        setErrorMessage('Tweet unavailable (deleted or protected)');
                        onError?.('Tweet unavailable');
                    }
                }).catch((err) => {
                    setStatus('error');
                    setErrorMessage('Failed to load tweet');
                    onError?.(err);
                });
            } else {
                setTimeout(createWidget, 100);
            }
        };

        createWidget();
    }, [tweetUrl, theme, onLoad, onError]);

    // Fetch oEmbed HTML from our server
    const fetchOembed = useCallback(async () => {
        setStatus('loading');
        hasHydrated.current = false;

        try {
            const response = await fetch(
                `http://127.0.0.1:3000/api/twitter/oembed?url=${encodeURIComponent(tweetUrl)}`
            );

            if (!response.ok) {
                throw new Error(`Server returned ${response.status}`);
            }

            const data = await response.json();

            if (data.html) {
                setOembedHtml(data.html);
                // Hydration happens in useEffect when oembedHtml changes
            } else {
                // No HTML returned, try factory method
                tryFactoryMethod();
            }
        } catch (err) {
            console.error('oEmbed fetch failed, trying factory method:', err);
            // Fallback to factory method
            tryFactoryMethod();
        }
    }, [tweetUrl, tryFactoryMethod]);

    // Set up IntersectionObserver for lazy loading
    useEffect(() => {
        if (!containerRef.current) return;

        observerRef.current = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting && status === 'idle') {
                        fetchOembed();
                        observerRef.current?.unobserve(entry.target);
                    }
                });
            },
            { rootMargin: '200px' } // Start loading 200px before visible
        );

        observerRef.current.observe(containerRef.current);

        return () => {
            observerRef.current?.disconnect();
        };
    }, [fetchOembed, status]);

    // Hydrate when oEmbed HTML is set
    useEffect(() => {
        if (oembedHtml && containerRef.current) {
            containerRef.current.innerHTML = oembedHtml;
            hydrateEmbed();
        }
    }, [oembedHtml, hydrateEmbed]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            hasHydrated.current = false;
            if (containerRef.current) {
                containerRef.current.innerHTML = '';
            }
        };
    }, []);

    return (
        <div className="tweet-embed-wrapper">
            {/* Loading state */}
            {(status === 'idle' || status === 'loading') && (
                <div className="flex items-center justify-center py-8 bg-[#000000]">
                    <Loader2 className="w-6 h-6 text-[#1d9bf0] animate-spin" />
                </div>
            )}

            {/* Error state - show fallback with link */}
            {status === 'error' && (
                <div className="flex flex-col items-center justify-center py-8 px-4 bg-[#000000] text-center">
                    <p className="text-[#71767b] text-sm mb-3">{errorMessage}</p>
                    <a
                        href={tweetUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-[#1d9bf0] text-white text-sm font-medium rounded-full hover:bg-[#1a8cd8] transition-colors"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <ExternalLink className="w-4 h-4" />
                        View on X
                    </a>
                </div>
            )}

            {/* Embed container - widgets.js will render here */}
            <div
                ref={containerRef}
                className="tweet-embed-container"
                style={{
                    display: status === 'loaded' ? 'block' : 'none',
                    minHeight: status === 'loading' ? '200px' : 'auto'
                }}
            />
        </div>
    );
};

export default TweetEmbed;
