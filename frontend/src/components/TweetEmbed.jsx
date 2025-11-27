import React, { useEffect, useRef, useState } from 'react';
import { Loader2, ExternalLink } from 'lucide-react';

/**
 * TweetEmbed Component - Using X's oEmbed API
 *
 * Following the guide exactly:
 * 1. Fetch oEmbed HTML from publish.twitter.com/oembed
 * 2. Inject HTML into container using dangerouslySetInnerHTML
 * 3. Call twttr.widgets.load() to hydrate the blockquote into full widget
 * 4. Attempt autoplay for videos (muted)
 */

// Fetch embed HTML from oEmbed API
async function getTweetEmbed(tweetUrl, maxWidth = 500) {
    const response = await fetch(
        `https://publish.twitter.com/oembed?url=${encodeURIComponent(tweetUrl)}&maxwidth=${maxWidth}&omit_script=true&theme=dark&hide_thread=true`
    );
    if (!response.ok) {
        throw new Error(`oEmbed failed: ${response.status}`);
    }
    const data = await response.json();
    return data.html;
}

// Autoplay video workaround from the guide
function autoPlayVideo(embedContainer) {
    // Wait for widget to load
    setTimeout(() => {
        const video = embedContainer.querySelector('video');
        if (video && video.paused) {
            video.muted = true; // Required for autoplay in most browsers
            video.play().catch(e => console.log('Autoplay blocked:', e));
        }
    }, 1000); // Adjust delay as needed
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

        // Fetch the oEmbed HTML
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

    // After HTML is injected, load widgets.js to hydrate
    useEffect(() => {
        if (!embedHtml || !containerRef.current) return;

        // Call twttr.widgets.load() to hydrate the blockquote
        if (window.twttr && window.twttr.widgets) {
            window.twttr.widgets.load(containerRef.current).then(() => {
                // After widget loads, attempt autoplay
                autoPlayVideo(containerRef.current);
            });
        } else {
            // widgets.js not loaded yet, wait for it
            const checkTwitter = setInterval(() => {
                if (window.twttr && window.twttr.widgets) {
                    clearInterval(checkTwitter);
                    window.twttr.widgets.load(containerRef.current).then(() => {
                        autoPlayVideo(containerRef.current);
                    });
                }
            }, 100);

            // Clean up interval after 5 seconds
            setTimeout(() => clearInterval(checkTwitter), 5000);
        }
    }, [embedHtml]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12 bg-black">
                <Loader2 className="w-8 h-8 text-[#1d9bf0] animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center py-8 px-4 bg-black rounded-xl">
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

    // Inject the oEmbed HTML using dangerouslySetInnerHTML (as per guide)
    return (
        <div
            ref={containerRef}
            className="tweet-embed-container"
            dangerouslySetInnerHTML={{ __html: embedHtml }}
        />
    );
};

export default TweetEmbed;
