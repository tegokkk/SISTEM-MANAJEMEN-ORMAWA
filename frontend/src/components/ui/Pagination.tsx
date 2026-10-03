"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

export function Pagination({ page, totalPages, onPageChange }: { page: number; totalPages: number; onPageChange?: (page: number) => void }) {
  const lastPage = Math.max(totalPages, 1);
  return <div className="flex items-center gap-2">
    <button type="button" aria-label="Halaman sebelumnya" disabled={!onPageChange || page <= 1} onClick={() => onPageChange?.(page - 1)} className="rounded-md border border-gray-200 p-1.5 text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-300"><ChevronLeft className="h-4 w-4" /></button>
    <span className="min-w-16 text-center text-xs text-gray-500">{page} / {lastPage}</span>
    <button type="button" aria-label="Halaman berikutnya" disabled={!onPageChange || page >= lastPage} onClick={() => onPageChange?.(page + 1)} className="rounded-md border border-gray-200 p-1.5 text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-300"><ChevronRight className="h-4 w-4" /></button>
  </div>;
}
