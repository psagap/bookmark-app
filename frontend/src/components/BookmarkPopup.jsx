import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ExternalLink,
  Play,
  Image as ImageIcon,
  FileText,
  BookOpen,
  Pin,
  Trash2,
  Copy,
  Check,
  Download,
  PenLine,
  Calendar,
  HardDrive,
  Maximize,
  Clock,
  Users,
  Flame,
  ChefHat,
  Star,
  CheckCircle2,
  Mic,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getTagColor } from '@/utils/tagColors';
import NoteBlockRenderer from './NoteBlockRenderer';

// X Logo SVG
const XLogo = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

// YouTube Logo SVG
const YouTubeLogo = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

// Recipe URL patterns
const isRecipeUrl = (url) => {
  if (!url) return false;
  const recipeSites = [
    'allrecipes.com', 'seriouseats.com', 'epicurious.com', 'food52.com',
    'bonappetit.com', 'tasty.co', 'delish.com', 'foodnetwork.com',
    'budgetbytes.com', 'minimalistbaker.com', 'halfbakedharvest.com',
    'skinnytaste.com', 'cookieandkate.com', 'pinchofyum.com',
    'smittenkitchen.com', 'thekitchn.com', 'simplyrecipes.com',
    'food.com', 'yummly.com', 'bettycrocker.com', 'pillsbury.com',
    'tasteofhome.com', 'eatingwell.com', 'cooking.nytimes.com',
    'recipetineats.com', 'damndelicious.net', 'gimmesomeoven.com',
    'cookingclassy.com', 'therecipecritic.com'
  ];
  if (recipeSites.some(site => url.includes(site))) return true;
  if (/\/recipes?\//.test(url) || /\/cooking\//.test(url)) return true;
  return false;
};

// Get content type info
const getContentType = (bookmark) => {
  const { url, type, thumbnail, metadata } = bookmark;

  // Audio/Voice notes - check FIRST before other types
  if (type === 'audio-note' || bookmark.subCategory === 'audio-note') {
    return { type: 'audio-note', icon: Mic, label: 'Voice Note', color: 'text-amber-500' };
  }

  if (type === 'note' || url?.startsWith('note://') || (!url && bookmark.notes)) {
    return { type: 'note', icon: PenLine, label: 'Note', color: 'text-amber-500' };
  }
  if (url?.includes('youtube.com') || url?.includes('youtu.be')) {
    return { type: 'video', icon: YouTubeLogo, label: 'YouTube', color: 'text-red-500' };
  }
  if (url?.includes('twitter.com') || url?.includes('x.com')) {
    return { type: 'tweet', icon: XLogo, label: 'X Post', color: 'text-white' };
  }

  // Recipe detection - check BEFORE image detection
  if (metadata?.contentType === 'recipe' ||
      metadata?.cookTime !== undefined ||
      metadata?.ingredients !== undefined ||
      isRecipeUrl(url)) {
    return { type: 'recipe', icon: BookOpen, label: 'Recipe', color: 'text-red-400' };
  }

  // Robust image/media detection
  const imageRegex = /\.(jpg|jpeg|png|gif|webp|svg|avif|bmp|ico|tiff)(\?|$|\/)/i;
  const videoRegex = /\.(mp4|webm|mov|m4v)(\?|$|\/)/i;
  const isSupabaseStorage = url?.includes('supabase.co/storage') || thumbnail?.includes('supabase.co/storage');

  if (type === 'image' || isSupabaseStorage || imageRegex.test(url) || imageRegex.test(thumbnail) || videoRegex.test(url) || videoRegex.test(thumbnail)) {
    const isVideoFile = videoRegex.test(url) || videoRegex.test(thumbnail);
    return {
      type: 'image',
      icon: isVideoFile ? Play : ImageIcon,
      label: isVideoFile ? 'Video' : 'Image',
      color: 'text-violet-400'
    };
  }

  return { type: 'article', icon: BookOpen, label: 'Article', color: 'text-blue-400' };
};

// Get domain from URL
const getDomain = (url) => {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return '';
  }
};

