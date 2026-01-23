import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import NoteEditorModal from '../NoteEditorModal';

// Mock dependencies
vi.mock('@/lib/utils', () => ({
  cn: (...classes) => classes.filter(Boolean).join(' '),
}));

vi.mock('../LexicalNoteEditor', () => ({
  default: ({ onContentChange, placeholder, className }) => (
    <div data-testid="lexical-editor" className={className}>
      <textarea
        data-testid="editor-textarea"
        placeholder={placeholder}
        onChange={(e) => onContentChange?.({ html: e.target.value, text: e.target.value, json: null })}
      />
    </div>
  ),
}));

vi.mock('../GruvboxLoader', () => ({
  default: ({ variant, size }) => <div data-testid="gruvbox-loader" data-variant={variant} data-size={size} />,
}));

vi.mock('@/utils/tagExtraction', () => ({
  extractTagsFromContent: () => [],
}));

vi.mock('@/utils/tagColors', () => ({
  getTagColor: (tag) => ({ bg: '#f0f0f0', text: '#333', border: '#ccc', hover: '#ddd' }),
  getAllTagColors: () => [
    { id: 'red', name: 'Red', bg: '#fef2f2', text: '#dc2626', border: '#fca5a5', hover: '#f87171' },
    { id: 'blue', name: 'Blue', bg: '#eff6ff', text: '#2563eb', border: '#93c5fd', hover: '#60a5fa' },
  ],
  setTagColor: vi.fn(),
  getColorById: (id) => ({ bg: '#f0f0f0', text: '#333', border: '#ccc', hover: '#ddd' }),
}));

vi.mock('../TagColorPicker', () => ({
  DeletableTagPill: ({ tag, onDelete }) => (
    <span data-testid={`tag-${tag}`}>
      #{tag}
      <button data-testid={`delete-tag-${tag}`} onClick={() => onDelete(tag)}>x</button>
    </span>
  ),
}));

// Mock createPortal to render inline
vi.mock('react-dom', async () => {
  const actual = await vi.importActual('react-dom');
  return {
    ...actual,
    createPortal: (node) => node,
  };
});

