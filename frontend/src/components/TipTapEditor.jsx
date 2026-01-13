import React, { useEffect, useCallback, useRef, useMemo } from 'react';
import { useEditor, EditorContent, ReactRenderer } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Placeholder from '@tiptap/extension-placeholder';
import Image from '@tiptap/extension-image';
import tippy from 'tippy.js';
import 'tippy.js/dist/tippy.css';

import SlashCommandExtension, { slashCommandItems } from './editor/SlashCommandExtension';
import CommandMenu from './editor/CommandMenu';
import HashtagSuggestion from './editor/HashtagSuggestion';
import HashtagMenu from './editor/HashtagMenu';
import './editor/tiptap-styles.css';

/**
 * TipTapEditor - Production-grade rich text editor
 * Built on ProseMirror for rock-solid cursor stability
 */
const TipTapEditor = ({
  content = '',
  onChange,
  onSave,
  placeholder = 'Start writing... Type / for commands, # for tags',
  autoFocus = false,
  editable = true,
  className = '',
  availableTags = [],
  onTagSelect,
}) => {
  const editorRef = useRef(null);
  const availableTagsRef = useRef(availableTags);
  const onTagSelectRef = useRef(onTagSelect);

  // Keep refs in sync
  useEffect(() => {
    availableTagsRef.current = availableTags;
    onTagSelectRef.current = onTagSelect;
  }, [availableTags, onTagSelect]);

  // Configure suggestion (slash commands)
  const slashSuggestion = useMemo(() => ({
    items: ({ query }) => {
      return slashCommandItems.filter((item) =>
        item.title.toLowerCase().startsWith(query.toLowerCase())
      );
    },
    render: () => {
      let component;
      let popup;

      return {
        onStart: (props) => {
          component = new ReactRenderer(CommandMenu, {
            props,
            editor: props.editor,
          });

          if (!props.clientRect) {
            return;
          }

          popup = tippy('body', {
            getReferenceClientRect: props.clientRect,
            appendTo: () => document.body,
            content: component.element,
            showOnCreate: true,
            interactive: true,
            trigger: 'manual',
            placement: 'bottom-start',
            animation: 'shift-toward-subtle',
            theme: 'gruvbox',
          });
        },

        onUpdate: (props) => {
          component?.updateProps(props);

          if (!props.clientRect) {
            return;
          }

          popup?.[0]?.setProps({
            getReferenceClientRect: props.clientRect,
          });
        },

        onKeyDown: (props) => {
          if (props.event.key === 'Escape') {
            popup?.[0]?.hide();
            return true;
          }

          return component?.ref?.onKeyDown(props);
        },

        onExit: () => {
          popup?.[0]?.destroy();
          component?.destroy();
        },
      };
    },
  }), []);

  // Configure hashtag suggestion
  const hashtagSuggestion = useMemo(() => ({
    char: '#',
    allowSpaces: false,
    startOfLine: false,
    items: ({ query }) => {
      // Use ref to get current availableTags
      return availableTagsRef.current || [];
    },
    command: ({ editor, range, props }) => {
      // Delete the # and query text
      editor.chain().focus().deleteRange(range).run();
      // Call the tag select callback via ref
      onTagSelectRef.current?.(props.tag);
    },
    render: () => {
      let component;
      let popup;

      return {
        onStart: (props) => {
          component = new ReactRenderer(HashtagMenu, {
            props: {
              ...props,
              items: availableTagsRef.current || [],
              command: (attrs) => {
                props.command(attrs);
              },
            },
            editor: props.editor,
          });

          if (!props.clientRect) {
            return;
          }

          popup = tippy('body', {
            getReferenceClientRect: props.clientRect,
            appendTo: () => document.body,
            content: component.element,
            showOnCreate: true,
            interactive: true,
            trigger: 'manual',
            placement: 'bottom-start',
            theme: 'gruvbox',
          });
        },

        onUpdate: (props) => {
          component?.updateProps({
            ...props,
            items: availableTagsRef.current || [],
            command: (attrs) => {
              props.command(attrs);
            },
          });

          if (!props.clientRect) {
            return;
          }

          popup?.[0]?.setProps({
            getReferenceClientRect: props.clientRect,
          });
        },

        onKeyDown: (props) => {
          if (props.event.key === 'Escape') {
            popup?.[0]?.hide();
            return true;
          }

          return component?.ref?.onKeyDown(props);
        },

        onExit: () => {
          popup?.[0]?.destroy();
          component?.destroy();
        },
      };
    },
  }), []);

  // Memoize extensions - only recreate when placeholder changes
  const extensions = useMemo(() => [
    StarterKit.configure({
      heading: {
        levels: [1, 2, 3],
      },
      codeBlock: {
        HTMLAttributes: {
          class: 'code-block',
        },
      },
    }),
    TaskList,
    TaskItem.configure({
      nested: true,
      HTMLAttributes: {
        class: 'task-item',
      },
    }),
    Placeholder.configure({
      placeholder,
      emptyEditorClass: 'is-editor-empty',
    }),
    Image.configure({
      inline: false,
      allowBase64: true,
    }),
    SlashCommandExtension.configure({
      suggestion: slashSuggestion,
    }),
    // Temporarily disabled to debug crash
    // HashtagSuggestion.configure({
    //   suggestion: hashtagSuggestion,
    // }),
  ], [placeholder, slashSuggestion]);

  // Initialize editor
  const editor = useEditor({
    extensions,
    content,
    editable,
    autofocus: autoFocus ? 'end' : false,
    editorProps: {
      attributes: {
        class: `tiptap-editor prose-gruvbox ${className}`,
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      const json = editor.getJSON();
      const text = editor.getText();

      onChange?.({
        html,
        json,
        text,
        plainText: text,
      });
    },
  });

  // Update editor content when prop changes
  useEffect(() => {
    if (editor && content && editor.getHTML() !== content) {
      editor.commands.setContent(content, false);
    }
  }, [content, editor]);

  // Handle keyboard shortcuts for save
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Cmd/Ctrl + Enter or Cmd/Ctrl + S to save
      if ((e.metaKey || e.ctrlKey) && (e.key === 'Enter' || e.key === 's')) {
        e.preventDefault();
        onSave?.();
      }
    };

    if (editor) {
      const editorElement = editorRef.current;
      editorElement?.addEventListener('keydown', handleKeyDown);
      return () => editorElement?.removeEventListener('keydown', handleKeyDown);
    }
  }, [editor, onSave]);

  // Focus editor
  const focusEditor = useCallback(() => {
    editor?.chain().focus().run();
  }, [editor]);

  // Expose editor methods
  useEffect(() => {
    if (editor) {
      editorRef.current = editor.view.dom;
    }
  }, [editor]);

  return (
    <div
      ref={editorRef}
      onClick={focusEditor}
      className="tiptap-editor-wrapper min-h-[200px] cursor-text"
    >
      <EditorContent editor={editor} />
    </div>
  );
};

export default TipTapEditor;
