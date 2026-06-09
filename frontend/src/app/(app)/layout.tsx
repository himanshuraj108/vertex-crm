'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { queryClient } from '@/lib/query-client';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { CommandPalette } from '@/components/layout/CommandPalette';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-[#FAFAFA]">
        <Sidebar />
        <Topbar />
        <CommandPalette />
        <main className="ml-[240px] pt-14">
          <div className="p-6">{children}</div>
        </main>
      </div>
      <Toaster richColors position="bottom-right" />
    </QueryClientProvider>
  );
}
