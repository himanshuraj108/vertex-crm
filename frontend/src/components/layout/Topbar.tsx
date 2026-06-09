'use client';

import { usePathname } from 'next/navigation';
import { Search, Bell } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';

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

  return (
    <header className="fixed left-[240px] right-0 top-0 z-20 flex h-14 items-center justify-between border-b border-zinc-200 bg-white px-6">
      <h1 className="text-[15px] font-semibold text-zinc-900">{title}</h1>

      <div className="flex items-center gap-2">
        {/* Command palette trigger */}
        <button
          onClick={() => setCommandPaletteOpen(true)}
          className="flex items-center gap-2 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-sm text-zinc-500 transition-colors hover:border-zinc-300 hover:bg-white"
        >
          <Search size={13} />
          <span>Search</span>
          <kbd className="ml-1 rounded bg-zinc-200 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500">
            ⌘K
          </kbd>
        </button>

        {/* Notifications */}
        <button className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700">
          <Bell size={15} />
        </button>

        {/* Avatar */}
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">
          H
        </div>
      </div>
    </header>
  );
}
