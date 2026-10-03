import { Router } from 'express';
import { z } from 'zod';
import { Prisma } from '../../generated/prisma';
import { requireAuth } from '../../middleware/auth.middleware';
import { requireTenantRole } from '../../middleware/role.guard';
import { prisma } from '../../core/prisma';
import { ApiResponse } from '../../utils/ApiResponse';
import { ApiError } from '../../utils/ApiError';
import { paginationFrom, parseId, requireTenantContext } from '../../utils/request';
import { serialize } from '../../utils/serialize';
import { writeAudit } from '../../services/audit.service';

const router = Router();
router.use(requireAuth, requireTenantRole(['ORMAWA_ADMIN', 'HMJ_ADMIN', 'HIMA_ADMIN']));

const itemConditionSchema = z.enum(['GOOD', 'MINOR_DAMAGE', 'MAJOR_DAMAGE', 'LOST', 'DISPOSED']);
const itemStatusSchema = z.enum(['ACTIVE', 'INACTIVE', 'ARCHIVED']);
export const inventoryFiltersSchema = z.object({
  condition: itemConditionSchema.optional(),
  location: z.string().trim().max(180).optional(),
  status: itemStatusSchema.optional(),
});

const itemSchema = z.object({
  code: z.string().trim().min(2).max(60).transform((v) => v.toUpperCase()), name: z.string().trim().min(2).max(180),
  description: z.string().trim().max(5000).optional().or(z.literal('')), category: z.string().trim().max(100).optional().or(z.literal('')),
  quantity: z.coerce.number().min(0).max(999999999999), minimumQuantity: z.coerce.number().min(0).max(999999999999).default(0),
  unit: z.string().trim().min(1).max(30).default('unit'), condition: itemConditionSchema.default('GOOD'),
  location: z.string().trim().max(180).optional().or(z.literal('')), acquisitionSource: z.string().trim().max(180).optional().or(z.literal('')),
  acquisitionDate: z.coerce.date().optional().nullable(), acquisitionValue: z.coerce.number().min(0).max(9999999999999999).optional().nullable(),
});
const movementSchema = z.object({ type: z.enum(['IN', 'OUT', 'ADJUSTMENT', 'DAMAGED', 'LOST', 'DISPOSED']),
  quantityDelta: z.coerce.number().refine((value) => value !== 0, 'Perubahan jumlah tidak boleh nol'), note: z.string().trim().max(500).optional() });

router.get('/', async (req, res) => {
  const { tenant } = requireTenantContext(req);
  const { page, limit, skip } = paginationFrom(req);
  const query = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 100) : '';
  const { condition, location, status } = inventoryFiltersSchema.parse(req.query);
  const where = { tenant_id: BigInt(tenant.id), deleted_at: null, item_condition: condition, status, location: location ? { contains: location } : undefined,
    OR: query ? [{ name: { contains: query } }, { code: { contains: query } }, { category: { contains: query } }] : undefined };
  const [items, total] = await Promise.all([
    prisma.inventory_items.findMany({ where, skip, take: limit, orderBy: { name: 'asc' } }), prisma.inventory_items.count({ where }),
  ]);
  res.json(ApiResponse.success(serialize(items), 'Inventaris berhasil dimuat', { page, limit, total, totalPages: Math.ceil(total / limit) }));
});

router.post('/', async (req, res) => {
  const { auth, tenant } = requireTenantContext(req);
  const input = itemSchema.parse(req.body);
  const tenantId = BigInt(tenant.id);
  const item = await prisma.$transaction(async (tx) => {
    const created = await tx.inventory_items.create({ data: { tenant_id: tenantId, code: input.code, name: input.name,
      description: input.description || null, category: input.category || null, quantity: input.quantity.toFixed(2), minimum_quantity: input.minimumQuantity.toFixed(2),
      unit: input.unit, item_condition: input.condition, location: input.location || null, acquisition_source: input.acquisitionSource || null,
      acquisition_date: input.acquisitionDate, acquisition_value: input.acquisitionValue?.toFixed(2), created_by_user_id: BigInt(auth.user.id) } });
    if (input.quantity > 0) await tx.inventory_movements.create({ data: { tenant_id: tenantId, inventory_item_id: created.id,
      movement_type: 'INITIAL', quantity_delta: input.quantity.toFixed(2), resulting_quantity: input.quantity.toFixed(2), actor_user_id: BigInt(auth.user.id), note: 'Stok awal' } });
    await writeAudit({ actorUserId: BigInt(auth.user.id), actorTenantId: tenantId, action: 'INVENTORY_CREATED', objectType: 'inventory_item',
      objectId: created.id, objectTenantId: tenantId, after: input }, tx);
    return created;
  });
  res.status(201).json(ApiResponse.success(serialize(item), 'Item inventaris berhasil dibuat'));
});

