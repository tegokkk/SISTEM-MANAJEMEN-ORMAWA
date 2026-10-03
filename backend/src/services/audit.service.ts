import { Prisma } from '../generated/prisma';
import { prisma } from '../core/prisma';

const SENSITIVE_KEYS = /password|token|secret|authorization|cookie|session/i;

export function sanitizeAuditData(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizeAuditData);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        SENSITIVE_KEYS.test(key) ? '[REDACTED]' : sanitizeAuditData(item),
      ]),
    );
  }
  if (typeof value === 'string' && value.length > 4000) return `${value.slice(0, 4000)}…`;
  return value;
}

type AuditInput = {
  actorUserId?: bigint;
  actorTenantId?: bigint | null;
  action: string;
  objectType: string;
  objectId?: bigint | null;
  objectTenantId?: bigint | null;
  requestId?: string;
  before?: unknown;
  after?: unknown;
  metadata?: unknown;
};

export async function writeAudit(input: AuditInput, tx: Prisma.TransactionClient | typeof prisma = prisma) {
  return tx.audit_logs.create({
    data: {
      actor_user_id: input.actorUserId,
      actor_tenant_id: input.actorTenantId,
      action: input.action.slice(0, 100),
      object_type: input.objectType.slice(0, 80),
      object_id: input.objectId,
      object_tenant_id: input.objectTenantId,
      request_id: input.requestId?.slice(0, 100),
      before_data: input.before === undefined ? undefined : JSON.stringify(sanitizeAuditData(input.before)),
      after_data: input.after === undefined ? undefined : JSON.stringify(sanitizeAuditData(input.after)),
      metadata: input.metadata === undefined ? undefined : JSON.stringify(sanitizeAuditData(input.metadata)),
    },
  });
}
