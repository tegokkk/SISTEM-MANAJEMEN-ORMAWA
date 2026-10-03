import { describe, expect, it } from 'vitest';
import { assertRequestEditable, assertWorkProgramDeletable, assertWorkProgramTransition } from './workflow.policy';

describe('work program workflow', () => {
  it.each([
    ['DRAFT', 'SUBMITTED'], ['SUBMITTED', 'APPROVED'], ['SUBMITTED', 'REVISION_REQUESTED'],
    ['REVISION_REQUESTED', 'SUBMITTED'], ['APPROVED', 'RUNNING'], ['RUNNING', 'COMPLETED'],
  ] as const)('allows %s -> %s', (from, to) => {
    expect(() => assertWorkProgramTransition(from, to)).not.toThrow();
  });

  it.each([
    ['DRAFT', 'COMPLETED'], ['SUBMITTED', 'RUNNING'], ['REJECTED', 'SUBMITTED'], ['COMPLETED', 'RUNNING'],
  ] as const)('rejects %s -> %s', (from, to) => {
    expect(() => assertWorkProgramTransition(from, to)).toThrow(/tidak diizinkan/);
  });
});

describe('request editing workflow', () => {
  it('only allows draft and revision-requested submissions to change', () => {
    expect(() => assertRequestEditable('DRAFT')).not.toThrow();
    expect(() => assertRequestEditable('REVISION_REQUESTED')).not.toThrow();
    expect(() => assertRequestEditable('SUBMITTED')).toThrow(/tidak dapat diubah/);
    expect(() => assertRequestEditable('APPROVED')).toThrow(/tidak dapat diubah/);
  });
});

describe('work program deletion workflow', () => {
  it('protects submitted and running programs from deletion', () => {
    expect(() => assertWorkProgramDeletable('DRAFT')).not.toThrow();
    expect(() => assertWorkProgramDeletable('CANCELLED')).not.toThrow();
    expect(() => assertWorkProgramDeletable('SUBMITTED')).toThrow(/tidak dapat dihapus/);
    expect(() => assertWorkProgramDeletable('RUNNING')).toThrow(/tidak dapat dihapus/);
  });
});
