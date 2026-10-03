import { Router, Request, Response } from 'express';
import { PrismaClient } from '../../generated/prisma';

const router = Router();
const prisma = new PrismaClient();

router.get('/', async (req: Request, res: Response) => {
  try {
    const departments = await prisma.departments.findMany({
      where: { is_active: true },
      orderBy: { name: 'asc' },
    });
    const mapped = departments.map(d => ({
      id: d.id.toString(),
      code: d.code,
      name: d.name,
    }));
    res.json({ success: true, data: mapped });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
