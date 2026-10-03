import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, AtSign as Instagram, Building2, Globe2, Mail } from "lucide-react";
import { env } from "@/config/env";

type PublicOrganization = {
  type: "ORMAWA" | "HMJ" | "HIMA";
  code: string;
  name: string;
  slug: string;
  description?: string | null;
  department?: { name: string } | null;
  studyProgram?: { name: string; degree_level?: string | null } | null;
  parent?: { name: string; slug: string } | null;
  profile?: { vision?: string | null; mission?: string | null; websiteUrl?: string | null; instagramUrl?: string | null; publicEmail?: string | null } | null;
};

async function getOrganization(slug: string): Promise<PublicOrganization | null> {
  try {
    const response = await fetch(`${env.NEXT_PUBLIC_API_URL}/public/organizations/${encodeURIComponent(slug)}`, { cache: "no-store" });
    if (!response.ok) return null;
    const json = await response.json() as { data?: PublicOrganization };
    return json.data ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const organization = await getOrganization(slug);
  return { title: organization?.name ?? "Profil Organisasi", description: organization?.description ?? "Profil publik organisasi mahasiswa" };
}

export default async function OrganizationProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const organization = await getOrganization(slug);
  if (!organization) {
    return <main className="grid min-h-screen place-items-center bg-slate-50 px-4"><div className="max-w-md text-center"><h1 className="text-3xl font-bold">Profil tidak ditemukan</h1><p className="mt-3 text-slate-600">Organisasi belum aktif, belum dipublikasikan, atau layanan sedang tidak tersedia.</p><Link href="/#direktori" className="mt-6 inline-flex items-center gap-2 font-bold text-brand-700"><ArrowLeft className="size-4" /> Kembali ke direktori</Link></div></main>;
  }
  return (
    <main className="min-h-screen bg-slate-50">
      <section className="bg-brand-900 text-white"><div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8"><Link href="/#direktori" className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-100 hover:text-white"><ArrowLeft className="size-4" /> Direktori organisasi</Link><div className="mt-10 flex flex-col gap-6 sm:flex-row sm:items-center"><span className="grid size-20 place-items-center rounded-2xl bg-white/10"><Building2 className="size-10" /></span><div><span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold">{organization.type}</span><h1 className="mt-3 text-4xl font-extrabold text-white">{organization.name}</h1><p className="mt-2 text-emerald-100">{organization.code}{organization.studyProgram ? ` · ${organization.studyProgram.name}` : organization.department ? ` · ${organization.department.name}` : ""}</p></div></div></div></section>
      <div className="mx-auto grid max-w-5xl gap-6 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_300px] lg:px-8">
        <div className="space-y-6"><article className="rounded-2xl border border-slate-200 bg-white p-7"><h2 className="text-2xl font-bold">Tentang organisasi</h2><p className="mt-4 whitespace-pre-line leading-7 text-slate-600">{organization.description || "Belum ada deskripsi publik."}</p></article>{organization.profile?.vision && <article className="rounded-2xl border border-slate-200 bg-white p-7"><h2 className="text-2xl font-bold">Visi</h2><p className="mt-4 whitespace-pre-line leading-7 text-slate-600">{organization.profile.vision}</p></article>}{organization.profile?.mission && <article className="rounded-2xl border border-slate-200 bg-white p-7"><h2 className="text-2xl font-bold">Misi</h2><p className="mt-4 whitespace-pre-line leading-7 text-slate-600">{organization.profile.mission}</p></article>}</div>
        <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-6"><h2 className="font-bold">Informasi publik</h2><div className="mt-5 space-y-4 text-sm text-slate-600">{organization.parent && <p>Induk: <Link className="font-semibold text-brand-700" href={`/organisasi/${organization.parent.slug}`}>{organization.parent.name}</Link></p>}{organization.profile?.publicEmail && <a className="flex items-center gap-2 hover:text-brand-700" href={`mailto:${organization.profile.publicEmail}`}><Mail className="size-4" /> {organization.profile.publicEmail}</a>}{organization.profile?.websiteUrl && <a className="flex items-center gap-2 hover:text-brand-700" href={organization.profile.websiteUrl} rel="noreferrer" target="_blank"><Globe2 className="size-4" /> Situs web</a>}{organization.profile?.instagramUrl && <a className="flex items-center gap-2 hover:text-brand-700" href={organization.profile.instagramUrl} rel="noreferrer" target="_blank"><Instagram className="size-4" /> Instagram</a>}</div></aside>
      </div>
    </main>
  );
}
