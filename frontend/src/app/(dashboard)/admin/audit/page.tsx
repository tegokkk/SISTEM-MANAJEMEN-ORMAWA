import { AuditPage } from '@/features/system/AuditPage';

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ sinceHours?: string | string[] }>;
}) {
  const raw = (await searchParams).sinceHours;
  const parsed = typeof raw === 'string' ? Number(raw) : undefined;
  const sinceHours =
    Number.isInteger(parsed) && parsed! >= 1 && parsed! <= 720 ? parsed : undefined;
  return <AuditPage initialSinceHours={sinceHours} />;
}
