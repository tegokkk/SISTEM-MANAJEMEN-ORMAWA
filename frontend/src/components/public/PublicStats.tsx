"use client";

import { useApiResource } from "@/hooks/useApiResource";

type PublicStatsData = { organizations: Record<string, number>; departments: number; studyPrograms: number };

export function PublicStats() {
  const stats = useApiResource<PublicStatsData>("/public/stats");
  if (!stats.data) return null;
  const items = [
    [Object.values(stats.data.organizations).reduce((total, count) => total + count, 0), "Organisasi aktif"],
    [stats.data.departments, "Jurusan"],
    [stats.data.studyPrograms, "Program studi"],
  ];
  return <section aria-label="Statistik publik" className="border-b border-slate-200 bg-white"><div className="mx-auto grid max-w-5xl grid-cols-3 gap-4 px-4 py-8 text-center sm:px-6">{items.map(([value, label]) => <div key={label}><p className="text-3xl font-extrabold text-brand-700">{value}</p><p className="mt-1 text-sm font-medium text-slate-600">{label}</p></div>)}</div></section>;
}
