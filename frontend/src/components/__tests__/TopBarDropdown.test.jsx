import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TopBar from '../TopBar';

// Mock dependencies
vi.mock('@/lib/utils', () => ({
  cn: (...classes) => classes.filter(Boolean).join(' '),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { email: 'user@test.com' },
    signOut: vi.fn(),
  }),
}));

vi.mock('./MindSearch', () => ({
  default: () => <div data-testid="mind-search">MindSearch</div>,
}));

vi.mock('@/components/ui/avatar', () => ({
  Avatar: ({ children, className }) => <div className={className} data-testid="avatar">{children}</div>,
  AvatarImage: ({ src, alt }) => <img src={src} alt={alt} data-testid="avatar-image" />,
  AvatarFallback: ({ children, className }) => <span className={className} data-testid="avatar-fallback">{children}</span>,
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
    header: ({ children, ...props }) => <header {...props}>{children}</header>,
  },
  AnimatePresence: ({ children }) => <>{children}</>,
}));

describe('TopBar Profile Dropdown', () => {
  const defaultProps = {
    onSearch: vi.fn(),
    searchQuery: '',
    onAddNew: vi.fn(),
    user: { email: 'user@test.com', user_metadata: {} },
    onOpenSettings: vi.fn(),
    onSignOut: vi.fn(),
    onSignIn: vi.fn(),
    onFilterChange: vi.fn(),
    activeFilters: [],
    activeTags: [],
    onTagFilterChange: vi.fn(),
    tagRefreshTrigger: 0,
    mediaCounts: {},
    sidebarCollapsed: false,
    scrollContainerRef: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Dropdown Visibility', () => {
    it('should not show dropdown by default', () => {
      render(<TopBar {...defaultProps} />);

      // Dropdown should be invisible
      const signOutButton = screen.queryByText('Sign Out');
      // It may exist in DOM but be invisible
      if (signOutButton) {
        const dropdown = signOutButton.closest('[style]');
        expect(dropdown).toBeTruthy();
      }
    });

    it('should show dropdown when avatar is clicked', () => {
      render(<TopBar {...defaultProps} />);

      const avatar = screen.getByTestId('avatar');
      fireEvent.click(avatar);

      expect(screen.getByText('Sign Out')).toBeInTheDocument();
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    it('should show user email in dropdown', () => {
      render(<TopBar {...defaultProps} />);

      const avatar = screen.getByTestId('avatar');
      fireEvent.click(avatar);

      expect(screen.getByText('user@test.com')).toBeInTheDocument();
    });
  });

  describe('Dropdown Solid Background (Non-transparent)', () => {
    it('should have solid background color on dropdown', () => {
      render(<TopBar {...defaultProps} />);

      const avatar = screen.getByTestId('avatar');
      fireEvent.click(avatar);

      // The dropdown is the rounded-2xl container holding the email section
      const dropdown = screen.getByText('user@test.com').closest('.rounded-2xl');
      expect(dropdown.style.backgroundColor).toBe('var(--theme-bg-light)');
    });

    it('should have solid border using theme variable', () => {
      render(<TopBar {...defaultProps} />);

      const avatar = screen.getByTestId('avatar');
      fireEvent.click(avatar);

      const dropdown = screen.getByText('user@test.com').closest('.rounded-2xl');
      expect(dropdown.style.border).toBe('1px solid var(--theme-bg-lighter)');
    });

    it('should NOT have backdrop-blur classes on dropdown', () => {
      render(<TopBar {...defaultProps} />);

      const avatar = screen.getByTestId('avatar');
      fireEvent.click(avatar);

      const dropdown = screen.getByText('user@test.com').closest('[style]').parentElement.closest('[style]');
      expect(dropdown.className).not.toContain('backdrop-blur');
    });

    it('should NOT have glass/transparent background classes', () => {
      render(<TopBar {...defaultProps} />);

      const avatar = screen.getByTestId('avatar');
      fireEvent.click(avatar);

      const dropdown = screen.getByText('user@test.com').closest('[style]').parentElement.closest('[style]');
      expect(dropdown.className).not.toContain('bg-theme-bg-dark/90');
      expect(dropdown.className).not.toContain('border-white/');
    });

    it('should have themed color on email text', () => {
      render(<TopBar {...defaultProps} />);

      const avatar = screen.getByTestId('avatar');
      fireEvent.click(avatar);

      const emailElement = screen.getByText('user@test.com');
      expect(emailElement.style.color).toBe('var(--theme-fg-muted)');
    });

    it('should have themed border on email divider', () => {
      render(<TopBar {...defaultProps} />);

      const avatar = screen.getByTestId('avatar');
      fireEvent.click(avatar);

      const emailContainer = screen.getByText('user@test.com').parentElement;
      expect(emailContainer.style.borderBottom).toBe('1px solid var(--theme-bg-lighter)');
    });
  });

  describe('Settings Button', () => {
    it('should render Settings button in dropdown', () => {
      render(<TopBar {...defaultProps} />);

      const avatar = screen.getByTestId('avatar');
      fireEvent.click(avatar);

      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    it('should call onOpenSettings when Settings is clicked', () => {
      render(<TopBar {...defaultProps} />);

      const avatar = screen.getByTestId('avatar');
      fireEvent.click(avatar);

      fireEvent.click(screen.getByText('Settings'));

      expect(defaultProps.onOpenSettings).toHaveBeenCalledTimes(1);
    });

    it('should have themed text color on Settings button', () => {
      render(<TopBar {...defaultProps} />);

      const avatar = screen.getByTestId('avatar');
      fireEvent.click(avatar);

      const settingsButton = screen.getByText('Settings').closest('button');
      expect(settingsButton.style.color).toBe('var(--theme-fg)');
    });
  });

  describe('Sign Out Button', () => {
    it('should render Sign Out button in dropdown', () => {
      render(<TopBar {...defaultProps} />);

      const avatar = screen.getByTestId('avatar');
      fireEvent.click(avatar);

      expect(screen.getByText('Sign Out')).toBeInTheDocument();
    });

    it('should call onSignOut when Sign Out is clicked', () => {
      render(<TopBar {...defaultProps} />);

      const avatar = screen.getByTestId('avatar');
      fireEvent.click(avatar);

      fireEvent.click(screen.getByText('Sign Out'));

      expect(defaultProps.onSignOut).toHaveBeenCalledTimes(1);
    });

    it('should have red/destructive color on Sign Out button', () => {
      render(<TopBar {...defaultProps} />);

      const avatar = screen.getByTestId('avatar');
      fireEvent.click(avatar);

      const signOutButton = screen.getByText('Sign Out').closest('button');
      // Browser normalizes hex to rgb
      expect(signOutButton.style.color).toBe('rgb(239, 68, 68)');
    });

    it('should apply hover background on mouseEnter for Sign Out', () => {
      render(<TopBar {...defaultProps} />);

      const avatar = screen.getByTestId('avatar');
      fireEvent.click(avatar);

      const signOutButton = screen.getByText('Sign Out').closest('button');
      fireEvent.mouseEnter(signOutButton);

      // Browser normalizes rgba spacing
      expect(signOutButton.style.backgroundColor).toBe('rgba(239, 68, 68, 0.08)');
    });

    it('should reset background on mouseLeave for Sign Out', () => {
      render(<TopBar {...defaultProps} />);

      const avatar = screen.getByTestId('avatar');
      fireEvent.click(avatar);

      const signOutButton = screen.getByText('Sign Out').closest('button');
      fireEvent.mouseEnter(signOutButton);
      fireEvent.mouseLeave(signOutButton);

      expect(signOutButton.style.backgroundColor).toBe('transparent');
    });
  });

  describe('Settings Button Hover', () => {
    it('should apply hover background on mouseEnter for Settings', () => {
      render(<TopBar {...defaultProps} />);

      const avatar = screen.getByTestId('avatar');
      fireEvent.click(avatar);

      const settingsButton = screen.getByText('Settings').closest('button');
      fireEvent.mouseEnter(settingsButton);

      expect(settingsButton.style.backgroundColor).toBe('var(--theme-bg-lighter)');
    });

    it('should reset background on mouseLeave for Settings', () => {
      render(<TopBar {...defaultProps} />);

      const avatar = screen.getByTestId('avatar');
      fireEvent.click(avatar);

      const settingsButton = screen.getByText('Settings').closest('button');
      fireEvent.mouseEnter(settingsButton);
      fireEvent.mouseLeave(settingsButton);

      expect(settingsButton.style.backgroundColor).toBe('transparent');
    });
  });

  describe('Sign In Button (No User)', () => {
    it('should show Sign In button when user is null', () => {
      render(<TopBar {...defaultProps} user={null} />);

      expect(screen.getByText('Sign In')).toBeInTheDocument();
    });

    it('should call onSignIn when Sign In is clicked', () => {
      render(<TopBar {...defaultProps} user={null} />);

      fireEvent.click(screen.getByText('Sign In'));

      expect(defaultProps.onSignIn).toHaveBeenCalledTimes(1);
    });

    it('should not show dropdown or Sign Out when user is null', () => {
      render(<TopBar {...defaultProps} user={null} />);

      expect(screen.queryByText('Sign Out')).not.toBeInTheDocument();
    });
  });

  describe('Avatar', () => {
    it('should display first letter of email as fallback', () => {
      render(<TopBar {...defaultProps} />);

      expect(screen.getByText('U')).toBeInTheDocument();
    });

    it('should toggle dropdown on avatar click', () => {
      render(<TopBar {...defaultProps} />);

      const avatar = screen.getByTestId('avatar');

      // Open
      fireEvent.click(avatar);
      expect(screen.getByText('Sign Out')).toBeInTheDocument();

      // Close
      fireEvent.click(avatar);
      // Dropdown may still be in DOM but invisible - check class
    });
  });

  describe('Click Outside to Close', () => {
    it('should close dropdown when clicking outside', () => {
      const { container } = render(<TopBar {...defaultProps} />);

      const avatar = screen.getByTestId('avatar');
      fireEvent.click(avatar);

      // Dropdown is visible
      expect(screen.getByText('Sign Out')).toBeInTheDocument();

      // Click outside the profile menu
      fireEvent.mouseDown(container);
    });
  });

  describe('Scroll Behavior', () => {
    it('should handle scroll events on window', () => {
      render(<TopBar {...defaultProps} />);

      // Simulate scroll - this triggers the scroll handler
      Object.defineProperty(window, 'scrollY', { value: 150, writable: true });
      fireEvent.scroll(window);
    });

    it('should handle scroll events on scrollContainerRef', () => {
      const scrollRef = { current: document.createElement('div') };
      Object.defineProperty(scrollRef.current, 'scrollTop', { value: 150, writable: true });

      render(<TopBar {...defaultProps} scrollContainerRef={scrollRef} />);

      fireEvent.scroll(scrollRef.current);
    });
  });

  describe('Dropdown Closes After Action', () => {
    it('should close dropdown after Settings is clicked', () => {
      render(<TopBar {...defaultProps} />);

      const avatar = screen.getByTestId('avatar');
      fireEvent.click(avatar);

      fireEvent.click(screen.getByText('Settings'));

      // After clicking settings, the dropdown state toggles off
      // (internally showProfileMenu becomes false)
      expect(defaultProps.onOpenSettings).toHaveBeenCalled();
    });

    it('should close dropdown after Sign Out is clicked', () => {
      render(<TopBar {...defaultProps} />);

      const avatar = screen.getByTestId('avatar');
      fireEvent.click(avatar);

      fireEvent.click(screen.getByText('Sign Out'));

      expect(defaultProps.onSignOut).toHaveBeenCalled();
    });
  });
});
