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
  queued:    { label: 'Queued',    className: 'bg-zinc-100 text-zinc-600' },
  sent:      { label: 'Sent',      className: 'bg-blue-50 text-blue-700' },
  delivered: { label: 'Delivered', className: 'bg-indigo-50 text-indigo-700' },
  failed:    { label: 'Failed',    className: 'bg-red-50 text-red-700' },
  opened:    { label: 'Opened',    className: 'bg-amber-50 text-amber-700' },
  read:      { label: 'Read',      className: 'bg-green-50 text-green-700' },
  clicked:   { label: 'Clicked',   className: 'bg-emerald-50 text-emerald-700' },
  draft:     { label: 'Draft',     className: 'bg-zinc-100 text-zinc-600' },
  running:   { label: 'Running',   className: 'bg-blue-50 text-blue-700' },
  completed: { label: 'Completed', className: 'bg-green-50 text-green-700' },
  failed_c:  { label: 'Failed',    className: 'bg-red-50 text-red-700' },
};

export const CHANNEL_CONFIG: Record<string, { label: string; className: string; openRate: string }> = {
  whatsapp: { label: 'WhatsApp', className: 'bg-green-50 text-green-700',   openRate: '78%' },
  sms:      { label: 'SMS',      className: 'bg-orange-50 text-orange-700', openRate: '55%' },
  email:    { label: 'Email',    className: 'bg-blue-50 text-blue-700',     openRate: '38%' },
  rcs:      { label: 'RCS',      className: 'bg-purple-50 text-purple-700', openRate: '62%' },
};
