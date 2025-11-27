import React, { useState, useEffect, useRef } from 'react';
import { CreepyButton } from './CreepyButton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Play, ExternalLink, ChevronUp, X, Plus } from "lucide-react";

// Tag color palette - similar to Notion
const TAG_COLORS = [
    { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' },
    { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/30' },
    { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30' },
    { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30' },
    { bg: 'bg-lime-500/20', text: 'text-lime-400', border: 'border-lime-500/30' },
    { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30' },
    { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30' },
    { bg: 'bg-teal-500/20', text: 'text-teal-400', border: 'border-teal-500/30' },
    { bg: 'bg-cyan-500/20', text: 'text-cyan-400', border: 'border-cyan-500/30' },
    { bg: 'bg-sky-500/20', text: 'text-sky-400', border: 'border-sky-500/30' },
    { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' },
    { bg: 'bg-indigo-500/20', text: 'text-indigo-400', border: 'border-indigo-500/30' },
    { bg: 'bg-violet-500/20', text: 'text-violet-400', border: 'border-violet-500/30' },
    { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/30' },
    { bg: 'bg-fuchsia-500/20', text: 'text-fuchsia-400', border: 'border-fuchsia-500/30' },
    { bg: 'bg-pink-500/20', text: 'text-pink-400', border: 'border-pink-500/30' },
    { bg: 'bg-rose-500/20', text: 'text-rose-400', border: 'border-rose-500/30' },
];

// Get consistent color for a tag based on its name
const getTagColor = (tagName) => {
    let hash = 0;
    for (let i = 0; i < tagName.length; i++) {
        hash = tagName.charCodeAt(i) + ((hash << 5) - hash);
    }
    return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
};

const TweetPreview = ({ bookmark }) => {
    const tweetData = bookmark.metadata?.tweetData || {};
    const handle = tweetData.authorHandle || (bookmark.url?.match(/(?:twitter|x)\.com\/(\w+)/)?.[1] ? `@${bookmark.url.match(/(?:twitter|x)\.com\/(\w+)/)[1]}` : '@user');
    const rawAuthorName = tweetData.authorName || bookmark.title.split(' on X:')[0] || handle.replace('@', '');
    const authorName = rawAuthorName.replace(/^\(\d+\)\s*/, '');
    const tweetText = tweetData.tweetText || bookmark.title.match(/on X: "(.+?)"/)?.[1] || bookmark.title.replace(/^.+? on X: /, '').replace(/ \/ X$/, '');
    const isVerified = tweetData.isVerified;
    const avatar = tweetData.authorAvatar || `https://unavatar.io/twitter/${handle.replace('@', '')}`;

    return (
        <div className="flex flex-col h-full bg-black text-white relative overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#2f3336]">
                <span className="text-[17px] font-bold">Post</span>
                <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
            </div>

            {/* Tweet content */}
            <div className="flex-1 overflow-y-auto p-4">
                <div className="flex gap-3">
                    <img
                        src={avatar}
                        alt={authorName}
                        className="w-12 h-12 rounded-full bg-[#2f3336] flex-shrink-0"
                        onError={(e) => { e.target.src = `https://api.dicebear.com/7.x/initials/svg?seed=${authorName}`; }}
                    />
                    <div className="flex-1">
                        <div className="flex items-center gap-1 flex-wrap">
                            <span className="font-bold text-[15px]">{authorName}</span>
                            {isVerified && (
                                <svg viewBox="0 0 22 22" className="w-5 h-5" fill="#1d9bf0">
                                    <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" />
                                </svg>
                            )}
                            <span className="text-[#71767b] text-[15px]">{handle}</span>
                        </div>

                        <p className="text-[20px] leading-relaxed mt-3 whitespace-pre-wrap">
                            {tweetText}
                        </p>

                        <div className="text-[#71767b] text-[15px] mt-4 pb-4 border-b border-[#2f3336]">
                            {new Date(bookmark.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} · {new Date(bookmark.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>

                        {/* Engagement */}
                        <div className="flex gap-6 py-4 border-b border-[#2f3336] text-[15px]">
                            {tweetData.retweetCount && (
                                <div><span className="font-bold text-white">{tweetData.retweetCount}</span> <span className="text-[#71767b]">Reposts</span></div>
                            )}
                            {tweetData.likeCount && (
                                <div><span className="font-bold text-white">{tweetData.likeCount}</span> <span className="text-[#71767b]">Likes</span></div>
                            )}
                            {tweetData.viewCount && (
                                <div><span className="font-bold text-white">{tweetData.viewCount}</span> <span className="text-[#71767b]">Views</span></div>
                            )}
                        </div>


                    </div>
                </div>
            </div>
        </div>
    );
};

const VideoPreview = ({ bookmark }) => {
    const [isPlaying, setIsPlaying] = useState(false);

    // Extract YouTube video ID from URL
    const getYoutubeVideoId = (url) => {
        if (!url) return null;
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    };

    const videoId = getYoutubeVideoId(bookmark.url);
    const isYoutube = bookmark.url?.includes('youtube.com') || bookmark.url?.includes('youtu.be');

    // Get high-quality YouTube thumbnail
    const youtubeThumbnail = videoId
        ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
        : bookmark.thumbnail;

    // Fallback thumbnail
    const fallbackThumbnail = videoId
        ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
        : bookmark.thumbnail;

    if (isPlaying && videoId) {
        // Show embedded YouTube player
        return (
            <div className="h-full bg-black flex flex-col">
                <div className="flex-1 relative">
                    <iframe
                        src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
                        title={bookmark.title}
                        className="absolute inset-0 w-full h-full"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="h-full bg-black flex items-center justify-center relative group">
            {/* YouTube Thumbnail */}
            {youtubeThumbnail ? (
                <img
                    src={youtubeThumbnail}
                    alt={bookmark.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                        // Fallback to lower quality thumbnail if maxres doesn't exist
                        if (e.target.src !== fallbackThumbnail) {
                            e.target.src = fallbackThumbnail;
                        }
                    }}
                />
            ) : (
                <div className="w-full h-full bg-neutral-900" />
            )}

            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/40" />

            {/* Play button */}
            <div
                className="absolute inset-0 flex items-center justify-center cursor-pointer"
                onClick={() => isYoutube && setIsPlaying(true)}
            >
                <div className="w-20 h-20 rounded-full bg-red-600 flex items-center justify-center border-4 border-white/90 transition-all group-hover:scale-110 group-hover:bg-red-500 shadow-2xl">
                    <Play className="w-8 h-8 text-white fill-white ml-1" />
                </div>
            </div>

            {/* Video info */}
            <div className="absolute bottom-0 left-0 right-0 p-6">
                <h2 className="text-white text-xl font-bold leading-tight line-clamp-2 mb-2">
                    {bookmark.title?.replace(/^\(\d+\)\s*/, '').replace(/ - YouTube$/, '')}
                </h2>
                <div className="flex items-center gap-2 text-white/70">
                    <svg className="w-5 h-5 text-red-500" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                    </svg>
                    <span className="text-sm font-medium">YouTube</span>
                    {isYoutube && (
                        <span className="text-xs text-white/50 ml-2">Click to play</span>
                    )}
                </div>
            </div>
        </div>
    );
};

const DefaultPreview = ({ bookmark }) => (
    <div className="h-full bg-gradient-to-br from-neutral-800 to-neutral-900 p-8 flex flex-col justify-center relative">
        <div className="w-16 h-16 rounded-xl bg-white/10 flex items-center justify-center mb-6">
            <span className="text-4xl">📄</span>
        </div>
        <h2 className="text-3xl font-bold text-white mb-4 leading-tight">{bookmark.title}</h2>
        <p className="text-white/60 text-lg line-clamp-4">{bookmark.notes || bookmark.url}</p>

        <div className="mt-auto pt-8 flex justify-between items-end">
            <Badge variant="outline" className="text-white border-white/20">{bookmark.category}</Badge>
            <span className="text-white/40 font-mono text-sm">{new Date(bookmark.createdAt).toLocaleDateString()}</span>
        </div>
    </div>
);

const WikiPreview = ({ bookmark }) => {
    // Extract title from URL if possible or use bookmark title
    const title = bookmark.title.replace(' - Wikipedia', '');
    const [image, setImage] = useState(bookmark.thumbnail || bookmark.metadata?.ogImage);
    const [description, setDescription] = useState(bookmark.metadata?.ogDescription || bookmark.metadata?.description || bookmark.notes);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchWikiData = async () => {
            // If we already have a good description (longer than "idk m8 u know"), don't fetch
            if (description && description.length > 50 && description !== bookmark.notes) return;

            try {
                setLoading(true);
                const urlObj = new URL(bookmark.url);
                const pageTitle = urlObj.pathname.split('/wiki/')[1];

                if (pageTitle) {
                    const response = await fetch(`http://127.0.0.1:3000/api/wikipedia/metadata?title=${pageTitle}`);
                    if (response.ok) {
                        const data = await response.json();
                        if (data.summary) setDescription(data.summary);
                        if (data.thumbnail && !image) setImage(data.thumbnail);
                    }
                }
            } catch (error) {
                console.error('Failed to fetch Wiki metadata:', error);
            } finally {
                setLoading(false);
            }
        };

        if (bookmark.url.includes('wikipedia.org')) {
            fetchWikiData();
        }
    }, [bookmark.url, description, bookmark.notes, image]);

    return (
        <div className="h-full bg-[#ffffff] text-black relative font-serif flex flex-col">
            {/* Header - fixed at top */}
            <div className="flex-shrink-0 flex items-center px-6 py-4 border-b border-black/5 bg-white/80 backdrop-blur-sm z-10">
                <div className="flex items-baseline gap-2">
                    <span className="text-xl font-bold tracking-tight font-serif text-black">Wikipedia</span>
                    <span className="text-sm text-black/50 font-sans font-medium uppercase tracking-wider">Article</span>
                </div>
            </div>

            {/* Scrollable Content - THIS is the scrollable area */}
            <div className="flex-1 min-h-0 overflow-y-auto">
                <div className="p-8 max-w-2xl mx-auto pb-24">
                    {/* Title */}
                    <h1 className="text-5xl font-bold mb-8 font-serif leading-tight text-black">
                        {title}
                    </h1>

                    {/* Image */}
                    {image && (
                        <div className="w-full mb-8 overflow-hidden rounded-sm border border-black/10 shadow-sm">
                            <img
                                src={image}
                                alt={title}
                                className="w-full h-auto object-cover"
                            />
                        </div>
                    )}

                    {/* Description */}
                    <div className="prose prose-lg prose-slate font-serif leading-relaxed text-black/80">
                        <p>
                            {loading && !description ? (
                                <span className="animate-pulse text-black/40">Loading summary...</span>
                            ) : (
                                description || (
                                    <span className="italic text-black/40">
                                        No summary available. Add notes to see them here.
                                    </span>
                                )
                            )}
                        </p>
                    </div>
                </div>
            </div>

            {/* Keep Reading Button - fixed at bottom */}
            <div className="absolute bottom-8 left-8 z-20">
                <a
                    href={bookmark.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-2 px-4 py-2 border-2 border-black bg-white text-black transition-all hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                    style={{ fontFamily: '"Gloria Hallelujah", cursive' }}
                >
                    <span className="text-lg">Keep reading</span>
                    <ExternalLink className="w-4 h-4 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                </a>
            </div>

            {/* Footer decoration */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-black/5 via-black/10 to-black/5" />
        </div>
    );
};

const BookmarkDetail = ({ bookmark, open, onOpenChange, onSave }) => {
    const [formData, setFormData] = useState({
        title: '',
        category: '',
        tags: '',
        notes: ''
    });
    const [saving, setSaving] = useState(false);
    const [showCloseHint, setShowCloseHint] = useState(false);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const contentRef = useRef(null);
    const isInDangerZone = useRef(false);

    // Update form when bookmark changes
    useEffect(() => {
        if (bookmark) {
            setFormData({
                title: bookmark.title || '',
                category: bookmark.category || '',
                tags: bookmark.tags?.join(', ') || '',
                notes: bookmark.notes || ''
            });
        }
    }, [bookmark]);

    // Show close hint briefly when dialog opens
    useEffect(() => {
        if (open) {
            setShowCloseHint(true);
            setOffset({ x: 0, y: 0 });
            const timer = setTimeout(() => setShowCloseHint(false), 3000);
            return () => clearTimeout(timer);
        }
    }, [open]);

    const handleSave = async () => {
        if (!bookmark) return;

        setSaving(true);
        try {
            const updatedBookmark = {
                ...bookmark,
                title: formData.title,
                category: formData.category,
                tags: formData.tags.split(',').map(t => t.trim()).filter(t => t),
                notes: formData.notes
            };

            const response = await fetch(`http://127.0.0.1:3000/api/bookmarks/${bookmark.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedBookmark)
            });

            if (response.ok) {
                if (onSave) onSave(await response.json());
                onOpenChange(false);
            }
        } catch (error) {
            console.error('Error saving bookmark:', error);
        } finally {
            setSaving(false);
        }
    };

    // Handle mouse movement to create the "dodge" effect
    const handleMouseMove = (e) => {
        if (!contentRef.current || !open) return;

        const rect = contentRef.current.getBoundingClientRect();
        const dangerZoneSize = 80; // pixels around the card that trigger the dodge
        const maxOffset = 12; // maximum dodge distance in pixels

        const mouseX = e.clientX;
        const mouseY = e.clientY;

        // Check if mouse is over the card itself
        const isOverCard = (
            mouseX >= rect.left &&
            mouseX <= rect.right &&
            mouseY >= rect.top &&
            mouseY <= rect.bottom
        );

        if (isOverCard) {
            // Mouse is over the card, return to center
            if (isInDangerZone.current) {
                isInDangerZone.current = false;
                setOffset({ x: 0, y: 0 });
            }
            return;
        }

        // Check if mouse is in the "danger zone" (close to the card edges)
        const isNearTop = mouseY < rect.top && mouseY > rect.top - dangerZoneSize;
        const isNearBottom = mouseY > rect.bottom && mouseY < rect.bottom + dangerZoneSize;
        const isNearLeft = mouseX < rect.left && mouseX > rect.left - dangerZoneSize;
        const isNearRight = mouseX > rect.right && mouseX < rect.right + dangerZoneSize;

        // Also check vertical/horizontal alignment for corner cases
        const isVerticallyAligned = mouseY >= rect.top - dangerZoneSize && mouseY <= rect.bottom + dangerZoneSize;
        const isHorizontallyAligned = mouseX >= rect.left - dangerZoneSize && mouseX <= rect.right + dangerZoneSize;

        let newOffsetX = 0;
        let newOffsetY = 0;

        // Calculate dodge based on which edge the mouse is near
        if (isNearTop && isHorizontallyAligned) {
            // Mouse approaching from top - card slides down
            const proximity = 1 - (rect.top - mouseY) / dangerZoneSize;
            newOffsetY = maxOffset * Math.min(1, proximity);
            setShowCloseHint(true);
        }
        if (isNearBottom && isHorizontallyAligned) {
            // Mouse approaching from bottom - card slides up
            const proximity = 1 - (mouseY - rect.bottom) / dangerZoneSize;
            newOffsetY = -maxOffset * Math.min(1, proximity);
            setShowCloseHint(true);
        }
        if (isNearLeft && isVerticallyAligned) {
            // Mouse approaching from left - card slides right
            const proximity = 1 - (rect.left - mouseX) / dangerZoneSize;
            newOffsetX = maxOffset * Math.min(1, proximity);
            setShowCloseHint(true);
        }
        if (isNearRight && isVerticallyAligned) {
            // Mouse approaching from right - card slides left
            const proximity = 1 - (mouseX - rect.right) / dangerZoneSize;
            newOffsetX = -maxOffset * Math.min(1, proximity);
            setShowCloseHint(true);
        }

        const inDangerZone = (isNearTop || isNearBottom || isNearLeft || isNearRight) &&
            (isVerticallyAligned || isHorizontallyAligned);

        if (inDangerZone) {
            isInDangerZone.current = true;
            setOffset({ x: newOffsetX, y: newOffsetY });
        } else if (isInDangerZone.current) {
            // Mouse left the danger zone, return to center
            isInDangerZone.current = false;
            setOffset({ x: 0, y: 0 });
            setTimeout(() => setShowCloseHint(false), 1000);
        }
    };

    // Reset offset when mouse leaves the window
    const handleMouseLeave = () => {
        isInDangerZone.current = false;
        setOffset({ x: 0, y: 0 });
    };

    if (!bookmark) return null;

    const isWiki = bookmark.url?.includes('wikipedia.org');

    const renderPreview = () => {
        const type = bookmark.subCategory || bookmark.category;
        if (isWiki) {
            return <WikiPreview bookmark={bookmark} />;
        }
        if (type?.includes('tweet') || bookmark.url?.includes('x.com') || bookmark.url?.includes('twitter.com')) {
            return <TweetPreview bookmark={bookmark} />;
        }
        if (type?.includes('video') || bookmark.url?.includes('youtube')) {
            return <VideoPreview bookmark={bookmark} />;
        }
        return <DefaultPreview bookmark={bookmark} />;
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            {/* Custom overlay with mouse tracking */}
            <div
                className="fixed inset-0 z-50 bg-black/80"
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                style={{ display: open ? 'block' : 'none' }}
            />

            {/* Close hint indicator */}
            <div
                className={`fixed top-6 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white/70 text-sm transition-all duration-500 ${
                    showCloseHint ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'
                }`}
                style={{ display: open ? 'flex' : 'none' }}
            >
                <ChevronUp className="w-4 h-4 animate-bounce" />
                <span>Click outside to close</span>
            </div>

            <DialogContent
                ref={contentRef}
                className="max-w-none w-[85vw] h-[85vh] max-h-[900px] p-0 overflow-hidden bg-background border-border rounded-2xl"
                style={{
                    transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
                    transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
                }}
            >

                <div className="grid grid-cols-1 md:grid-cols-2 h-full overflow-hidden">

                    {/* Left: Preview */}
                    <div className="h-full overflow-hidden flex flex-col">
                        <div className="flex-1 overflow-y-auto min-h-0">
                            {renderPreview()}
                        </div>
                        {!isWiki && (
                            <a
                                href={bookmark.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-shrink-0 flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground hover:text-foreground transition-colors bg-black/20"
                            >
                                <ExternalLink className="w-4 h-4" />
                                <span className="truncate">{bookmark.url}</span>
                            </a>
                        )}
                    </div>

                    {/* Right: Edit Form */}
                    <div className="p-8 flex flex-col h-full overflow-hidden">
                        {/* Empty space at top */}
                        <div className="mb-8 flex-shrink-0" />

                        <div className="space-y-6 flex-1 overflow-y-auto min-h-0">
                            {/* Title Input */}
                            <div className="relative group">
                                <input
                                    id="title"
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                                    placeholder="Title..."
                                    className="w-full bg-transparent text-4xl font-serif italic text-muted-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:text-foreground transition-colors border-b border-transparent focus:border-border pb-2"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="category">Category</Label>
                                <Select
                                    value={formData.category}
                                    onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                                >
                                    <SelectTrigger className="bg-accent/50">
                                        <SelectValue placeholder="Select category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="X">X (Tweet/Thread)</SelectItem>
                                        <SelectItem value="Instagram">Instagram</SelectItem>
                                        <SelectItem value="Substack">Substack</SelectItem>
                                        <SelectItem value="YouTube">YouTube</SelectItem>
                                        <SelectItem value="Wikipedia">Wikipedia</SelectItem>
                                        <SelectItem value="GitHub">GitHub</SelectItem>
                                        <SelectItem value="Reddit">Reddit</SelectItem>
                                        <SelectItem value="Medium">Medium</SelectItem>
                                        <SelectItem value="LinkedIn">LinkedIn</SelectItem>
                                        <SelectItem value="TikTok">TikTok</SelectItem>
                                        <SelectItem value="Article">Article/Webpage</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-3">
                                <Label>Tags</Label>
                                {/* Tag bubbles */}
                                <div className="flex flex-wrap gap-2">
                                    {formData.tags && formData.tags.split(',').filter(t => t.trim()).map((tag, idx) => {
                                        const trimmedTag = tag.trim();
                                        const color = getTagColor(trimmedTag);
                                        return (
                                            <span
                                                key={idx}
                                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all hover:scale-105 ${color.bg} ${color.text} ${color.border}`}
                                            >
                                                {trimmedTag}
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const tagsList = formData.tags.split(',').map(t => t.trim()).filter(t => t);
                                                        const filtered = tagsList.filter((_, i) => i !== idx);
                                                        setFormData(prev => ({ ...prev, tags: filtered.join(', ') }));
                                                    }}
                                                    className="hover:bg-white/20 rounded-full p-0.5 transition-colors"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </span>
                                        );
                                    })}
                                    {/* Add tag input */}
                                    <div className="relative">
                                        <input
                                            type="text"
                                            placeholder="Add tag..."
                                            className="w-24 focus:w-32 transition-all px-3 py-1.5 rounded-full text-sm bg-accent/30 border border-border/50 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/20 placeholder:text-muted-foreground/50"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && e.target.value.trim()) {
                                                    e.preventDefault();
                                                    const newTag = e.target.value.trim();
                                                    const currentTags = formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(t => t) : [];
                                                    if (!currentTags.includes(newTag)) {
                                                        setFormData(prev => ({
                                                            ...prev,
                                                            tags: [...currentTags, newTag].join(', ')
                                                        }));
                                                    }
                                                    e.target.value = '';
                                                }
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="notes">Notes</Label>
                                <Textarea
                                    id="notes"
                                    value={formData.notes}
                                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                                    className="bg-accent/50 min-h-[100px] resize-none"
                                />
                            </div>
                        </div>

                        <div className="pt-6 flex justify-end gap-2 border-t border-border/50 mt-auto flex-shrink-0">
                            <button className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors" onClick={() => onOpenChange(false)}>
                                Cancel
                            </button>
                            <CreepyButton onClick={handleSave} disabled={saving}>
                                {saving ? 'Saving...' : 'Save Changes'}
                            </CreepyButton>
                        </div>
                    </div>

                </div>
            </DialogContent>
        </Dialog>
    );
};

export default BookmarkDetail;
