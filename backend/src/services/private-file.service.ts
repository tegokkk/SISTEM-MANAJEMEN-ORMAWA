import crypto from 'crypto';
import { mkdir, readFile, unlink, writeFile } from 'fs/promises';
import path from 'path';
import multer from 'multer';
import { Prisma } from '../generated/prisma';
import { env } from '../config/env';
import { prisma } from '../core/prisma';
import { ApiError } from '../utils/ApiError';

const storageRoot = path.resolve(env.FILE_STORAGE_PATH);
export const privateUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: env.MAX_UPLOAD_SIZE_MB * 1024 * 1024,
    files: 1,
    fields: 2,
    fieldSize: 2000,
  },
}).single('file');

export function detectPrivateFile(buffer: Buffer) {
  if (buffer.subarray(0, 5).toString() === '%PDF-')
    return { mime: 'application/pdf', extension: 'pdf' };
  if (buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])))
    return { mime: 'image/png', extension: 'png' };
  if (buffer.subarray(0, 3).equals(Buffer.from([255, 216, 255])))
    return { mime: 'image/jpeg', extension: 'jpg' };
  throw new ApiError(422, 'Berkas harus berupa PDF, PNG, atau JPEG yang valid');
}

export function sanitizeOriginalFilename(name: string, fallbackExtension: string) {
  return (
    path
      .basename(name)
      .replace(/[\u0000-\u001f\u007f<>:&"\\]/g, '_')
      .slice(0, 255) || `berkas.${fallbackExtension}`
  );
}

export async function withPrivateFile<T>(
  file: Express.Multer.File | undefined,
  tenantId: bigint,
  userId: bigint,
  link: (tx: Prisma.TransactionClient, fileId: bigint) => Promise<T>,
) {
  if (!file) throw new ApiError(422, 'Berkas wajib dipilih');
  if (env.FILE_STORAGE_DRIVER !== 'local')
    throw new ApiError(503, 'Penyimpanan berkas belum dikonfigurasi');
  const detected = detectPrivateFile(file.buffer);
  const filename = sanitizeOriginalFilename(file.originalname, detected.extension);
  const key = crypto.randomUUID();
  await mkdir(storageRoot, { recursive: true, mode: 0o700 });
  await writeFile(path.join(storageRoot, key), file.buffer, { flag: 'wx', mode: 0o600 });
  try {
    return await prisma.$transaction(
      async (tx) => {
        const record = await tx.files.create({
          data: {
            tenant_id: tenantId,
            uploaded_by_user_id: userId,
            storage_driver: 'local',
            storage_key: key,
            original_name: filename,
            mime_type: detected.mime,
            extension: detected.extension,
            size_bytes: BigInt(file.buffer.length),
            checksum_sha256: crypto.createHash('sha256').update(file.buffer).digest('hex'),
            visibility: 'PRIVATE',
            scan_status: 'PENDING',
          },
        });
        return link(tx, record.id);
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (error) {
    await unlink(path.join(storageRoot, key)).catch(() => undefined);
    throw error;
  }
}

export async function readPrivateFile(key: string) {
  if (!/^[0-9a-f-]{36}$/.test(key)) throw new ApiError(404, 'Berkas tidak ditemukan');
  try {
    return await readFile(path.join(storageRoot, key));
  } catch {
    throw new ApiError(404, 'Berkas tidak ditemukan');
  }
}
