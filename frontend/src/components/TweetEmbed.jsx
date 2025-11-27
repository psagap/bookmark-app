import React, { useEffect, useRef, useState } from 'react';
import { Loader2, ExternalLink } from 'lucide-react';

/**
 * TweetEmbed Component - Using X's oEmbed API
 *
 * Features:
 * 1. Fetches oEmbed HTML from publish.twitter.com
 * 2. Handles both twitter.com and x.com URLs
 * 3. Auto-loads widgets.js
 * 4. Autoplays videos (muted) when loaded
 */

// Fetch embed HTML from oEmbed API via our server proxy (avoids CORS issues)
async function getTweetEmbed(tweetUrl, maxWidth = 500) {
    // Use our server-side proxy to fetch oEmbed data
    // The server handles the twitter.com/x.com URL conversion internally
    const response = await fetch(
        `/api/twitter/oembed?url=${encodeURIComponent(tweetUrl)}&maxwidth=${maxWidth}`
    );

    if (!response.ok) {
        throw new Error(`oEmbed failed: ${response.status}`);
    }
    const data = await response.json();
    return data.html;
}

// Autoplay video workaround
function autoPlayVideo(embedContainer) {
    // Poll for the video element since it might take a moment to render after hydration
    const maxAttempts = 20; // Try for 2 seconds
    let attempts = 0;

    const checkVideo = setInterval(() => {
        attempts++;
        const video = embedContainer.querySelector('video');

        if (video) {
            clearInterval(checkVideo);
            if (video.paused) {
                video.muted = true; // Required for autoplay
                video.play().catch(e => console.log('Autoplay blocked:', e));
            }
        } else if (attempts >= maxAttempts) {
            clearInterval(checkVideo);
        }
    }, 100);
}

const TweetEmbed = ({ tweetUrl }) => {
    const containerRef = useRef(null);
    const [embedHtml, setEmbedHtml] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!tweetUrl) return;

        setLoading(true);
        setError(null);

        getTweetEmbed(tweetUrl)
            .then((html) => {
                setEmbedHtml(html);
                setLoading(false);
            })
            .catch((err) => {
                console.error('Failed to fetch tweet embed:', err);
                setError(err.message);
                setLoading(false);
            });
    }, [tweetUrl]);

    // Hydrate and Autoplay
    useEffect(() => {
        if (!embedHtml || !containerRef.current) return;

        const hydrate = () => {
            if (window.twttr && window.twttr.widgets) {
                window.twttr.widgets.load(containerRef.current).then(() => {
                    autoPlayVideo(containerRef.current);
                });
            }
        };

        if (window.twttr && window.twttr.widgets) {
            hydrate();
        } else {
            // Wait for widgets.js to be available (loaded in index.html)
            const checkTwitter = setInterval(() => {
                if (window.twttr && window.twttr.widgets) {
                    clearInterval(checkTwitter);
                    hydrate();
                }
            }, 100);

            // Timeout after 5s
            setTimeout(() => clearInterval(checkTwitter), 5000);
        }
    }, [embedHtml]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12 bg-black min-h-[200px]">
                <Loader2 className="w-8 h-8 text-[#1d9bf0] animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center py-8 px-4 bg-black rounded-xl border border-white/10">
                <p className="text-[#71767b] text-sm mb-4">Could not load tweet</p>
                <a
                    href={tweetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1d9bf0] text-white text-sm font-medium rounded-full hover:bg-[#1a8cd8] transition-colors"
                    onClick={(e) => e.stopPropagation()}
                >
                    <ExternalLink className="w-4 h-4" />
                    View on X
                </a>
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            className="tweet-embed-container w-full flex justify-center bg-black"
            dangerouslySetInnerHTML={{ __html: embedHtml }}
        />
    );
};

export default TweetEmbed;
