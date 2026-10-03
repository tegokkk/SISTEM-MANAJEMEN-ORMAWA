import { z } from 'zod';

// ─────────────────────────────────────────────────────
// CREATE APPLICATION
// ─────────────────────────────────────────────────────

export const CreateApplicationSchema = z.object({
  requested_type: z.enum(['ORMAWA', 'HMJ', 'HIMA']),

  /** Required for HMJ */
  requested_department_id: z.string().optional(),

  /** Required for HIMA */
  requested_parent_tenant_id: z.string().optional(),
  requested_study_program_id: z.string().optional(),

  organization_code: z
    .string()
    .min(2, 'Kode organisasi minimal 2 karakter')
    .max(50, 'Kode organisasi maksimal 50 karakter')
    .regex(/^[A-Z0-9\-]+$/, 'Kode hanya boleh berisi huruf besar, angka, dan tanda hubung'),

  organization_name: z
    .string()
    .min(3, 'Nama organisasi minimal 3 karakter')
    .max(180, 'Nama organisasi maksimal 180 karakter'),

  organization_email: z
    .string()
    .email('Format email tidak valid')
    .optional()
    .or(z.literal('')),

  organization_phone: z
    .string()
    .max(30)
    .optional()
    .or(z.literal('')),

  description: z
    .string()
    .max(2000, 'Deskripsi maksimal 2000 karakter')
    .optional()
    .or(z.literal('')),

  reason: z
    .string()
    .min(20, 'Alasan pengajuan minimal 20 karakter')
    .max(2000, 'Alasan pengajuan maksimal 2000 karakter'),
}).superRefine((data, ctx) => {
  if (data.requested_type === 'HMJ' && !data.requested_department_id) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Jurusan wajib dipilih untuk pengajuan HMJ',
      path: ['requested_department_id'],
    });
  }
  if (data.requested_type === 'HIMA' && !data.requested_parent_tenant_id) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'HMJ induk wajib dipilih untuk pengajuan HIMA',
      path: ['requested_parent_tenant_id'],
    });
  }
  if (data.requested_type === 'HIMA' && !data.requested_study_program_id) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Program studi wajib dipilih untuk pengajuan HIMA',
      path: ['requested_study_program_id'],
    });
  }
});

export type CreateApplicationRequest = z.infer<typeof CreateApplicationSchema>;

// ─────────────────────────────────────────────────────
// REVIEW APPLICATION
// ─────────────────────────────────────────────────────

export const ReviewApplicationSchema = z.object({
  decision: z.enum(['APPROVED', 'REJECTED', 'REVISION_REQUESTED']),
  note: z.string().max(2000).optional(),
}).superRefine((data, ctx) => {
  if ((data.decision === 'REJECTED' || data.decision === 'REVISION_REQUESTED') && !data.note?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Catatan wajib diisi saat menolak atau meminta revisi',
      path: ['note'],
    });
  }
});

export type ReviewApplicationRequest = z.infer<typeof ReviewApplicationSchema>;

// ─────────────────────────────────────────────────────
// RESPONSE TYPES
// ─────────────────────────────────────────────────────

export type ApplicationStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'REVISION_REQUESTED'
  | 'APPROVED'
  | 'REJECTED';

export interface ApplicationSummary {
  id: string;
  requested_type: 'ORMAWA' | 'HMJ' | 'HIMA';
  organization_code: string;
  organization_name: string;
  organization_email?: string;
  status: ApplicationStatus;
  submitted_at?: string;
  reviewed_at?: string;
  applicant: { id: string; fullName: string; email: string };
}

export interface ApplicationDetail extends ApplicationSummary {
  description?: string;
  reason?: string;
  reviewer_note?: string;
  department?: { id: string; name: string };
  parent_tenant?: { id: string; name: string };
  study_program?: { id: string; name: string };
  history: Array<{
    from_status?: ApplicationStatus;
    to_status: ApplicationStatus;
    actor: string;
    note?: string;
    created_at: string;
  }>;
}
