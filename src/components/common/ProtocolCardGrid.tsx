import React from 'react';
import { Search, X, Star, FileText, Plus } from 'lucide-react';

interface ProtocolCardGridProps<T> {
  items: T[];
  pinnedItems: T[];
  renderCard: (item: T) => React.ReactNode;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  categories: string[];
  tags: string[];
  selectedCategory: string | null;
  selectedTag: string | null;
  onSelectCategory: (cat: string | null) => void;
  onSelectTag: (tag: string | null) => void;
  emptyStateTitle: string;
  emptyStateAction: string;
  onEmptyAction: () => void;
  headerTitle: string;
  headerSubtitle: string;
  headerButtonLabel: string;
  onHeaderButtonClick: () => void;
}

export function ProtocolCardGrid<T extends { id?: string | number }>(props: ProtocolCardGridProps<T>) {
  const {
    items,
    pinnedItems,
    renderCard,
    searchQuery,
    onSearchChange,
    categories,
    tags,
    selectedCategory,
    selectedTag,
    onSelectCategory,
    onSelectTag,
    emptyStateTitle,
    emptyStateAction,
    onEmptyAction,
    headerTitle,
    headerSubtitle,
    headerButtonLabel,
    onHeaderButtonClick,
  } = props;

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6 animate-in fade-in duration-150">
      {/* Header Banner */}
      <div className="bg-white dark:bg-semantic-card border border-semantic-border rounded-2xl p-6 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-semantic-text">{headerTitle}</h1>
          <p className="text-sm text-semantic-text-secondary mt-1">{headerSubtitle}</p>
        </div>
        <button
          onClick={onHeaderButtonClick}
          className="bg-indigo-600 hover:bg-indigo-700 dark:hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{headerButtonLabel}</span>
        </button>
      </div>

      {/* Toolbar: Search, Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-semantic-text-muted" />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white dark:bg-semantic-surface border border-semantic-border text-semantic-text placeholder-semantic-text-muted focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm"
          />
        </div>

        {/* Categories ribbon */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide flex-1">
          <button
            onClick={() => onSelectCategory(null)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors border cursor-pointer ${
              selectedCategory === null
                ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                : 'bg-white dark:bg-semantic-surface text-semantic-text-secondary border-semantic-border hover:bg-slate-50 dark:hover:bg-semantic-elevated dark:hover:border-slate-600'
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => onSelectCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors border cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                  : 'bg-white dark:bg-semantic-surface text-semantic-text-secondary border-semantic-border hover:bg-slate-50 dark:hover:bg-semantic-elevated dark:hover:border-slate-600'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Active Tag Pill */}
      {selectedTag && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-semantic-text-secondary">Filtered by tag:</span>
          <div className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-full text-sm">
            <span>#{selectedTag}</span>
            <button
              onClick={() => onSelectTag(null)}
              className="p-0.5 hover:bg-indigo-200 dark:hover:bg-indigo-800 rounded-full transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      {items.length === 0 && pinnedItems.length === 0 ? (
        <div className="py-16 text-center bg-white dark:bg-semantic-surface border border-semantic-border rounded-2xl shadow-2xs">
          <div className="w-16 h-16 bg-slate-50 dark:bg-semantic-elevated rounded-2xl flex items-center justify-center mx-auto mb-4 border border-semantic-border">
            <FileText className="w-8 h-8 text-semantic-text-muted" />
          </div>
          <h3 className="text-lg font-bold text-semantic-text mb-2">{emptyStateTitle}</h3>
          <p className="text-sm text-semantic-text-secondary mb-6 max-w-sm mx-auto">
            Get started by creating your first item or adjust your search filters to find what you're looking for.
          </p>
          <button
            onClick={onEmptyAction}
            className="bg-indigo-600 hover:bg-indigo-700 dark:hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold inline-flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{emptyStateAction}</span>
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Pinned Items */}
          {pinnedItems.length > 0 && !searchQuery && !selectedCategory && !selectedTag && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 px-1">
                <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                <h2 className="text-lg font-bold text-semantic-text">Pinned</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {pinnedItems.map((item, idx) => (
                  <div key={item.id ?? idx}>{renderCard(item)}</div>
                ))}
              </div>
            </div>
          )}

          {/* Regular Items */}
          {(items.length > 0 || (searchQuery || selectedCategory || selectedTag)) && (
            <div className="space-y-4">
              {pinnedItems.length > 0 && !searchQuery && !selectedCategory && !selectedTag && (
                <div className="flex items-center gap-2 px-1">
                  <FileText className="w-5 h-5 text-semantic-text-muted" />
                  <h2 className="text-lg font-bold text-semantic-text">All Items</h2>
                </div>
              )}
              {items.length === 0 ? (
                <div className="py-12 text-center text-semantic-text-secondary">
                  No items match your filters.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {items.map((item, idx) => (
                    <div key={item.id ?? idx}>{renderCard(item)}</div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
