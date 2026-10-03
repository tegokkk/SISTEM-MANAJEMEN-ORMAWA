import crypto from 'crypto';
import { NextFunction, Request, Response } from 'express';

export function requestId(req: Request, res: Response, next: NextFunction) {
  const id = req.get('x-request-id')?.slice(0, 100) || crypto.randomUUID();
  res.locals.requestId = id;
  res.setHeader('x-request-id', id);
  next();
}
