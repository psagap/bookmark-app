import React, { useState } from 'react';
import { ArrowLeft, Check, Palette, Sparkles, Moon, Sun, Monitor, ChevronDown } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { themeCategories } from '../config/themes';

// Theme Preview Card Component
const ThemePreviewCard = ({ theme, isSelected, onSelect }) => {
  const { preview, name, description, category } = theme;

  return (
    <button
      onClick={() => onSelect(theme.id)}
      className={`
        group relative w-full text-left rounded-2xl overflow-hidden
        transition-all duration-300 transform
        ${isSelected
          ? 'ring-2 ring-offset-2 scale-[1.02] shadow-2xl'
          : 'hover:scale-[1.01] hover:shadow-xl'
        }
      `}
      style={{
        '--ring-color': preview.primary,
        '--ring-offset-color': preview.background,
        ringColor: isSelected ? preview.primary : 'transparent',
        ringOffsetColor: preview.background,
      }}
    >
      {/* Preview Area */}
      <div
        className="relative h-44 p-4 overflow-hidden"
        style={{ backgroundColor: preview.background }}
      >
        {/* Mesh gradient effect */}
        <div
          className="absolute inset-0 opacity-60"
          style={{
            background: `
              radial-gradient(ellipse at 20% 20%, ${preview.primary}30 0%, transparent 50%),
              radial-gradient(ellipse at 80% 80%, ${preview.secondary}25 0%, transparent 50%),
              radial-gradient(ellipse at 80% 20%, ${preview.accent}20 0%, transparent 40%)
            `,
          }}
        />

        {/* Mock UI Elements */}
        <div className="relative z-10 h-full flex flex-col">
          {/* Mock header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-lg"
                style={{ backgroundColor: `${preview.primary}30` }}
              />
              <div className="space-y-1">
                <div
                  className="w-20 h-2 rounded-full"
                  style={{ backgroundColor: `${preview.primary}` }}
                />
                <div
                  className="w-12 h-1.5 rounded-full opacity-40"
                  style={{ backgroundColor: preview.primary }}
                />
              </div>
            </div>
            <div
              className="w-6 h-6 rounded-full"
              style={{ backgroundColor: `${preview.accent}40` }}
            />
          </div>

          {/* Mock cards grid */}
          <div className="flex-1 grid grid-cols-3 gap-2">
            {/* Card 1 - larger */}
            <div
              className="col-span-2 rounded-lg p-2 flex flex-col justify-between"
              style={{
                backgroundColor: `${preview.primary}15`,
                border: `1px solid ${preview.primary}30`,
              }}
            >
              <div className="space-y-1">
                <div
                  className="w-full h-1.5 rounded-full"
                  style={{ backgroundColor: `${preview.primary}60` }}
                />
                <div
                  className="w-3/4 h-1.5 rounded-full"
                  style={{ backgroundColor: `${preview.primary}40` }}
                />
              </div>
              <div className="flex gap-1 mt-2">
                <div
                  className="w-8 h-4 rounded-full"
                  style={{ backgroundColor: preview.secondary }}
                />
                <div
                  className="w-6 h-4 rounded-full"
                  style={{ backgroundColor: preview.accent }}
                />
              </div>
            </div>

            {/* Card 2 */}
            <div
              className="rounded-lg p-2"
              style={{
                backgroundColor: `${preview.secondary}20`,
                border: `1px solid ${preview.secondary}30`,
              }}
            >
              <div
                className="w-full h-10 rounded mb-1"
                style={{ backgroundColor: `${preview.secondary}30` }}
              />
              <div
                className="w-full h-1.5 rounded-full"
                style={{ backgroundColor: `${preview.secondary}50` }}
              />
            </div>

            {/* Card 3 */}
            <div
              className="rounded-lg p-2"
              style={{
                backgroundColor: `${preview.accent}15`,
                border: `1px solid ${preview.accent}25`,
              }}
            >
              <div className="flex items-center gap-1 mb-1">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: preview.accent }}
                />
                <div
                  className="w-8 h-1.5 rounded-full"
                  style={{ backgroundColor: `${preview.accent}60` }}
                />
              </div>
              <div
                className="w-full h-1 rounded-full"
                style={{ backgroundColor: `${preview.accent}40` }}
              />
            </div>

            {/* Card 4 */}
            <div
              className="col-span-2 rounded-lg p-2"
              style={{
                backgroundColor: `${preview.primary}10`,
                border: `1px solid ${preview.primary}20`,
              }}
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded"
                  style={{ backgroundColor: `${preview.primary}25` }}
                />
                <div className="flex-1 space-y-1">
                  <div
                    className="w-3/4 h-1.5 rounded-full"
                    style={{ backgroundColor: `${preview.primary}50` }}
                  />
                  <div
                    className="w-1/2 h-1 rounded-full"
                    style={{ backgroundColor: `${preview.primary}30` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Selected checkmark */}
        {isSelected && (
          <div
            className="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center shadow-lg"
            style={{ backgroundColor: preview.primary }}
          >
            <Check className="w-4 h-4" style={{ color: preview.background }} />
          </div>
        )}

        {/* Glow effect on hover */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
          style={{
            boxShadow: `inset 0 0 60px ${preview.primary}20`,
          }}
        />
      </div>

      {/* Theme Info */}
      <div
        className="p-4"
        style={{
          backgroundColor: preview.background,
          borderTop: `1px solid ${preview.primary}20`,
        }}
      >
        <div className="flex items-center justify-between mb-1">
          <h3
            className="font-semibold text-base"
            style={{ color: preview.primary }}
          >
            {name}
          </h3>
          {isSelected && (
            <span
              className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: `${preview.primary}20`,
                color: preview.primary,
              }}
            >
              Active
            </span>
          )}
        </div>
        <p
          className="text-sm opacity-60"
          style={{ color: preview.primary }}
        >
          {description}
        </p>

        {/* Color swatches */}
        <div className="flex gap-1.5 mt-3">
          <div
            className="w-5 h-5 rounded-full shadow-sm"
            style={{ backgroundColor: preview.primary }}
            title="Primary"
          />
          <div
            className="w-5 h-5 rounded-full shadow-sm"
            style={{ backgroundColor: preview.secondary }}
            title="Secondary"
          />
          <div
            className="w-5 h-5 rounded-full shadow-sm"
            style={{ backgroundColor: preview.accent }}
            title="Accent"
          />
          <div
            className="w-5 h-5 rounded-full shadow-sm border border-white/20"
            style={{ backgroundColor: preview.background }}
            title="Background"
          />
        </div>
      </div>
    </button>
  );
};

