import { NextFunction, Request, Response } from 'express';
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export function verifyMutationOrigin(req: Request, _res: Response, next: NextFunction) {
  if (SAFE_METHODS.has(req.method)) return next();

  const origin = req.get('origin');
  if (origin !== env.FRONTEND_URL) {
    return next(new ApiError(403, 'Origin permintaan tidak diizinkan', undefined, 'INVALID_ORIGIN'));
  }

  const contentType = req.get('content-type') ?? '';
  if (!contentType.startsWith('application/json') && !contentType.startsWith('multipart/form-data')) {
    return next(new ApiError(415, 'Tipe konten tidak didukung', undefined, 'UNSUPPORTED_MEDIA_TYPE'));
  }
  return next();
}
