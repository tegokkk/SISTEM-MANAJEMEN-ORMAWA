'use client';

import Link from 'next/link';
import {
  Activity,
  ArrowRight,
  Bell,
  Briefcase,
  Building2,
  CircleDollarSign,
  ClipboardCheck,
  MessageSquare,
  Package,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Alert } from '@/components/ui/Alert';
import { Card } from '@/components/ui/Card';
import { DetailList, StatCard } from '@/components/ui/DataDisplays';
import { FeedbackState } from '@/components/ui/FeedbackState';
import { useAuth } from '@/context/AuthContext';
import { useApiResource } from '@/hooks/useApiResource';
import { formatCurrency } from '@/lib/format';

interface DashboardSummary {
  actor: string;
  metrics: Record<string, number | string>;
}

const tenantCards = [
  {
    key: 'members',
    label: 'Anggota aktif',
    icon: Users,
    href: '/portal/anggota?status=ACTIVE',
    color: 'bg-brand-100 text-brand-700',
  },
  {
    key: 'programs',
    label: 'Program kerja',
    icon: Briefcase,
    href: '/portal/program-kerja',
    color: 'bg-blue-100 text-blue-700',
  },
  {
    key: 'inventory',
    label: 'Item inventaris',
    icon: Package,
    href: '/portal/inventaris?status=ACTIVE',
    color: 'bg-violet-100 text-violet-700',
  },
  {
    key: 'unreadMessages',
    label: 'Pesan belum dibaca',
    icon: MessageSquare,
    href: '/portal/pesan?unread=true',
    color: 'bg-amber-100 text-amber-700',
  },
];
const adminCards = [
  {
    key: 'tenants',
    label: 'Tenant aktif',
    icon: Building2,
    href: '/admin/tenant?status=ACTIVE',
    color: 'bg-brand-100 text-brand-700',
  },
  {
    key: 'pendingApplications',
    label: 'Pengajuan menunggu',
    icon: ClipboardCheck,
    href: '/admin/pengajuan-akun',
    color: 'bg-amber-100 text-amber-700',
  },
  {
    key: 'activeHima',
    label: 'HIMA aktif',
    icon: Users,
    href: '/admin/tenant?type=HIMA&status=ACTIVE',
    color: 'bg-blue-100 text-blue-700',
  },
  {
    key: 'auditEvents',
    label: 'Audit 24 jam',
    icon: ShieldCheck,
    href: '/admin/audit?sinceHours=24',
    color: 'bg-violet-100 text-violet-700',
  },
];

export function DashboardOverview() {
  const { user, activeTenant } = useAuth();
  const summary = useApiResource<DashboardSummary>('/dashboard/summary');
  const isAdmin = !activeTenant;
  const cards = isAdmin ? adminCards : tenantCards;
  const metrics = summary.data?.metrics ?? {};
  const quickLinks = isAdmin
    ? [
        { label: 'Review pengajuan', href: '/admin/pengajuan-akun', icon: ClipboardCheck },
        { label: 'Audit log', href: '/admin/audit', icon: ShieldCheck },
        { label: 'Notifikasi', href: '/portal/notifikasi', icon: Bell },
      ]
    : [
        { label: 'Tambah anggota', href: '/portal/anggota', icon: Users },
        { label: 'Buat program kerja', href: '/portal/program-kerja', icon: Briefcase },
        { label: 'Catat keuangan', href: '/portal/keuangan', icon: CircleDollarSign },
        { label: 'Kelola inventaris', href: '/portal/inventaris', icon: Package },
      ];

  return (
    <div className="space-y-7">
      <PageHeader
        title={isAdmin ? 'Dashboard Super Admin' : `Dashboard ${activeTenant?.name}`}
        description={`Selamat datang, ${user?.fullName}. Ringkasan ini dihitung langsung dari data ${isAdmin ? 'sistem' : 'tenant aktif'}.`}
        breadcrumbs={[{ label: 'Dashboard' }]}
      />
      {summary.error && <Alert variant="error">{summary.error}</Alert>}
      {summary.isLoading ? (
        <FeedbackState kind="loading" title="Menghitung ringkasan" />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {cards.map((card) => (
              <StatCard
                key={card.key}
                label={card.label}
                value={metrics[card.key] ?? 0}
                icon={card.icon}
                href={card.href}
                iconClass={card.color}
              />
            ))}
          </div>
          {!isAdmin && (
            <div className="grid gap-4 md:grid-cols-3">
              <FinanceMetric
                label="Total pemasukan"
                value={metrics.income}
                className="text-emerald-700"
                href="/portal/keuangan?type=INCOME&status=POSTED"
              />
              <FinanceMetric
                label="Total pengeluaran"
                value={metrics.expense}
                className="text-red-600"
                href="/portal/keuangan?type=EXPENSE&status=POSTED"
              />
              <FinanceMetric
                label="Saldo saat ini"
                value={metrics.balance}
                className="text-brand-700"
                href="/portal/keuangan?status=POSTED"
              />
            </div>
          )}
          <div className="grid gap-5 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-brand-600" />
                <h2 className="font-heading text-lg font-bold text-gray-900">Aksi cepat</h2>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {quickLinks.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-3 rounded-xl border border-gray-200 p-4 text-sm font-semibold text-gray-700 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
                  >
                    <item.icon className="h-5 w-5" />
                    {item.label}
                    <ArrowRight className="ml-auto h-4 w-4" />
                  </Link>
                ))}
              </div>
            </Card>
            <Card>
              <h2 className="font-heading text-lg font-bold text-gray-900">Konteks akses</h2>
              <div className="mt-4">
                <DetailList
                  items={[
                    { label: 'Aktor', value: summary.data?.actor ?? '—' },
                    ...(activeTenant?.type === 'HMJ'
                      ? [{ label: 'HIMA aktif', value: metrics.children ?? 0 }]
                      : []),
                    { label: 'Scope', value: isAdmin ? 'Seluruh sistem' : activeTenant?.name },
                  ]}
                />
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function FinanceMetric({
  label,
  value,
  className,
  href,
}: {
  label: string;
  value: string | number | undefined;
  className: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
      aria-label={`${label}: ${formatCurrency(value)}. Buka detail`}
    >
      <Card className="h-full">
        <p className="text-sm text-gray-500">{label}</p>
        <p className={`mt-1 font-heading text-2xl font-bold ${className}`}>
          {formatCurrency(value)}
        </p>
      </Card>
    </Link>
  );
}
