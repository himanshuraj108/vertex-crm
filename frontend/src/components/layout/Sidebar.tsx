'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Target,
  Megaphone,
  Bot,
  Coffee,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/customers', label: 'Customers',    icon: Users },
  { href: '/segments',  label: 'Segments',     icon: Target },
  { href: '/campaigns', label: 'Campaigns',    icon: Megaphone },
  { href: '/ai',        label: 'AI Assistant', icon: Bot },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-[240px] flex-col border-r border-zinc-200 bg-white">
      {/* Logo */}
      <div className="flex h-14 items-center border-b border-zinc-200 px-5">
        <span className="text-lg font-bold tracking-tight text-zinc-900">
          Vertex
          <span className="ml-1 text-blue-600">.</span>
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
              )}
            >
              <Icon
                size={16}
                className={cn(isActive ? 'text-blue-600' : 'text-zinc-400')}
              />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Brand footer */}
      <div className="border-t border-zinc-200 px-5 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-amber-50">
            <Coffee size={14} className="text-amber-600" />
          </div>
          <div>
            <p className="text-xs font-semibold text-zinc-900">BrewCo</p>
            <p className="text-[11px] text-zinc-400">Premium Coffee Chain</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
