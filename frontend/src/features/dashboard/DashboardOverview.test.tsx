import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardOverview } from './DashboardOverview';

const state = vi.hoisted(() => ({
  auth: {
    user: { id: '1', email: 'admin@example.com', fullName: 'Admin', roles: ['SUPER_ADMIN'] },
    activeTenant: undefined as
      { id: string; type: 'ORMAWA' | 'HMJ' | 'HIMA'; name: string; roles: string[] } | undefined,
  },
  summary: { actor: 'SUPER_ADMIN', metrics: {} as Record<string, number | string> },
}));

vi.mock('@/context/AuthContext', () => ({ useAuth: () => state.auth }));
vi.mock('@/hooks/useApiResource', () => ({
  useApiResource: () => ({ data: state.summary, error: null, isLoading: false, reload: vi.fn() }),
}));

describe('DashboardOverview drill-down links', () => {
  beforeEach(() => {
    state.auth.activeTenant = undefined;
    state.auth.user.roles = ['SUPER_ADMIN'];
    state.summary.actor = 'SUPER_ADMIN';
    state.summary.metrics = { tenants: 12, pendingApplications: 3, activeHima: 7, auditEvents: 9 };
  });

  it('links every admin metric to its matching filtered detail', () => {
    render(<DashboardOverview />);

    expect(screen.getByRole('link', { name: /Tenant aktif: 12/ }).getAttribute('href')).toBe(
      '/admin/tenant?status=ACTIVE',
    );
    expect(screen.getByRole('link', { name: /Pengajuan menunggu: 3/ }).getAttribute('href')).toBe(
      '/admin/pengajuan-akun',
    );
    expect(screen.getByRole('link', { name: /HIMA aktif: 7/ }).getAttribute('href')).toBe(
      '/admin/tenant?type=HIMA&status=ACTIVE',
    );
    expect(screen.getByRole('link', { name: /Audit 24 jam: 9/ }).getAttribute('href')).toBe(
      '/admin/audit?sinceHours=24',
    );
  });

  it('links tenant and financial metrics to scoped filters', () => {
    state.auth.user.roles = [];
    state.auth.activeTenant = { id: '11', type: 'HIMA', name: 'HIMA A', roles: ['HIMA_ADMIN'] };
    state.summary.actor = 'HIMA';
    state.summary.metrics = {
      members: 8,
      programs: 5,
      inventory: 4,
      unreadMessages: 6,
      income: '100.10',
      expense: '19.01',
      balance: '81.09',
    };

    render(<DashboardOverview />);

    expect(screen.getByRole('link', { name: /Anggota aktif: 8/ }).getAttribute('href')).toBe(
      '/portal/anggota?status=ACTIVE',
    );
    expect(screen.getByRole('link', { name: /Item inventaris: 4/ }).getAttribute('href')).toBe(
      '/portal/inventaris?status=ACTIVE',
    );
    expect(screen.getByRole('link', { name: /Pesan belum dibaca: 6/ }).getAttribute('href')).toBe(
      '/portal/pesan?unread=true',
    );
    expect(screen.getByRole('link', { name: /Total pemasukan/ }).getAttribute('href')).toBe(
      '/portal/keuangan?type=INCOME&status=POSTED',
    );
    expect(screen.getByRole('link', { name: /Saldo saat ini/ }).getAttribute('href')).toBe(
      '/portal/keuangan?status=POSTED',
    );
  });
});
