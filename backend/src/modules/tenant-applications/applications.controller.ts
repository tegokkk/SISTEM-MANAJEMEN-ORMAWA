import { Request, Response } from 'express';
import { ApplicationsService } from './applications.service';
import { CreateApplicationSchema, ReviewApplicationSchema } from '@sim-ormawa/contracts';
import { ApiError } from '../../utils/ApiError';
import { ApiResponse } from '../../utils/ApiResponse';

function authFrom(req: Request) {
  if (!req.authContext) throw new ApiError(401, 'Silakan login terlebih dahulu');
  return req.authContext;
}

function idFrom(req: Request): string {
  const raw = req.params.id;
  const id = Array.isArray(raw) ? raw[0] : raw;
  if (!id || !/^\d+$/.test(id)) throw new ApiError(400, 'ID pengajuan tidak valid');
  return id;
}

export class ApplicationsController {
  static async create(req: Request, res: Response) {
    const auth = authFrom(req);
    const data = CreateApplicationSchema.parse(req.body);
    const application = await ApplicationsService.create(data, auth.user.id);
    res.status(201).json(ApiResponse.success({ id: application.id.toString() }, 'Pengajuan berhasil dibuat'));
  }

  static async submit(req: Request, res: Response) {
    const auth = authFrom(req);
    await ApplicationsService.submit(idFrom(req), auth.user.id);
    res.json(ApiResponse.success(null, 'Pengajuan berhasil dikirim'));
  }

  static async list(req: Request, res: Response) {
    const auth = authFrom(req);
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    let reviewerType: 'SUPER_ADMIN' | 'HMJ' | undefined;
    let reviewerTenantId: string | undefined;
    let applicantUserId: string | undefined;

    if (auth.user.roles.includes('SUPER_ADMIN')) {
      reviewerType = 'SUPER_ADMIN';
    } else if (auth.activeTenant?.type === 'HMJ' && auth.activeTenant.roles.includes('HMJ_ADMIN')) {
      reviewerType = 'HMJ';
      reviewerTenantId = auth.activeTenant.id;
    } else {
      applicantUserId = auth.user.id;
    }

    const applications = await ApplicationsService.list({ status, reviewerType, reviewerTenantId, applicantUserId });
    res.json(ApiResponse.success(applications, 'Daftar pengajuan berhasil dimuat'));
  }

  static async findOne(req: Request, res: Response) {
    const auth = authFrom(req);
    const application = await ApplicationsService.findOneForActor(idFrom(req), auth);
    res.json(ApiResponse.success(application, 'Detail pengajuan berhasil dimuat'));
  }

  static async review(req: Request, res: Response) {
    const auth = authFrom(req);
    const data = ReviewApplicationSchema.parse(req.body);
    let reviewerTenantId: string | undefined;

    if (!auth.user.roles.includes('SUPER_ADMIN')) {
      if (auth.activeTenant?.type !== 'HMJ' || !auth.activeTenant.roles.includes('HMJ_ADMIN')) {
        throw new ApiError(403, 'Akses ditolak');
      }
      reviewerTenantId = auth.activeTenant.id;
    }

    await ApplicationsService.review(idFrom(req), data, auth.user.id, reviewerTenantId);
    res.json(ApiResponse.success(null, 'Review berhasil disimpan'));
  }
}
