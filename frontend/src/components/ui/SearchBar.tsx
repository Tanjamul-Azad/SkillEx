
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from './input';

interface SearchBarProps {
  placeholder?: string;
  onSearch: (query: string) => void;
  showShortcut?: boolean;
  className?: string;
}

export function SearchBar({
  placeholder = 'Search...',
  onSearch,
  showShortcut = true,
  className,
}: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        inputRef.current?.focus();
      }
      if (event.key === 'Escape' && document.activeElement === inputRef.current) {
        setQuery('');
        onSearch('');
        inputRef.current?.blur();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSearch]);
  
  const handleQueryChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const newQuery = event.target.value;
      setQuery(newQuery);
      onSearch(newQuery);
  }

  return (
    <motion.div
      layout
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className={cn('relative w-full', className)}
    >
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
      <Input
        ref={inputRef}
        value={query}
        onChange={handleQueryChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder}
        className="pl-10 text-base"
      />
      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
        <AnimatePresence>
            {query && (
                <motion.button
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.5 }}
                    onClick={() => {
                        setQuery('');
                        onSearch('');
                    }}
                    className="p-1 rounded-full hover:bg-muted"
                >
                    <X className="h-4 w-4 text-muted-foreground" />
                </motion.button>
            )}
        </AnimatePresence>
        {showShortcut && (
            <kbd className="pointer-events-none hidden h-6 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[12px] font-medium opacity-100 md:flex">
                <span className="text-sm">⌘</span>K
            </kbd>
        )}
      </div>
    </motion.div>
  );
}
