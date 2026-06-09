'use client';

import { useQuery } from '@tanstack/react-query';
import { customersApi } from '@/lib/api-client';
import { formatCurrency, formatDate, formatRelativeTime, getInitials, cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingBag, Megaphone, Mail, Phone, MapPin, Calendar } from 'lucide-react';
import type { Customer, Order, PaginatedResponse } from '@/types';
import { useState } from 'react';

interface CustomerDrawerProps {
  customer: Customer | null;
  onClose: () => void;
}

type Tab = 'overview' | 'orders' | 'campaigns';

export function CustomerDrawer({ customer, onClose }: CustomerDrawerProps) {
  const [tab, setTab] = useState<Tab>('overview');

  const { data: ordersData } = useQuery<PaginatedResponse<Order>>({
    queryKey: ['customer-orders', customer?.id],
    queryFn: () => customersApi.getOrders(customer!.id) as Promise<PaginatedResponse<Order>>,
    enabled: !!customer && tab === 'orders',
  });

  const { data: campaignsData } = useQuery({
    queryKey: ['customer-campaigns', customer?.id],
    queryFn: () => customersApi.getCampaigns(customer!.id),
    enabled: !!customer && tab === 'campaigns',
  });

  const daysSinceLastOrder = customer?.last_order_at
    ? Math.floor((Date.now() - new Date(customer.last_order_at).getTime()) / 86400000)
    : null;

  const avgOrderValue = customer && customer.order_count > 0
    ? customer.total_spend / customer.order_count
    : 0;

  return (
    <AnimatePresence>
      {customer && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/10"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 z-50 flex h-full w-[480px] flex-col bg-white dark:bg-zinc-950 shadow-2xl border-l border-transparent dark:border-zinc-800"
          >
            {/* Header */}
            <div className="flex items-start justify-between border-b border-zinc-100 dark:border-zinc-800 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-950/40 text-sm font-bold text-blue-700 dark:text-blue-400">
                  {getInitials(customer.name)}
                </div>
                <div>
                  <p className="font-semibold text-zinc-900 dark:text-zinc-50">{customer.name}</p>
                  <p className="text-sm text-zinc-400 dark:text-zinc-500">{customer.email}</p>
                </div>
              </div>
              <button onClick={onClose} className="rounded-md p-1.5 text-zinc-400 dark:text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">
                <X size={16} />
              </button>
            </div>

            {/* KPI Strip */}
            <div className="grid grid-cols-4 divide-x divide-zinc-100 dark:divide-zinc-800 border-b border-zinc-100 dark:border-zinc-800">
              {[
                { label: 'Total Spend', value: formatCurrency(customer.total_spend) },
                { label: 'Orders', value: String(customer.order_count) },
                { label: 'Avg Order', value: formatCurrency(avgOrderValue) },
                { label: 'Last Order', value: daysSinceLastOrder !== null ? (daysSinceLastOrder === 0 ? 'Today' : `${daysSinceLastOrder}d ago`) : '—' },
              ].map(({ label, value }) => (
                <div key={label} className="px-2 py-3 text-center flex flex-col justify-between min-h-[56px]">
                  <p className="text-xs text-zinc-400 dark:text-zinc-500 leading-tight">{label}</p>
                  <p className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100 leading-none">{value}</p>
                </div>
              ))}
            </div>

            {/* Tabs */}
            <div className="flex border-b border-zinc-100 dark:border-zinc-800 px-6">
              {(['overview', 'orders', 'campaigns'] as Tab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={cn(
                    'mr-5 border-b-2 py-3 text-sm font-medium capitalize transition-colors',
                    tab === t
                      ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                      : 'border-transparent text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                  )}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {tab === 'overview' && (
                <div className="space-y-5">
                  <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">Contact Info</p>
                    {[
                      { icon: Mail, label: customer.email },
                      { icon: Phone, label: customer.phone ?? 'No phone' },
                      { icon: MapPin, label: customer.city ?? 'Unknown city' },
                      { icon: Calendar, label: `Joined ${formatDate(customer.created_at)}` },
                    ].map(({ icon: Icon, label }) => (
                      <div key={label} className="flex items-center gap-2.5 text-sm text-zinc-600 dark:text-zinc-300">
                        <Icon size={14} className="text-zinc-300 dark:text-zinc-600" />
                        {label}
                      </div>
                    ))}
                  </div>

                  {customer.tags.length > 0 && (
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">Tags</p>
                      <div className="flex flex-wrap gap-1.5">
                        {customer.tags.map((tag) => (
                          <span key={tag} className="rounded-full bg-zinc-100 dark:bg-zinc-800 px-2.5 py-0.5 text-xs font-medium text-zinc-600 dark:text-zinc-450 border border-transparent dark:border-zinc-800/50">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {tab === 'orders' && (
                <div className="space-y-3">
                  {!ordersData ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="animate-pulse rounded-lg border border-zinc-100 dark:border-zinc-800 p-4">
                        <div className="h-3 w-24 rounded bg-zinc-100 dark:bg-zinc-800 mb-2" />
                        <div className="h-3 w-full rounded bg-zinc-50 dark:bg-zinc-800/40" />
                      </div>
                    ))
                  ) : ordersData.data.length === 0 ? (
                    <p className="text-center text-sm text-zinc-400 dark:text-zinc-500 py-8">No orders yet.</p>
                  ) : (
                    ordersData.data.map((order: Order) => (
                      <div key={order.id} className="rounded-lg border border-zinc-100 dark:border-zinc-800 p-4 bg-white dark:bg-zinc-900/50">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs text-zinc-400 dark:text-zinc-500">{formatDate(order.ordered_at)}</p>
                          <div className="flex items-center gap-2">
                            <span className="rounded-full bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-[11px] text-zinc-500 dark:text-zinc-450 capitalize border border-transparent dark:border-zinc-800/50">{order.channel}</span>
                            <p className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">{formatCurrency(order.amount)}</p>
                          </div>
                        </div>
                        <div className="space-y-0.5">
                          {order.items.map((item, i) => (
                            <p key={i} className="text-xs text-zinc-500 dark:text-zinc-400">
                              {item.qty}× {item.name} — {formatCurrency(item.price)}
                            </p>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {tab === 'campaigns' && (
                <div className="space-y-3">
                  {!campaignsData ? (
                    <div className="animate-pulse space-y-3">
                      {[1,2].map(i => <div key={i} className="h-12 rounded-lg bg-zinc-50 dark:bg-zinc-800/40" />)}
                    </div>
                  ) : (campaignsData as { data: unknown[] }).data?.length === 0 ? (
                    <p className="text-center text-sm text-zinc-400 dark:text-zinc-500 py-8">
                      This customer hasn&apos;t received any campaigns yet.
                    </p>
                  ) : (
                    <p className="text-sm text-zinc-400 dark:text-zinc-500 py-4">Campaign history available after launch.</p>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