router.get('/:id', async (req, res) => {
  const { tenant } = requireTenantContext(req);
  const item = await prisma.inventory_items.findFirst({ where: { id: parseId(req.params.id), tenant_id: BigInt(tenant.id), deleted_at: null },
    include: { inventory_movements: { orderBy: { created_at: 'desc' }, take: 100 } } });
  if (!item) throw new ApiError(404, 'Item inventaris tidak ditemukan');
  res.json(ApiResponse.success(serialize(item)));
});

router.patch('/:id', async (req, res) => {
  const { auth, tenant } = requireTenantContext(req);
  const id = parseId(req.params.id);
  const input = itemSchema.omit({ quantity: true }).partial().extend({ status: itemStatusSchema.optional() }).parse(req.body);
  const existing = await prisma.inventory_items.findFirst({ where: { id, tenant_id: BigInt(tenant.id), deleted_at: null } });
  if (!existing) throw new ApiError(404, 'Item inventaris tidak ditemukan');
  const item = await prisma.inventory_items.update({ where: { id }, data: { code: input.code, name: input.name,
    description: input.description === '' ? null : input.description, category: input.category === '' ? null : input.category,
    minimum_quantity: input.minimumQuantity?.toFixed(2), unit: input.unit, item_condition: input.condition,
    location: input.location === '' ? null : input.location, acquisition_source: input.acquisitionSource === '' ? null : input.acquisitionSource,
    acquisition_date: input.acquisitionDate, acquisition_value: input.acquisitionValue?.toFixed(2), status: input.status, updated_by_user_id: BigInt(auth.user.id) } });
  await writeAudit({ actorUserId: BigInt(auth.user.id), actorTenantId: BigInt(tenant.id), action: 'INVENTORY_UPDATED', objectType: 'inventory_item',
    objectId: id, objectTenantId: BigInt(tenant.id), before: existing, after: input });
  res.json(ApiResponse.success(serialize(item), 'Item inventaris berhasil diperbarui'));
});

router.delete('/:id', async (req, res) => {
  const { auth, tenant } = requireTenantContext(req);
  const id = parseId(req.params.id);
  const tenantId = BigInt(tenant.id);
  const existing = await prisma.inventory_items.findFirst({ where: { id, tenant_id: tenantId, deleted_at: null } });
  if (!existing) throw new ApiError(404, 'Item inventaris tidak ditemukan');
  await prisma.$transaction(async (tx) => {
    await tx.inventory_items.update({ where: { id }, data: { status: 'ARCHIVED', deleted_at: new Date(), updated_by_user_id: BigInt(auth.user.id) } });
    await writeAudit({ actorUserId: BigInt(auth.user.id), actorTenantId: tenantId, action: 'INVENTORY_ARCHIVED',
      objectType: 'inventory_item', objectId: id, objectTenantId: tenantId, before: existing }, tx);
  });
  res.json(ApiResponse.success(null, 'Item inventaris berhasil diarsipkan'));
});

router.post('/:id/movements', async (req, res) => {
  const { auth, tenant } = requireTenantContext(req);
  const id = parseId(req.params.id);
  const input = movementSchema.parse(req.body);
  const result = await prisma.$transaction(async (tx) => {
    const item = await tx.inventory_items.findFirst({ where: { id, tenant_id: BigInt(tenant.id), deleted_at: null } });
    if (!item) throw new ApiError(404, 'Item inventaris tidak ditemukan');
    const delta = input.type === 'OUT' || input.type === 'LOST' || input.type === 'DISPOSED' ? -Math.abs(input.quantityDelta) : input.quantityDelta;
    const resulting = Number(item.quantity) + delta;
    if (resulting < 0) throw new ApiError(422, 'Stok inventaris tidak boleh negatif');
    const movement = await tx.inventory_movements.create({ data: { tenant_id: BigInt(tenant.id), inventory_item_id: id,
      movement_type: input.type, quantity_delta: delta.toFixed(2), resulting_quantity: resulting.toFixed(2), note: input.note,
      actor_user_id: BigInt(auth.user.id) } });
    await tx.inventory_items.update({ where: { id }, data: { quantity: resulting.toFixed(2),
      item_condition: input.type === 'LOST' ? 'LOST' : input.type === 'DISPOSED' ? 'DISPOSED' : undefined, updated_by_user_id: BigInt(auth.user.id) } });
    await writeAudit({ actorUserId: BigInt(auth.user.id), actorTenantId: BigInt(tenant.id), action: 'INVENTORY_MOVEMENT', objectType: 'inventory_item',
      objectId: id, objectTenantId: BigInt(tenant.id), before: { quantity: item.quantity.toString() }, after: { quantity: resulting, ...input } }, tx);
    return movement;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  res.status(201).json(ApiResponse.success(serialize(result), 'Pergerakan stok berhasil dicatat'));
});

export default router;