describe('NoteEditorModal', () => {
  const defaultBookmark = {
    id: '1',
    title: 'Test Note',
    notes: 'Some test content',
    notesHtml: '<p>Some test content</p>',
    notesBlocks: null,
    tags: ['existing'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
  };

  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    bookmark: defaultBookmark,
    onSave: vi.fn(),
    onDelete: vi.fn(),
    availableTags: ['tag1', 'tag2', 'tag3'],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should not render when isOpen is false', () => {
      const { container } = render(<NoteEditorModal {...defaultProps} isOpen={false} />);
      expect(container.querySelector('.zen-note-overlay')).toBeNull();
    });

    it('should render when isOpen is true', () => {
      const { container } = render(<NoteEditorModal {...defaultProps} />);
      expect(container.querySelector('.zen-note-overlay')).toBeInTheDocument();
    });

    it('should render the editor', () => {
      render(<NoteEditorModal {...defaultProps} />);
      expect(screen.getByTestId('lexical-editor')).toBeInTheDocument();
    });

    it('should display "Edit note" title for existing bookmarks', () => {
      render(<NoteEditorModal {...defaultProps} />);
      expect(screen.getByText('Edit note')).toBeInTheDocument();
    });

    it('should display "New note" title for new bookmarks', () => {
      render(<NoteEditorModal {...defaultProps} bookmark={{ ...defaultBookmark, isNew: true }} />);
      expect(screen.getByText('New note')).toBeInTheDocument();
    });
  });

  describe('Slide Animation Classes (Non-fullscreen)', () => {
    it('should apply zen-note-container class for slide-in animation', () => {
      const { container } = render(<NoteEditorModal {...defaultProps} />);
      const noteContainer = container.querySelector('.zen-note-container');
      expect(noteContainer).toBeInTheDocument();
      expect(noteContainer.className).not.toContain('zen-note-container--fullscreen');
    });

    it('should apply zen-note-card class without fullscreen modifier', () => {
      const { container } = render(<NoteEditorModal {...defaultProps} />);
      const card = container.querySelector('.zen-note-card');
      expect(card).toBeInTheDocument();
      expect(card.className).not.toContain('zen-note-card--fullscreen');
    });

    it('should have backdrop element for dimming', () => {
      const { container } = render(<NoteEditorModal {...defaultProps} />);
      expect(container.querySelector('.zen-note-backdrop')).toBeInTheDocument();
    });
  });

  describe('Fullscreen Toggle', () => {
    it('should toggle fullscreen when button is clicked', () => {
      const { container } = render(<NoteEditorModal {...defaultProps} />);

      const fullscreenBtn = screen.getByLabelText('Enter fullscreen');
      fireEvent.click(fullscreenBtn);

      const noteContainer = container.querySelector('.zen-note-container');
      expect(noteContainer.className).toContain('zen-note-container--fullscreen');

      const card = container.querySelector('.zen-note-card');
      expect(card.className).toContain('zen-note-card--fullscreen');
    });

    it('should exit fullscreen when toggled again', () => {
      vi.useFakeTimers();
      const { container } = render(<NoteEditorModal {...defaultProps} />);

      const enterBtn = screen.getByLabelText('Enter fullscreen');
      fireEvent.click(enterBtn);

      const exitBtn = screen.getByLabelText('Exit fullscreen');
      fireEvent.click(exitBtn);

      // During exit animation, the exiting class should be applied
      const card = container.querySelector('.zen-note-card');
      expect(card.className).toContain('zen-note-card--exiting-fullscreen');

      // After animation completes, fullscreen class should be removed
      act(() => { vi.advanceTimersByTime(500); });

      const noteContainer = container.querySelector('.zen-note-container');
      expect(noteContainer.className).not.toContain('zen-note-container--fullscreen');
      vi.useRealTimers();
    });

    it('should not have conflicting animation classes when entering fullscreen', () => {
      const { container } = render(<NoteEditorModal {...defaultProps} />);

      const fullscreenBtn = screen.getByLabelText('Enter fullscreen');
      fireEvent.click(fullscreenBtn);

      const card = container.querySelector('.zen-note-card--fullscreen');
      // Should NOT have any animation class that would cause bouncing
      // The fullscreen uses CSS transitions, not keyframe animations
      expect(card).toBeInTheDocument();
    });

    it('should apply fullscreen header class', () => {
      const { container } = render(<NoteEditorModal {...defaultProps} />);

      const fullscreenBtn = screen.getByLabelText('Enter fullscreen');
      fireEvent.click(fullscreenBtn);

      const header = container.querySelector('.zen-note-header');
      expect(header.className).toContain('zen-note-header--fullscreen');
    });

    it('should ignore clicks during exit animation (rapid toggle protection)', () => {
      vi.useFakeTimers();
      const { container } = render(<NoteEditorModal {...defaultProps} />);

      // Enter fullscreen
      fireEvent.click(screen.getByLabelText('Enter fullscreen'));

      // Start exit
      fireEvent.click(screen.getByLabelText('Exit fullscreen'));
      const card = container.querySelector('.zen-note-card');
      expect(card.className).toContain('zen-note-card--exiting-fullscreen');

      // Click again during exit animation - should be ignored
      fireEvent.click(screen.getByLabelText('Exit fullscreen'));
      // Still in exiting state, not re-entered fullscreen
      expect(card.className).toContain('zen-note-card--exiting-fullscreen');
      expect(card.className).toContain('zen-note-card--fullscreen');

      vi.useRealTimers();
    });

    it('should maintain both fullscreen and exiting classes during exit animation', () => {
      vi.useFakeTimers();
      const { container } = render(<NoteEditorModal {...defaultProps} />);

      fireEvent.click(screen.getByLabelText('Enter fullscreen'));
      fireEvent.click(screen.getByLabelText('Exit fullscreen'));

      const card = container.querySelector('.zen-note-card');
      // Both classes needed: fullscreen provides width:100%, exiting provides animation
      expect(card.className).toContain('zen-note-card--fullscreen');
      expect(card.className).toContain('zen-note-card--exiting-fullscreen');

      // After animation, both should be removed
      act(() => { vi.advanceTimersByTime(450); });
      expect(card.className).not.toContain('zen-note-card--fullscreen');
      expect(card.className).not.toContain('zen-note-card--exiting-fullscreen');

      vi.useRealTimers();
    });

    it('should clean up exit timer on unmount during animation', () => {
      vi.useFakeTimers();
      const { container, unmount } = render(<NoteEditorModal {...defaultProps} />);

      fireEvent.click(screen.getByLabelText('Enter fullscreen'));
      fireEvent.click(screen.getByLabelText('Exit fullscreen'));

      // Unmount while exiting - should not throw or leak
      expect(() => {
        unmount();
        vi.advanceTimersByTime(500);
      }).not.toThrow();

      vi.useRealTimers();
    });

    it('should reset isExitingFullscreen when modal reopens', () => {
      vi.useFakeTimers();
      const { container, rerender } = render(<NoteEditorModal {...defaultProps} />);

      // Enter fullscreen and start exit
      fireEvent.click(screen.getByLabelText('Enter fullscreen'));
      fireEvent.click(screen.getByLabelText('Exit fullscreen'));

      // Close modal while exiting
      rerender(<NoteEditorModal {...defaultProps} isOpen={false} />);
      // Reopen modal with new bookmark
      rerender(<NoteEditorModal {...defaultProps} isOpen={true} bookmark={{ ...defaultBookmark, id: '3' }} />);

      // Should be back to normal (not fullscreen, not exiting)
      const card = container.querySelector('.zen-note-card');
      expect(card.className).not.toContain('zen-note-card--fullscreen');
      expect(card.className).not.toContain('zen-note-card--exiting-fullscreen');

      vi.useRealTimers();
    });

    it('should use 420ms timeout matching CSS animation duration', () => {
      vi.useFakeTimers();
      const { container } = render(<NoteEditorModal {...defaultProps} />);

      fireEvent.click(screen.getByLabelText('Enter fullscreen'));
      fireEvent.click(screen.getByLabelText('Exit fullscreen'));

      // At 419ms, animation should still be running
      act(() => { vi.advanceTimersByTime(419); });
      const card = container.querySelector('.zen-note-card');
      expect(card.className).toContain('zen-note-card--exiting-fullscreen');

      // At 420ms, animation should complete
      act(() => { vi.advanceTimersByTime(1); });
      expect(card.className).not.toContain('zen-note-card--exiting-fullscreen');

      vi.useRealTimers();
    });
  });

  describe('Fullscreen Auto-hide Controls', () => {
    beforeEach(() => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should show controls initially in fullscreen', async () => {
      const { container } = render(<NoteEditorModal {...defaultProps} />);

      // Advance past the initial scrollToTop timeouts
      await act(async () => { vi.advanceTimersByTime(200); });

      const fullscreenBtn = screen.getByLabelText('Enter fullscreen');
      await act(async () => { fireEvent.click(fullscreenBtn); });

      const header = container.querySelector('.zen-note-header');
      expect(header.className).not.toContain('zen-note-header--hidden');
    });

    it('should hide controls after idle timeout in fullscreen', async () => {
      const { container } = render(<NoteEditorModal {...defaultProps} />);

      await act(async () => { vi.advanceTimersByTime(200); });

      const fullscreenBtn = screen.getByLabelText('Enter fullscreen');
      await act(async () => { fireEvent.click(fullscreenBtn); });

      // Advance past the 2500ms idle timer
      await act(async () => { vi.advanceTimersByTime(2600); });

      const header = container.querySelector('.zen-note-header');
      expect(header.className).toContain('zen-note-header--hidden');
    });

    it('should show controls on mouse move in fullscreen', async () => {
      const { container } = render(<NoteEditorModal {...defaultProps} />);

      await act(async () => { vi.advanceTimersByTime(200); });

      const fullscreenBtn = screen.getByLabelText('Enter fullscreen');
      await act(async () => { fireEvent.click(fullscreenBtn); });

      // Hide controls
      await act(async () => { vi.advanceTimersByTime(2600); });

      // Move mouse to show controls
      await act(async () => { fireEvent.mouseMove(document); });

      const header = container.querySelector('.zen-note-header');
      expect(header.className).not.toContain('zen-note-header--hidden');
    });

    it('should show controls when not in fullscreen regardless of time', async () => {
      const { container } = render(<NoteEditorModal {...defaultProps} />);

      await act(async () => { vi.advanceTimersByTime(200); });

      // Advance time - should not hide since not fullscreen
      await act(async () => { vi.advanceTimersByTime(5000); });

      const header = container.querySelector('.zen-note-header');
      expect(header.className).not.toContain('zen-note-header--hidden');
    });
  });

  describe('Close Behavior', () => {
    it('should call onClose when backdrop is clicked', () => {
      const { container } = render(<NoteEditorModal {...defaultProps} />);

      const backdrop = container.querySelector('.zen-note-backdrop');
      fireEvent.click(backdrop);

      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when X button is clicked', () => {
      render(<NoteEditorModal {...defaultProps} />);

      const closeBtn = screen.getByLabelText('Close');
      fireEvent.click(closeBtn);

      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose on Escape key', () => {
      render(<NoteEditorModal {...defaultProps} />);

      fireEvent.keyDown(document, { key: 'Escape' });

      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('should reset fullscreen state when modal reopens', async () => {
      const { container, rerender } = render(<NoteEditorModal {...defaultProps} />);

      // Enter fullscreen
      const fullscreenBtn = screen.getByLabelText('Enter fullscreen');
      await act(async () => { fireEvent.click(fullscreenBtn); });

      // Close and reopen - the useEffect resets isFullscreen on isOpen+bookmark change
      await act(async () => {
        rerender(<NoteEditorModal {...defaultProps} isOpen={false} />);
      });
      await act(async () => {
        rerender(<NoteEditorModal {...defaultProps} isOpen={true} bookmark={{ ...defaultBookmark, id: '2' }} />);
      });

      const noteContainer = container.querySelector('.zen-note-container');
      expect(noteContainer.className).not.toContain('zen-note-container--fullscreen');
    });
  });

  describe('Save Behavior', () => {
    it('should trigger save on Cmd+Enter when there are changes', async () => {
      defaultProps.onSave.mockResolvedValue(undefined);
      render(<NoteEditorModal {...defaultProps} />);

      // Make a change to set hasChanges=true
      const textarea = screen.getByTestId('editor-textarea');
      await act(async () => {
        fireEvent.change(textarea, { target: { value: 'updated content' } });
      });

      // Trigger save
      await act(async () => {
        fireEvent.keyDown(document, { key: 'Enter', metaKey: true });
      });

      expect(defaultProps.onSave).toHaveBeenCalled();
    });

    it('should not trigger save on Cmd+Enter when no changes', () => {
      render(<NoteEditorModal {...defaultProps} />);

      fireEvent.keyDown(document, { key: 'Enter', metaKey: true });

      expect(defaultProps.onSave).not.toHaveBeenCalled();
    });

    it('should show saving indicator during save', async () => {
      let resolvePromise;
      defaultProps.onSave.mockImplementation(() => new Promise((resolve) => { resolvePromise = resolve; }));

      const { container } = render(<NoteEditorModal {...defaultProps} />);

      // Make a change and save
      const textarea = screen.getByTestId('editor-textarea');
      await act(async () => {
        fireEvent.change(textarea, { target: { value: 'updated content' } });
      });
      await act(async () => {
        fireEvent.keyDown(document, { key: 'Enter', metaKey: true });
      });

      // Should show saving strip
      await waitFor(() => {
        const strip = container.querySelector('.zen-note-strip--visible');
        expect(strip).toBeInTheDocument();
      });

      await act(async () => { resolvePromise(); });
    });
  });

  describe('Tags', () => {
    it('should render existing tags', () => {
      render(<NoteEditorModal {...defaultProps} />);
      expect(screen.getByTestId('tag-existing')).toBeInTheDocument();
    });

    it('should show add tag button', () => {
      render(<NoteEditorModal {...defaultProps} />);
      expect(screen.getByText('Add tag')).toBeInTheDocument();
    });

    it('should open tag dropdown when Add tag is clicked', () => {
      const { container } = render(<NoteEditorModal {...defaultProps} />);

      fireEvent.click(screen.getByText('Add tag'));

      expect(container.querySelector('.zen-note-tag-dropdown')).toBeInTheDocument();
    });

    it('should close tag dropdown on Escape without closing modal', () => {
      const { container } = render(<NoteEditorModal {...defaultProps} />);

      fireEvent.click(screen.getByText('Add tag'));
      expect(container.querySelector('.zen-note-tag-dropdown')).toBeInTheDocument();

      fireEvent.keyDown(document, { key: 'Escape' });

      // Escape closes dropdown first, not the modal
      expect(container.querySelector('.zen-note-tag-dropdown')).not.toBeInTheDocument();
      expect(defaultProps.onClose).not.toHaveBeenCalled();
    });

    it('should remove a tag when delete is clicked', () => {
      render(<NoteEditorModal {...defaultProps} />);

      fireEvent.click(screen.getByTestId('delete-tag-existing'));

      expect(screen.queryByTestId('tag-existing')).not.toBeInTheDocument();
    });

    it('should add a tag from input on Enter', () => {
      render(<NoteEditorModal {...defaultProps} />);

      fireEvent.click(screen.getByText('Add tag'));

      const input = screen.getByPlaceholderText('Type a tag name...');
      fireEvent.change(input, { target: { value: 'newtag' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(screen.getByTestId('tag-newtag')).toBeInTheDocument();
    });

    it('should show suggested tags in dropdown', () => {
      render(<NoteEditorModal {...defaultProps} />);

      fireEvent.click(screen.getByText('Add tag'));

      expect(screen.getByText('#tag1')).toBeInTheDocument();
      expect(screen.getByText('#tag2')).toBeInTheDocument();
    });

    it('should add a suggested tag when clicked', () => {
      render(<NoteEditorModal {...defaultProps} />);

      fireEvent.click(screen.getByText('Add tag'));
      fireEvent.click(screen.getByText('#tag1'));

      expect(screen.getByTestId('tag-tag1')).toBeInTheDocument();
    });
  });

  describe('Footer', () => {
    it('should display created date', () => {
      render(<NoteEditorModal {...defaultProps} />);
      expect(screen.getByText(/Created/)).toBeInTheDocument();
    });

    it('should display edited time', () => {
      render(<NoteEditorModal {...defaultProps} />);
      expect(screen.getByText(/Edited/)).toBeInTheDocument();
    });

    it('should hide footer in fullscreen when controls are hidden', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });

      const { container } = render(<NoteEditorModal {...defaultProps} />);

      await act(async () => { vi.advanceTimersByTime(200); });
      await act(async () => { fireEvent.click(screen.getByLabelText('Enter fullscreen')); });
      await act(async () => { vi.advanceTimersByTime(2600); });

      const footer = container.querySelector('.zen-note-footer');
      expect(footer.className).toContain('zen-note-footer--hidden');

      vi.useRealTimers();
    });
  });

  describe('CSS Animation Styles', () => {
    const getZenStyle = (container) => {
      const styles = container.querySelectorAll('style');
      return Array.from(styles).find(s => s.textContent.includes('.zen-note-overlay'));
    };

    it('should include slideInFromRight keyframe in styles', () => {
      const { container } = render(<NoteEditorModal {...defaultProps} />);
      const style = getZenStyle(container);
      expect(style).toBeTruthy();
      expect(style.textContent).toContain('slideInFromRight');
    });

    it('should NOT include slideToFullscreen keyframe (removed)', () => {
      const { container } = render(<NoteEditorModal {...defaultProps} />);
      const style = getZenStyle(container);
      expect(style.textContent).not.toContain('slideToFullscreen');
    });

    it('should NOT include cardSlideExpand keyframe (caused bouncing)', () => {
      const { container } = render(<NoteEditorModal {...defaultProps} />);
      const style = getZenStyle(container);
      expect(style.textContent).not.toContain('cardSlideExpand');
    });

    it('should use cardSlideLeft transform-based animation for fullscreen', () => {
      const { container } = render(<NoteEditorModal {...defaultProps} />);
      const style = getZenStyle(container);
      // Uses translateX (GPU-composited) not width transition (layout thrashing)
      expect(style.textContent).toContain('cardSlideLeft');
      expect(style.textContent).toContain('translateX');
    });

    it('should use will-change transform for GPU acceleration on both enter and exit', () => {
      const { container } = render(<NoteEditorModal {...defaultProps} />);
      const style = getZenStyle(container);
      expect(style.textContent).toContain('will-change: transform');
    });

    it('should have cardSlideRight exit animation in styles', () => {
      const { container } = render(<NoteEditorModal {...defaultProps} />);
      const style = getZenStyle(container);
      expect(style.textContent).toContain('cardSlideRight');
      expect(style.textContent).toContain('0.42s');
      expect(style.textContent).toContain('cubic-bezier(0.4, 0, 0.2, 1)');
    });

    it('should NOT use opacity in exit animation keyframes (prevents snap)', () => {
      const { container } = render(<NoteEditorModal {...defaultProps} />);
      const style = getZenStyle(container);
      // Extract the cardSlideRight keyframe block
      const exitKeyframe = style.textContent.match(/@keyframes cardSlideRight\s*\{[\s\S]*?\n\s*\}/);
      expect(exitKeyframe).toBeTruthy();
      expect(exitKeyframe[0]).not.toContain('opacity');
    });

    it('should have tablet responsive exit animation', () => {
      const { container } = render(<NoteEditorModal {...defaultProps} />);
      const style = getZenStyle(container);
      expect(style.textContent).toContain('cardSlideRightTablet');
    });

    it('should have prefers-reduced-motion styles', () => {
      const { container } = render(<NoteEditorModal {...defaultProps} />);
      const style = getZenStyle(container);
      expect(style.textContent).toContain('prefers-reduced-motion');
    });

    it('should NOT have width transition on card (causes layout thrashing)', () => {
      const { container } = render(<NoteEditorModal {...defaultProps} />);
      const style = getZenStyle(container);
      // The base .zen-note-card should not have any transition
      const cardRule = style.textContent.match(/\.zen-note-card\s*\{[^}]+\}/);
      expect(cardRule[0]).not.toContain('transition');
    });

    it('should align placeholder with content-editable using same centering method (margin auto, not transform)', () => {
      const { container } = render(<NoteEditorModal {...defaultProps} />);
      const style = getZenStyle(container);
      const css = style.textContent;

      // Placeholder should use margin-based centering (same as content-editable)
      expect(css).toContain('.zen-note-editor .lexical-placeholder');

      // Extract the placeholder rule
      const placeholderMatch = css.match(/\.zen-note-editor\s+\.lexical-placeholder\s*\{([^}]+)\}/);
      expect(placeholderMatch).toBeTruthy();
      const placeholderCSS = placeholderMatch[1];

      // Should use margin auto centering, not transform centering
      expect(placeholderCSS).toContain('margin-left: auto');
      expect(placeholderCSS).toContain('margin-right: auto');
      expect(placeholderCSS).toContain('transform: none');
      expect(placeholderCSS).toContain('left: 0');
      expect(placeholderCSS).toContain('right: 0');
      expect(placeholderCSS).not.toContain('left: 50%');
      expect(placeholderCSS).not.toContain('translateX(-50%)');

      // Should match font properties with content-editable for cursor alignment
      expect(placeholderCSS).toContain("font-family: 'Nunito'");
      expect(placeholderCSS).toContain('font-size: 17px');
      expect(placeholderCSS).toContain('line-height: 1.8');
    });

    it('should have matching max-width on placeholder and content-editable (640px)', () => {
      const { container } = render(<NoteEditorModal {...defaultProps} />);
      const style = getZenStyle(container);
      const css = style.textContent;

      // Both content-editable and placeholder should be constrained to 640px
      const contentEditableMatch = css.match(/\.zen-note-editor\s+\.lexical-content-editable\s*\{([^}]+)\}/);
      const placeholderMatch = css.match(/\.zen-note-editor\s+\.lexical-placeholder\s*\{([^}]+)\}/);

      expect(contentEditableMatch[1]).toContain('max-width: 640px');
      expect(placeholderMatch[1]).toContain('max-width: 640px');
    });
  });

  describe('Body Overflow', () => {
    it('should set body overflow to hidden when open', () => {
      render(<NoteEditorModal {...defaultProps} />);
      expect(document.body.style.overflow).toBe('hidden');
    });

    it('should restore body overflow when closed', () => {
      const { unmount } = render(<NoteEditorModal {...defaultProps} />);
      unmount();
      expect(document.body.style.overflow).toBe('');
    });
  });
});