// Format date - full format
const formatDate = (dateString) => {
  if (!dateString) return '';
  const d = new Date(dateString);
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

// Format file size - exactly like the card
const formatFileSize = (bytes) => {
  if (!bytes) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// YouTube Channel Name - fetch from oEmbed like the card does
const YouTubeChannelName = ({ videoUrl }) => {
  const [channelName, setChannelName] = useState(null);

  useEffect(() => {
    const fetchChannelName = async () => {
      try {
        const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(videoUrl)}&format=json`;
        const response = await fetch(oembedUrl);
        if (response.ok) {
          const data = await response.json();
          if (data.author_name) {
            setChannelName(data.author_name);
          }
        }
      } catch (err) {
        // Silently fail
      }
    };
    fetchChannelName();
  }, [videoUrl]);

  if (!channelName) return null;

  return (
    <p className="text-sm text-white/50">
      Channel: <span className="text-white/70 font-medium">{channelName}</span>
    </p>
  );
};

// YouTube Video Player - constrained to fit in popup
const YouTubePlayer = ({ bookmark }) => {
  const [isPlaying, setIsPlaying] = useState(false);

  const getVideoId = (url) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url?.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const videoId = getVideoId(bookmark.url);
  if (!videoId) return null;

  if (isPlaying) {
    return (
      <div className="relative w-full max-h-[50vh] aspect-video rounded-xl overflow-hidden bg-black">
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
          title={bookmark.title}
          className="absolute inset-0 w-full h-full"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <button
      onClick={() => setIsPlaying(true)}
      className="relative w-full max-h-[50vh] aspect-video rounded-xl overflow-hidden bg-black group focus:outline-none"
    >
      <img
        src={`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`}
        alt=""
        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
        onError={(e) => {
          e.target.src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
        }}
      />
      <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition-colors" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center shadow-2xl transform group-hover:scale-110 transition-transform">
          <Play className="w-7 h-7 text-white fill-white ml-1" />
        </div>
      </div>
    </button>
  );
};

// Embedded Tweet Card - styled like native Twitter embed
const TweetEmbedCard = ({ tweetUrl, tweetText, authorName, authorHandle, metadata }) => {
  const [tweetData, setTweetData] = useState(null);
  const [loading, setLoading] = useState(true);
  const videoRef = useRef(null);

  useEffect(() => {
    const fetchTweetData = async () => {
      try {
        const response = await fetch(`/api/twitter/video?url=${encodeURIComponent(tweetUrl)}`);
        const data = await response.json();
        if (data.success) {
          setTweetData(data);
        }
      } catch (err) {
        console.warn('FxTwitter fetch failed:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchTweetData();
  }, [tweetUrl]);

  useEffect(() => {
    if (videoRef.current && tweetData?.videoUrl) {
      videoRef.current.muted = true;
      videoRef.current.play().catch(() => {});
    }
  }, [tweetData?.videoUrl]);

  const displayName = tweetData?.authorName || authorName || 'Unknown';
  const handle = tweetData?.authorHandle || authorHandle || '';
  const profilePic = tweetData?.authorAvatar || metadata?.tweetData?.authorAvatar;
  const text = tweetData?.tweetText || tweetText || '';
  const hasMedia = !loading && tweetData && (tweetData.videoUrl || tweetData.photos?.length > 0 || tweetData.thumbnail);

  return (
    <div className="w-full flex justify-center">
      <div className="w-full max-w-[400px] rounded-2xl bg-[#16181c] border border-white/10 overflow-hidden">
        {/* X Logo - top left */}
        <div className="px-4 pt-4 pb-2">
          <XLogo className="w-5 h-5 text-white/60" />
        </div>

        {/* Profile row */}
        <div className="px-4 flex items-center gap-3">
          {profilePic ? (
            <img src={profilePic} alt={displayName} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-violet-500/30 flex items-center justify-center flex-shrink-0">
              <span className="text-base font-semibold text-violet-300">{displayName.charAt(0).toUpperCase()}</span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-white text-sm truncate">{displayName}</p>
            {handle && <p className="text-xs text-white/50">@{handle.replace(/^@/, '')}</p>}
          </div>
        </div>

        {/* Tweet Text */}
        {text && (
          <div className="px-4 mt-3">
            <p className="text-[15px] leading-[1.7] text-white/90 whitespace-pre-wrap">{text}</p>
          </div>
        )}

        {/* Media */}
        {hasMedia && (
          <div className="mt-3 px-4">
            {tweetData.videoUrl ? (
              <div className="rounded-xl overflow-hidden bg-black">
                <video
                  ref={videoRef}
                  src={tweetData.videoUrl}
                  poster={tweetData.thumbnail}
                  autoPlay
                  muted
                  loop
                  playsInline
                  controls
                  className="w-full h-auto max-h-[40vh] object-contain"
                />
              </div>
            ) : tweetData.photos?.length > 0 ? (
              <div className="rounded-xl overflow-hidden">
                <img src={tweetData.photos[0].url} alt="" className="w-full h-auto max-h-[40vh] object-contain" />
              </div>
            ) : tweetData.thumbnail ? (
              <div className="rounded-xl overflow-hidden">
                <img src={tweetData.thumbnail} alt="" className="w-full h-auto max-h-[40vh] object-contain" />
              </div>
            ) : null}
          </div>
        )}

        {/* Read more link */}
        <div className="p-4 mt-3 border-t border-white/10">
          <a
            href={tweetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full text-center py-2 rounded-full border border-white/20 text-sm text-white/60 hover:text-white hover:border-white/40 transition-colors"
          >
            Read more on X
          </a>
        </div>
      </div>
    </div>
  );
};

// Image/Video/GIF Media Display
// Uses same URL priority as ImageBookmarkCard: thumbnail || url
// Constrains height to fit in viewport without scrolling
const MediaDisplay = ({ bookmark }) => {
  const [imageError, setImageError] = useState(false);

  // IMPORTANT: Match ImageBookmarkCard - prefer thumbnail, fall back to url
  const primaryUrl = bookmark.thumbnail || bookmark.url;
  const fallbackUrl = bookmark.url || bookmark.thumbnail;

  // Check if video
  const videoRegex = /\.(mp4|webm|mov|m4v)(\?|$|\/)/i;
  const isVideo = videoRegex.test(primaryUrl) || videoRegex.test(fallbackUrl);
  const videoSrc = isVideo ? (videoRegex.test(primaryUrl) ? primaryUrl : fallbackUrl) : null;

  // Check if GIF - GIFs should use <img> to animate
  const isGif = /\.gif(\?|$|\/)/i.test(primaryUrl) || /\.gif(\?|$|\/)/i.test(fallbackUrl);

  // Max height to fit in popup without scrolling (accounts for header, footer, metadata)
  const maxHeight = "max-h-[60vh]";

  if (isVideo && videoSrc) {
    return (
      <div className="w-full rounded-xl overflow-hidden bg-black flex items-center justify-center">
        <video
          src={videoSrc}
          autoPlay
          loop
          muted
          playsInline
          controls
          className={cn("w-auto h-auto max-w-full", maxHeight, "object-contain")}
        />
      </div>
    );
  }

  // For images and GIFs - constrain height for portrait images
  const imgSrc = imageError ? fallbackUrl : primaryUrl;

  return (
    <div className="w-full rounded-xl overflow-hidden bg-black/20 flex items-center justify-center">
      <img
        src={imgSrc}
        alt={bookmark.title || 'Media'}
        className={cn("w-auto h-auto max-w-full", maxHeight, "object-contain")}
        onError={() => {
          if (!imageError && fallbackUrl && fallbackUrl !== primaryUrl) {
            setImageError(true);
          }
        }}
      />
    </div>
  );
};

// Recipe Display - shows full recipe with ingredients and instructions
const RecipeDisplay = ({ bookmark }) => {
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
  const cuisine = metadata.cuisine;

  // Get domain
  const getDomain = (url) => {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return '';
    }
  };
  const domain = getDomain(url);

  const primaryTime = totalTime || cookTime;

  // Parse instruction text
  const parseInstruction = (instruction) => {
    if (typeof instruction === 'string') return instruction;
    if (instruction?.text) return instruction.text;
    if (instruction?.['@type'] === 'HowToStep') return instruction.text || instruction.name || '';
    return JSON.stringify(instruction);
  };

  return (
    <div className="space-y-5">
      {/* Title */}
      <h2 className="text-xl font-semibold text-white leading-tight">
        {title}
      </h2>

      {/* Hero Image */}
      {thumbnail && (
        <div className="relative w-full rounded-xl overflow-hidden max-h-[40vh]">
          <img
            src={thumbnail}
            alt={title}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Quick metadata pills */}
      <div className="flex flex-wrap gap-2">
        {primaryTime && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-900/30 border border-red-900/40 text-white">
            <Clock className="w-3.5 h-3.5 text-red-400" />
            <span className="text-xs font-medium">{primaryTime}</span>
          </div>
        )}
        {servings && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-white">
            <Users className="w-3.5 h-3.5 text-white/60" />
            <span className="text-xs">{servings}</span>
          </div>
        )}
        {calories && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-white">
            <Flame className="w-3.5 h-3.5 text-orange-400" />
            <span className="text-xs">{calories}</span>
          </div>
        )}
        {rating && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-white">
            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            <span className="text-xs">{rating.toFixed(1)}</span>
            {ratingCount && <span className="text-xs text-white/40">({ratingCount})</span>}
          </div>
        )}
      </div>

      {/* Ingredients Section */}
      {ingredients.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-red-300 flex items-center gap-2">
            <ChefHat className="w-4 h-4" />
            Ingredients ({ingredients.length})
          </h3>
          <div className="grid grid-cols-1 gap-1.5">
            {ingredients.map((ingredient, index) => (
              <div
                key={index}
                className="flex items-start gap-2 p-2 rounded-lg bg-white/[0.03] border border-white/5 text-sm text-white/80"
              >
                <div className="w-4 h-4 rounded-full border border-red-900/50 flex-shrink-0 mt-0.5" />
                <span>{ingredient}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Instructions Section */}
      {instructions.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-red-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Instructions ({instructions.length} steps)
          </h3>
          <div className="space-y-2">
            {instructions.map((instruction, index) => (
              <div
                key={index}
                className="flex gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5"
              >
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-red-900/40 text-red-300 text-xs font-bold flex items-center justify-center">
                  {index + 1}
                </span>
                <p className="text-sm text-white/80 leading-relaxed flex-1">
                  {parseInstruction(instruction)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No recipe data fallback */}
      {ingredients.length === 0 && instructions.length === 0 && (
        <div className="text-center py-8">
          <ChefHat className="w-12 h-12 text-red-400/30 mx-auto mb-3" />
          <p className="text-white/40 text-sm">
            Recipe details not available.
          </p>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-red-400 hover:text-red-300 text-sm underline mt-2 inline-block"
          >
            View on {domain}
          </a>
        </div>
      )}
    </div>
  );
};

// Action Button
const ActionButton = ({ icon: Icon, label, active, danger, onClick }) => (
  <button
    onClick={onClick}
    className={cn(
      "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
      "hover:bg-white/10",
      active && "text-amber-400 bg-amber-500/10",
      danger && "text-red-400 hover:bg-red-500/20 hover:text-red-300"
    )}
  >
    <Icon className={cn("w-4 h-4", active && "fill-current")} />
    <span>{label}</span>
  </button>
);

// Metadata Row Component - consistent display
const MetadataItem = ({ icon: Icon, label, value, className }) => {
  if (!value) return null;
  return (
    <div className={cn("flex items-center gap-2 text-sm", className)}>
      <Icon className="w-4 h-4 text-white/40" />
      <span className="text-white/50">{label}:</span>
      <span className="text-white/80 font-medium">{value}</span>
    </div>
  );
};

// Main Popup Component
const BookmarkPopup = ({
  bookmark,
  isOpen,
  onClose,
  onDelete,
  onPin,
  onTagClick,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (bookmark?.url) {
      await navigator.clipboard.writeText(bookmark.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    // Use same URL priority as display
    const downloadUrl = bookmark?.thumbnail || bookmark?.url;
    if (downloadUrl) {
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = bookmark.title || 'download';
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  if (!bookmark) return null;

  const contentType = getContentType(bookmark);
  const ContentIcon = contentType.icon;
  const tags = bookmark.tags || [];
  const metadata = bookmark.metadata || {};

  // Clean title - same as cards
  const title = bookmark.title?.replace(/^\(\d+\)\s*/, '').replace(/ - YouTube$/, '').trim() || 'Untitled';

  // Domain
  const domain = bookmark.url ? getDomain(bookmark.url) : null;

  // Note content - prefer HTML for rich text rendering
  const noteContent = bookmark.notesHtml || bookmark.notes || bookmark.noteContent || '';

  // Tweet data - same extraction as card
  const tweetData = metadata?.tweetData;
  let tweetText = '';
  if (contentType.type === 'tweet') {
    tweetText = tweetData?.tweetText || title || '';
    const titleMatch = tweetText.match(/on X: [""](.+)[""] \/ X$/);
    if (titleMatch) tweetText = titleMatch[1];
    tweetText = tweetText.replace(/https?:\/\/t\.co\/\w+/g, '').replace(/\s+/g, ' ').trim();
  }
  const tweetAuthor = tweetData?.authorName || tweetData?.authorHandle?.replace(/^@/, '') ||
    bookmark.url?.match(/(?:twitter|x)\.com\/(@?\w+)\/status/)?.[1]?.replace(/^@/, '');

  // Image/Video metadata - EXACTLY like ImageBookmarkCard
  const imageWidth = metadata?.width;
  const imageHeight = metadata?.height;
  const fileSize = formatFileSize(metadata?.fileSize);

  // Article description
  const description = metadata?.ogDescription || metadata?.description;

  // Content type detection
  const isYouTube = bookmark.url?.includes('youtube.com') || bookmark.url?.includes('youtu.be');
  const isTweet = bookmark.url?.includes('twitter.com') || bookmark.url?.includes('x.com');
  const isNote = contentType.type === 'note';
  const isRecipe = contentType.type === 'recipe';

  // Image detection - more robust (exclude recipes)
  const imageRegex = /\.(jpg|jpeg|png|gif|webp|svg|avif|bmp|ico|tiff)(\?|$|\/)/i;
  const videoRegex = /\.(mp4|webm|mov|m4v)(\?|$|\/)/i;
  const isSupabaseStorage = bookmark.url?.includes('supabase.co/storage') || bookmark.thumbnail?.includes('supabase.co/storage');
  const hasMediaExtension = imageRegex.test(bookmark.url) || imageRegex.test(bookmark.thumbnail) ||
                           videoRegex.test(bookmark.url) || videoRegex.test(bookmark.thumbnail);
  const isMediaType = !isYouTube && !isTweet && !isNote && !isRecipe && (
    bookmark.type === 'image' || isSupabaseStorage || hasMediaExtension
  );

  // Article with thumbnail (not a direct media file)
  const isArticleWithThumbnail = !isYouTube && !isTweet && !isMediaType && !isNote && !isRecipe && bookmark.thumbnail;

  // Determine modal size based on content type
  const isWideContent = isMediaType || isYouTube || isTweet || isRecipe;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className={cn(
          // Reset default max-w-lg and set custom sizing
          "!max-w-none w-[95vw] max-h-[90vh] overflow-y-auto p-0 gap-0",
          "bg-[#0a0a0c] border-white/10",
          "rounded-2xl",
          // Responsive width - wider for media, narrower for text
          isWideContent
            ? "sm:w-[90vw] md:w-[80vw] lg:w-[900px] xl:w-[1000px]"
            : "sm:w-[550px]"
        )}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center gap-3 px-5 py-4 border-b border-white/10 bg-[#0a0a0c]">
          <ContentIcon className={cn("w-5 h-5", contentType.color)} />
          <span className="text-sm font-medium text-white/70">{contentType.label}</span>
          {domain && contentType.type !== 'note' && (
            <>
              <span className="text-white/30">•</span>
              <span className="text-sm text-white/50 truncate">{domain}</span>
            </>
          )}
        </div>

        {/* Tweet Embed Card - full embedded style */}
        {isTweet && (
          <div className="px-5 pt-4">
            <TweetEmbedCard
              tweetUrl={bookmark.url}
              tweetText={tweetText}
              authorName={tweetAuthor}
              authorHandle={tweetAuthor}
              metadata={metadata}
            />
          </div>
        )}

        {/* Media Section - for non-tweet content */}
        {!isTweet && !isRecipe && (
          <div className="px-5 pt-4">
            {isYouTube && <YouTubePlayer bookmark={bookmark} />}
            {isMediaType && <MediaDisplay bookmark={bookmark} />}
            {isArticleWithThumbnail && (
              <div className="w-full rounded-xl overflow-hidden flex items-center justify-center">
                <img src={bookmark.thumbnail} alt="" className="w-auto h-auto max-w-full max-h-[50vh] object-contain" />
              </div>
            )}
          </div>
        )}

        {/* Recipe Section */}
        {isRecipe && (
          <div className="px-5 pt-4">
            <RecipeDisplay bookmark={bookmark} />
          </div>
        )}

        {/* Content Section - for non-tweet content */}
        <div className={cn("px-5 py-5 space-y-4", isTweet && "pt-2")}>
          {/* Title - for non-tweet, non-note, non-recipe content (recipes show title in RecipeDisplay) */}
          {!isNote && !isRecipe && contentType.type !== 'tweet' && (
            <DialogHeader className="space-y-0">
              <DialogTitle className="text-lg font-semibold leading-relaxed text-white/95">
                {title}
              </DialogTitle>
            </DialogHeader>
          )}

          {/* Note Content */}
          {isNote && noteContent && (
            <div className="text-[15px] leading-relaxed text-white/85">
              <NoteBlockRenderer content={noteContent} compact={false} />
            </div>
          )}

          {/* YouTube Channel */}
          {isYouTube && <YouTubeChannelName videoUrl={bookmark.url} />}

          {/* Article Description */}
          {contentType.type === 'article' && description && (
            <p className="text-sm text-white/60 leading-relaxed">
              {description}
            </p>
          )}

          {/* Metadata Section - for non-tweet content */}
          {contentType.type !== 'tweet' && (
            <div className="space-y-2 pt-2 border-t border-white/10">
              <MetadataItem
                icon={Calendar}
                label="Added"
                value={formatDate(bookmark.createdAt)}
              />

              {/* File size - for images/videos */}
              {fileSize && (
                <MetadataItem
                  icon={HardDrive}
                  label="Size"
                  value={fileSize}
                />
              )}

              {/* Dimensions - for images/videos */}
              {imageWidth && imageHeight && (
                <MetadataItem
                  icon={Maximize}
                  label="Dimensions"
                  value={`${imageWidth} × ${imageHeight}`}
                />
              )}

              {/* Pinned status */}
              {bookmark.pinned && (
                <div className="flex items-center gap-2 text-sm text-amber-400">
                  <Pin className="w-4 h-4 fill-current" />
                  <span>Pinned</span>
                </div>
              )}
            </div>
          )}

          {/* Tweet minimal metadata */}
          {contentType.type === 'tweet' && bookmark.pinned && (
            <div className="flex items-center gap-2 text-sm text-amber-400 pt-2">
              <Pin className="w-4 h-4 fill-current" />
              <span>Pinned</span>
            </div>
          )}

          {/* Tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {tags.map((tag) => {
                const color = getTagColor(tag);
                return (
                  <button
                    key={tag}
                    onClick={() => onTagClick?.(tag)}
                    className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80 active:scale-95"
                    style={{
                      backgroundColor: color.bg,
                      color: color.text,
                    }}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Actions Footer */}
        <div className="sticky bottom-0 flex items-center justify-between px-5 py-4 border-t border-white/10 bg-[#0a0a0c]">
          <div className="flex items-center gap-1">
            <ActionButton
              icon={Pin}
              label={bookmark.pinned ? "Unpin" : "Pin"}
              active={bookmark.pinned}
              onClick={() => onPin?.(bookmark)}
            />
            {bookmark.url && !bookmark.url.startsWith('note://') && (
              <ActionButton
                icon={copied ? Check : Copy}
                label={copied ? "Copied!" : "Copy"}
                onClick={handleCopy}
              />
            )}
            {isMediaType && (
              <ActionButton
                icon={Download}
                label="Download"
                onClick={handleDownload}
              />
            )}
            <ActionButton
              icon={Trash2}
              label="Delete"
              danger
              onClick={() => onDelete?.(bookmark)}
            />
          </div>

          {bookmark.url && !bookmark.url.startsWith('note://') && (
            <a
              href={bookmark.url}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2 rounded-lg",
                "bg-white/10 hover:bg-white/15",
                "text-sm font-medium text-white",
                "transition-colors"
              )}
            >
              Open
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BookmarkPopup;
