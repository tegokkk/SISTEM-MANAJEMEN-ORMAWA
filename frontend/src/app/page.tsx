import Link from "next/link";
import { ArrowRight, BookOpenCheck, Building2, CheckCircle2, Mail, MapPin, Network, ShieldCheck, UsersRound } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { OrganizationDirectory } from "@/components/public/OrganizationDirectory";
import { PublicStats } from "@/components/public/PublicStats";

const benefits = [
  { icon: Network, title: "Satu sistem terpadu", text: "Anggota, kepengurusan, program kerja, keuangan, inventaris, dan pesan dikelola dalam satu portal." },
  { icon: ShieldCheck, title: "Isolasi multi-tenant", text: "Setiap organisasi hanya mengakses data sesuai tenant, peran, dan hubungan HMJ–HIMA yang sah." },
  { icon: BookOpenCheck, title: "Proses dapat diaudit", text: "Histori status, notifikasi, dan audit log membantu setiap keputusan tetap transparan dan dapat ditelusuri." },
];

const types = [
  { code: "ORMAWA / UKM", title: "Organisasi tingkat institusi", text: "Tenant mandiri yang mengelola kegiatan, anggota, keuangan, dan inventarisnya sendiri." },
  { code: "HMJ", title: "Himpunan Mahasiswa Jurusan", text: "Satu HMJ per jurusan yang sekaligus meninjau pengajuan HIMA di bawahnya." },
  { code: "HIMA", title: "Himpunan Mahasiswa Prodi", text: "Tenant program studi yang terhubung dan berkomunikasi hanya dengan HMJ induknya." },
];

export default function HomePage() {
  return (
    <main className="bg-white text-slate-950">
      <div className="bg-brand-900 text-white">
        <div className="mx-auto flex min-h-10 max-w-7xl items-center justify-between gap-4 px-4 py-2 text-xs sm:px-6 lg:px-8">
          <span className="flex items-center gap-2"><MapPin aria-hidden="true" className="size-3.5" /> Politeknik Negeri Lampung</span>
          <a href="mailto:kemahasiswaan@polinela.ac.id" className="flex items-center gap-2 underline-offset-4 hover:underline"><Mail aria-hidden="true" className="size-3.5" /> Layanan Kemahasiswaan</a>
        </div>
      </div>

      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Logo />
          <nav className="hidden items-center gap-8 text-sm font-semibold text-slate-700 md:flex" aria-label="Navigasi utama">
            <a href="#tentang" className="hover:text-brand-700">Tentang</a>
            <a href="#organisasi" className="hover:text-brand-700">Jenis organisasi</a>
            <a href="#direktori" className="hover:text-brand-700">Direktori</a>
          </nav>
          <Link href="/login" className="inline-flex h-11 items-center gap-2 rounded-lg bg-accent-400 px-5 text-sm font-extrabold text-amber-950 shadow-sm transition hover:bg-accent-500 focus-visible:ring-2 focus-visible:ring-amber-600">
            Masuk Portal <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </div>
      </header>

      <section className="relative overflow-hidden bg-brand-900 text-white">
        <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_20%_20%,#86efac_0,transparent_35%),radial-gradient(circle_at_85%_60%,#facc15_0,transparent_25%)]" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 py-20 sm:px-6 sm:py-28 lg:grid-cols-[1.15fr_.85fr] lg:px-8 lg:py-32">
          <div>
            <span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold">Portal organisasi mahasiswa terintegrasi</span>
            <h1 className="mt-7 max-w-4xl text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">Kelola organisasi, program, dan pertanggungjawaban dalam satu sistem.</h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-emerald-50">SIM ORMAWA & HMJ membantu ORMAWA, HMJ, dan HIMA bekerja lebih tertib dengan alur persetujuan yang jelas serta pemisahan data yang aman.</p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href="/login" className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-accent-400 px-6 font-bold text-amber-950 transition hover:bg-accent-500">Buka portal <ArrowRight aria-hidden="true" className="size-5" /></Link>
              <Link href="/daftar" className="inline-flex h-12 items-center justify-center rounded-lg border border-white/40 bg-white/10 px-6 font-bold text-white transition hover:bg-white/20">Ajukan akun organisasi</Link>
            </div>
          </div>
          <div className="rounded-3xl border border-white/20 bg-white/10 p-6 shadow-2xl backdrop-blur sm:p-8">
            <div className="grid gap-4 sm:grid-cols-2">
              {["Pengajuan terarah", "Data anggota", "Program kerja", "Keuangan", "Inventaris", "Pesan HMJ–HIMA"].map((label) => (
                <div key={label} className="flex items-center gap-3 rounded-xl border border-white/15 bg-white/10 p-4 text-sm font-semibold"><CheckCircle2 aria-hidden="true" className="size-5 shrink-0 text-yellow-300" /> {label}</div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <PublicStats />

      <section id="tentang" className="py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-brand-600">Mengapa SIM ORMAWA</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Administrasi yang rapi, aman, dan mudah dipantau</h2>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {benefits.map(({ icon: Icon, title, text }) => <article key={title} className="rounded-2xl border border-slate-200 p-7 shadow-sm"><span className="grid size-12 place-items-center rounded-xl bg-brand-50 text-brand-700"><Icon aria-hidden="true" /></span><h3 className="mt-5 text-xl font-bold">{title}</h3><p className="mt-3 text-base leading-7 text-slate-600">{text}</p></article>)}
          </div>
        </div>
      </section>

      <section id="organisasi" className="bg-brand-50 py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex max-w-3xl items-start gap-4"><span className="grid size-12 shrink-0 place-items-center rounded-xl bg-brand-600 text-white"><UsersRound aria-hidden="true" /></span><div><p className="text-sm font-bold uppercase tracking-[0.2em] text-brand-600">Struktur organisasi</p><h2 className="mt-2 text-3xl font-bold">Ruang kerja sesuai tingkat organisasi</h2></div></div>
          <div className="mt-10 grid gap-6 lg:grid-cols-3">{types.map((type) => <article key={type.code} className="rounded-2xl bg-white p-7 shadow-sm ring-1 ring-brand-100"><span className="text-xs font-extrabold uppercase tracking-widest text-brand-600">{type.code}</span><h3 className="mt-3 text-xl font-bold">{type.title}</h3><p className="mt-3 leading-7 text-slate-600">{type.text}</p></article>)}</div>
        </div>
      </section>

      <OrganizationDirectory />

      <footer className="bg-slate-950 py-12 text-slate-300">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div><div className="flex items-center gap-3 text-white"><Building2 aria-hidden="true" className="size-6" /><span className="font-bold">SIM ORMAWA & HMJ</span></div><p className="mt-3 max-w-lg text-sm">Sistem Informasi Manajemen Organisasi Mahasiswa Politeknik Negeri Lampung.</p></div>
          <div className="flex gap-6 text-sm"><Link href="/login" className="hover:text-white">Portal</Link><Link href="/daftar" className="hover:text-white">Pengajuan akun</Link><a href="#direktori" className="hover:text-white">Direktori</a></div>
        </div>
        <div className="mx-auto mt-8 max-w-7xl border-t border-slate-800 px-4 pt-8 text-xs sm:px-6 lg:px-8">© 2026 Politeknik Negeri Lampung. Seluruh hak dilindungi.</div>
      </footer>
    </main>
  );
}
