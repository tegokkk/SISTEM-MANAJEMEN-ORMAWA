'use client';

import React from 'react';
import { Search, InboxIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { FilterBar } from './FilterBar';
import { Pagination } from './Pagination';

export interface Column<T> {
  header: string;
  accessorKey?: keyof T;
  cell?: (item: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T) => string;
  isLoading?: boolean;
  emptyMessage?: string;
  searchPlaceholder?: string;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  actions?: React.ReactNode;
  page?: number;
  total?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
}

export function DataTable<T>({
  data,
  columns,
  keyExtractor,
  isLoading = false,
  emptyMessage = 'Tidak ada data',
  searchPlaceholder = 'Cari...',
  searchQuery = '',
  onSearchChange,
  actions,
  page = 1,
  total,
  totalPages = 1,
  onPageChange,
}: DataTableProps<T>) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Toolbar */}
      {(onSearchChange !== undefined || actions) && (
        <FilterBar>
          {onSearchChange !== undefined && (
            <div className="relative max-w-sm w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-shadow"
              />
            </div>
          )}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </FilterBar>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-gray-600">
          <thead className="bg-gray-50 text-gray-700 text-xs uppercase font-semibold border-b border-gray-200">
            <tr>
              {columns.map((col, i) => (
                <th key={i} className={`px-6 py-3.5 ${col.className || ''}`}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              // Loading Skeleton
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {columns.map((_, j) => (
                    <td key={j} className="px-6 py-4">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              // Empty State
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <InboxIcon className="h-10 w-10 text-gray-300 mb-3" />
                    <p className="text-gray-500 font-medium">{emptyMessage}</p>
                  </div>
                </td>
              </tr>
            ) : (
              // Data Rows
              data.map((item, i) => (
                <motion.tr
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.2 }}
                  key={keyExtractor(item)}
                  className="hover:bg-gray-50 transition-colors group"
                >
                  {columns.map((col, j) => (
                    <td key={j} className={`px-6 py-4 ${col.className || ''}`}>
                      {col.cell ? col.cell(item) : String(item[col.accessorKey as keyof T] || '')}
                    </td>
                  ))}
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {!isLoading && data.length > 0 && (
        <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-between text-sm">
          <span className="text-gray-500">
            Menampilkan <span className="font-medium text-gray-900">{data.length}</span>
            {total !== undefined && <> dari <span className="font-medium text-gray-900">{total}</span></>} data
          </span>
          <Pagination page={page} totalPages={totalPages} onPageChange={onPageChange} />
        </div>
      )}
    </div>
  );
}
