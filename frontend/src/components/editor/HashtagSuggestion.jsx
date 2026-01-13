import { Extension } from '@tiptap/core';
import Suggestion from '@tiptap/suggestion';

// Create the hashtag suggestion extension
// Note: The full suggestion config (items, render) should be passed via options
const HashtagSuggestion = Extension.create({
  name: 'hashtagSuggestion',

  addOptions() {
    return {
      suggestion: {
        char: '#',
        allowSpaces: false,
        startOfLine: false,
        command: ({ editor, range, props }) => {
          // Delete the # and query text
          editor
            .chain()
            .focus()
            .deleteRange(range)
            .run();

          // Call the command handler
          props.command?.({ tag: props.tag });
        },
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ];
  },
});

export default HashtagSuggestion;
