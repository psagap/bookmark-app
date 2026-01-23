import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CreepyButton } from './CreepyButton';
import TweetEmbed from './TweetEmbed';
import GruvboxLoader from './GruvboxLoader';
import NotionEditor from './NotionEditor';
import BookmarkMetadataPanel from './BookmarkMetadataPanel';
import { Dialog, DialogContent, MotionDialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Play, ExternalLink, X, Plus, Link2, MoreHorizontal, StickyNote, Clock, Users, Flame, ChefHat, Star, CheckCircle2 } from "lucide-react";
import { getTagColor, getTagColors, getAllTagColors, setTagColor } from '@/utils/tagColors';
import { extractTagsFromContent } from '@/utils/tagExtraction';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';

// Helper component to render YouTube descriptions with auto-linked URLs, @mentions, #hashtags, and timestamps
const YouTubeLinkedText = ({ text, videoUrl = '', className = '' }) => {
    if (!text) return null;

    // Convert timestamp string (MM:SS or HH:MM:SS) to seconds
    const timestampToSeconds = (match) => {
        const parts = match.split(':').map(Number);
        if (parts.length === 2) {
            return parts[0] * 60 + parts[1];
        } else if (parts.length === 3) {
            return parts[0] * 3600 + parts[1] * 60 + parts[2];
        }
        return 0;
    };

    // Get video URL with timestamp parameter
    const getTimestampUrl = (timestamp) => {
        const seconds = timestampToSeconds(timestamp);
        if (!videoUrl) return '#';
        // Remove any existing time parameter and add new one
        const baseUrl = videoUrl.split('?')[0].split('&t=')[0];
        const urlParams = videoUrl.includes('?') ? videoUrl.split('?')[1].replace(/&?t=\d+/, '') : '';
        const separator = urlParams ? '&' : '';
        return `${baseUrl}?${urlParams}${separator}t=${seconds}`;
    };

    // Combined regex that captures all link types in order
    // Groups: (1) URL, (2) @mention, (3) #hashtag, (4) timestamp
    const combinedPattern = /(https?:\/\/[^\s<]+[^<.,:;"')\]\s])|(@[a-zA-Z0-9_]+)|(#[a-zA-Z0-9_]+)|(\b\d{1,2}:\d{2}(?::\d{2})?\b)/g;

    const linkClass = "text-gruvbox-aqua hover:text-gruvbox-aqua-light underline underline-offset-2 cursor-pointer";

    // Process the text and create elements
    const elements = [];
    let lastIndex = 0;
    let match;

    // Reset regex
    combinedPattern.lastIndex = 0;

    while ((match = combinedPattern.exec(text)) !== null) {
        // Add text before this match
        if (match.index > lastIndex) {
            const beforeText = text.slice(lastIndex, match.index);
            // Split by newlines and add line breaks
            beforeText.split('\n').forEach((line, i, arr) => {
                if (line) elements.push(<React.Fragment key={`text-${lastIndex}-${i}`}>{line}</React.Fragment>);
                if (i < arr.length - 1) elements.push(<br key={`br-${lastIndex}-${i}`} />);
            });
        }

        const [fullMatch, url, mention, hashtag, timestamp] = match;

        if (url) {
            // URL link
            elements.push(
                <a
                    key={`url-${match.index}`}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${linkClass} break-all`}
                    onClick={(e) => e.stopPropagation()}
                >
                    {url}
                </a>
            );
        } else if (mention) {
            // @mention link to YouTube channel
            const username = mention.slice(1); // Remove @
            elements.push(
                <a
                    key={`mention-${match.index}`}
                    href={`https://youtube.com/@${username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={linkClass}
                    onClick={(e) => e.stopPropagation()}
                >
                    {mention}
                </a>
            );
        } else if (hashtag) {
            // #hashtag link to YouTube hashtag search
            const tag = hashtag.slice(1); // Remove #
            elements.push(
                <a
                    key={`hashtag-${match.index}`}
                    href={`https://youtube.com/hashtag/${tag}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={linkClass}
                    onClick={(e) => e.stopPropagation()}
                >
                    {hashtag}
                </a>
            );
        } else if (timestamp) {
            // Timestamp link to video position
            elements.push(
                <a
                    key={`timestamp-${match.index}`}
                    href={getTimestampUrl(timestamp)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={linkClass}
                    onClick={(e) => e.stopPropagation()}
                >
                    {timestamp}
                </a>
            );
        }

        lastIndex = match.index + fullMatch.length;
    }

    // Add remaining text after last match
    if (lastIndex < text.length) {
        const remainingText = text.slice(lastIndex);
        remainingText.split('\n').forEach((line, i, arr) => {
            if (line) elements.push(<React.Fragment key={`text-end-${i}`}>{line}</React.Fragment>);
            if (i < arr.length - 1) elements.push(<br key={`br-end-${i}`} />);
        });
    }

    return <span className={className}>{elements}</span>;
};

// Alias for backward compatibility
const LinkedText = YouTubeLinkedText;

// Color picker dropdown for tags - opens on click of ellipsis menu
const TagColorDropdown = ({ tag, currentColor, onSelect, onClose, position }) => {
    const allColors = getAllTagColors();
    const dropdownRef = React.useRef(null);

    // Close on click outside
    React.useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    // Close on escape
    React.useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [onClose]);

    return (
        <div
            ref={dropdownRef}
            className="absolute z-50 animate-in fade-in zoom-in-95 duration-100"
            style={{
                top: position === 'above' ? 'auto' : '100%',
                bottom: position === 'above' ? '100%' : 'auto',
                right: 0,
                marginTop: position === 'above' ? 0 : '4px',
                marginBottom: position === 'above' ? '4px' : 0,
            }}
        >
            <div
                className="flex items-center gap-1.5 p-2 rounded-lg"
                style={{
                    background: 'var(--theme-bg-dark, rgba(29, 32, 33, 0.95))',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid color-mix(in srgb, var(--theme-fg-muted, #a89984) 12%, transparent)',
                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
                }}
            >
                {allColors.map((color) => {
                    const isSelected = currentColor.id === color.id;
                    return (
                        <button
                            key={color.id}
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                setTagColor(tag, color.id);
                                onSelect(color.id);
                                onClose();
                            }}
                            className="relative w-4 h-4 rounded-full transition-all duration-150 hover:scale-125 focus:outline-none flex items-center justify-center"
                            style={{
                                backgroundColor: color.hover,
                                boxShadow: isSelected
                                    ? `0 0 0 1.5px var(--theme-bg-dark, #1d2021), 0 0 0 2.5px ${color.hover}`
                                    : 'none',
                            }}
                            title={color.name}
                        >
                            {isSelected && (
                                <svg
                                    className="w-2 h-2"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth={4}
                                    style={{ color: color.hoverText }}
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

// Simple tag container with flex wrap - uniform pill sizes
const TagColumnsContainer = ({ tags, onRemoveTag, onAddTag }) => {
    const [isAdding, setIsAdding] = useState(false);
    const [newTag, setNewTag] = useState('');
    const [openMenuTag, setOpenMenuTag] = useState(null); // Track which tag's menu is open
    const [, forceUpdate] = useState(0); // For re-rendering after color change
    const inputRef = useRef(null);

    // Parse tags into array
    const tagsList = tags ? tags.split(',').map(t => t.trim()).filter(t => t) : [];

    // Get colors for all tags at once to avoid adjacent duplicates
    const tagColors = getTagColors(tagsList);

    // Focus input when adding mode is activated
    useEffect(() => {
        if (isAdding && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isAdding]);

    const handleAddTag = () => {
        if (newTag.trim()) {
            onAddTag(newTag.trim());
            setNewTag('');
            setIsAdding(false);
        }
    };

    const handleMenuToggle = (tag, e) => {
        e.stopPropagation();
        setOpenMenuTag(openMenuTag === tag ? null : tag);
    };

    return (
        <div className="flex flex-wrap gap-1.5 items-center">
            {/* Tags - minimal pills */}
            {tagsList.map((tag, idx) => {
                const color = tagColors[idx];
                const isMenuOpen = openMenuTag === tag;

                return (
                    <div
                        key={idx}
                        className="relative group/tag"
                    >
                        <div
                            className="inline-flex items-center gap-0.5 rounded-full text-[11px] font-medium px-2 py-[3px] transition-all duration-150 hover:brightness-125"
                            style={{
                                backgroundColor: color.bg,
                                color: color.text,
                            }}
                        >
                            <span className="truncate max-w-[100px] leading-none">
                                {tag}
                            </span>

                            {/* Action buttons - fade in on hover */}
                            <div className="flex items-center gap-0 overflow-hidden max-w-0 opacity-0 transition-all duration-150 group-hover/tag:max-w-[50px] group-hover/tag:opacity-100">
                                <button
                                    type="button"
                                    onClick={(e) => handleMenuToggle(tag, e)}
                                    className="p-0.5 rounded-full hover:opacity-100 opacity-60 transition-opacity"
                                >
                                    <MoreHorizontal className="w-3 h-3" />
                                </button>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onRemoveTag(idx);
                                    }}
                                    className="p-0.5 rounded-full hover:opacity-100 opacity-60 transition-opacity"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        </div>

                        {/* Color dropdown */}
                        {isMenuOpen && (
                            <TagColorDropdown
                                tag={tag}
                                currentColor={color}
                                onSelect={() => forceUpdate(n => n + 1)}
                                onClose={() => setOpenMenuTag(null)}
                                position="below"
                            />
                        )}
                    </div>
                );
            })}

            {/* Add tag - ghost button */}
            {isAdding ? (
                <div
                    className="inline-flex items-center rounded-full transition-all duration-150"
                    style={{
                        backgroundColor: 'color-mix(in srgb, var(--theme-fg-muted, #a89984) 8%, transparent)',
                    }}
                >
                    <input
                        ref={inputRef}
                        type="text"
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        placeholder="tag..."
                        className="bg-transparent text-[11px] py-[3px] pl-2 pr-1 focus:outline-none placeholder:opacity-40"
                        style={{
                            color: 'var(--theme-fg, #ebdbb2)',
                            width: `${Math.max(50, newTag.length * 7 + 24)}px`,
                            caretColor: 'var(--theme-primary, #fabd2f)',
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                e.stopPropagation();
                                handleAddTag();
                            } else if (e.key === 'Escape') {
                                setIsAdding(false);
                                setNewTag('');
                            }
                        }}
                        onBlur={() => {
                            setTimeout(() => {
                                if (!newTag.trim()) {
                                    setIsAdding(false);
                                }
                            }, 150);
                        }}
                    />
                    <button
                        type="button"
                        onClick={handleAddTag}
                        disabled={!newTag.trim()}
                        className="p-1 mr-0.5 rounded-full transition-opacity"
                        style={{
                            opacity: newTag.trim() ? 0.8 : 0.3,
                            color: 'var(--theme-fg-muted, #a89984)',
                        }}
                    >
                        <Plus className="w-3 h-3" />
                    </button>
                </div>
            ) : (
                <button
                    type="button"
                    onClick={() => setIsAdding(true)}
                    className="inline-flex items-center gap-0.5 py-[3px] px-2 rounded-full text-[11px] transition-all duration-150 opacity-40 hover:opacity-70"
                    style={{
                        color: 'var(--theme-fg-muted, #a89984)',
                        backgroundColor: 'color-mix(in srgb, var(--theme-fg-muted, #a89984) 5%, transparent)',
                    }}
                >
                    <Plus className="w-3 h-3" />
                    <span>add</span>
                </button>
            )}
        </div>
    );
};

const TweetPreview = ({ bookmark }) => {
    return (
        <div className="flex flex-col h-full bg-black text-white relative overflow-hidden">
            {/* Scrollable container for the tweet embed */}
            <div className="flex-1 overflow-y-auto p-6">
                <div className="w-full max-w-[550px] mx-auto">
                    {/* Twitter/X Embed Widget */}
                    <TweetEmbed tweetUrl={bookmark.url} />
                </div>
            </div>
        </div>
    );
};

const VideoPreview = ({ bookmark, autoPlay = false }) => {
    // Initialize with autoPlay value so video starts immediately when prop is true
    const [isPlaying, setIsPlaying] = useState(autoPlay);

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

            {/* YouTube-style play button */}
            <div
                className="absolute inset-0 flex items-center justify-center cursor-pointer"
                onClick={() => isYoutube && setIsPlaying(true)}
            >
                <div className="w-[88px] h-[62px] rounded-2xl bg-black/80 hover:bg-[#ff0000] flex items-center justify-center transition-all duration-200 hover:scale-105 shadow-xl">
                    <svg className="w-8 h-8 text-white ml-1" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 5v14l11-7z" />
                    </svg>
                </div>
            </div>

            {/* Video info - Title is clickable to open on YouTube */}
            <div className="absolute bottom-0 left-0 right-0 p-6">
                <a
                    href={bookmark.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block group/title"
                    onClick={(e) => e.stopPropagation()}
                >
                    <h2 className="text-white text-xl font-bold leading-tight line-clamp-2 mb-2 group-hover/title:text-red-300 transition-colors">
                        {bookmark.title?.replace(/^\(\d+\)\s*/, '').replace(/ - YouTube$/, '')}
                    </h2>
                </a>
                <div className="flex items-center gap-2 text-white/70">
                    <svg className="w-5 h-5 text-red-500" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                    </svg>
                    <span className="text-sm font-medium">YouTube</span>
                    {isYoutube && (
                        <span className="text-xs text-white/50 ml-2">Click to play • Title opens YouTube</span>
                    )}
                </div>
            </div>
        </div>
    );
};

const ArticlePreview = ({ bookmark }) => {
    const [article, setArticle] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [revealed, setRevealed] = useState(false);

    useEffect(() => {
        const fetchArticle = async () => {
            try {
                setLoading(true);
                setError(null);
                setRevealed(false);
                const response = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:3000'}/api/article/extract?url=${encodeURIComponent(bookmark.url)}`);
                if (response.ok) {
                    const data = await response.json();
                    setArticle(data);
                    // Trigger reveal animation after data loads
                    setTimeout(() => setRevealed(true), 100);
                } else {
                    setError('Failed to load article');
                }
            } catch (err) {
                console.error('Article fetch error:', err);
                setError('Failed to load article');
            } finally {
                setLoading(false);
            }
        };

        if (bookmark.url) {
            fetchArticle();
        }
    }, [bookmark.url]);

    if (loading) {
        return (
            <div className="h-full min-h-[300px] flex items-center justify-center bg-gruvbox-bg-dark">
                <GruvboxLoader variant="orbit" size="lg" label="Loading Article" />
            </div>
        );
    }

    if (error || !article) {
        return (
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
    }

    const heroImage = article.images?.find(img => img.type === 'hero');

    return (
        <div className="h-full bg-[#1a1a2e] text-neutral-100 relative flex flex-col overflow-hidden">
            {/* Vintage film grain overlay */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none z-50"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
                }}
            />

            {/* Reveal animation curtain */}
            <div
                className="absolute inset-0 bg-[#1a1a2e] z-40 pointer-events-none transition-transform duration-1000 ease-out"
                style={{
                    transform: revealed ? 'translateY(-100%)' : 'translateY(0)',
                }}
            >
                {/* Decorative bottom edge like vintage theater curtain */}
                <div className="absolute bottom-0 left-0 right-0 h-8 flex justify-center">
                    {[...Array(20)].map((_, i) => (
                        <div
                            key={i}
                            className="w-8 h-8 rounded-b-full bg-amber-700/50"
                            style={{ marginLeft: i > 0 ? '-4px' : 0 }}
                        />
                    ))}
                </div>
            </div>

            {/* Header with site info */}
            <div className="flex-shrink-0 flex items-center gap-3 px-6 py-4 border-b border-gruvbox-bg-light bg-gruvbox-bg/80 backdrop-blur-sm relative z-10">
                {article.favicon && (
                    <img
                        src={article.favicon}
                        alt=""
                        className="w-5 h-5 rounded"
                        onError={(e) => { e.target.style.display = 'none'; }}
                    />
                )}
                <span className="text-sm font-medium text-gruvbox-teal">{article.siteName}</span>
                {article.author && (
                    <>
                        <span className="text-gruvbox-bg-lighter">•</span>
                        <span className="text-sm text-gruvbox-fg-muted">{article.author}</span>
                    </>
                )}
                {article.publishedDate && (
                    <>
                        <span className="text-gruvbox-bg-lighter">•</span>
                        <span className="text-sm text-gruvbox-fg-dim">
                            {new Date(article.publishedDate).toLocaleDateString(undefined, {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                            })}
                        </span>
                    </>
                )}
            </div>

            {/* Scrollable content */}
            <div className="flex-1 min-h-0 overflow-y-auto relative z-10">
                <div className="max-w-2xl mx-auto px-6 py-8 pb-24">
                    {/* Title - Clickable to original article */}
                    <a
                        href={bookmark.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block group/title cursor-pointer mb-4"
                    >
                        <h1
                            className="text-4xl font-bold leading-tight text-gruvbox-fg group-hover/title:text-gruvbox-teal-light transition-all duration-700"
                            style={{
                                opacity: revealed ? 1 : 0,
                                transform: revealed ? 'translateY(0)' : 'translateY(20px)',
                                fontFamily: 'Georgia, serif',
                            }}
                        >
                            {article.title || bookmark.title}
                        </h1>
                        {/* Click hint */}
                        <div className="flex items-center gap-2 mt-2 text-xs text-gruvbox-fg-muted opacity-0 group-hover/title:opacity-100 transition-opacity">
                            <ExternalLink className="w-3 h-3" />
                            <span>Read full article on {article.siteName}</span>
                        </div>
                    </a>

                    {/* Description/subtitle */}
                    {article.description && (
                        <p
                            className="text-xl text-gruvbox-fg-muted mb-8 leading-relaxed transition-all duration-700 delay-100"
                            style={{
                                opacity: revealed ? 1 : 0,
                                transform: revealed ? 'translateY(0)' : 'translateY(20px)',
                                fontStyle: 'italic',
                            }}
                        >
                            {article.description}
                        </p>
                    )}

                    {/* Hero image - Clickable */}
                    {heroImage && (
                        <a
                            href={bookmark.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block mb-8 -mx-2 overflow-hidden rounded-sm transition-all duration-700 delay-200 group/hero"
                            style={{
                                opacity: revealed ? 1 : 0,
                                transform: revealed ? 'translateY(0)' : 'translateY(20px)',
                                boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                            }}
                        >
                            <div className="relative">
                                <img
                                    src={heroImage.src}
                                    alt={article.title}
                                    className="w-full h-auto object-cover"
                                    onError={(e) => { e.target.style.display = 'none'; }}
                                />
                                {/* Hover overlay */}
                                <div className="absolute inset-0 bg-black/0 group-hover/hero:bg-black/30 transition-colors flex items-center justify-center">
                                    <div className="opacity-0 group-hover/hero:opacity-100 transition-opacity bg-gruvbox-bg-darkest/80 px-4 py-2 rounded-full flex items-center gap-2">
                                        <ExternalLink className="w-4 h-4 text-gruvbox-teal" />
                                        <span className="text-sm text-gruvbox-fg">View original</span>
                                    </div>
                                </div>
                            </div>
                        </a>
                    )}

                    {/* Article content - rendered in document order */}
                    <div className="space-y-4">
                        {article.content?.length > 0 ? (
                            article.content.map((block, idx) => {
                                const delay = Math.min(300 + idx * 50, 800);

                                if (block.type === 'paragraph') {
                                    return (
                                        <p
                                            key={idx}
                                            className="text-gruvbox-fg/85 leading-relaxed transition-all duration-500"
                                            style={{
                                                opacity: revealed ? 1 : 0,
                                                transform: revealed ? 'translateY(0)' : 'translateY(15px)',
                                                transitionDelay: `${delay}ms`,
                                            }}
                                        >
                                            {block.text}
                                        </p>
                                    );
                                }

                                if (block.type === 'heading') {
                                    const HeadingTag = `h${Math.min(block.level + 1, 6)}`;
                                    return (
                                        <HeadingTag
                                            key={idx}
                                            className="text-gruvbox-teal-light font-bold mt-8 mb-4 transition-all duration-500"
                                            style={{
                                                opacity: revealed ? 1 : 0,
                                                transform: revealed ? 'translateY(0)' : 'translateY(15px)',
                                                transitionDelay: `${delay}ms`,
                                                fontSize: block.level <= 2 ? '1.5rem' : '1.25rem',
                                                fontFamily: 'Georgia, serif',
                                            }}
                                        >
                                            {block.text}
                                        </HeadingTag>
                                    );
                                }

                                if (block.type === 'image') {
                                    return (
                                        <figure
                                            key={idx}
                                            className="my-6 transition-all duration-500"
                                            style={{
                                                opacity: revealed ? 1 : 0,
                                                transform: revealed ? 'translateY(0)' : 'translateY(15px)',
                                                transitionDelay: `${delay}ms`,
                                            }}
                                        >
                                            <div
                                                className="overflow-hidden rounded-sm"
                                                style={{
                                                    boxShadow: '0 4px 15px rgba(0,0,0,0.4)',
                                                }}
                                            >
                                                <img
                                                    src={block.src}
                                                    alt={block.caption || ''}
                                                    className="w-full h-auto object-cover"
                                                    onError={(e) => { e.target.parentElement.parentElement.style.display = 'none'; }}
                                                />
                                            </div>
                                            {block.caption && (
                                                <figcaption className="mt-2 text-sm text-gruvbox-fg-muted italic text-center">
                                                    {block.caption}
                                                </figcaption>
                                            )}
                                        </figure>
                                    );
                                }

                                return null;
                            })
                        ) : (
                            <p className="text-gruvbox-fg-dim italic">
                                No article content could be extracted. Click the link below to read on the original site.
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Read more link - subtle bottom left */}
            <div
                className="absolute bottom-6 left-6 z-20 transition-all duration-700 delay-500"
                style={{
                    opacity: revealed ? 1 : 0,
                    transform: revealed ? 'translateY(0)' : 'translateY(20px)',
                }}
            >
                <a
                    href={bookmark.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-gruvbox-fg-muted hover:text-gruvbox-teal transition-colors"
                >
                    <span>Continue on {article.siteName}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                </a>
            </div>

            {/* Decorative corner ornaments */}
            <div className="absolute top-16 left-4 w-8 h-8 border-l-2 border-t-2 border-amber-700/30 pointer-events-none z-10" />
            <div className="absolute top-16 right-4 w-8 h-8 border-r-2 border-t-2 border-amber-700/30 pointer-events-none z-10" />
            <div className="absolute bottom-4 left-4 w-8 h-8 border-l-2 border-b-2 border-amber-700/30 pointer-events-none z-10" />
            <div className="absolute bottom-4 right-4 w-8 h-8 border-r-2 border-b-2 border-amber-700/30 pointer-events-none z-10" />
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

// Note Preview - Distraction-free writing space
const NotePreview = ({ bookmark, notes, onNotesChange, title, onTitleChange, onSave, saving, availableTags = [], onClose, onTagClick }) => {
    const [isFocused, setIsFocused] = useState(false);

    // Extract tags from notes content
    const extractedTags = extractTagsFromContent(notes || '');
    // Also check bookmark.tags array - normalize to lowercase for consistency
    const allTags = [...new Set([...extractedTags, ...(bookmark?.tags || []).map(t => t.toLowerCase())])];

    return (
        <div className="h-full bg-gruvbox-bg-darkest flex flex-col overflow-hidden relative">
            {/* Subtle ambient background */}
            <div className="absolute inset-0 opacity-30 pointer-events-none">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-gruvbox-yellow/5 rounded-full blur-3xl" />
                <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-gruvbox-aqua/5 rounded-full blur-3xl" />
            </div>

            {/* Back button - top left with bounce animation */}
            <motion.button
                onClick={onClose}
                className="absolute top-6 left-6 z-20 flex items-center gap-2 px-3 py-2 rounded-full text-gruvbox-fg-muted/60 hover:text-gruvbox-fg bg-gruvbox-bg-light/30 hover:bg-gruvbox-bg-light/60 backdrop-blur-sm border border-gruvbox-bg-lighter/20 hover:border-gruvbox-bg-lighter/40 transition-colors"
                whileHover={{
                    scale: 1.05,
                    x: -3,
                }}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, x: -20 }}
                animate={{
                    opacity: 1,
                    x: 0,
                    transition: {
                        type: "spring",
                        stiffness: 500,
                        damping: 25,
                        delay: 0.2
                    }
                }}
            >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span className="text-xs font-medium">Back</span>
            </motion.button>

            {/* Minimal header - tags and title */}
            <motion.div
                className="flex-shrink-0 pt-20 pb-8 px-8 relative z-10"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
            >
                <div className="max-w-2xl mx-auto">
                    {/* Tags section - right before title */}
                    {allTags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-4">
                            {allTags.map((tag, index) => {
                                const tagColor = getTagColor(tag, index > 0 ? getTagColor(allTags[index - 1]).id : null);
                                return (
                                    <button
                                        key={tag}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onTagClick?.(tag);
                                        }}
                                        className="inline-flex items-center px-2 py-[3px] rounded-full text-[11px] font-medium transition-all duration-150 cursor-pointer hover:brightness-125"
                                        style={{
                                            backgroundColor: tagColor.bg,
                                            color: tagColor.text,
                                        }}
                                    >
                                        {tag}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => onTitleChange?.(e.target.value)}
                        placeholder="Untitled"
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                        className="w-full bg-transparent text-3xl font-light text-gruvbox-fg placeholder:text-gruvbox-fg-muted/30 focus:outline-none tracking-wide"
                        style={{ caretColor: '#fabd2f' }}
                    />
                    {/* Subtle underline that appears on focus */}
                    <motion.div
                        className="h-px bg-gradient-to-r from-gruvbox-yellow/50 via-gruvbox-yellow/20 to-transparent mt-3"
                        initial={{ scaleX: 0, opacity: 0 }}
                        animate={{
                            scaleX: isFocused ? 1 : 0.3,
                            opacity: isFocused ? 1 : 0.3
                        }}
                        style={{ originX: 0 }}
                        transition={{ duration: 0.3 }}
                    />
                </div>
            </motion.div>

            {/* Writing area - clean and spacious */}
            <motion.div
                className="flex-1 overflow-y-auto px-8 relative z-10"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
            >
                <div className="max-w-2xl mx-auto pb-32">
                    <NotionEditor
                        value={notes}
                        onChange={onNotesChange}
                        minHeight={500}
                        availableTags={availableTags}
                        className="note-distraction-free"
                        placeholder="Start writing..."
                    />
                </div>
            </motion.div>

            {/* Minimal floating save button */}
            <motion.div
                className="absolute bottom-6 right-6 z-20"
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{
                    opacity: 1,
                    scale: 1,
                    y: 0,
                    transition: {
                        type: "spring",
                        stiffness: 400,
                        damping: 25,
                        delay: 0.3
                    }
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
            >
                <button
                    onClick={onSave}
                    disabled={saving}
                    className="px-5 py-2.5 rounded-full text-sm font-medium bg-gruvbox-yellow text-gruvbox-bg-darkest hover:bg-gruvbox-yellow-light transition-colors shadow-lg shadow-gruvbox-yellow/20 disabled:opacity-50"
                >
                    {saving ? 'Saving...' : 'Save'}
                </button>
            </motion.div>

            {/* Keyboard hints - very subtle, bottom left */}
            <div className="absolute bottom-6 left-6 z-10 flex items-center gap-3 text-[10px] text-gruvbox-fg-muted/30">
                <span><kbd className="px-1 py-0.5 rounded bg-gruvbox-bg-dark/50 border border-gruvbox-bg-lighter/20">/</kbd> cmds</span>
                <span><kbd className="px-1 py-0.5 rounded bg-gruvbox-bg-dark/50 border border-gruvbox-bg-lighter/20">esc</kbd> close</span>
            </div>
        </div>
    );
};

// Helper component to render Wikipedia HTML content with clickable links and images
const WikiContent = ({ html, lang, skipMainImage = false }) => {
    if (!html) return null;

    // Process HTML to make links clickable, fix image URLs, and clean up content
    const processHtml = (rawHtml) => {
        let processed = rawHtml;

        // Convert Wikipedia internal links to full URLs that open in new tab
        processed = processed.replace(
            /<a[^>]*href="\.\/([^"]+)"[^>]*>([^<]*)<\/a>/gi,
            (match, path, text) => {
                const fullUrl = `https://${lang}.wikipedia.org/wiki/${path}`;
                return `<a href="${fullUrl}" target="_blank" rel="noopener noreferrer" class="wiki-link">${text}</a>`;
            }
        );

        // Also handle /wiki/ links
        processed = processed.replace(
            /<a[^>]*href="\/wiki\/([^"]+)"[^>]*>([^<]*)<\/a>/gi,
            (match, path, text) => {
                const fullUrl = `https://${lang}.wikipedia.org/wiki/${path}`;
                return `<a href="${fullUrl}" target="_blank" rel="noopener noreferrer" class="wiki-link">${text}</a>`;
            }
        );

        // Fix ALL image src URLs - handle various Wikipedia URL formats
        // Handle protocol-relative URLs (//upload.wikimedia.org)
        processed = processed.replace(
            /src="\/\/([^"]+)"/gi,
            'src="https://$1"'
        );

        // Handle relative /w/ URLs
        processed = processed.replace(
            /src="\/w\/([^"]+)"/gi,
            `src="https://${lang}.wikipedia.org/w/$1"`
        );

        // Handle relative /static/ URLs
        processed = processed.replace(
            /src="\/static\/([^"]+)"/gi,
            `src="https://${lang}.wikipedia.org/static/$1"`
        );

        // CRITICAL: Wikipedia mobile-html uses lazy-load placeholders with <span> instead of <img>
        // Convert these span placeholders to actual img tags
        processed = processed.replace(
            /<span([^>]*class="[^"]*pcs-lazy-load-placeholder[^"]*"[^>]*)>[\s\S]*?<\/span>/gi,
            (match, attrs) => {
                // Extract data-src from attributes
                const dataSrcMatch = attrs.match(/data-src="([^"]+)"/i);
                if (!dataSrcMatch) return match;

                let imgUrl = dataSrcMatch[1];
                // Fix protocol-relative URL
                if (imgUrl.startsWith('//')) {
                    imgUrl = 'https:' + imgUrl;
                }

                // Extract other useful attributes
                const widthMatch = attrs.match(/data-width="(\d+)"/i);
                const heightMatch = attrs.match(/data-height="(\d+)"/i);
                const classMatch = attrs.match(/data-class="([^"]+)"/i);

                const width = widthMatch ? ` width="${widthMatch[1]}"` : '';
                const height = heightMatch ? ` height="${heightMatch[1]}"` : '';
                const imgClass = classMatch ? classMatch[1] : 'mw-file-element';

                return `<img src="${imgUrl}" class="${imgClass}"${width}${height} loading="lazy" />`;
            }
        );

        // Also handle any remaining data-src on img tags
        processed = processed.replace(
            /data-src="([^"]+)"/gi,
            (match, url) => {
                let fixedUrl = url;
                if (url.startsWith('//')) {
                    fixedUrl = 'https:' + url;
                } else if (url.startsWith('/')) {
                    fixedUrl = `https://${lang}.wikipedia.org${url}`;
                }
                return `src="${fixedUrl}"`;
            }
        );

        // Fix srcset URLs - handle all protocol-relative URLs
        processed = processed.replace(
            /srcset="([^"]+)"/gi,
            (match, srcset) => {
                let fixed = srcset;
                // Fix protocol-relative URLs
                fixed = fixed.replace(/\/\/upload\.wikimedia\.org/g, 'https://upload.wikimedia.org');
                fixed = fixed.replace(/\/\/[a-z]+\.wikipedia\.org/g, (m) => 'https:' + m);
                return `srcset="${fixed}"`;
            }
        );

        // Also fix background-image URLs in style attributes
        processed = processed.replace(
            /background-image:\s*url\(['"]?(\/\/[^'")\s]+)['"]?\)/gi,
            (match, url) => `background-image: url('https:${url}')`
        );

        // Add class to figures for styling
        processed = processed.replace(
            /<figure([^>]*)>/gi,
            '<figure$1 class="wiki-figure">'
        );

        // Remove edit links, citation needed, etc.
        processed = processed.replace(/<span class="mw-editsection[^>]*>[\s\S]*?<\/span>/gi, '');
        processed = processed.replace(/\[edit\]/gi, '');
        processed = processed.replace(/\[citation needed\]/gi, '');
        processed = processed.replace(/\[\d+\]/g, ''); // Remove reference numbers

        // Remove infobox from content (displayed separately in sidebar)
        processed = processed.replace(/<table[^>]*class="[^"]*infobox[^"]*"[^>]*>[\s\S]*?<\/table>/gi, '');

        // If skipMainImage is true, remove the first figure (which is typically the same as infobox image)
        if (skipMainImage) {
            // Remove only the FIRST figure element to avoid duplicate with infobox
            processed = processed.replace(/<figure[^>]*>[\s\S]*?<\/figure>/i, '');
        }

        // Remove navboxes, sidebars, and other navigation elements
        processed = processed.replace(/<div[^>]*class="[^"]*navbox[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '');
        processed = processed.replace(/<table[^>]*class="[^"]*navbox[^"]*"[^>]*>[\s\S]*?<\/table>/gi, '');
        processed = processed.replace(/<div[^>]*class="[^"]*sidebar[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '');

        // Remove empty spans and cleanup
        processed = processed.replace(/<span[^>]*>\s*<\/span>/gi, '');

        return processed;
    };

    return (
        <div
            className="wiki-content"
            dangerouslySetInnerHTML={{ __html: processHtml(html) }}
        />
    );
};

