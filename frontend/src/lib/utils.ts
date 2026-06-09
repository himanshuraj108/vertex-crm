import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { formatDistanceToNow, format, differenceInDays } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  return format(new Date(date), 'MMM d, yyyy');
}

export function formatRelativeTime(date: string | Date): string {
  const d = new Date(date);
  const days = differenceInDays(new Date(), d);
  if (days > 7) return formatDate(d);
  return formatDistanceToNow(d, { addSuffix: true });
}

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

export function formatPercent(value: number, total: number): string {
  if (total === 0) return '0%';
  return `${Math.round((value / total) * 100)}%`;
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + '…';
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();
}

export const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  queued:    { label: 'Queued',    className: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200/50 dark:border-zinc-700/50' },
  sent:      { label: 'Sent',      className: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-100/50 dark:border-blue-900/30' },
  delivered: { label: 'Delivered', className: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border border-indigo-100/50 dark:border-indigo-900/30' },
  failed:    { label: 'Failed',    className: 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-100/50 dark:border-red-900/30' },
  opened:    { label: 'Opened',    className: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-100/50 dark:border-amber-900/30' },
  read:      { label: 'Read',      className: 'bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400 border border-green-100/50 dark:border-green-900/30' },
  clicked:   { label: 'Clicked',   className: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-100/50 dark:border-emerald-900/30' },
  draft:     { label: 'Draft',     className: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200/50 dark:border-zinc-700/50' },
  running:   { label: 'Running',   className: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-100/50 dark:border-blue-900/30' },
  completed: { label: 'Completed', className: 'bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400 border border-green-100/50 dark:border-green-900/30' },
  failed_c:  { label: 'Failed',    className: 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-100/50 dark:border-red-900/30' },
};

export const CHANNEL_CONFIG: Record<string, { label: string; className: string; openRate: string }> = {
  whatsapp: { label: 'WhatsApp', className: 'bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400 border border-green-100/50 dark:border-green-900/30',   openRate: '78%' },
  sms:      { label: 'SMS',      className: 'bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400 border border-orange-100/50 dark:border-orange-900/30', openRate: '55%' },
  email:    { label: 'Email',    className: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-100/50 dark:border-blue-900/30',     openRate: '38%' },
  rcs:      { label: 'RCS',      className: 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400 border border-purple-100/50 dark:border-purple-900/30', openRate: '62%' },
};
