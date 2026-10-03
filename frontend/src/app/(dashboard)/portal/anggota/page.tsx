import { MembersPage } from '@/features/members/MembersPage';

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ status?: string | string[] }>;
}) {
  const rawStatus = (await searchParams).status;
  const status =
    typeof rawStatus === 'string' && ['ACTIVE', 'INACTIVE', 'ALUMNI'].includes(rawStatus)
      ? rawStatus
      : '';
  return <MembersPage initialStatus={status} />;
}