const WikiPreview = ({ bookmark }) => {
    // Extract title from URL if possible or use bookmark title
    const title = bookmark.title.replace(' - Wikipedia', '');
    const [wikiData, setWikiData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [revealed, setRevealed] = useState(false);

    // Helper to strip HTML tags from text
    const stripHtml = (html) => {
        if (!html) return '';
        return html.replace(/<[^>]+>/g, '').trim();
    };

    useEffect(() => {
        const fetchWikiData = async () => {
            try {
                setLoading(true);
                setRevealed(false);
                const urlObj = new URL(bookmark.url);
                const pageTitle = urlObj.pathname.split('/wiki/')[1];

                // Detect language from subdomain
                const langMatch = urlObj.hostname.match(/^(\w+)\.wikipedia\.org/);
                const lang = langMatch ? langMatch[1] : 'en';

                if (pageTitle) {
                    const response = await fetch(`http://127.0.0.1:3000/api/wikipedia/article?title=${lang}:${encodeURIComponent(decodeURIComponent(pageTitle))}`);
                    if (response.ok) {
                        const data = await response.json();
                        setWikiData(data);
                        setTimeout(() => setRevealed(true), 100);
                    }
                }
            } catch (error) {
                console.error('Failed to fetch Wiki article:', error);
            } finally {
                setLoading(false);
            }
        };

        if (bookmark.url.includes('wikipedia.org')) {
            fetchWikiData();
        }
    }, [bookmark.url]);

    if (loading) {
        return (
            <div className="h-full min-h-[300px] flex items-center justify-center bg-gruvbox-bg-dark">
                <GruvboxLoader variant="orbit" size="lg" label="Loading Wikipedia" />
            </div>
        );
    }

    const mainImage = wikiData?.mainImage || bookmark.thumbnail;
    const mainImageCaption = wikiData?.mainImageCaption || '';
    const infobox = wikiData?.infobox;
    const sections = wikiData?.sections || [];
    const lang = wikiData?.lang || 'en';
    const images = wikiData?.images || [];

    return (
        <div className="h-full bg-gruvbox-bg-darkest text-gruvbox-fg relative flex flex-col overflow-hidden">
            {/* Subtle film grain overlay */}
            <div className="absolute inset-0 opacity-[0.02] pointer-events-none z-50"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
                }}
            />

            {/* Reveal animation curtain */}
            <div
                className="absolute inset-0 bg-gruvbox-bg-darkest z-40 pointer-events-none transition-transform duration-1000 ease-out"
                style={{
                    transform: revealed ? 'translateY(-100%)' : 'translateY(0)',
                }}
            >
                <div className="absolute bottom-0 left-0 right-0 h-8 flex justify-center">
                    {[...Array(20)].map((_, i) => (
                        <div
                            key={i}
                            className="w-8 h-8 rounded-b-full bg-gruvbox-teal/50"
                            style={{ marginLeft: i > 0 ? '-4px' : 0 }}
                        />
                    ))}
                </div>
            </div>

            {/* Wikipedia-style Header - clickable link */}
            <a
                href={bookmark.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0 flex items-center gap-3 px-6 py-3 border-b border-gruvbox-bg-light bg-gruvbox-bg/90 backdrop-blur-sm relative z-10 group hover:bg-gruvbox-bg-light/50 transition-colors"
            >
                <div className="w-8 h-8 rounded bg-gruvbox-teal/20 flex items-center justify-center border border-gruvbox-teal/30 group-hover:bg-gruvbox-teal/30 transition-colors">
                    <span className="text-gruvbox-teal text-sm font-bold" style={{ fontFamily: 'Linux Libertine, Georgia, serif' }}>W</span>
                </div>
                <div className="flex-1">
                    <span className="text-lg font-medium text-gruvbox-fg group-hover:text-gruvbox-teal transition-colors" style={{ fontFamily: 'Linux Libertine, Georgia, serif' }}>Wikipedia</span>
                    <span className="text-xs text-gruvbox-fg-muted ml-2">The Free Encyclopedia</span>
                </div>
                <ExternalLink className="w-4 h-4 text-gruvbox-fg-muted group-hover:text-gruvbox-teal transition-colors" />
            </a>

            {/* Scrollable Content - Wikipedia Layout */}
            <div className="flex-1 min-h-0 overflow-y-auto relative z-10">
                <div className="px-6 py-6">
                    {/* Title */}
                    <h1
                        className="text-4xl font-normal mb-1 leading-tight text-gruvbox-fg border-b border-gruvbox-bg-light pb-2 transition-all duration-700"
                        style={{
                            opacity: revealed ? 1 : 0,
                            transform: revealed ? 'translateY(0)' : 'translateY(20px)',
                            fontFamily: 'Linux Libertine, Georgia, Times, serif',
                        }}
                    >
                        {stripHtml(wikiData?.displayTitle) || title}
                    </h1>

                    {/* Short description */}
                    {wikiData?.description && (
                        <p
                            className="text-sm text-gruvbox-fg-muted italic mb-4 transition-all duration-700 delay-100"
                            style={{
                                opacity: revealed ? 1 : 0,
                                transform: revealed ? 'translateY(0)' : 'translateY(15px)',
                            }}
                        >
                            {wikiData.description}
                        </p>
                    )}

                    {/* Main content area with floating infobox */}
                    <div className="relative">
                        {/* Infobox - floats right (Wikipedia style) */}
                        {(mainImage || infobox) && (
                            <div
                                className="float-right w-64 ml-6 mb-4 transition-all duration-700 delay-150"
                                style={{
                                    opacity: revealed ? 1 : 0,
                                    transform: revealed ? 'translateX(0)' : 'translateX(20px)',
                                }}
                            >
                                <div
                                    className="bg-gruvbox-bg border border-gruvbox-bg-light rounded overflow-hidden"
                                    style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}
                                >
                                    {/* Infobox title */}
                                    <div className="bg-gruvbox-teal/20 px-3 py-2 text-center border-b border-gruvbox-bg-light">
                                        <span className="text-gruvbox-fg font-medium text-sm" style={{ fontFamily: 'Georgia, serif' }}>
                                            {stripHtml(wikiData?.displayTitle) || title}
                                        </span>
                                    </div>

                                    {/* Main image */}
                                    {mainImage && (
                                        <div className="p-2 border-b border-gruvbox-bg-light">
                                            <img
                                                src={mainImage}
                                                alt={title}
                                                className="w-full h-auto rounded-sm"
                                            />
                                            {mainImageCaption && (
                                                <p className="mt-2 text-xs text-gruvbox-fg-muted italic leading-relaxed px-1">
                                                    {mainImageCaption}
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    {/* Infobox properties */}
                                    {infobox && infobox.rows && (
                                        <div className="divide-y divide-gruvbox-bg-light/50">
                                            {infobox.rows.slice(0, 12).map((row, idx) => (
                                                row.type === 'header' ? (
                                                    <div key={idx} className="bg-gruvbox-teal/10 px-3 py-1.5 text-center">
                                                        <span className="text-gruvbox-teal-light text-xs font-medium">{stripHtml(row.text)}</span>
                                                    </div>
                                                ) : (
                                                    <div key={idx} className="flex text-xs">
                                                        <div className="w-24 flex-shrink-0 bg-gruvbox-bg-light/30 px-2 py-1.5 text-gruvbox-fg-muted font-medium">
                                                            {stripHtml(row.label)}
                                                        </div>
                                                        <div className="flex-1 px-2 py-1.5 text-gruvbox-fg/80">
                                                            {stripHtml(row.value)}
                                                        </div>
                                                    </div>
                                                )
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Article content - wraps around infobox */}
                        <div>
                            {/* Lead section / Extract */}
                            <div
                                className="transition-all duration-700 delay-200"
                                style={{
                                    opacity: revealed ? 1 : 0,
                                    transform: revealed ? 'translateY(0)' : 'translateY(15px)',
                                }}
                            >
                                {sections.length > 0 && sections[0]?.html ? (
                                    <WikiContent html={sections[0].html} lang={lang} skipMainImage={!!(mainImage || infobox)} />
                                ) : wikiData?.extract ? (
                                    <p className="text-amber-100/85 leading-relaxed mb-4" style={{ fontFamily: 'Georgia, serif' }}>
                                        {wikiData.extract}
                                    </p>
                                ) : null}
                            </div>

                            {/* Other sections - images are preserved in HTML */}
                            {sections.slice(1).map((section, idx) => (
                                <div
                                    key={section.id}
                                    className="mt-6 transition-all duration-500"
                                    style={{
                                        opacity: revealed ? 1 : 0,
                                        transform: revealed ? 'translateY(0)' : 'translateY(15px)',
                                        transitionDelay: `${300 + idx * 100}ms`,
                                    }}
                                >
                                    {section.title && (
                                        <h2
                                            className={`font-normal text-amber-200 border-b border-amber-800/30 pb-1 mb-3 clear-both ${section.level <= 2 ? 'text-2xl' : 'text-xl'
                                                }`}
                                            style={{ fontFamily: 'Linux Libertine, Georgia, serif' }}
                                        >
                                            {section.title}
                                        </h2>
                                    )}
                                    <WikiContent html={section.html} lang={lang} />
                                </div>
                            ))}

                            {/* Image Gallery - All images from media list */}
                            {images.length > 0 && (
                                <div
                                    className="mt-8 pt-6 border-t border-amber-800/30 transition-all duration-700"
                                    style={{
                                        opacity: revealed ? 1 : 0,
                                        transform: revealed ? 'translateY(0)' : 'translateY(15px)',
                                        transitionDelay: '500ms',
                                    }}
                                >
                                    <h2
                                        className="text-2xl font-normal text-amber-200 border-b border-amber-800/30 pb-1 mb-4"
                                        style={{ fontFamily: 'Linux Libertine, Georgia, serif' }}
                                    >
                                        Images
                                    </h2>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                        {images.map((img, idx) => (
                                            <figure
                                                key={idx}
                                                className="bg-[#16213e]/60 border border-amber-800/30 rounded overflow-hidden transition-all duration-300 hover:border-amber-600/50"
                                                style={{
                                                    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                                                    opacity: revealed ? 1 : 0,
                                                    transform: revealed ? 'translateY(0)' : 'translateY(10px)',
                                                    transitionDelay: `${550 + idx * 50}ms`,
                                                }}
                                            >
                                                <div className="aspect-video overflow-hidden">
                                                    <img
                                                        src={img.src}
                                                        alt={img.caption || img.title || ''}
                                                        className="w-full h-full object-cover"
                                                        style={{ filter: 'sepia(5%) contrast(1.02)' }}
                                                        onError={(e) => { e.target.parentElement.parentElement.style.display = 'none'; }}
                                                        loading="lazy"
                                                    />
                                                </div>
                                                {img.caption && (
                                                    <figcaption className="p-2 text-xs text-amber-500/70 italic line-clamp-2">
                                                        {img.caption}
                                                    </figcaption>
                                                )}
                                            </figure>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Clear float */}
                        <div className="clear-both" />
                    </div>
                </div>
            </div>

            {/* CSS for wiki content styling */}
            <style>{`
                .wiki-content {
                    font-family: Georgia, 'Times New Roman', serif;
                    font-size: 0.95rem;
                    line-height: 1.7;
                    color: rgba(251, 191, 36, 0.85);
                }
                .wiki-content p {
                    margin-bottom: 1rem;
                }
                .wiki-content .wiki-link {
                    color: #60a5fa;
                    text-decoration: none;
                    border-bottom: 1px solid transparent;
                    transition: all 0.2s;
                }
                .wiki-content .wiki-link:hover {
                    color: #93c5fd;
                    border-bottom-color: #93c5fd;
                }
                .wiki-content b, .wiki-content strong {
                    color: rgba(251, 191, 36, 1);
                    font-weight: 600;
                }
                .wiki-content ul, .wiki-content ol {
                    margin: 0.75rem 0;
                    padding-left: 1.5rem;
                }
                .wiki-content li {
                    margin-bottom: 0.25rem;
                }
                .wiki-content h3, .wiki-content h4 {
                    color: rgba(253, 230, 138, 0.9);
                    font-family: 'Linux Libertine', Georgia, serif;
                    margin-top: 1.5rem;
                    margin-bottom: 0.5rem;
                }
                /* Wikipedia-style figure/image styling */
                .wiki-content figure,
                .wiki-content .wiki-figure,
                .wiki-content .thumb {
                    float: right;
                    clear: right;
                    margin: 0.5rem 0 1rem 1.5rem;
                    max-width: 280px;
                    background: rgba(22, 33, 62, 0.6);
                    border: 1px solid rgba(245, 158, 11, 0.3);
                    border-radius: 4px;
                    padding: 6px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                }
                .wiki-content figure img,
                .wiki-content .wiki-figure img,
                .wiki-content .thumb img {
                    max-width: 100%;
                    height: auto;
                    display: block;
                    border-radius: 2px;
                    filter: sepia(5%) contrast(1.02);
                }
                .wiki-content figcaption,
                .wiki-content .thumbcaption {
                    font-size: 0.8rem;
                    color: rgba(251, 191, 36, 0.7);
                    padding: 6px 4px 2px;
                    line-height: 1.4;
                    font-style: italic;
                }
                /* Handle left-aligned images */
                .wiki-content figure.mw-halign-left,
                .wiki-content .tleft {
                    float: left;
                    margin: 0.5rem 1.5rem 1rem 0;
                }
                /* Handle centered images */
                .wiki-content figure.mw-halign-center {
                    float: none;
                    margin: 1rem auto;
                    display: block;
                }
                /* Gallery styling */
                .wiki-content .gallery {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 8px;
                    margin: 1rem 0;
                    clear: both;
                }
                .wiki-content .gallery .gallerybox {
                    flex: 0 0 auto;
                    max-width: 180px;
                }
                /* Clear floats after sections */
                .wiki-content::after {
                    content: '';
                    display: table;
                    clear: both;
                }
                /* Ensure all images are visible */
                .wiki-content img {
                    max-width: 100%;
                    height: auto;
                    display: block;
                }
                /* Handle various Wikipedia image wrapper classes */
                .wiki-content .mw-file-element,
                .wiki-content .mw-file-description {
                    display: block;
                }
                .wiki-content .thumbinner {
                    background: rgba(22, 33, 62, 0.6);
                    border: 1px solid rgba(245, 158, 11, 0.3);
                    border-radius: 4px;
                    padding: 6px;
                    max-width: 280px;
                }
                .wiki-content .thumbimage {
                    border-radius: 2px;
                }
                /* Handle noresize and other image classes */
                .wiki-content .noresize img,
                .wiki-content .mw-default-size img {
                    max-width: 280px;
                }
                /* Lazy loaded image placeholders */
                .wiki-content .lazy-image-placeholder {
                    background: rgba(245, 158, 11, 0.1);
                    min-height: 100px;
                }
                /* Remove any hidden attributes that might hide images */
                .wiki-content [hidden] {
                    display: block !important;
                }
                .wiki-content .noviewer {
                    display: block;
                }
            `}</style>

            {/* Decorative corner ornaments */}
            <div className="absolute top-14 left-4 w-6 h-6 border-l-2 border-t-2 border-amber-700/20 pointer-events-none z-10" />
            <div className="absolute top-14 right-4 w-6 h-6 border-r-2 border-t-2 border-amber-700/20 pointer-events-none z-10" />
            <div className="absolute bottom-4 left-4 w-6 h-6 border-l-2 border-b-2 border-amber-700/20 pointer-events-none z-10" />
            <div className="absolute bottom-4 right-4 w-6 h-6 border-r-2 border-b-2 border-amber-700/20 pointer-events-none z-10" />
        </div>
    );
};

// Recipe preview - shows full recipe with ingredients and instructions
const RecipePreview = ({ bookmark }) => {
    const [revealed, setRevealed] = useState(false);
    const { metadata = {}, title, thumbnail, url } = bookmark;

    // Extract recipe metadata
    const cookTime = metadata.cookTime;
    const prepTime = metadata.prepTime;
    const totalTime = metadata.totalTime;
    const servings = metadata.servings;
    const calories = metadata.calories;
    const rating = metadata.rating;
    const ratingCount = metadata.ratingCount;
    const ingredients = metadata.ingredients || [];
    const instructions = metadata.instructions || [];
    const author = metadata.author;
    const cuisine = metadata.cuisine;

    // Get domain for source display
    const getDomain = (url) => {
        try {
            return new URL(url).hostname.replace('www.', '');
        } catch {
            return url;
        }
    };
    const domain = getDomain(url);

    // Determine primary time to show
    const primaryTime = totalTime || cookTime;

    // Trigger reveal animation
    useEffect(() => {
        setTimeout(() => setRevealed(true), 100);
    }, []);

    // Parse instruction text - handle both string and object formats
    const parseInstruction = (instruction, index) => {
        if (typeof instruction === 'string') {
            return instruction;
        }
        if (instruction?.text) {
            return instruction.text;
        }
        if (instruction?.['@type'] === 'HowToStep') {
            return instruction.text || instruction.name || '';
        }
        return JSON.stringify(instruction);
    };

    // Star rating component
    const StarRating = ({ rating, maxStars = 5 }) => {
        if (!rating) return null;
        const fullStars = Math.floor(rating);
        const hasHalf = rating - fullStars >= 0.5;

        return (
            <div className="flex items-center gap-1.5">
                <div className="flex">
                    {[...Array(maxStars)].map((_, i) => (
                        <Star
                            key={i}
                            className={`w-4 h-4 ${
                                i < fullStars
                                    ? "text-amber-400 fill-amber-400"
                                    : i === fullStars && hasHalf
                                        ? "text-amber-400 fill-amber-400/50"
                                        : "text-white/20"
                            }`}
                        />
                    ))}
                </div>
                <span className="text-sm text-white/60">{rating.toFixed(1)}</span>
                {ratingCount && (
                    <span className="text-sm text-white/40">({ratingCount.toLocaleString()} reviews)</span>
                )}
            </div>
        );
    };

    return (
        <div className="h-full bg-[#0f0a08] text-neutral-100 relative flex flex-col overflow-hidden">
            {/* Subtle texture overlay */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none z-50"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
                }}
            />

            {/* Reveal animation curtain */}
            <div
                className="absolute inset-0 bg-[#0f0a08] z-40 pointer-events-none transition-transform duration-1000 ease-out"
                style={{
                    transform: revealed ? 'translateY(-100%)' : 'translateY(0)',
                }}
            >
                <div className="absolute bottom-0 left-0 right-0 h-8 flex justify-center">
                    {[...Array(20)].map((_, i) => (
                        <div
                            key={i}
                            className="w-8 h-8 rounded-b-full bg-red-900/50"
                            style={{ marginLeft: i > 0 ? '-4px' : 0 }}
                        />
                    ))}
                </div>
            </div>

            {/* Header with site info */}
            <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0 flex items-center gap-3 px-6 py-3 border-b border-red-900/20 bg-black/40 backdrop-blur-sm relative z-10 group hover:bg-red-900/10 transition-colors"
            >
                <div className="w-8 h-8 rounded-lg bg-red-900/30 flex items-center justify-center overflow-hidden border border-red-900/30 group-hover:border-red-700/50 transition-colors">
                    <img
                        src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
                        alt={domain}
                        className="w-5 h-5"
                        onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.parentElement.innerHTML = '<span class="text-red-400"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg></span>';
                        }}
                    />
                </div>
                <div className="flex-1">
                    <span className="text-sm font-medium text-red-300 group-hover:text-red-200 transition-colors">{domain}</span>
                    {author && <span className="text-xs text-white/40 ml-2">by {author}</span>}
                </div>
                <ExternalLink className="w-4 h-4 text-white/30 group-hover:text-red-300 transition-colors" />
            </a>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto">
                {/* Hero Image */}
                {thumbnail && (
                    <div className="relative aspect-[16/9] max-h-[300px] overflow-hidden">
                        <img
                            src={thumbnail}
                            alt={title}
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0f0a08] via-transparent to-transparent" />
                    </div>
                )}

                {/* Recipe Content */}
                <div className="px-6 py-6 space-y-6">
                    {/* Title */}
                    <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight">
                        {title}
                    </h1>

                    {/* Rating */}
                    {rating && <StarRating rating={rating} />}

                    {/* Quick metadata pills */}
                    <div className="flex flex-wrap gap-3">
                        {primaryTime && (
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-900/30 border border-red-900/40 text-white">
                                <Clock className="w-4 h-4 text-red-400" />
                                <span className="text-sm font-medium">{primaryTime}</span>
                                {prepTime && prepTime !== primaryTime && (
                                    <span className="text-xs text-white/50">(+{prepTime} prep)</span>
                                )}
                            </div>
                        )}
                        {servings && (
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-white">
                                <Users className="w-4 h-4 text-white/60" />
                                <span className="text-sm">{servings}</span>
                            </div>
                        )}
                        {calories && (
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-white">
                                <Flame className="w-4 h-4 text-orange-400" />
                                <span className="text-sm">{calories}</span>
                            </div>
                        )}
                        {cuisine && (
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-white">
                                <span className="text-sm">{cuisine}</span>
                            </div>
                        )}
                    </div>

                    {/* Ingredients Section */}
                    {ingredients.length > 0 && (
                        <div className="space-y-4">
                            <h2 className="text-lg font-semibold text-red-300 flex items-center gap-2">
                                <span className="w-8 h-8 rounded-lg bg-red-900/30 flex items-center justify-center">
                                    <ChefHat className="w-4 h-4 text-red-400" />
                                </span>
                                Ingredients
                                <span className="text-sm font-normal text-white/40">({ingredients.length} items)</span>
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {ingredients.map((ingredient, index) => (
                                    <div
                                        key={index}
                                        className="flex items-start gap-3 p-3 rounded-lg bg-white/[0.03] border border-white/5 hover:bg-white/[0.05] transition-colors group"
                                    >
                                        <div className="w-5 h-5 rounded-full border-2 border-red-900/50 flex-shrink-0 mt-0.5 group-hover:border-red-700/70 transition-colors" />
                                        <span className="text-sm text-white/80 leading-relaxed">{ingredient}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Instructions Section */}
                    {instructions.length > 0 && (
                        <div className="space-y-4">
                            <h2 className="text-lg font-semibold text-red-300 flex items-center gap-2">
                                <span className="w-8 h-8 rounded-lg bg-red-900/30 flex items-center justify-center">
                                    <CheckCircle2 className="w-4 h-4 text-red-400" />
                                </span>
                                Instructions
                                <span className="text-sm font-normal text-white/40">({instructions.length} steps)</span>
                            </h2>
                            <div className="space-y-3">
                                {instructions.map((instruction, index) => {
                                    const text = parseInstruction(instruction, index);
                                    return (
                                        <div
                                            key={index}
                                            className="flex gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.05] transition-colors group"
                                        >
                                            <div className="flex-shrink-0">
                                                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-900/40 text-red-300 text-sm font-bold border border-red-900/50 group-hover:bg-red-900/60 transition-colors">
                                                    {index + 1}
                                                </span>
                                            </div>
                                            <p className="text-white/80 leading-relaxed flex-1 pt-1">
                                                {text}
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* No recipe data fallback */}
                    {ingredients.length === 0 && instructions.length === 0 && (
                        <div className="text-center py-12">
                            <div className="w-16 h-16 rounded-2xl bg-red-900/20 flex items-center justify-center mx-auto mb-4">
                                <ChefHat className="w-8 h-8 text-red-400/50" />
                            </div>
                            <p className="text-white/40 text-sm">
                                Recipe details not available.
                                <a
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-red-400 hover:text-red-300 ml-1 underline"
                                >
                                    View on source site
                                </a>
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// Humorous placeholder options for the title field
const TITLE_PLACEHOLDERS = [
    "Give me a name, I'm feeling anonymous...",
    "Title goes here (or doesn't, I'm not your boss)",
    "Name me like one of your French bookmarks",
    "Untitled masterpiece awaits...",
    "This bookmark deserves a name, don't you think?",
    "Insert witty title here",
    "What shall we call this treasure?",
    "A title would be nice, just saying...",
    "Name pending... forever?",
    "Title loading... just kidding, you have to type it",
    "Bookmark #4,827 (or give me a real name)",
    "Your future self will thank you for a title",
    "Don't leave me nameless!",
    "Title TBD (To Be Determined... by you)",
    "I'm too pretty to be untitled",
    "Help, I need a title!",
    "Insert creative title here",
    "What's in a name? Everything.",
    "Title or it didn't happen",
    "Nameless but not shameless",
    "Waiting for inspiration...",
    "Title goes brrr...",
    "This space intentionally left blank",
    "Error 404: Title not found",
    "Loading title.exe...",
    "Your ad here (just kidding, add a title)",
    "Roses are red, this needs a title",
    "Keep calm and add a title",
    "Plot twist: add a title",
    "Title-less in Seattle",
    "To title or not to title...",
    "Once upon a title...",
    "Breaking: Bookmark still untitled",
    "Title.mp3 not found",
    "My name is... (what?)",
    "Spoiler alert: needs a title",
    "Coming soon: a great title",
    "Title under construction",
    "May the title be with you",
    "Winter is coming... add a title",
    "In a galaxy without a title...",
    "Houston, we need a title",
    "I'll be back... with a title hopefully",
    "You shall not pass... without a title",
    "Why so titleless?",
    "One does not simply skip the title",
    "I am inevitable... but my title isn't",
    "Reality can be whatever you title it",
    "It's a bird! It's a plane! It's... untitled",
    "Title machine broke",
    "Achievement unlocked: Add a title",
    "Press F to add title",
    "Ctrl+T for title (not really)",
    "No title gang",
    "Professional bookmark, casual title",
    "This bookmark is mint, title is... not",
];

const getRandomPlaceholder = () => {
    return TITLE_PLACEHOLDERS[Math.floor(Math.random() * TITLE_PLACEHOLDERS.length)];
};

const BookmarkDetail = ({ bookmark, open, onOpenChange, onSave, allTags = [], autoPlay = false, onTagClick }) => {
    const [formData, setFormData] = useState({
        title: '',
        category: '',
        tags: '',
        notes: ''
    });
    const [titlePlaceholder, setTitlePlaceholder] = useState(getRandomPlaceholder());
    const [saving, setSaving] = useState(false);
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
    const [repelOffset, setRepelOffset] = useState({ x: 0, y: 0 });
    const [showHint, setShowHint] = useState(false);
    const contentRef = useRef(null);
    const notesTextareaRef = useRef(null);
    const formContainerRef = useRef(null);
    const notesContainerRef = useRef(null);

    // Detect prefers-reduced-motion
    useEffect(() => {
        const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
        setPrefersReducedMotion(mq.matches);
        const handler = (e) => setPrefersReducedMotion(e.matches);
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, []);

    // Check if this is a YouTube bookmark (needed for conditional rendering)
    const isYoutube = bookmark?.url?.includes('youtube.com') || bookmark?.url?.includes('youtu.be');

    // Auto-resize notes textarea to expand as user types, up to the save button
    const autoResizeNotes = useCallback(() => {
        const textarea = notesTextareaRef.current;
        const formContainer = formContainerRef.current;

        if (!textarea || !formContainer) return;

        // Temporarily set height to auto to measure content
        const prevHeight = textarea.style.height;
        textarea.style.height = 'auto';

        // Get the natural content height
        const contentHeight = textarea.scrollHeight;

        // Get positions
        const formRect = formContainer.getBoundingClientRect();
        const textareaRect = textarea.getBoundingClientRect();

        // Calculate space from current textarea top to bottom of form container
        // Subtract space for the button area (buttons + padding + border = ~75px)
        const buttonAreaSpace = 75;
        const spaceFromTopToFormBottom = formRect.bottom - textareaRect.top - buttonAreaSpace;

        // The maximum height the textarea can be
        const maxHeight = Math.max(100, spaceFromTopToFormBottom);

        // Use content height if it fits, otherwise cap at max
        const minHeight = 100;
        let newHeight;

        if (contentHeight <= minHeight) {
            newHeight = minHeight;
        } else if (contentHeight >= maxHeight) {
            newHeight = maxHeight;
        } else {
            newHeight = contentHeight;
        }

        textarea.style.height = `${newHeight}px`;
    }, []);

    // Update form when bookmark changes
    // Title starts empty - user can add custom title if they want
    useEffect(() => {
        if (bookmark) {
            setFormData({
                title: bookmark.customTitle || '',
                category: bookmark.category || '',
                tags: bookmark.tags?.join(', ') || '',
                notes: bookmark.notes || ''
            });
        }
    }, [bookmark]);

    // Reset state when dialog opens/closes
    useEffect(() => {
        if (open) {
            setRepelOffset({ x: 0, y: 0 });
            setShowHint(false);
            setTitlePlaceholder(getRandomPlaceholder());
            // Trigger auto-resize after dialog opens (with delay for layout to settle)
            const resizeTimer = setTimeout(autoResizeNotes, 150);
            return () => clearTimeout(resizeTimer);
        } else {
            setRepelOffset({ x: 0, y: 0 });
            setShowHint(false);
        }
    }, [open, autoResizeNotes]);

    // Auto-resize on window resize
    useEffect(() => {
        if (!open) return;

        const handleResize = () => autoResizeNotes();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [open, autoResizeNotes]);

    // Auto-save removed - was causing performance issues
    // Users should click Save to save changes

    const handleSave = async () => {
        if (!bookmark) return;

        setSaving(true);
        try {
            const updatedData = {
                title: formData.title || bookmark.title,
                category: formData.category,
                tags: formData.tags.split(',').map(t => t.trim()).filter(t => t),
                notes: formData.notes
            };

            const { data, error } = await supabase
                .from('bookmarks')
                .update(updatedData)
                .eq('id', bookmark.id)
                .select()
                .single();

            if (error) throw error;
            if (onSave) onSave(data);
            onOpenChange(false);
        } catch (error) {
            console.error('Error saving bookmark:', error);
        } finally {
            setSaving(false);
        }
    };

    // Window-level mouse tracking for repulsion effect
    useEffect(() => {
        if (!open) {
            setRepelOffset({ x: 0, y: 0 });
            setShowHint(false);
            return;
        }

        const handleMouseMove = (e) => {
            if (!contentRef.current) return;

            // Skip for reduced motion
            if (prefersReducedMotion) {
                setRepelOffset({ x: 0, y: 0 });
                return;
            }

            const rect = contentRef.current.getBoundingClientRect();
            const mouseX = e.clientX;
            const mouseY = e.clientY;

            // Check if mouse is inside the modal
            const isInside = (
                mouseX >= rect.left &&
                mouseX <= rect.right &&
                mouseY >= rect.top &&
                mouseY <= rect.bottom
            );

            if (isInside) {
                setRepelOffset({ x: 0, y: 0 });
                setShowHint(false);
                return;
            }

            // Mouse is OUTSIDE - calculate repulsion
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;

            // Vector from cursor to card center
            const dx = mouseX - centerX;
            const dy = mouseY - centerY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // Repulsion direction (opposite of cursor direction)
            const repulseX = -(dx / distance);
            const repulseY = -(dy / distance);

            // Fixed offset - same effect anywhere outside the card
            const maxOffset = 12;
            const offsetX = repulseX * maxOffset;
            const offsetY = repulseY * maxOffset;

            setRepelOffset({ x: offsetX, y: offsetY });
            setShowHint(true);
        };

        const handleMouseLeave = () => {
            setRepelOffset({ x: 0, y: 0 });
            setShowHint(false);
        };

        // Add listeners
        window.addEventListener('mousemove', handleMouseMove);
        document.documentElement.addEventListener('mouseleave', handleMouseLeave);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            document.documentElement.removeEventListener('mouseleave', handleMouseLeave);
        };
    }, [open, prefersReducedMotion]);

    if (!bookmark) return null;

    // Check if this is a note-type bookmark (match BookmarkCard logic)
    const isNote = bookmark.type === 'note' ||
        bookmark.url?.startsWith('note://') ||
        bookmark.category === 'Note' ||
        (!bookmark.url && (bookmark.notes || bookmark.title));

    const isWiki = bookmark.url?.includes('wikipedia.org');

    // Recipe detection - check metadata, category, and URL patterns
    const isRecipe = bookmark.metadata?.contentType === 'recipe' ||
        bookmark.metadata?.cookTime !== undefined ||
        bookmark.metadata?.ingredients !== undefined ||
        bookmark.category === 'recipe' ||
        bookmark.subCategory === 'recipe' ||
        bookmark.url?.includes('allrecipes.com') ||
        bookmark.url?.includes('seriouseats.com') ||
        bookmark.url?.includes('epicurious.com') ||
        bookmark.url?.includes('food52.com') ||
        bookmark.url?.includes('bonappetit.com') ||
        bookmark.url?.includes('tasty.co') ||
        bookmark.url?.includes('delish.com') ||
        bookmark.url?.includes('foodnetwork.com') ||
        bookmark.url?.includes('budgetbytes.com') ||
        bookmark.url?.includes('minimalistbaker.com') ||
        bookmark.url?.includes('halfbakedharvest.com') ||
        bookmark.url?.includes('skinnytaste.com') ||
        bookmark.url?.includes('cookieandkate.com') ||
        bookmark.url?.includes('pinchofyum.com') ||
        bookmark.url?.includes('smittenkitchen.com') ||
        bookmark.url?.includes('thekitchn.com') ||
        /\/recipes?\//.test(bookmark.url) ||
        /\/cooking\//.test(bookmark.url);

    const isArticle = bookmark.category === 'Article' ||
        bookmark.subCategory === 'article' ||
        bookmark.subCategory === 'webpage' ||
        (!bookmark.url?.includes('x.com') &&
            !bookmark.url?.includes('twitter.com') &&
            !bookmark.url?.includes('youtube') &&
            !bookmark.url?.includes('wikipedia.org') &&
            !isNote);

    const renderPreview = () => {
        // Note-type bookmarks get the NotePreview (full-width, no sidebar)
        if (isNote) {
            return (
                <NotePreview
                    bookmark={bookmark}
                    notes={formData.notes}
                    onNotesChange={(newNotes) => setFormData(prev => ({ ...prev, notes: newNotes }))}
                    title={formData.title}
                    onTitleChange={(newTitle) => setFormData(prev => ({ ...prev, title: newTitle }))}
                    onSave={handleSave}
                    saving={saving}
                    availableTags={allTags}
                    onClose={() => onOpenChange(false)}
                    onTagClick={onTagClick}
                />
            );
        }

        const type = bookmark.subCategory || bookmark.category;
        if (isWiki) {
            return <WikiPreview bookmark={bookmark} />;
        }
        if (type?.includes('tweet') || bookmark.url?.includes('x.com') || bookmark.url?.includes('twitter.com')) {
            return <TweetPreview bookmark={bookmark} />;
        }
        if (type?.includes('video') || bookmark.url?.includes('youtube')) {
            return <VideoPreview bookmark={bookmark} autoPlay={autoPlay} />;
        }
        // Recipe preview for recipe bookmarks
        if (isRecipe) {
            return <RecipePreview bookmark={bookmark} />;
        }
        // Use ArticlePreview for articles/webpages
        if (isArticle) {
            return <ArticlePreview bookmark={bookmark} />;
        }
        return <DefaultPreview bookmark={bookmark} />;
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            {/* Close hint - subtle text above the modal */}
            <motion.span
                className="fixed left-1/2 -translate-x-1/2 z-[60] text-white/40 text-[11px] tracking-[0.2em] uppercase pointer-events-none select-none"
                initial={{ opacity: 0 }}
                animate={{ opacity: showHint ? 1 : 0 }}
                transition={{ duration: 0.2 }}
                style={{
                    top: 'calc(5vh - 16px)',
                    display: open ? 'block' : 'none',
                }}
            >
                click outside to close
            </motion.span>

            <MotionDialogContent
                ref={contentRef}
                repelOffset={repelOffset}
                hideCloseButton={true}
                className="max-w-none w-[92vw] h-[90vh] max-h-[950px] p-0 overflow-hidden bg-background border-border rounded-2xl"
            >
                {/* For notes: full width, no sidebar. For others: split view */}
                <div className={`h-full overflow-hidden ${isNote ? '' : 'grid grid-cols-1 md:grid-cols-[2fr_1fr]'}`}>

                    {/* Preview - Full width for notes, left side for others */}
                    <div className="h-full overflow-hidden flex flex-col">
                        <div className="flex-1 overflow-y-auto min-h-0">
                            {renderPreview()}
                        </div>
                    </div>

                    {/* Right: Edit Form - Hidden for notes */}
                    {!isNote && (
                        <div ref={formContainerRef} className="p-6 flex flex-col h-full overflow-hidden bg-gruvbox-bg-light/50">
                            <div className="space-y-4 flex-1 flex flex-col min-h-0">
                                {/* Title Input with Link Button */}
                                <div className="relative">
                                    <div className="flex items-start gap-3">
                                        <input
                                            id="title"
                                            type="text"
                                            value={formData.title}
                                            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                                            placeholder={titlePlaceholder}
                                            autoComplete="off"
                                            spellCheck="false"
                                            className="flex-1"
                                            style={{
                                                fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
                                                fontStyle: 'normal',
                                                fontSize: '1.25rem',
                                                fontWeight: 500,
                                                color: '#ebdbb2',
                                                caretColor: '#fabd2f',
                                                background: 'none',
                                                border: 'none',
                                                borderRadius: 0,
                                                outline: 'none',
                                                boxShadow: 'none',
                                                padding: 0,
                                                margin: 0,
                                                width: '100%',
                                                WebkitAppearance: 'none',
                                                MozAppearance: 'none',
                                                appearance: 'none'
                                            }}
                                        />
                                    </div>
                                    {/* Creation date + source link - subtle inline (hide link for notes) */}
                                    <p className="text-xs text-gruvbox-fg-muted mt-3 flex items-center gap-2">
                                        <span>Added {new Date(bookmark.createdAt).toLocaleDateString([], { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                                        {bookmark.url && !bookmark.url.startsWith('note://') && (
                                            <>
                                                <span className="text-gruvbox-bg-lighter">·</span>
                                                {isYoutube ? (
                                                    <a
                                                        href={bookmark.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-white text-[11px] font-medium transition-all hover:shadow-[0_0_12px_rgba(239,68,68,0.5)]"
                                                        style={{ backgroundColor: 'rgb(239, 68, 68)' }}
                                                    >
                                                        YouTube
                                                        <ExternalLink className="w-3 h-3 flex-shrink-0" />
                                                    </a>
                                                ) : (
                                                    <a
                                                        href={bookmark.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1 text-gruvbox-fg-muted hover:text-gruvbox-teal transition-colors"
                                                    >
                                                        <span className="truncate max-w-[150px]">
                                                            {new URL(bookmark.url).hostname.replace('www.', '')}
                                                        </span>
                                                        <ExternalLink className="w-3 h-3 flex-shrink-0" />
                                                    </a>
                                                )}
                                            </>
                                        )}
                                    </p>
                                </div>

                                {/* Metadata Panel removed - stats change daily and won't be dynamic */}

                                {/* Category dropdown - hidden for notes */}
                                {!isNote && (
                                    <div className="space-y-1.5">
                                        <Label htmlFor="category" className="text-gruvbox-fg-muted text-xs uppercase tracking-wider">Category</Label>
                                        <Select
                                            value={formData.category}
                                            onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                                        >
                                            <SelectTrigger className="bg-gruvbox-bg/60 border-gruvbox-bg-lighter/60 text-gruvbox-fg">
                                                <SelectValue placeholder="Select category" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-gruvbox-bg border-gruvbox-bg-lighter">
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
                                )}

                                {/* YouTube Video Description (read-only) - with auto-linked URLs */}
                                {isYoutube && (bookmark.metadata?.videoDescription || bookmark.metadata?.ogDescription) && (
                                    <div className="space-y-1.5">
                                        <Label className="text-gruvbox-fg-muted text-xs uppercase tracking-wider flex items-center gap-2">
                                            Video Description
                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-gruvbox-bg-lighter/50 text-gruvbox-fg-muted/70 font-normal normal-case">
                                                from YouTube
                                            </span>
                                        </Label>
                                        <div className="p-3 rounded-lg bg-gruvbox-bg/40 border border-gruvbox-bg-lighter/40 text-gruvbox-fg-muted text-sm max-h-48 overflow-y-auto">
                                            <YouTubeLinkedText
                                                text={bookmark.metadata.videoDescription || bookmark.metadata.ogDescription}
                                                videoUrl={bookmark.url}
                                                className="leading-relaxed"
                                            />
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <Label className="text-gruvbox-fg-muted text-xs uppercase tracking-wider">Tags</Label>
                                    {/* Tag columns with horizontal scroll */}
                                    <TagColumnsContainer
                                        tags={formData.tags}
                                        onRemoveTag={(idx) => {
                                            const tagsList = formData.tags.split(',').map(t => t.trim()).filter(t => t);
                                            const filtered = tagsList.filter((_, i) => i !== idx);
                                            setFormData(prev => ({ ...prev, tags: filtered.join(', ') }));
                                        }}
                                        onAddTag={(newTag) => {
                                            const currentTags = formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(t => t) : [];
                                            if (!currentTags.includes(newTag)) {
                                                setFormData(prev => ({
                                                    ...prev,
                                                    tags: [...currentTags, newTag].join(', ')
                                                }));
                                            }
                                        }}
                                    />
                                </div>

                                {/* Notes section - hidden for note-type bookmarks since note content is shown in preview */}
                                {!isNote && (
                                    <div ref={notesContainerRef} className="space-y-1.5 flex-1 flex flex-col min-h-0">
                                        <Label htmlFor="notes" className="text-gruvbox-fg-muted text-xs uppercase tracking-wider flex-shrink-0">Notes</Label>
                                        <div className="flex-1 min-h-[120px] w-full rounded-lg border border-gruvbox-bg-lighter/60 bg-gruvbox-bg/60 px-4 py-3 text-sm focus-within:border-gruvbox-yellow/40 transition-colors overflow-auto">
                                            <NotionEditor
                                                value={formData.notes}
                                                onChange={(newNotes) => setFormData(prev => ({ ...prev, notes: newNotes }))}
                                                placeholder="Add notes about this bookmark... Type '/' for commands"
                                                minHeight={100}
                                                availableTags={allTags}
                                                className="notion-notes-editor"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="pt-4 flex justify-end gap-3 border-t border-gruvbox-bg-lighter/40 mt-auto flex-shrink-0">
                                <button
                                    className="px-4 py-2 text-sm font-medium text-gruvbox-fg-muted hover:text-gruvbox-fg transition-colors"
                                    onClick={() => onOpenChange(false)}
                                >
                                    Cancel
                                </button>
                                <div className="creepy-btn-small">
                                    <CreepyButton onClick={handleSave} disabled={saving}>
                                        {saving ? 'Saving...' : 'Save Changes'}
                                    </CreepyButton>
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            </MotionDialogContent>
        </Dialog>
    );
};

export default BookmarkDetail;
