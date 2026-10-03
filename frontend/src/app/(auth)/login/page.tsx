import type { Metadata } from 'next';
import { LoginForm } from '@/features/auth/components/LoginForm';

export const metadata: Metadata = {
  title: 'Masuk',
  description: 'Masuk ke portal SIM ORMAWA Politeknik Negeri Lampung.',
};

export default function LoginPage() {
  return (
    <main className="min-h-screen flex">
      {/* ==============================
          LEFT PANEL — Hero Visual
         ============================== */}
      <div className="hidden lg:flex lg:w-[52%] relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 gradient-auth-hero" />

        {/* Decorative circles */}
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-[28rem] h-[28rem] rounded-full bg-blue-400/10 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[36rem] h-[36rem] rounded-full bg-white/[0.02] border border-white/10" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[24rem] h-[24rem] rounded-full bg-white/[0.03] border border-white/10" />

        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)`,
            backgroundSize: '40px 40px',
          }}
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 text-white w-full">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 border border-white/25 flex items-center justify-center backdrop-blur-sm">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="text-white">
                <path
                  d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div>
              <p className="font-heading font-bold text-white text-base tracking-wide">
                SIM ORMAWA
              </p>
              <p className="text-white/60 text-xs">Politeknik Negeri Lampung</p>
            </div>
          </div>

          {/* Main headline */}
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 backdrop-blur-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-white/80 text-xs font-medium">
                Platform Resmi ORMAWA Polinela
              </span>
            </div>

            <div>
              <h2 className="font-heading text-4xl xl:text-5xl font-bold leading-tight text-white">
                Kelola Organisasi
                <br />
                <span className="text-gradient-accent" style={{ WebkitTextFillColor: '#f5a623' }}>
                  Lebih Mudah &amp;
                </span>
                <br />
                <span style={{ color: '#93c5fd' }}>Lebih Transparan</span>
              </h2>

              <p className="mt-5 text-white/65 text-base leading-relaxed max-w-sm">
                Sistem informasi terpadu untuk ORMAWA, HMJ, dan HIMA — mulai dari program kerja,
                keuangan, hingga inventaris, semua dalam satu platform.
              </p>
            </div>

            {/* Stats */}
            <div className="flex gap-8 pt-2">
              {[
                { value: '8', label: 'Jurusan' },
                { value: '31+', label: 'Program Studi' },
                { value: '3', label: 'Jenis Organisasi' },
              ].map(({ value, label }) => (
                <div key={label}>
                  <p className="font-heading text-3xl font-bold text-white">{value}</p>
                  <p className="text-white/50 text-xs mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center gap-2 text-white/40 text-xs">
            <span>© {new Date().getFullYear()} Politeknik Negeri Lampung</span>
            <span>·</span>
            <span>Sistem Informasi Manajemen ORMAWA</span>
          </div>
        </div>
      </div>

      {/* ==============================
          RIGHT PANEL — Login Form
         ============================== */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 bg-[#f8fafc]">
        <div className="w-full max-w-md">
          {/* Mobile brand (only visible on small screens) */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-white">
                <path
                  d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div>
              <p className="font-heading font-bold text-gray-900 text-sm">SIM ORMAWA Polinela</p>
            </div>
          </div>

          <LoginForm />
        </div>
      </div>
    </main>
  );
}
