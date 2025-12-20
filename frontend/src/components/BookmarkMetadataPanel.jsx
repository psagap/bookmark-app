import React from 'react';
import { 
    Play, 
    User, 
    Calendar, 
    Clock, 
    Eye, 
    ThumbsUp, 
    MessageCircle,
    Globe,
    Tag,
    FileText,
    Hash,
    AtSign,
    Repeat,
    Heart,
    BookOpen,
    Layers
} from 'lucide-react';

// Helper to format numbers with K/M suffixes
const formatCount = (count) => {
    if (!count) return null;
    const num = parseInt(count);
    if (isNaN(num)) return count;
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
};

// Helper to format date
const formatDate = (dateString) => {
    if (!dateString) return null;
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    } catch {
        return null;
    }
};

// Individual metadata row component
const MetadataRow = ({ icon: Icon, label, value, className = '' }) => {
    if (!value) return null;
    return (
        <div className={`flex items-center gap-2 text-sm ${className}`}>
            <Icon className="w-3.5 h-3.5 text-gruvbox-fg-muted/70 flex-shrink-0" />
            <span className="text-gruvbox-fg-muted/70">{label}:</span>
            <span className="text-gruvbox-fg truncate">{value}</span>
        </div>
    );
};

// YouTube metadata panel
const YouTubeMetadata = ({ metadata }) => {
    if (!metadata) return null;
    
    return (
        <div className="space-y-2">
            <MetadataRow icon={User} label="Channel" value={metadata.channelTitle} />
            <MetadataRow icon={Calendar} label="Published" value={formatDate(metadata.publishedAt)} />
            <MetadataRow icon={Clock} label="Duration" value={metadata.duration} />
            <MetadataRow icon={Eye} label="Views" value={formatCount(metadata.viewCount)} />
            <MetadataRow icon={ThumbsUp} label="Likes" value={formatCount(metadata.likeCount)} />
            <MetadataRow icon={MessageCircle} label="Comments" value={formatCount(metadata.commentCount)} />
        </div>
    );
};

// Twitter/X metadata panel
const TwitterMetadata = ({ metadata }) => {
    const tweetData = metadata?.tweetData;
    if (!tweetData) return null;
    
    return (
        <div className="space-y-2">
            <MetadataRow icon={User} label="Author" value={tweetData.authorName} />
            <MetadataRow icon={AtSign} label="Handle" value={tweetData.authorHandle} />
            <MetadataRow icon={Calendar} label="Posted" value={formatDate(tweetData.tweetDate)} />
            <MetadataRow icon={Eye} label="Views" value={tweetData.viewCount} />
            {tweetData.isThread && (
                <MetadataRow icon={Layers} label="Type" value="Thread" />
            )}
        </div>
    );
};

// Wikipedia metadata panel
const WikipediaMetadata = ({ metadata }) => {
    const wikiData = metadata?.wikipediaData;
    if (!wikiData) return null;
    
    const categoryCount = wikiData.categories?.length || 0;
    
    return (
        <div className="space-y-2">
            {wikiData.description && (
                <MetadataRow icon={FileText} label="Type" value={wikiData.description} />
            )}
            {categoryCount > 0 && (
                <MetadataRow icon={Tag} label="Categories" value={`${categoryCount} categories`} />
            )}
            {wikiData.lang && (
                <MetadataRow icon={Globe} label="Language" value={wikiData.lang.toUpperCase()} />
            )}
        </div>
    );
};

// Article/Webpage metadata panel
const ArticleMetadata = ({ metadata, bookmark }) => {
    return (
        <div className="space-y-2">
            {metadata?.siteName && (
                <MetadataRow icon={Globe} label="Source" value={metadata.siteName} />
            )}
            {metadata?.author && (
                <MetadataRow icon={User} label="Author" value={metadata.author} />
            )}
            {metadata?.publishedDate && (
                <MetadataRow icon={Calendar} label="Published" value={formatDate(metadata.publishedDate)} />
            )}
            {bookmark?.category && (
                <MetadataRow icon={Tag} label="Category" value={bookmark.category} />
            )}
        </div>
    );
};

// Image metadata panel (for OCR text preview)
const ImageMetadata = ({ metadata }) => {
    if (!metadata?.ocrText) return null;
    
    return (
        <div className="space-y-2">
            <div className="flex items-start gap-2 text-sm">
                <FileText className="w-3.5 h-3.5 text-gruvbox-fg-muted/70 flex-shrink-0 mt-0.5" />
                <div>
                    <span className="text-gruvbox-fg-muted/70">OCR Text:</span>
                    <p className="text-gruvbox-fg text-xs mt-1 line-clamp-3 leading-relaxed">
                        {metadata.ocrText}
                    </p>
                </div>
            </div>
        </div>
    );
};

// Helper to determine bookmark type
const getBookmarkType = (bookmark) => {
    const url = bookmark?.url || '';
    if (bookmark?.type === 'note' || url.startsWith('note://') || (!url && (bookmark?.notes || bookmark?.title))) {
        return 'note';
    }
    if (url.includes('twitter.com') || url.includes('x.com')) {
        return 'twitter';
    }
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
        return 'youtube';
    }
    if (url.includes('wikipedia.org')) {
        return 'wikipedia';
    }
    if (bookmark?.type === 'image' || /\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i.test(url)) {
        return 'image';
    }
    return 'article';
};

/**
 * BookmarkMetadataPanel - Shows type-specific metadata for bookmarks
 * 
 * @param {Object} bookmark - The bookmark object
 * @param {string} className - Additional CSS classes
 */
const BookmarkMetadataPanel = ({ bookmark, className = '' }) => {
    if (!bookmark) return null;
    
    const type = getBookmarkType(bookmark);
    const metadata = bookmark.metadata || {};
    
    // Check if there's any metadata to show
    const hasYouTubeData = type === 'youtube' && (metadata.channelTitle || metadata.duration || metadata.viewCount);
    const hasTwitterData = type === 'twitter' && metadata.tweetData;
    const hasWikiData = type === 'wikipedia' && metadata.wikipediaData;
    const hasArticleData = type === 'article' && (metadata.siteName || metadata.author || metadata.publishedDate);
    const hasImageData = type === 'image' && metadata.ocrText;
    
    const hasData = hasYouTubeData || hasTwitterData || hasWikiData || hasArticleData || hasImageData;
    
    if (!hasData) return null;
    
    return (
        <div className={`rounded-lg bg-gruvbox-bg/40 border border-gruvbox-bg-lighter/40 p-3 ${className}`}>
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gruvbox-bg-lighter/30">
                <BookOpen className="w-3.5 h-3.5 text-gruvbox-fg-muted/70" />
                <span className="text-xs uppercase tracking-wider text-gruvbox-fg-muted/70 font-medium">
                    Metadata
                </span>
            </div>
            
            {type === 'youtube' && <YouTubeMetadata metadata={metadata} />}
            {type === 'twitter' && <TwitterMetadata metadata={metadata} />}
            {type === 'wikipedia' && <WikipediaMetadata metadata={metadata} />}
            {type === 'article' && <ArticleMetadata metadata={metadata} bookmark={bookmark} />}
            {type === 'image' && <ImageMetadata metadata={metadata} />}
        </div>
    );
};

export default BookmarkMetadataPanel;



