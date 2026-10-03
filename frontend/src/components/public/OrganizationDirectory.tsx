"use client";

import { useDeferredValue, useEffect, useState } from "react";
import Link from "next/link";
import { Building2, Search } from "lucide-react";
import { apiClient } from "@/lib/api-client";

type Organization = {
  id: string;
  type: "ORMAWA" | "HMJ" | "HIMA";
  code: string;
  name: string;
  slug: string;
  description?: string | null;
  department?: { name: string } | null;
  studyProgram?: { name: string } | null;
  parent?: { name: string } | null;
};
type Department = { id: string; name: string };
type StudyProgram = { id: string; departmentId: string; name: string; degreeLevel: string };

const FILTERS = [
  { label: "Semua", value: "" },
  { label: "ORMAWA / UKM", value: "ORMAWA" },
  { label: "HMJ", value: "HMJ" },
  { label: "HIMA", value: "HIMA" },
] as const;

export function OrganizationDirectory() {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [type, setType] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [studyProgramId, setStudyProgramId] = useState("");
  const [departments, setDepartments] = useState<Department[]>([]);
  const [studyPrograms, setStudyPrograms] = useState<StudyProgram[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    Promise.all([
      apiClient.get<Department[]>("/references/departments"),
      apiClient.get<StudyProgram[]>("/references/study-programs"),
    ]).then(([departmentItems, studyProgramItems]) => {
      setDepartments(departmentItems);
      setStudyPrograms(studyProgramItems);
    }).catch(() => setError(true));
  }, []);

  useEffect(() => {
    let cancelled = false;
    const search = new URLSearchParams();
    if (deferredQuery) search.set("q", deferredQuery);
    if (type) search.set("type", type);
    if (departmentId) search.set("departmentId", departmentId);
    if (studyProgramId) search.set("studyProgramId", studyProgramId);
    apiClient
      .get<Organization[]>(`/public/organizations?${search.toString()}`)
      .then((items) => {
        if (!cancelled) {
          setOrganizations(items);
          setError(false);
        }
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [deferredQuery, type, departmentId, studyProgramId]);

  return (
    <section id="direktori" className="bg-slate-50 py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-brand-600">Direktori organisasi</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Temukan organisasi mahasiswa</h2>
          <p className="mt-4 text-base text-slate-600">Jelajahi ORMAWA, UKM, HMJ, dan HIMA aktif berdasarkan nama maupun jenis organisasi.</p>
        </div>

        <div className="mt-8 grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-3">
          <label className="relative block flex-1">
            <span className="sr-only">Cari organisasi</span>
            <Search aria-hidden="true" className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-slate-400" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari nama atau kode organisasi…"
              className="h-11 w-full rounded-lg border border-slate-300 bg-white pl-10 pr-4 text-base outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100" />
          </label>
          <label>
            <span className="sr-only">Filter jurusan</span>
            <select value={departmentId} onChange={(event) => { setDepartmentId(event.target.value); setStudyProgramId(""); }} className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100">
              <option value="">Semua jurusan</option>
              {departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
            </select>
          </label>
          <label>
            <span className="sr-only">Filter program studi</span>
            <select value={studyProgramId} onChange={(event) => setStudyProgramId(event.target.value)} className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100">
              <option value="">Semua program studi</option>
              {studyPrograms.filter((program) => !departmentId || program.departmentId === departmentId).map((program) => <option key={program.id} value={program.id}>{program.degreeLevel} {program.name}</option>)}
            </select>
          </label>
          <div className="flex flex-wrap gap-2 lg:col-span-3" role="group" aria-label="Filter jenis organisasi">
            {FILTERS.map((filter) => (
              <button key={filter.value} type="button" onClick={() => setType(filter.value)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${type === filter.value ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-brand-50 hover:text-brand-700"}`}>
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {error ? (
          <div className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
            Direktori belum dapat dimuat. Pastikan layanan backend dan database sedang berjalan.
          </div>
        ) : organizations.length === 0 ? (
          <div className="mt-8 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
            Belum ada organisasi publik yang sesuai pencarian.
          </div>
        ) : (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {organizations.map((organization) => (
              <Link key={organization.id} href={`/organisasi/${organization.slug}`}
                className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-brand-300 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-brand-600">
                <div className="flex items-start justify-between gap-4">
                  <span className="grid size-12 place-items-center rounded-xl bg-brand-50 text-brand-700"><Building2 aria-hidden="true" /></span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{organization.type}</span>
                </div>
                <h3 className="mt-5 text-xl font-bold transition group-hover:text-brand-700">{organization.name}</h3>
                <p className="mt-1 text-sm font-semibold text-brand-600">{organization.code}</p>
                <p className="mt-3 line-clamp-3 text-sm text-slate-600">{organization.description || organization.studyProgram?.name || organization.department?.name || "Organisasi mahasiswa aktif."}</p>
                {organization.parent && <p className="mt-4 text-xs text-slate-500">Induk: {organization.parent.name}</p>}
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
