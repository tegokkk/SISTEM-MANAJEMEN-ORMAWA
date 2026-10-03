import { ApiError } from '../utils/ApiError';

export const WORK_PROGRAM_TRANSITIONS = {
  DRAFT: ['SUBMITTED', 'CANCELLED'],
  SUBMITTED: ['APPROVED', 'REJECTED', 'REVISION_REQUESTED', 'CANCELLED'],
  REVISION_REQUESTED: ['SUBMITTED', 'CANCELLED'],
  APPROVED: ['RUNNING', 'CANCELLED'],
  REJECTED: [],
  RUNNING: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
} as const;

export type WorkProgramStatus = keyof typeof WORK_PROGRAM_TRANSITIONS;

export function assertWorkProgramTransition(from: WorkProgramStatus, to: WorkProgramStatus) {
  const allowed = WORK_PROGRAM_TRANSITIONS[from] as readonly WorkProgramStatus[];
  if (!allowed.includes(to)) {
    throw new ApiError(409, `Perubahan status ${from} ke ${to} tidak diizinkan`, undefined, 'INVALID_TRANSITION');
  }
}

export function assertRequestEditable(status: string) {
  if (!['DRAFT', 'REVISION_REQUESTED'].includes(status)) {
    throw new ApiError(409, 'Pengajuan tidak dapat diubah pada status ini', undefined, 'REQUEST_NOT_EDITABLE');
  }
}

export function assertWorkProgramDeletable(status: string) {
  if (!['DRAFT', 'REVISION_REQUESTED', 'REJECTED', 'CANCELLED'].includes(status)) {
    throw new ApiError(409, 'Program kerja pada status ini tidak dapat dihapus', undefined, 'PROGRAM_NOT_DELETABLE');
  }
}
