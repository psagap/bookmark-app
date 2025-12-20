import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Loader2, Save } from 'lucide-react';

/**
 * SaveBar - Sticky save indicator bar for the editor modal
 * Shows save state: idle (with changes), saving, saved
 */
const SaveBar = ({ visible, state, onSave }) => {
  // Determine if clickable
  const isClickable = state === 'idle';

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 20, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 40 }}
          onClick={isClickable ? onSave : undefined}
          className={`
            sticky bottom-0 left-0 right-0 py-3.5 px-6
            font-medium text-center rounded-b-2xl
            flex items-center justify-center gap-2
            transition-all duration-300
            ${isClickable
              ? 'cursor-pointer bg-gradient-to-r from-gruvbox-yellow via-gruvbox-orange to-gruvbox-yellow bg-[length:200%_100%] hover:bg-[position:100%_0] text-gruvbox-bg-darkest'
              : state === 'saved'
                ? 'bg-gruvbox-green/90 text-gruvbox-bg-darkest'
                : 'bg-gruvbox-yellow/80 text-gruvbox-bg-darkest'
            }
          `}
        >
          {state === 'idle' && (
            <>
              <span className="text-sm">Press</span>
              <kbd className="px-2 py-0.5 rounded bg-gruvbox-bg-darkest/20 text-xs font-mono">
                ⌘+Enter
              </kbd>
              <span className="text-sm">to save</span>
            </>
          )}

          {state === 'saving' && (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Saving...</span>
            </>
          )}

          {state === 'saved' && (
            <>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 25 }}
              >
                <Check className="w-4 h-4" />
              </motion.div>
              <span className="text-sm">Saved</span>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SaveBar;
