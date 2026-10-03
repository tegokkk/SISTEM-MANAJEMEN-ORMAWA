import { FinancePage } from '@/features/finance/FinancePage';

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ type?: string | string[]; status?: string | string[] }>;
}) {
  const params = await searchParams;
  const type =
    typeof params.type === 'string' && ['INCOME', 'EXPENSE'].includes(params.type)
      ? params.type
      : '';
  const status =
    typeof params.status === 'string' && ['DRAFT', 'POSTED', 'VOID'].includes(params.status)
      ? params.status
      : '';
  return <FinancePage initialType={type} initialStatus={status} />;
}
