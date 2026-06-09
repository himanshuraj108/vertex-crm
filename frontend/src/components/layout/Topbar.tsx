'use client';

import { usePathname } from 'next/navigation';
import { Search, Sun, Moon } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { useEffect, useState } from 'react';

const ROUTE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/customers': 'Customers',
  '/segments':  'Segments',
  '/campaigns': 'Campaigns',
  '/ai':        'AI Assistant',
};

function getTitle(pathname: string): string {
  for (const [route, title] of Object.entries(ROUTE_TITLES)) {
    if (pathname.startsWith(route)) return title;
  }
  return 'Vertex CRM';
}

export function Topbar() {
  const pathname = usePathname();
  const setCommandPaletteOpen = useAppStore((s) => s.setCommandPaletteOpen);
  const title = getTitle(pathname);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark');
    setTheme(isDark ? 'dark' : 'light');
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  return (
    <header className="fixed left-[240px] right-0 top-0 z-20 flex h-14 items-center justify-between border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-6">
      <h1 className="text-[15px] font-semibold text-zinc-900 dark:text-zinc-50">
        {title}
      </h1>

      <div className="flex items-center gap-2">
        {/* Command palette trigger */}
        <button
          onClick={() => setCommandPaletteOpen(true)}
          className="flex items-center gap-2 rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-3 py-1.5 text-sm text-zinc-500 transition-colors hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-white dark:hover:bg-zinc-950"
        >
          <Search size={13} />
          <span>Search</span>
          <kbd className="ml-1 rounded bg-zinc-200 dark:bg-zinc-800 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500">
            ⌘K
          </kbd>
        </button>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-400 dark:text-zinc-500 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-700 dark:hover:text-zinc-300"
          aria-label="Toggle theme"
        >
          {theme === 'light' ? <Moon size={15} /> : <Sun size={15} />}
        </button>

        {/* Avatar */}
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">
          H
        </div>
      </div>
    </header>
  );
}
