import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError';
import { ApiResponse } from '../utils/ApiResponse';
import { logger } from '../utils/logger';
import { env } from '../config/env';
import { ZodError } from 'zod';
import { MulterError } from 'multer';

export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  next(new ApiError(404, `Rute tidak ditemukan: ${req.originalUrl}`));
};

export const errorHandler = (
  err: Error | ApiError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
) => {
  let statusCode = 500;
  let message = 'Terjadi kesalahan pada server';
  let errors: unknown = undefined;
  let code = 'INTERNAL_SERVER_ERROR';

  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
    errors = err.details;
    code = err.code;
  } else if (err instanceof ZodError) {
    statusCode = 422;
    message = 'Periksa kembali data yang ditandai';
    errors = err.flatten();
    code = 'VALIDATION_ERROR';
  } else if (err instanceof MulterError) {
    statusCode = err.code === 'LIMIT_FILE_SIZE' ? 413 : 422;
    message = err.code === 'LIMIT_FILE_SIZE' ? 'Ukuran berkas melebihi batas' : 'Format unggahan tidak valid';
    code = 'UPLOAD_ERROR';
  } else {
    logger.error({ err, req: { method: req.method, url: req.originalUrl } }, 'Unhandled Exception');
  }

  res.status(statusCode).json({ ...ApiResponse.error(message, errors, code), requestId: res.locals.requestId });
};