// Settings Section Component
const SettingsSection = ({ title, icon: Icon, children, description }) => (
  <div className="mb-10">
    <div className="flex items-center gap-3 mb-4">
      {Icon && (
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: 'var(--theme-primary)20' }}
        >
          <Icon className="w-5 h-5" style={{ color: 'var(--theme-primary)' }} />
        </div>
      )}
      <div>
        <h2
          className="text-xl font-semibold"
          style={{ color: 'var(--theme-fg-light)' }}
        >
          {title}
        </h2>
        {description && (
          <p
            className="text-sm mt-0.5"
            style={{ color: 'var(--theme-fg-muted)' }}
          >
            {description}
          </p>
        )}
      </div>
    </div>
    {children}
  </div>
);

// Category Filter Pill
const CategoryPill = ({ category, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`
      px-4 py-2 rounded-full text-sm font-medium transition-all duration-200
      ${isActive
        ? 'shadow-lg scale-105'
        : 'opacity-70 hover:opacity-100'
      }
    `}
    style={{
      backgroundColor: isActive ? 'var(--theme-primary)' : 'var(--theme-bg-lighter)',
      color: isActive ? 'var(--theme-bg-darkest)' : 'var(--theme-fg)',
    }}
  >
    {category.label}
  </button>
);

// Main Settings Page Component
const SettingsPage = ({ onBack }) => {
  const { currentTheme, currentThemeId, setTheme, availableThemes } = useTheme();
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter themes by category and search
  const filteredThemes = availableThemes.filter(theme => {
    const matchesCategory = activeCategory === 'all' || theme.category === activeCategory;
    const matchesSearch = !searchQuery ||
      theme.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      theme.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: 'var(--theme-bg-darkest)' }}
    >
      {/* Header */}
      <div
        className="sticky top-0 z-50 backdrop-blur-md border-b"
        style={{
          backgroundColor: 'var(--theme-bg-darkest)e6',
          borderColor: 'var(--theme-bg-lighter)',
        }}
      >
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-200 hover:scale-105"
                style={{
                  backgroundColor: 'var(--theme-bg-light)',
                  color: 'var(--theme-fg)',
                }}
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="font-medium">Back</span>
              </button>
              <div>
                <h1
                  className="text-2xl font-display font-semibold"
                  style={{ color: 'var(--theme-fg-light)' }}
                >
                  Settings
                </h1>
                <p
                  className="text-sm"
                  style={{ color: 'var(--theme-fg-muted)' }}
                >
                  Customize your experience
                </p>
              </div>
            </div>

            {/* Current Theme Badge */}
            <div
              className="flex items-center gap-3 px-4 py-2 rounded-xl"
              style={{ backgroundColor: 'var(--theme-bg-light)' }}
            >
              <Sparkles className="w-4 h-4" style={{ color: 'var(--theme-primary)' }} />
              <span style={{ color: 'var(--theme-fg-muted)' }}>Current:</span>
              <span
                className="font-semibold"
                style={{ color: 'var(--theme-primary)' }}
              >
                {currentTheme.name}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Theme Selection Section */}
        <SettingsSection
          title="Appearance"
          icon={Palette}
          description="Choose a theme that matches your style"
        >
          {/* Category Filters */}
          <div className="flex flex-wrap gap-2 mb-6">
            {themeCategories.map(category => (
              <CategoryPill
                key={category.id}
                category={category}
                isActive={activeCategory === category.id}
                onClick={() => setActiveCategory(category.id)}
              />
            ))}
          </div>

          {/* Search */}
          <div className="relative mb-6">
            <input
              type="text"
              placeholder="Search themes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full max-w-md px-4 py-3 rounded-xl text-sm outline-none transition-all duration-200"
              style={{
                backgroundColor: 'var(--theme-bg-light)',
                color: 'var(--theme-fg)',
                border: '1px solid var(--theme-bg-lighter)',
              }}
            />
          </div>

          {/* Theme Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredThemes.map(theme => (
              <ThemePreviewCard
                key={theme.id}
                theme={theme}
                isSelected={currentThemeId === theme.id}
                onSelect={setTheme}
              />
            ))}
          </div>

          {filteredThemes.length === 0 && (
            <div
              className="text-center py-12 rounded-xl"
              style={{ backgroundColor: 'var(--theme-bg-light)' }}
            >
              <p style={{ color: 'var(--theme-fg-muted)' }}>
                No themes found matching your search.
              </p>
            </div>
          )}
        </SettingsSection>

        {/* Future Settings Sections (placeholder) */}
        <SettingsSection
          title="More Settings Coming Soon"
          icon={Sparkles}
          description="We're working on more customization options"
        >
          <div
            className="p-8 rounded-xl text-center"
            style={{
              backgroundColor: 'var(--theme-bg-light)',
              border: '1px dashed var(--theme-bg-lighter)',
            }}
          >
            <Sparkles
              className="w-12 h-12 mx-auto mb-4 opacity-40"
              style={{ color: 'var(--theme-primary)' }}
            />
            <p
              className="text-lg font-medium mb-2"
              style={{ color: 'var(--theme-fg)' }}
            >
              More customization coming soon
            </p>
            <p
              className="text-sm"
              style={{ color: 'var(--theme-fg-muted)' }}
            >
              Font sizes, card styles, layout options, and more
            </p>
          </div>
        </SettingsSection>
      </div>

      {/* Footer */}
      <div
        className="border-t py-6"
        style={{ borderColor: 'var(--theme-bg-lighter)' }}
      >
        <div className="max-w-6xl mx-auto px-6 text-center">
          <p
            className="text-sm"
            style={{ color: 'var(--theme-fg-muted)' }}
          >
            Theme changes are saved automatically and persist across sessions
          </p>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
