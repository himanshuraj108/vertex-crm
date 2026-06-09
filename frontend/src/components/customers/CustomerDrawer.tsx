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
            className="fixed right-0 top-0 z-50 flex h-full w-[480px] flex-col bg-white shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-start justify-between border-b border-zinc-100 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-blue-700">
                  {getInitials(customer.name)}
                </div>
                <div>
                  <p className="font-semibold text-zinc-900">{customer.name}</p>
                  <p className="text-sm text-zinc-400">{customer.email}</p>
                </div>
              </div>
              <button onClick={onClose} className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700">
                <X size={16} />
              </button>
            </div>

            {/* KPI Strip */}
            <div className="grid grid-cols-4 divide-x divide-zinc-100 border-b border-zinc-100">
              {[
                { label: 'Total Spend', value: formatCurrency(customer.total_spend) },
                { label: 'Orders', value: String(customer.order_count) },
                { label: 'Avg Order', value: formatCurrency(avgOrderValue) },
                { label: 'Days Since Order', value: daysSinceLastOrder !== null ? String(daysSinceLastOrder) : '—' },
              ].map(({ label, value }) => (
                <div key={label} className="px-4 py-3 text-center">
                  <p className="text-xs text-zinc-400">{label}</p>
                  <p className="mt-0.5 text-sm font-semibold text-zinc-900">{value}</p>
                </div>
              ))}
            </div>

            {/* Tabs */}
            <div className="flex border-b border-zinc-100 px-6">
              {(['overview', 'orders', 'campaigns'] as Tab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={cn(
                    'mr-5 border-b-2 py-3 text-sm font-medium capitalize transition-colors',
                    tab === t
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-zinc-400 hover:text-zinc-700'
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
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Contact Info</p>
                    {[
                      { icon: Mail, label: customer.email },
                      { icon: Phone, label: customer.phone ?? 'No phone' },
                      { icon: MapPin, label: customer.city ?? 'Unknown city' },
                      { icon: Calendar, label: `Joined ${formatDate(customer.created_at)}` },
                    ].map(({ icon: Icon, label }) => (
                      <div key={label} className="flex items-center gap-2.5 text-sm text-zinc-600">
                        <Icon size={14} className="text-zinc-300" />
                        {label}
                      </div>
                    ))}
                  </div>

                  {customer.tags.length > 0 && (
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">Tags</p>
                      <div className="flex flex-wrap gap-1.5">
                        {customer.tags.map((tag) => (
                          <span key={tag} className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600">
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
                      <div key={i} className="animate-pulse rounded-lg border border-zinc-100 p-4">
                        <div className="h-3 w-24 rounded bg-zinc-100 mb-2" />
                        <div className="h-3 w-full rounded bg-zinc-50" />
                      </div>
                    ))
                  ) : ordersData.data.length === 0 ? (
                    <p className="text-center text-sm text-zinc-400 py-8">No orders yet.</p>
                  ) : (
                    ordersData.data.map((order: Order) => (
                      <div key={order.id} className="rounded-lg border border-zinc-100 p-4">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs text-zinc-400">{formatDate(order.ordered_at)}</p>
                          <div className="flex items-center gap-2">
                            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] text-zinc-500 capitalize">{order.channel}</span>
                            <p className="font-semibold text-zinc-900 text-sm">{formatCurrency(order.amount)}</p>
                          </div>
                        </div>
                        <div className="space-y-0.5">
                          {order.items.map((item, i) => (
                            <p key={i} className="text-xs text-zinc-500">
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
                      {[1,2].map(i => <div key={i} className="h-12 rounded-lg bg-zinc-50" />)}
                    </div>
                  ) : (campaignsData as { data: unknown[] }).data?.length === 0 ? (
                    <p className="text-center text-sm text-zinc-400 py-8">
                      This customer hasn&apos;t received any campaigns yet.
                    </p>
                  ) : (
                    <p className="text-sm text-zinc-400 py-4">Campaign history available after launch.</p>
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