describe('NoteEditorModal Helper Functions', () => {
  describe('formatCreatedDate', () => {
    // Test through the component's rendering
    it('should format date correctly when bookmark has createdAt', () => {
      const bookmark = {
        id: '1',
        title: 'Test',
        notes: 'Content',
        tags: [],
        createdAt: '2026-01-15T14:30:00.000Z',
      };

      render(
        <NoteEditorModal
          isOpen={true}
          onClose={vi.fn()}
          bookmark={bookmark}
          onSave={vi.fn()}
          availableTags={[]}
        />
      );

      expect(screen.getByText(/Created/)).toBeInTheDocument();
      expect(screen.getByText(/Jan 15, 2026/)).toBeInTheDocument();
    });

    it('should not render footer when no dates present', () => {
      const bookmark = {
        id: '1',
        title: 'Test',
        notes: 'Content',
        tags: [],
      };

      const { container } = render(
        <NoteEditorModal
          isOpen={true}
          onClose={vi.fn()}
          bookmark={bookmark}
          onSave={vi.fn()}
          availableTags={[]}
        />
      );

      expect(container.querySelector('.zen-note-footer')).toBeNull();
    });
  });

  describe('formatEditedTime', () => {
    it('should show "Just now" for recent edits', () => {
      const bookmark = {
        id: '1',
        title: 'Test',
        notes: 'Content',
        tags: [],
        updatedAt: new Date().toISOString(),
      };

      render(
        <NoteEditorModal
          isOpen={true}
          onClose={vi.fn()}
          bookmark={bookmark}
          onSave={vi.fn()}
          availableTags={[]}
        />
      );

      expect(screen.getByText(/Just now/)).toBeInTheDocument();
    });
  });
});
