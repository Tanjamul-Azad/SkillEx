import React, { FC } from 'react';
import { motion } from 'framer-motion';
import { SlidersHorizontal, Sparkles, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

export const categories = [
  { id: 'Tech', name: 'Technology' },
  { id: 'Creative', name: 'Creative' },
  { id: 'Design', name: 'Design' },
  { id: 'Business', name: 'Business' },
  { id: 'Communication', name: 'Communication' },
  { id: 'Language', name: 'Language' },
  { id: 'Lifestyle', name: 'Lifestyle' },
];

export type Filters = {
  categories: string[];
  levels: string[];
  sessionType: string;
  compatibility: number[];
  rating: number;
  search: string;
};

export const defaultFilters: Filters = {
  categories: [],
  levels: [],
  sessionType: 'Both',
  compatibility: [50],
  rating: 0,
  search: '',
};

interface FilterSidebarProps {
  filters: Filters;
  setFilters: (f: Filters) => void;
  onApply?: () => void;
  mobileSheetOpen: boolean;
  setMobileSheetOpen: (open: boolean) => void;
}

export const FilterSidebar: FC<FilterSidebarProps> = React.memo(({
  filters,
  setFilters,
  onApply: _onApply,
  mobileSheetOpen,
  setMobileSheetOpen
}) => {
  const PillToggle: FC<{ label: string; active: boolean; onClick: () => void }> = ({ label, active, onClick }) => (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={cn(
        'rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide transition-all duration-300 ease-snappy',
        active
          ? 'border border-primary/45 bg-primary/15 text-primary shadow-[0_0_16px_hsl(var(--primary)/0.12)]'
          : 'border border-border/70 bg-muted/20 text-muted-foreground hover:border-primary/30 hover:bg-muted/40'
      )}
    >
      {label}
    </motion.button>
  );

  const content = (
    <div className="flex h-full flex-col gap-4 overflow-y-auto custom-scrollbar p-4">
      {/* Categories */}
      <div className="space-y-2.5">
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
          <Sparkles className="h-3 w-3 text-primary"/> Categories
        </h3>
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <PillToggle
              key={category.id}
              label={category.name}
              active={filters.categories.includes(category.id)}
              onClick={() => {
                setFilters({
                  ...filters,
                  categories: filters.categories.includes(category.id)
                    ? filters.categories.filter((c) => c !== category.id)
                    : [...filters.categories, category.id],
                });
              }}
            />
          ))}
        </div>
      </div>

      {/* Levels */}
      <div className="space-y-2.5">
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Level</h3>
        <div className="flex flex-wrap gap-2">
          {['beginner', 'moderate', 'expert'].map((level) => (
            <PillToggle
              key={level}
              label={level.charAt(0).toUpperCase() + level.slice(1)}
              active={filters.levels.includes(level)}
              onClick={() => {
                setFilters({
                  ...filters,
                  levels: filters.levels.includes(level)
                    ? filters.levels.filter((l) => l !== level)
                    : [...filters.levels, level],
                });
              }}
            />
          ))}
        </div>
      </div>

      {/* Session Type */}
      <div className="space-y-2.5">
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Session Type</h3>
        <div className="flex flex-wrap gap-2">
          {['Online', 'In-person', 'Both'].map((type) => (
            <PillToggle
              key={type}
              label={type}
              active={filters.sessionType === type}
              onClick={() => setFilters({ ...filters, sessionType: type })}
            />
          ))}
        </div>
      </div>

      {/* Minimum Compatibility */}
      <div className="space-y-3 rounded-2xl border border-border/50 bg-card p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Min Match</h3>
          <span className="text-lg font-headline font-bold text-primary">{filters.compatibility[0]}%</span>
        </div>
        <Slider
          value={filters.compatibility}
          onValueChange={(value) => setFilters({ ...filters, compatibility: value })}
          max={100}
          min={50}
          step={1}
          className="w-full"
        />
      </div>

      {/* Minimum Rating */}
      <div className="space-y-2.5">
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Minimum Rating</h3>
        <div className="flex gap-2">
          {[3, 4, 4.5].map((r) => (
            <motion.button
              key={r}
              whileTap={{ scale: 0.95 }}
              onClick={() => setFilters({ ...filters, rating: filters.rating === r ? 0 : r })}
              className={cn(
                'flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-bold uppercase transition-all duration-300 ease-snappy',
                filters.rating === r
                  ? 'bg-warning/20 text-warning border border-warning/50'
                  : 'bg-muted/20 text-muted-foreground border border-white/5 hover:border-warning/30 hover:bg-muted/40'
              )}
            >
              <span>{r}</span>
              <Star className="h-3.5 w-3.5 fill-current" />
            </motion.button>
          ))}
        </div>
      </div>

      {/* Reset button */}
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => setFilters(defaultFilters)}
        className="mt-1 w-full rounded-full border border-border/70 bg-muted/20 px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground transition-all duration-300 ease-snappy hover:border-primary/30 hover:bg-muted/40"
      >
        Reset Filters
      </motion.button>
    </div>
  );

  return (
    <>
      <aside className="hidden w-64 shrink-0 overflow-hidden border-r border-border/60 bg-background md:block h-[calc(100vh-64px)] sticky top-16">
        {content}
      </aside>

      <div className="md:hidden">
        <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="fixed bottom-24 right-4 z-40 rounded-full shadow-lg"
              aria-label="Open filters"
            >
              <SlidersHorizontal />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-full max-w-sm p-0 bg-background/95 backdrop-blur-xl">
            <SheetHeader className="border-b border-border/60 p-4">
              <SheetTitle className="flex items-center justify-between">
                Filters
                <Button 
                  variant="link" 
                  className="p-0 text-xs text-muted-foreground hover:text-foreground" 
                  onClick={() => setFilters(defaultFilters)}
                >
                  Reset
                </Button>
              </SheetTitle>
            </SheetHeader>
            {content}
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
});

FilterSidebar.displayName = 'FilterSidebar';
