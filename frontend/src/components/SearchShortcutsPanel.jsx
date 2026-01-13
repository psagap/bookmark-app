import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * SearchShortcutsPanel - Shows search shortcuts and syntax help
 * "Shortcuts to rule your mind" design
 */

// Search syntax help data
const REFINE_RESULTS = [
  {
    description: 'Press ENTER after a keyword to create a deep search.',
    keys: ['SHOE', '+', 'RED']
  },
  {
    description: 'Search for objects inside images',
    keys: ['object: CAR']
  },
  {
    description: 'OR Search',
    keys: ['cats || dogs']
  },
  {
    description: 'Search for text within images or inside notes',
    keys: ['text: CAR']
  },
  {
    description: 'Search by card type',
    chips: ['ARTICLES', 'WEBSITES', 'NOTES', 'SNIPPETS']
  },
  {
    description: 'Search files by format',
    keys: ['format: PDF']
  },
  {
    description: 'Search by date',
    chips: ['YESTERDAY', 'LAST WEEK', 'MAY 19TH']
  },
  {
    description: 'Exclude something from the search results',
    keys: ['SHOE', '+', '-RED']
  },
  {
    description: 'To find an exact match (text or text in images)',
    keys: ['"SHOES"']
  },
  {
    description: 'Filter results by a specific website',
    keys: ['site: YOUTUBE']
  },
  {
    description: 'Filter results by a specific tag',
    keys: ['tag: NAMEOFTAG']
  },
];

const GLOBAL_SHORTCUTS = [
  { description: 'Shortcut to create a new note', keys: ['N'] },
  { description: 'Saves note as a new card', keys: ['⌘', '+', 'ENTER'] },
  { description: 'Exit a card view', keys: ['ESC'] },
  { description: 'Focus on the search field', keys: ['ENTER'] },
];

const SearchShortcutsPanel = ({ isVisible, onClose }) => {
  if (!isVisible) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="absolute left-1/2 -translate-x-1/2 top-full mt-4 z-[100] w-full max-w-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Main Panel */}
          <div className="relative rounded-2xl overflow-hidden shadow-2xl">
            {/* Aurora gradient background effect */}
            <div className="absolute inset-0 bg-[#0d0d0f]" />
            <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-purple-900/20 via-pink-900/10 to-transparent" />
            <div className="absolute top-0 left-1/4 w-1/2 h-24 bg-gradient-to-r from-purple-600/10 via-pink-500/10 to-cyan-500/10 blur-2xl" />

            {/* Content */}
            <div className="relative z-10 px-10 py-10">
              {/* Title */}
              <h2 className="text-[32px] leading-tight font-serif text-white mb-8">
                Shortcuts to<br />
                rule your mind
              </h2>

              {/* Refine Your Search Results */}
              <div className="mb-8">
                <h3 className="text-[11px] font-semibold tracking-[0.15em] text-orange-500 uppercase mb-5">
                  Refine Your Search Results
                </h3>
                <div className="space-y-0">
                  {REFINE_RESULTS.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between py-3 border-b border-white/[0.06] last:border-0"
                    >
                      <span className="text-[14px] text-zinc-400 flex-1 pr-6">
                        {item.description}
                      </span>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {item.chips ? (
                          // Render as chips (card types, dates)
                          item.chips.map((chip, i) => (
                            <span
                              key={i}
                              className="px-3 py-1.5 rounded-lg bg-zinc-800/80 text-[12px] font-medium text-zinc-200 border border-zinc-700/50"
                            >
                              {chip}
                            </span>
                          ))
                        ) : (
                          // Render as keys
                          item.keys.map((key, i) => (
                            key === '+' ? (
                              <span key={i} className="text-zinc-500 text-sm px-1">+</span>
                            ) : (
                              <span
                                key={i}
                                className="px-3 py-1.5 rounded-lg bg-zinc-800/80 text-[12px] font-medium text-zinc-200 border border-zinc-700/50"
                              >
                                {key}
                              </span>
                            )
                          ))
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Global Shortcuts */}
              <div>
                <h3 className="text-[11px] font-semibold tracking-[0.15em] text-orange-500 uppercase mb-5">
                  Global Shortcuts
                </h3>
                <div className="space-y-0">
                  {GLOBAL_SHORTCUTS.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between py-3 border-b border-white/[0.06] last:border-0"
                    >
                      <span className="text-[14px] text-zinc-400 flex-1 pr-6">
                        {item.description}
                      </span>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {item.keys.map((key, i) => (
                          key === '+' ? (
                            <span key={i} className="text-zinc-500 text-sm px-1">+</span>
                          ) : (
                            <kbd
                              key={i}
                              className="min-w-[36px] h-8 px-3 flex items-center justify-center rounded-lg bg-zinc-800/80 text-[12px] font-medium text-zinc-200 border border-zinc-700/50"
                            >
                              {key}
                            </kbd>
                          )
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SearchShortcutsPanel;
