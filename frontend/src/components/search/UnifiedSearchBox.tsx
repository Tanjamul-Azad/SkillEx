import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Loader2, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { SearchService, type SearchResult } from '@/services/searchService';
import { SearchResultCard } from './SearchResultCard';

const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 400;

interface UnifiedSearchBoxProps {
  className?: string;
  placeholder?: string;
  onResultSelected?: (result: SearchResult) => void;
}

/**
 * Unified search box component with autocomplete and semantic search.
 * Integrates embedding-based search across mentors, skills, discussions, and circles.
 */
export function UnifiedSearchBox({
  className,
  placeholder = 'Search mentors, skills, discussions...',
  onResultSelected,
}: UnifiedSearchBoxProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Debounce query
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [query]);

  // Execute search when debounced query changes
  useEffect(() => {
    if (debouncedQuery.length < MIN_QUERY_LENGTH) {
      setResults([]);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);

    const runSearch = async () => {
      try {
        const searchResults = await SearchService.search(debouncedQuery, 12);
        if (active) {
          setResults(searchResults);
          setSelectedIndex(0);
        }
      } catch (error) {
        console.error('Search failed:', error);
        if (active) {
          setResults([]);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    runSearch();
    return () => {
      active = false;
    };
  }, [debouncedQuery]);

  // Close on outside click
  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener('mousedown', onClickOutside);
    return () => window.removeEventListener('mousedown', onClickOutside);
  }, []);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!open || results.length === 0) {
        if (e.key === 'Enter' && debouncedQuery) {
          setOpen(true);
        }
        return;
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => (prev + 1) % results.length);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => (prev - 1 + results.length) % results.length);
          break;
        case 'Enter':
          e.preventDefault();
          if (results[selectedIndex]) {
            handleSelectResult(results[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          setOpen(false);
          break;
      }
    },
    [open, results, selectedIndex]
  );

  const handleSelectResult = (result: SearchResult) => {
    onResultSelected?.(result);
    setOpen(false);
  };

  // Scroll selected item into view
  useEffect(() => {
    if (!resultsRef.current) return;
    const items = resultsRef.current.querySelectorAll('[data-result-index]');
    const selected = items[selectedIndex];
    if (selected) {
      selected.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [selectedIndex]);

  return (
    <div ref={rootRef} className={cn('relative w-full', className)}>
      {/* Search Input */}
      <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-card px-3 py-2.5 shadow-sm transition-all focus-within:border-primary/45 focus-within:shadow-[0_0_0_3px_hsl(var(--primary)/0.12)] dark:border-white/10 dark:bg-slate-950">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (!open) setOpen(true);
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (debouncedQuery.length >= MIN_QUERY_LENGTH || query.length >= MIN_QUERY_LENGTH) {
                setOpen(true);
              }
            }}
            placeholder={placeholder}
            className="h-8 border-0 bg-transparent px-0 text-sm shadow-none focus:border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          {loading && (
            <Loader2 className="h-4 w-4 animate-spin text-primary flex-shrink-0" />
          )}
        </div>
      </div>

      {/* Results Dropdown */}
      <AnimatePresence>
        {open && debouncedQuery.length >= MIN_QUERY_LENGTH && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 max-h-[60vh] overflow-hidden rounded-2xl border border-border/70 bg-popover shadow-2xl dark:border-white/10 dark:bg-slate-950"
          >
            <div className="overflow-y-auto max-h-[60vh]">
              {/* Header */}
              <div className="sticky top-0 z-10 border-b border-border/70 bg-popover/95 backdrop-blur-sm px-4 py-3 dark:border-white/10">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Semantic Search Results
                  </p>
                  <Badge variant="secondary" className="text-[10px]">
                    {loading ? 'Searching...' : `${results.length} found`}
                  </Badge>
                </div>
              </div>

              {/* Loading State */}
              {loading && (
                <div className="flex items-center justify-center gap-2 p-8">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">
                    Searching using embeddings...
                  </span>
                </div>
              )}

              {/* Empty State */}
              {!loading && results.length === 0 && (
                <div className="rounded-lg border border-dashed border-border/70 mx-4 my-4 px-4 py-8 text-center dark:border-white/10">
                  <p className="text-sm text-muted-foreground mb-2">
                    No semantic matches found for "{debouncedQuery}"
                  </p>
                  <p className="text-xs text-muted-foreground/70">
                    Try searching for skills, mentor names, or discussion topics
                  </p>
                </div>
              )}

              {/* Results Grid */}
              {!loading && results.length > 0 && (
                <div
                  ref={resultsRef}
                  className="p-4 space-y-2 max-h-[calc(60vh-100px)] overflow-y-auto"
                >
                  {results.map((result, idx) => (
                    <div
                      key={`${result.type}-${result.id}`}
                      data-result-index={idx}
                      onClick={() => handleSelectResult(result)}
                      className={cn(
                        'cursor-pointer rounded-lg transition-colors',
                        selectedIndex === idx && 'ring-2 ring-primary'
                      )}
                      onMouseEnter={() => setSelectedIndex(idx)}
                    >
                      <SearchResultCard result={result} onClick={() => setOpen(false)} />
                    </div>
                  ))}
                </div>
              )}

              {/* Footer */}
              {results.length > 0 && (
                <div className="border-t border-border/70 bg-muted/30 px-4 py-2 text-center text-xs text-muted-foreground dark:border-white/10">
                  Use arrow keys to navigate, Enter to select, Esc to close
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
