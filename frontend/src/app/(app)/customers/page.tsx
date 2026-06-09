'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { customersApi } from '@/lib/api-client';
import { formatCurrency, formatRelativeTime, getInitials, cn } from '@/lib/utils';
import { Search, Filter, Eye, Upload, UserPlus, ChevronLeft, ChevronRight, X, RefreshCw } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { CustomerDrawer } from '@/components/customers/CustomerDrawer';
import { ImportModal } from '@/components/customers/ImportModal';
import { AddCustomerModal } from '@/components/customers/AddCustomerModal';
import type { Customer, PaginatedResponse } from '@/types';
import { useDebounce } from '@/hooks/useDebounce';

const CITIES = ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Pune', 'Hyderabad'];

export default function CustomersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [city, setCity] = useState('');
  const [gender, setGender] = useState('');
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const { selectedCustomer, setSelectedCustomer } = useAppStore();
  const debouncedSearch = useDebounce(search, 300);

  const { data, isLoading, refetch, isRefetching } = useQuery<PaginatedResponse<Customer>>({
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
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Customers</h2>
            <p className="mt-0.5 text-sm text-zinc-400 dark:text-zinc-500">
              {data?.total?.toLocaleString() ?? '—'} total customers
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => refetch()}
              disabled={isRefetching}
              className="flex items-center gap-1.5 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
              title="Refresh customers list"
            >
              <RefreshCw size={14} className={cn(isRefetching && 'animate-spin')} />
              Refresh
            </button>
            <button
              onClick={() => setIsImportOpen(true)}
              className="flex items-center gap-1.5 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            >
              <Upload size={14} />
              Import
            </button>
            <button
              onClick={() => setIsAddOpen(true)}
              className="flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              <UserPlus size={14} />
              Add Customer
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by name or email..."
              className="w-full rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 py-2 pl-8 pr-3 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 outline-none focus:border-blue-400 dark:focus:border-blue-500 focus:ring-1 focus:ring-blue-100 dark:focus:ring-zinc-800"
            />
          </div>

          <select
            value={city}
            onChange={(e) => { setCity(e.target.value); setPage(1); }}
            className="rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 outline-none focus:border-blue-400 dark:focus:border-blue-500"
          >
            <option value="">All Cities</option>
            {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>

          <select
            value={gender}
            onChange={(e) => { setGender(e.target.value); setPage(1); }}
            className="rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 outline-none focus:border-blue-400 dark:focus:border-blue-500"
          >
            <option value="">All Genders</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>

          {hasFilters && (
            <button onClick={clearFilters} className="flex items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200">
              <X size={13} /> Clear
            </button>
          )}
        </div>

        {/* Table */}
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-[0_1px_3px_rgba(0,0,0,0.06)] dark:shadow-none overflow-hidden">
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
                    <td><div className="flex items-center gap-3"><div className="h-8 w-8 rounded-full bg-zinc-100 dark:bg-zinc-800" /><div className="space-y-1"><div className="h-3 w-28 rounded bg-zinc-100 dark:bg-zinc-800" /><div className="h-2.5 w-36 rounded bg-zinc-50 dark:bg-zinc-800/50" /></div></div></td>
                    <td><div className="h-3 w-16 rounded bg-zinc-100 dark:bg-zinc-800" /></td>
                    <td><div className="h-3 w-20 rounded bg-zinc-100 dark:bg-zinc-800" /></td>
                    <td><div className="h-3 w-8 rounded bg-zinc-100 dark:bg-zinc-800" /></td>
                    <td><div className="h-3 w-20 rounded bg-zinc-100 dark:bg-zinc-800" /></td>
                    <td />
                  </tr>
                ))
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-sm text-zinc-400 dark:text-zinc-500">
                    No customers found.{' '}
                    {hasFilters && <button onClick={clearFilters} className="text-blue-600 dark:text-blue-400 hover:underline">Clear filters</button>}
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr key={c.id} onClick={() => setSelectedCustomer(c)} className="cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-950/40 text-xs font-semibold text-blue-700 dark:text-blue-400">
                          {getInitials(c.name)}
                        </div>
                        <div>
                          <p className="font-medium text-zinc-900 dark:text-zinc-100">{c.name}</p>
                          <p className="text-xs text-zinc-400 dark:text-zinc-500">{c.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="text-zinc-600 dark:text-zinc-400">{c.city ?? '—'}</td>
                    <td className="font-medium text-zinc-900 dark:text-zinc-100">{formatCurrency(c.total_spend)}</td>
                    <td className="text-zinc-600 dark:text-zinc-400">{c.order_count}</td>
                    <td className="text-zinc-400 dark:text-zinc-500 text-xs">
                      {c.last_order_at ? formatRelativeTime(c.last_order_at) : 'Never'}
                    </td>
                    <td>
                      <button
                        onClick={(e) => { e.stopPropagation(); setSelectedCustomer(c); }}
                        className="flex items-center gap-1 rounded px-2 py-1 text-xs text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-700 dark:hover:text-zinc-200"
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
            <div className="flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800 px-5 py-3">
              <p className="text-xs text-zinc-400 dark:text-zinc-500">
                Page {data.page} of {data.totalPages} — {data.total} results
              </p>
              <div className="flex gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="flex h-7 w-7 items-center justify-center rounded border border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-40"
                >
                  <ChevronLeft size={13} />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                  disabled={page === data.totalPages}
                  className="flex h-7 w-7 items-center justify-center rounded border border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-40"
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

      <ImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
      />

      <AddCustomerModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
      />
    </>
  );
}
