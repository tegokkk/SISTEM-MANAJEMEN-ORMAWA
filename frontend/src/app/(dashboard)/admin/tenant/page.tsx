import { TenantMonitorPage } from '@/features/tenants/TenantMonitorPage';

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ type?: string | string[]; status?: string | string[] }>;
}) {
  const params = await searchParams;
  const type =
    typeof params.type === 'string' && ['ORMAWA', 'HMJ', 'HIMA'].includes(params.type)
      ? params.type
      : '';
  const status =
    typeof params.status === 'string' &&
    ['ACTIVE', 'PENDING', 'SUSPENDED', 'REJECTED', 'INACTIVE'].includes(params.status)
      ? params.status
      : '';
  return <TenantMonitorPage initialType={type} initialStatus={status} />;
}
