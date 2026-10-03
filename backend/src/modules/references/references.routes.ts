import { Router } from 'express';
import { prisma } from '../../core/prisma';
import { ApiResponse } from '../../utils/ApiResponse';
import { parseId } from '../../utils/request';

const router = Router();

router.get('/departments', async (_req, res) => {
  const data = await prisma.departments.findMany({ where: { is_active: true }, orderBy: { name: 'asc' } });
  res.json(ApiResponse.success(data.map((item) => ({ id: item.id.toString(), code: item.code, name: item.name }))));
});

router.get('/study-programs', async (req, res) => {
  const departmentId = req.query.department_id ? parseId(req.query.department_id as string, 'ID jurusan') : undefined;
  const data = await prisma.study_programs.findMany({
    where: { is_active: true, department_id: departmentId },
    orderBy: { name: 'asc' },
  });
  res.json(ApiResponse.success(data.map((item) => ({
    id: item.id.toString(),
    departmentId: item.department_id.toString(),
    code: item.code,
    name: item.name,
    degreeLevel: item.degree_level,
  }))));
});

router.get('/hmj', async (_req, res) => {
  const data = await prisma.tenants.findMany({
    where: { tenant_type: 'HMJ', status: 'ACTIVE', deleted_at: null },
    orderBy: { name: 'asc' },
    select: { id: true, department_id: true, code: true, name: true },
  });
  res.json(ApiResponse.success(data.map((item) => ({
    id: item.id.toString(),
    departmentId: item.department_id?.toString(),
    code: item.code,
    name: item.name,
  }))));
});

export default router;
