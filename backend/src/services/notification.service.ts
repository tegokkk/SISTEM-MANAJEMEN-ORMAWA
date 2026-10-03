import { Prisma } from '../generated/prisma';
import { prisma } from '../core/prisma';

type NotificationInput = {
  recipientUserId: bigint;
  tenantId?: bigint | null;
  type: string;
  title: string;
  body: string;
  targetUrl?: string;
  objectType?: string;
  objectId?: bigint;
};

export function createNotification(
  input: NotificationInput,
  tx: Prisma.TransactionClient | typeof prisma = prisma,
) {
  return tx.notifications.create({
    data: {
      recipient_user_id: input.recipientUserId,
      tenant_id: input.tenantId,
      notification_type: input.type.slice(0, 80),
      title: input.title.slice(0, 180),
      body: input.body.slice(0, 1000),
      target_url: input.targetUrl?.slice(0, 500),
      object_type: input.objectType?.slice(0, 80),
      object_id: input.objectId,
    },
  });
}
