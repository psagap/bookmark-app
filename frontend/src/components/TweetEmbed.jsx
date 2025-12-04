import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ExternalLink, RefreshCw } from 'lucide-react';
import FerrisWheelLoader from './FerrisWheelLoader';

/**
 * TweetEmbed Component - Using X's oEmbed API
 *
 * Features:
 * 1. Fetches oEmbed HTML from publish.twitter.com
 * 2. Handles both twitter.com and x.com URLs
 * 3. Auto-loads widgets.js with retry logic
 * 4. Caches embed HTML to prevent refetch on re-render
 * 5. Handles hydration failures with retry
 */

// Simple in-memory cache for embed HTML
const embedCache = new Map();

// Fetch embed HTML from oEmbed API via our server proxy (avoids CORS issues)
async function getTweetEmbed(tweetUrl, maxWidth = 550) {
    // Check cache first
    const cacheKey = `${tweetUrl}-${maxWidth}`;
    if (embedCache.has(cacheKey)) {
        return embedCache.get(cacheKey);
    }

    const response = await fetch(
        `/api/twitter/oembed?url=${encodeURIComponent(tweetUrl)}&maxwidth=${maxWidth}`
    );

    if (!response.ok) {
        throw new Error(`oEmbed failed: ${response.status}`);
    }
    const data = await response.json();

    // Cache the result
    embedCache.set(cacheKey, data.html);

    return data.html;
}

// Load Twitter widgets.js if not already loaded
function ensureTwitterWidgets() {
    return new Promise((resolve) => {
        // Already loaded and ready
        if (window.twttr?.widgets?.load) {
            resolve(window.twttr);
            return;
        }

        // Check if script is already in DOM
        const existingScript = document.querySelector('script[src*="platform.twitter.com/widgets.js"]');

        if (!existingScript) {
            // Load the script
            const script = document.createElement('script');
            script.src = 'https://platform.twitter.com/widgets.js';
            script.async = true;
            script.charset = 'utf-8';
            document.body.appendChild(script);
        }

        // Poll for availability
        let attempts = 0;
        const maxAttempts = 50; // 5 seconds
        const checkInterval = setInterval(() => {
            attempts++;
            if (window.twttr?.widgets?.load) {
                clearInterval(checkInterval);
                resolve(window.twttr);
            } else if (attempts >= maxAttempts) {
                clearInterval(checkInterval);
                resolve(null);
            }
        }, 100);
    });
}

// Autoplay video workaround
function autoPlayVideo(embedContainer) {
    if (!embedContainer) return;

    const maxAttempts = 20;
    let attempts = 0;

    const checkVideo = setInterval(() => {
        attempts++;
        const video = embedContainer.querySelector('video');

        if (video) {
            clearInterval(checkVideo);
            if (video.paused) {
                video.muted = true;
                video.play().catch(() => {});
            }
        } else if (attempts >= maxAttempts) {
            clearInterval(checkVideo);
        }
    }, 100);
}

