import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SettingsPage from '../SettingsPage';

// Mock the contexts
const mockSetTheme = vi.fn();
const mockSetUiSize = vi.fn();
const mockSetFontSize = vi.fn();
const mockSetNoteFont = vi.fn();
const mockSignOut = vi.fn();

vi.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    currentTheme: { name: 'Dark Mode', id: 'dark' },
    currentThemeId: 'dark',
    setTheme: mockSetTheme,
    availableThemes: [
      {
        id: 'dark',
        name: 'Dark Mode',
        description: 'A dark theme',
        category: 'dark',
        preview: {
          primary: '#ffffff',
          secondary: '#888888',
          accent: '#6366f1',
          background: '#1a1a1a',
        },
      },
      {
        id: 'light',
        name: 'Light Mode',
        description: 'A light theme',
        category: 'light',
        preview: {
          primary: '#000000',
          secondary: '#555555',
          accent: '#4f46e5',
          background: '#ffffff',
        },
      },
    ],
  }),
}));

vi.mock('../../contexts/PreferencesContext', () => ({
  usePreferences: () => ({
    uiSize: 'default',
    setUiSize: mockSetUiSize,
    sizes: {
      minimal: { id: 'minimal', label: 'Minimal', description: 'Compact UI' },
      default: { id: 'default', label: 'Default', description: 'Standard UI' },
    },
    fontSize: 'medium',
    setFontSize: mockSetFontSize,
    fontSizes: {
      small: { id: 'small', label: 'Small', description: 'Smaller text' },
      medium: { id: 'medium', label: 'Medium', description: 'Default text size' },
      large: { id: 'large', label: 'Large', description: 'Larger text' },
    },
    noteFont: 'sans',
    setNoteFont: mockSetNoteFont,
    noteFonts: {
      sans: { id: 'sans', label: 'Sans Serif', description: 'Clean and modern', fontFamily: 'system-ui', previewText: 'Hello World' },
      serif: { id: 'serif', label: 'Serif', description: 'Classic style', fontFamily: 'Georgia', previewText: 'Hello World' },
    },
  }),
  UI_SIZES: {},
  FONT_SIZES: {},
  NOTE_FONTS: {},
}));

vi.mock('../../config/themes', () => ({
  themeCategories: [
    { id: 'all', label: 'All' },
    { id: 'dark', label: 'Dark' },
    { id: 'light', label: 'Light' },
  ],
}));

const mockUser = { email: 'test@example.com' };

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    signOut: mockSignOut,
  }),
}));

