import { InventoryPage } from '@/features/inventory/InventoryPage';

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ status?: string | string[] }>;
}) {
  const rawStatus = (await searchParams).status;
  const status =
    typeof rawStatus === 'string' && ['ACTIVE', 'INACTIVE', 'ARCHIVED'].includes(rawStatus)
      ? rawStatus
      : '';
  return <InventoryPage initialStatus={status} />;
}