const TweetEmbed = ({ tweetUrl }) => {
    const containerRef = useRef(null);
    const iframeObserverRef = useRef(null);
    const [embedHtml, setEmbedHtml] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [hydrated, setHydrated] = useState(false);
    const [retryCount, setRetryCount] = useState(0);
    const mountedRef = useRef(true);

    // Hydrate the tweet embed
    const hydrateTweet = useCallback(async () => {
        if (!containerRef.current || !embedHtml) return false;

        try {
            const twttr = await ensureTwitterWidgets();
            if (!twttr || !mountedRef.current) return false;

            // Clear any existing iframes first
            const existingIframes = containerRef.current.querySelectorAll('iframe');
            existingIframes.forEach(iframe => iframe.remove());

            // Re-inject the HTML
            containerRef.current.innerHTML = embedHtml;

            // Load/hydrate the widget
            await twttr.widgets.load(containerRef.current);

            // Check if iframe was created (successful hydration)
            await new Promise(resolve => setTimeout(resolve, 500));

            if (!mountedRef.current) return false;

            const iframe = containerRef.current.querySelector('iframe');
            if (iframe) {
                setHydrated(true);
                autoPlayVideo(containerRef.current);
                return true;
            }

            return false;
        } catch (err) {
            console.error('Hydration error:', err);
            return false;
        }
    }, [embedHtml]);

    // Fetch embed HTML
    useEffect(() => {
        if (!tweetUrl) return;

        mountedRef.current = true;
        setLoading(true);
        setError(null);
        setHydrated(false);

        getTweetEmbed(tweetUrl)
            .then((html) => {
                if (mountedRef.current) {
                    setEmbedHtml(html);
                    setLoading(false);
                }
            })
            .catch((err) => {
                console.error('Failed to fetch tweet embed:', err);
                if (mountedRef.current) {
                    setError(err.message);
                    setLoading(false);
                }
            });

        return () => {
            mountedRef.current = false;
        };
    }, [tweetUrl]);

    // Hydrate when HTML is ready
    useEffect(() => {
        if (!embedHtml || loading) return;

        let retryTimeout;

        const attemptHydration = async () => {
            const success = await hydrateTweet();

            // If hydration failed and we haven't retried too many times, try again
            if (!success && mountedRef.current && retryCount < 3) {
                retryTimeout = setTimeout(() => {
                    if (mountedRef.current) {
                        setRetryCount(prev => prev + 1);
                    }
                }, 1000);
            }
        };

        attemptHydration();

        return () => {
            if (retryTimeout) clearTimeout(retryTimeout);
        };
    }, [embedHtml, loading, hydrateTweet, retryCount]);

    // Monitor for iframe disappearing (React re-render issue)
    useEffect(() => {
        if (!hydrated || !containerRef.current) return;

        // Use MutationObserver to detect if iframe gets removed
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'childList' && mutation.removedNodes.length > 0) {
                    const iframe = containerRef.current?.querySelector('iframe');
                    if (!iframe && mountedRef.current) {
                        // Iframe was removed, re-hydrate
                        setHydrated(false);
                        setRetryCount(prev => prev + 1);
                    }
                }
            }
        });

        observer.observe(containerRef.current, { childList: true, subtree: true });
        iframeObserverRef.current = observer;

        return () => {
            observer.disconnect();
        };
    }, [hydrated]);

    // Manual retry handler
    const handleRetry = useCallback(() => {
        setError(null);
        setHydrated(false);
        setRetryCount(0);
        setLoading(true);

        // Clear cache for this URL to force refetch
        const cacheKey = `${tweetUrl}-550`;
        embedCache.delete(cacheKey);

        getTweetEmbed(tweetUrl)
            .then((html) => {
                if (mountedRef.current) {
                    setEmbedHtml(html);
                    setLoading(false);
                }
            })
            .catch((err) => {
                if (mountedRef.current) {
                    setError(err.message);
                    setLoading(false);
                }
            });
    }, [tweetUrl]);

    if (error) {
        return (
            <div
                className="flex flex-col items-center justify-center py-10 px-6 rounded-xl"
                style={{
                    background: 'linear-gradient(180deg, rgba(40, 40, 40, 0.6) 0%, rgba(29, 32, 33, 0.8) 100%)',
                    border: '1px solid rgba(204, 36, 29, 0.2)',
                }}
            >
                <p className="text-gruvbox-fg-muted text-sm mb-5">Could not load tweet</p>
                <div className="flex gap-3">
                    <button
                        onClick={handleRetry}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-gruvbox-bg-lighter text-gruvbox-fg text-sm font-medium rounded-full hover:bg-gruvbox-bg-light transition-colors border border-gruvbox-bg-lighter"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Retry
                    </button>
                    <a
                        href={tweetUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-5 py-2.5 text-gruvbox-bg-darkest text-sm font-medium rounded-full transition-colors"
                        style={{
                            background: 'linear-gradient(135deg, #fabd2f 0%, #fe8019 100%)',
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <ExternalLink className="w-4 h-4" />
                        View on X
                    </a>
                </div>
            </div>
        );
    }

    const isLoading = loading || !hydrated;

    return (
        <div className="relative rounded-xl overflow-hidden" style={{ background: '#000' }}>
            {/* Loading overlay - matches parent black background */}
            {isLoading && (
                <div className="absolute inset-0 z-10">
                    <FerrisWheelLoader
                        label={loading ? "Loading Tweet" : "Rendering"}
                        subtitle={loading ? "FETCHING FROM X" : "PREPARING TWEET"}
                        background="black"
                    />
                </div>
            )}
            {/* Tweet container - always rendered so hydration can happen */}
            <div
                ref={containerRef}
                className="tweet-embed-container w-full flex justify-center rounded-xl overflow-hidden"
                style={{ background: '#000' }}
            />
        </div>
    );
};

export default TweetEmbed;
