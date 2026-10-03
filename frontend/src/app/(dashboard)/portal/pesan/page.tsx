import { MessagingPage } from '@/features/messaging/MessagingPage';

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ unread?: string | string[] }>;
}) {
  const unreadOnly = (await searchParams).unread === 'true';
  return <MessagingPage unreadOnly={unreadOnly} />;
}
