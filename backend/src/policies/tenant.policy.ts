export type TenantIdentity = {
  id: string;
  type: 'ORMAWA' | 'HMJ' | 'HIMA';
  parentTenantId?: string | null;
};

export function canAccessTenant(actor: TenantIdentity, resourceTenantId: string): boolean {
  return actor.id === resourceTenantId;
}

export function isHmjHimaPair(first: TenantIdentity, second: TenantIdentity): boolean {
  if (first.type === 'HMJ' && second.type === 'HIMA') return second.parentTenantId === first.id;
  if (first.type === 'HIMA' && second.type === 'HMJ') return first.parentTenantId === second.id;
  return false;
}

export function canReviewChildHima(hmj: TenantIdentity, hima: TenantIdentity): boolean {
  return hmj.type === 'HMJ' && hima.type === 'HIMA' && hima.parentTenantId === hmj.id;
}

export function resolveReviewTarget(actor: TenantIdentity, requestedTargetId?: string | null): string | null {
  if (actor.type === 'HIMA') return actor.parentTenantId ?? null;
  if (!requestedTargetId || requestedTargetId === actor.id) return actor.id;
  return null;
}