describe('SettingsPage', () => {
  const mockOnBack = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Account Section', () => {
    it('should render the Account section with user email', () => {
      render(<SettingsPage onBack={mockOnBack} />);

      expect(screen.getByText('Account')).toBeInTheDocument();
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
    });

    it('should display the user avatar with first letter of email', () => {
      render(<SettingsPage onBack={mockOnBack} />);

      expect(screen.getByText('T')).toBeInTheDocument();
    });

    it('should show "Signed in" status text', () => {
      render(<SettingsPage onBack={mockOnBack} />);

      expect(screen.getByText('Signed in')).toBeInTheDocument();
    });

    it('should render a Sign Out button', () => {
      render(<SettingsPage onBack={mockOnBack} />);

      const signOutButton = screen.getByRole('button', { name: /sign out/i });
      expect(signOutButton).toBeInTheDocument();
    });

    it('should call signOut when Sign Out button is clicked', () => {
      render(<SettingsPage onBack={mockOnBack} />);

      const signOutButton = screen.getByRole('button', { name: /sign out/i });
      fireEvent.click(signOutButton);

      expect(mockSignOut).toHaveBeenCalledTimes(1);
    });

    it('should have solid background on the account card (not transparent)', () => {
      render(<SettingsPage onBack={mockOnBack} />);

      // The account card wraps the email - find the styled flex container
      const emailEl = screen.getByText('test@example.com');
      const accountCard = emailEl.closest('.rounded-xl');
      expect(accountCard.style.backgroundColor).toBe('var(--theme-bg-light)');
    });

    it('should have a visible border on the account card', () => {
      render(<SettingsPage onBack={mockOnBack} />);

      const emailEl = screen.getByText('test@example.com');
      const accountCard = emailEl.closest('.rounded-xl');
      expect(accountCard.style.border).toBe('1px solid var(--theme-bg-lighter)');
    });

    it('should render the Sign Out button with red/destructive styling', () => {
      render(<SettingsPage onBack={mockOnBack} />);

      const signOutButton = screen.getByRole('button', { name: /sign out/i });
      // Browser normalizes hex colors to rgb
      expect(signOutButton.style.color).toBe('rgb(239, 68, 68)');
      expect(signOutButton.style.backgroundColor).toBe('rgba(239, 68, 68, 0.1)');
    });

    it('should display the section description "Manage your account settings"', () => {
      render(<SettingsPage onBack={mockOnBack} />);

      expect(screen.getByText('Manage your account settings')).toBeInTheDocument();
    });
  });

  describe('Account Section - User Present', () => {
    it('should render Account section when user exists', () => {
      render(<SettingsPage onBack={mockOnBack} />);
      expect(screen.getByText('Account')).toBeInTheDocument();
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
    });
  });

  describe('Header', () => {
    it('should render the Settings title', () => {
      render(<SettingsPage onBack={mockOnBack} />);

      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    it('should render the subtitle', () => {
      render(<SettingsPage onBack={mockOnBack} />);

      expect(screen.getByText('Customize your experience')).toBeInTheDocument();
    });

    it('should render a Back button', () => {
      render(<SettingsPage onBack={mockOnBack} />);

      expect(screen.getByText('Back')).toBeInTheDocument();
    });

    it('should call onBack when Back button is clicked', () => {
      render(<SettingsPage onBack={mockOnBack} />);

      fireEvent.click(screen.getByText('Back'));

      expect(mockOnBack).toHaveBeenCalledTimes(1);
    });

    it('should display the current theme name in badge', () => {
      render(<SettingsPage onBack={mockOnBack} />);

      // "Dark Mode" appears in both the badge and theme card
      expect(screen.getAllByText('Dark Mode').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Current:')).toBeInTheDocument();
    });
  });

  describe('Appearance Section', () => {
    it('should render the Appearance section', () => {
      render(<SettingsPage onBack={mockOnBack} />);

      expect(screen.getByText('Appearance')).toBeInTheDocument();
    });

    it('should render category filter pills', () => {
      render(<SettingsPage onBack={mockOnBack} />);

      expect(screen.getByText('All')).toBeInTheDocument();
      expect(screen.getByText('Dark')).toBeInTheDocument();
      expect(screen.getByText('Light')).toBeInTheDocument();
    });

    it('should render theme cards', () => {
      render(<SettingsPage onBack={mockOnBack} />);

      // Both theme names should be visible in the grid
      expect(screen.getAllByText('Dark Mode').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Light Mode')).toBeInTheDocument();
    });

    it('should filter themes when category pill is clicked', () => {
      render(<SettingsPage onBack={mockOnBack} />);

      fireEvent.click(screen.getByText('Light'));

      expect(screen.getByText('Light Mode')).toBeInTheDocument();
      // Dark Mode should still be in the header badge
      expect(screen.queryAllByText('Dark Mode').length).toBeGreaterThanOrEqual(1);
    });

    it('should render search input', () => {
      render(<SettingsPage onBack={mockOnBack} />);

      expect(screen.getByPlaceholderText('Search themes...')).toBeInTheDocument();
    });

    it('should filter themes by search query', () => {
      render(<SettingsPage onBack={mockOnBack} />);

      const searchInput = screen.getByPlaceholderText('Search themes...');
      fireEvent.change(searchInput, { target: { value: 'light' } });

      expect(screen.getByText('Light Mode')).toBeInTheDocument();
    });

    it('should show empty state when no themes match search', () => {
      render(<SettingsPage onBack={mockOnBack} />);

      const searchInput = screen.getByPlaceholderText('Search themes...');
      fireEvent.change(searchInput, { target: { value: 'nonexistent-theme-xyz' } });

      expect(screen.getByText('No themes found matching your search.')).toBeInTheDocument();
    });

    it('should call setTheme when a theme card is clicked', () => {
      render(<SettingsPage onBack={mockOnBack} />);

      // Click the light theme card
      fireEvent.click(screen.getByText('Light Mode').closest('button'));

      expect(mockSetTheme).toHaveBeenCalledWith('light');
    });

    it('should mark the current theme as selected with Active badge', () => {
      render(<SettingsPage onBack={mockOnBack} />);

      expect(screen.getByText('Active')).toBeInTheDocument();
    });
  });

  describe('Display Section', () => {
    it('should render the Display section', () => {
      render(<SettingsPage onBack={mockOnBack} />);

      expect(screen.getByText('Display')).toBeInTheDocument();
    });

    it('should render size option cards', () => {
      render(<SettingsPage onBack={mockOnBack} />);

      expect(screen.getByText('Minimal')).toBeInTheDocument();
      expect(screen.getByText('Default')).toBeInTheDocument();
    });

    it('should call setUiSize when a size option is clicked', () => {
      render(<SettingsPage onBack={mockOnBack} />);

      fireEvent.click(screen.getByText('Minimal').closest('button'));

      expect(mockSetUiSize).toHaveBeenCalledWith('minimal');
    });
  });

  describe('Font Size Section', () => {
    it('should render the Font Size section', () => {
      render(<SettingsPage onBack={mockOnBack} />);

      expect(screen.getByText('Font Size')).toBeInTheDocument();
    });

    it('should render font size options', () => {
      render(<SettingsPage onBack={mockOnBack} />);

      expect(screen.getByText('Small')).toBeInTheDocument();
      expect(screen.getByText('Medium')).toBeInTheDocument();
      expect(screen.getByText('Large')).toBeInTheDocument();
    });

    it('should call setFontSize when a font size option is clicked', () => {
      render(<SettingsPage onBack={mockOnBack} />);

      fireEvent.click(screen.getByText('Small').closest('button'));

      expect(mockSetFontSize).toHaveBeenCalledWith('small');
    });
  });

  describe('Note Font Section', () => {
    it('should render the Note Font section', () => {
      render(<SettingsPage onBack={mockOnBack} />);

      expect(screen.getByText('Note Font')).toBeInTheDocument();
    });

    it('should render note font options', () => {
      render(<SettingsPage onBack={mockOnBack} />);

      expect(screen.getByText('Sans Serif')).toBeInTheDocument();
      expect(screen.getByText('Serif')).toBeInTheDocument();
    });

    it('should call setNoteFont when a font option is clicked', () => {
      render(<SettingsPage onBack={mockOnBack} />);

      fireEvent.click(screen.getByText('Serif').closest('button'));

      expect(mockSetNoteFont).toHaveBeenCalledWith('serif');
    });

    it('should display the font preview text', () => {
      render(<SettingsPage onBack={mockOnBack} />);

      const previews = screen.getAllByText('Hello World');
      expect(previews.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Footer', () => {
    it('should render the footer message', () => {
      render(<SettingsPage onBack={mockOnBack} />);

      expect(screen.getByText('Theme changes are saved automatically and persist across sessions')).toBeInTheDocument();
    });
  });

  describe('Page Layout', () => {
    it('should have a solid background on the page', () => {
      const { container } = render(<SettingsPage onBack={mockOnBack} />);

      const pageContainer = container.firstChild;
      expect(pageContainer.style.backgroundColor).toBe('var(--theme-bg-darkest)');
    });

    it('should have a sticky header', () => {
      const { container } = render(<SettingsPage onBack={mockOnBack} />);

      const header = container.querySelector('.sticky');
      expect(header).toBeInTheDocument();
    });
  });
});
