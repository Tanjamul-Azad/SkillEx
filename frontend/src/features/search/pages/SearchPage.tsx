import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Filter, Loader2 } from 'lucide-react';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { UnifiedSearchBox } from '@/components/search/UnifiedSearchBox';
import { SearchResultCard } from '@/components/search/SearchResultCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SearchService, type SearchResult, type GroupedSearchResults } from '@/services/searchService';
import { cn } from '@/lib/utils';

type ResultFilter = 'all' | 'mentors' | 'skills' | 'discussions' | 'circles';

interface FilterOption {
  id: ResultFilter;
  label: string;
  icon: string;
}

const FILTERS: FilterOption[] = [
  { id: 'all', label: 'All Results', icon: 'Search' },
  { id: 'mentors', label: 'Mentors', icon: 'Users' },
  { id: 'skills', label: 'Skills', icon: 'Sparkles' },
  { id: 'discussions', label: 'Discussions', icon: 'MessageSquare' },
  { id: 'circles', label: 'Circles', icon: 'Circle' },
];

export default function SearchPage() {
  useDocumentTitle('Search');
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialQuery = searchParams.get('q') || '';
  const initialFilter = (searchParams.get('type') as ResultFilter | null) || 'all';
  const [query, setQuery] = useState(initialQuery);
  const [loading, setLoading] = useState(!!initialQuery);
  const [results, setResults] = useState<GroupedSearchResults>({
    mentors: [],
    skills: [],
    discussions: [],
    circles: [],
  });
  const [selectedFilter, setSelectedFilter] = useState<ResultFilter>(
    FILTERS.some((filter) => filter.id === initialFilter) ? initialFilter : 'all'
  );

  useEffect(() => {
    const nextQuery = searchParams.get('q') || '';
    setQuery(nextQuery);
    const nextType = (searchParams.get('type') as ResultFilter | null) || 'all';
    if (FILTERS.some((filter) => filter.id === nextType)) {
      setSelectedFilter(nextType);
    }
  }, [searchParams]);

  // Perform search when query changes
  useEffect(() => {
    if (!query.trim()) {
      setResults({ mentors: [], skills: [], discussions: [], circles: [] });
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);

    const runSearch = async () => {
      try {
        const grouped = await SearchService.searchGrouped(query, 20);
        if (active) {
          setResults(grouped);
        }
      } catch (error) {
        console.error('Search failed:', error);
        if (active) {
          setResults({ mentors: [], skills: [], discussions: [], circles: [] });
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
  }, [query]);

  // Get filtered results
  const filteredResults = useMemo((): SearchResult[] => {
    const allResults: SearchResult[] = [
      ...results.mentors,
      ...results.skills,
      ...results.discussions,
      ...results.circles,
    ];

    if (selectedFilter === 'all') {
      return allResults.sort((a, b) => b.relevanceScore - a.relevanceScore);
    }

    const typeForFilter: Record<Exclude<ResultFilter, 'all'>, SearchResult['type']> = {
      mentors: 'mentor',
      skills: 'skill',
      discussions: 'discussion',
      circles: 'circle',
    };

    return allResults.filter((r) => r.type === typeForFilter[selectedFilter])
      .sort((a, b) => b.relevanceScore - a.relevanceScore);
  }, [results, selectedFilter]);

  const resultCounts = {
    all: results.mentors.length + results.skills.length + results.discussions.length + results.circles.length,
    mentors: results.mentors.length,
    skills: results.skills.length,
    discussions: results.discussions.length,
    circles: results.circles.length,
  };

  const handleSearch = useCallback((newQuery: string) => {
    setQuery(newQuery);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      const trimmed = newQuery.trim();
      if (trimmed) {
        next.set('q', trimmed);
      } else {
        next.delete('q');
      }
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const routeForResult = useCallback((result: SearchResult) => {
    if (result.type === 'mentor') return `/profile/${result.id}`;
    if (result.type === 'discussion') return `/community?tab=discussions&discussionId=${result.id}`;
    if (result.type === 'circle') return `/community?tab=circles&circleId=${result.id}`;
    if (result.type === 'skill') return `/search?q=${encodeURIComponent(result.name)}&type=mentors`;
    return '/search';
  }, []);

  const handleFilterChange = (filterId: ResultFilter) => {
    setSelectedFilter(filterId);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (filterId === 'all') {
        next.delete('type');
      } else {
        next.set('type', filterId);
      }
      return next;
    }, { replace: true });
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col h-full bg-gradient-to-br from-background via-background to-primary/5 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900/20">
        {/* Header */}
        <div className="border-b border-border/70 bg-card/50 backdrop-blur-sm dark:border-white/10 dark:bg-slate-900/20 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {/* Back Button */}
            <div className="mb-6">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(-1)}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            </div>

            {/* Title & Search */}
            <div className="space-y-4">
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">
                  Global Semantic Search
                </h1>
                <p className="text-sm text-muted-foreground">
                  Find mentors, skills, discussions, and communities using AI-powered semantic matching
                </p>
              </div>

              {/* Search Box */}
              <div className="max-w-2xl">
                <UnifiedSearchBox
                  placeholder="Search mentors, skills, discussions, circles..."
                  initialQuery={query}
                  onQueryChange={handleSearch}
                  onResultSelected={(result) => navigate(routeForResult(result))}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Filters */}
            {query && (
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-semibold text-muted-foreground">Filter by type</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {FILTERS.map((filter) => (
                    <Button
                      key={filter.id}
                      variant={selectedFilter === filter.id ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleFilterChange(filter.id)}
                      className="rounded-full"
                    >
                      {filter.label}
                      {resultCounts[filter.id] > 0 && (
                        <Badge
                          variant={selectedFilter === filter.id ? 'secondary' : 'outline'}
                          className="ml-2 text-xs"
                        >
                          {resultCounts[filter.id]}
                        </Badge>
                      )}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Results */}
            {!query ? (
              <div className="min-h-[400px] flex flex-col items-center justify-center">
                <div className="text-center space-y-4">
                  <h2 className="text-2xl font-semibold text-foreground">
                    Start searching
                  </h2>
                  <p className="text-muted-foreground max-w-md">
                    Use the search box above to find mentors, skills, discussions, and skill circles using semantic search powered by embeddings.
                  </p>
                </div>
              </div>
            ) : loading ? (
              <div className="min-h-[400px] flex flex-col items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">Searching across all content...</p>
              </div>
            ) : filteredResults.length === 0 ? (
              <div className="min-h-[400px] flex flex-col items-center justify-center">
                <div className="text-center space-y-4">
                  <h2 className="text-xl font-semibold text-foreground">
                    No results found
                  </h2>
                  <p className="text-muted-foreground">
                    Try different keywords or adjust your filters
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Results Info */}
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Found <span className="font-semibold text-foreground">
                      {filteredResults.length}
                    </span> result{filteredResults.length !== 1 ? 's' : ''} for "{query}"
                  </p>
                </div>

                {/* Results Grid */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <AnimatePresence>
                    {filteredResults.map((result, idx) => (
                      <motion.div
                        key={`${result.type}-${result.id}`}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.2, delay: idx * 0.05 }}
                      >
                        <SearchResultCard
                          result={result}
                          onClick={() => {}}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
