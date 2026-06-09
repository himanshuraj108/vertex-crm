'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { customersApi } from '@/lib/api-client';
import { formatCurrency, formatRelativeTime, getInitials, cn } from '@/lib/utils';
import { Search, Filter, Eye, Upload, UserPlus, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { CustomerDrawer } from '@/components/customers/CustomerDrawer';
import type { Customer, PaginatedResponse } from '@/types';
import { useDebounce } from '@/hooks/useDebounce';

const CITIES = ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Pune', 'Hyderabad'];

export default function CustomersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [city, setCity] = useState('');
  const [gender, setGender] = useState('');
  const { selectedCustomer, setSelectedCustomer } = useAppStore();
  const debouncedSearch = useDebounce(search, 300);

  const { data, isLoading } = useQuery<PaginatedResponse<Customer>>({
    queryKey: ['customers', page, debouncedSearch, city, gender],
    queryFn: () =>
      customersApi.getAll({ page, limit: 15, search: debouncedSearch || undefined, city: city || undefined, gender: gender || undefined }) as Promise<PaginatedResponse<Customer>>,
  });

  const customers = data?.data ?? [];
  const hasFilters = debouncedSearch || city || gender;

  const clearFilters = () => { setSearch(''); setCity(''); setGender(''); setPage(1); };

  return (
    <>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-zinc-900">Customers</h2>
            <p className="mt-0.5 text-sm text-zinc-400">
              {data?.total?.toLocaleString() ?? '—'} total customers
            </p>
          </div>
          <div className="flex gap-2">
            <button className="flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50">
              <Upload size={14} />
              Import
            </button>
            <button className="flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700">
              <UserPlus size={14} />
              Add Customer
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by name or email..."
              className="w-full rounded-md border border-zinc-200 bg-white py-2 pl-8 pr-3 text-sm text-zinc-900 placeholder-zinc-400 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
            />
          </div>

          <select
            value={city}
            onChange={(e) => { setCity(e.target.value); setPage(1); }}
            className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 outline-none focus:border-blue-400"
          >
            <option value="">All Cities</option>
            {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>

          <select
            value={gender}
            onChange={(e) => { setGender(e.target.value); setPage(1); }}
            className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 outline-none focus:border-blue-400"
          >
            <option value="">All Genders</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>

          {hasFilters && (
            <button onClick={clearFilters} className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-700">
              <X size={13} /> Clear
            </button>
          )}
        </div>

        {/* Table */}
        <div className="rounded-lg border border-zinc-200 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
          <table className="data-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>City</th>
                <th>Total Spend</th>
                <th>Orders</th>
                <th>Last Order</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td><div className="flex items-center gap-3"><div className="h-8 w-8 rounded-full bg-zinc-100" /><div className="space-y-1"><div className="h-3 w-28 rounded bg-zinc-100" /><div className="h-2.5 w-36 rounded bg-zinc-50" /></div></div></td>
                    <td><div className="h-3 w-16 rounded bg-zinc-100" /></td>
                    <td><div className="h-3 w-20 rounded bg-zinc-100" /></td>
                    <td><div className="h-3 w-8 rounded bg-zinc-100" /></td>
                    <td><div className="h-3 w-20 rounded bg-zinc-100" /></td>
                    <td />
                  </tr>
                ))
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-sm text-zinc-400">
                    No customers found.{' '}
                    {hasFilters && <button onClick={clearFilters} className="text-blue-600 hover:underline">Clear filters</button>}
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr key={c.id} onClick={() => setSelectedCustomer(c)} className="cursor-pointer">
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-semibold text-blue-700">
                          {getInitials(c.name)}
                        </div>
                        <div>
                          <p className="font-medium text-zinc-900">{c.name}</p>
                          <p className="text-xs text-zinc-400">{c.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="text-zinc-600">{c.city ?? '—'}</td>
                    <td className="font-medium text-zinc-900">{formatCurrency(c.total_spend)}</td>
                    <td className="text-zinc-600">{c.order_count}</td>
                    <td className="text-zinc-400 text-xs">
                      {c.last_order_at ? formatRelativeTime(c.last_order_at) : 'Never'}
                    </td>
                    <td>
                      <button
                        onClick={(e) => { e.stopPropagation(); setSelectedCustomer(c); }}
                        className="flex items-center gap-1 rounded px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-50 hover:text-zinc-700"
                      >
                        <Eye size={13} /> View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Pagination */}
          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-zinc-100 px-5 py-3">
              <p className="text-xs text-zinc-400">
                Page {data.page} of {data.totalPages} — {data.total} results
              </p>
              <div className="flex gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="flex h-7 w-7 items-center justify-center rounded border border-zinc-200 text-zinc-500 hover:bg-zinc-50 disabled:opacity-40"
                >
                  <ChevronLeft size={13} />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                  disabled={page === data.totalPages}
                  className="flex h-7 w-7 items-center justify-center rounded border border-zinc-200 text-zinc-500 hover:bg-zinc-50 disabled:opacity-40"
                >
                  <ChevronRight size={13} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <CustomerDrawer
        customer={selectedCustomer}
        onClose={() => setSelectedCustomer(null)}
      />
    </>
  );
}
