'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, LayoutDashboard, Users, Target, Megaphone, Bot, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/stores/useAppStore';
import { cn } from '@/lib/utils';

const PAGES = [
  { label: 'Dashboard',    href: '/dashboard', icon: LayoutDashboard },
  { label: 'Customers',    href: '/customers',  icon: Users },
  { label: 'Segments',     href: '/segments',   icon: Target },
  { label: 'Campaigns',    href: '/campaigns',  icon: Megaphone },
  { label: 'AI Assistant', href: '/ai',         icon: Bot },
];

export function CommandPalette() {
  const { commandPaletteOpen, setCommandPaletteOpen } = useAppStore();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const router = useRouter();

  const filtered = PAGES.filter((p) =>
    p.label.toLowerCase().includes(query.toLowerCase())
  );

  const navigate = useCallback(
    (href: string) => {
      router.push(href);
      setCommandPaletteOpen(false);
      setQuery('');
    },
    [router, setCommandPaletteOpen]
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
      if (e.key === 'Escape') setCommandPaletteOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [setCommandPaletteOpen]);

  useEffect(() => {
    if (!commandPaletteOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      }
      if (e.key === 'Enter' && filtered[activeIndex]) {
        navigate(filtered[activeIndex].href);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [commandPaletteOpen, filtered, activeIndex, navigate]);

  useEffect(() => setActiveIndex(0), [query]);

  return (
    <AnimatePresence>
      {commandPaletteOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
            onClick={() => setCommandPaletteOpen(false)}
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="fixed left-1/2 top-24 z-50 w-full max-w-md -translate-x-1/2 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-2xl"
          >
            {/* Search input */}
            <div className="flex items-center gap-3 border-b border-zinc-100 px-4 py-3">
              <Search size={15} className="shrink-0 text-zinc-400" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search pages..."
                className="flex-1 bg-transparent text-sm text-zinc-900 placeholder-zinc-400 outline-none"
              />
              <kbd className="shrink-0 rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-500">
                ESC
              </kbd>
            </div>

            {/* Results */}
            <div className="py-2">
              {filtered.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-zinc-400">
                  No results found
                </p>
              ) : (
                <>
                  <p className="px-4 pb-1.5 text-[11px] font-medium uppercase tracking-wider text-zinc-400">
                    Navigation
                  </p>
                  {filtered.map((item, i) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.href}
                        onClick={() => navigate(item.href)}
                        className={cn(
                          'flex w-full items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors',
                          i === activeIndex
                            ? 'bg-blue-50 text-blue-700'
                            : 'text-zinc-700 hover:bg-zinc-50'
                        )}
                      >
                        <Icon size={14} className={cn(i === activeIndex ? 'text-blue-600' : 'text-zinc-400')} />
                        <span className="flex-1 font-medium">{item.label}</span>
                        {i === activeIndex && <ArrowRight size={13} className="text-blue-400" />}
                      </button>
                    );
                  })}
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
