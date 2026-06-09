'use client';

import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
} from 'recharts';
import type { Customer } from '@/types';

interface SegmentAnalyticsProps {
  customers: Customer[];
  isLoading: boolean;
}

export function SegmentAnalytics({ customers, isLoading }: SegmentAnalyticsProps) {
  // 1. Process City Distribution
  const cityData = useMemo(() => {
    if (!customers || customers.length === 0) return [];
    const counts: Record<string, number> = {};
    customers.forEach((c) => {
      const city = c.city || 'Unknown';
      counts[city] = (counts[city] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5); // top 5 cities
  }, [customers]);

  // 2. Process Spend Brackets
  const spendData = useMemo(() => {
    if (!customers || customers.length === 0) return [];
    let low = 0; // < 2000
    let mid = 0; // 2000 - 10000
    let high = 0; // > 10000

    customers.forEach((c) => {
      if (c.total_spend < 2000) low++;
      else if (c.total_spend <= 10000) mid++;
      else high++;
    });

    return [
      { name: 'Bronze (< ₹2K)', value: low, color: '#D97706' },
      { name: 'Silver (₹2K - ₹10K)', value: mid, color: '#3B82F6' },
      { name: 'Gold VIP (> ₹10K)', value: high, color: '#16A34A' },
    ].filter((d) => d.value > 0);
  }, [customers]);

  // 3. Process Visits vs Orders
  const visitOrderData = useMemo(() => {
    if (!customers || customers.length === 0) return [];
    // Sort by total spend or order count to show a distribution
    return [...customers]
      .sort((a, b) => b.order_count - a.order_count)
      .slice(0, 15)
      .map((c) => ({
        name: c.name.split(' ')[0],
        orders: c.order_count,
        visits: c.visit_count,
      }));
  }, [customers]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="animate-pulse h-[280px] rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50" />
        ))}
      </div>
    );
  }

  if (!customers || customers.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 text-center">
        <p className="text-sm text-zinc-400 dark:text-zinc-500">Not enough segment customer data to build charts.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {/* City Distribution */}
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-sm flex flex-col">
        <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-3">Top Cities</p>
        <div className="h-[220px] w-full flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={cityData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
              <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={10} tickLine={false} />
              <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                labelClassName="font-semibold"
                cursor={{ fill: 'rgba(0, 0, 0, 0.03)' }}
              />
              <Bar dataKey="value" fill="var(--accent)" radius={[4, 4, 0, 0]} barSize={25} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Spend Distribution */}
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-sm flex flex-col">
        <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-3">Value Brackets</p>
        <div className="h-[220px] w-full flex-1 relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={spendData}
                cx="50%"
                cy="45%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={4}
                dataKey="value"
              >
                {spendData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              />
              <Legend
                verticalAlign="bottom"
                align="center"
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: '10px', color: 'var(--text-muted)' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Engagement Scatter/Area */}
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-sm flex flex-col">
        <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-3">Visits vs Orders (Top 15 Customers)</p>
        <div className="h-[220px] w-full flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={visitOrderData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
              <defs>
                <linearGradient id="colorVisits" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#16A34A" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#16A34A" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
              <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={9} tickLine={false} />
              <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} />
              <Tooltip
                contentStyle={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              />
              <Legend
                verticalAlign="top"
                align="right"
                iconSize={8}
                wrapperStyle={{ fontSize: '10px', color: 'var(--text-muted)', top: -10 }}
              />
              <Area type="monotone" name="Visits" dataKey="visits" stroke="var(--accent)" fillOpacity={1} fill="url(#colorVisits)" strokeWidth={1.5} />
              <Area type="monotone" name="Orders" dataKey="orders" stroke="#16A34A" fillOpacity={1} fill="url(#colorOrders)" strokeWidth={1.5} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
