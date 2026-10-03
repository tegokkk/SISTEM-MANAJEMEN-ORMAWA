import crypto from 'node:crypto';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { app } from '../app';
import { env } from '../config/env';
import { prisma } from '../core/prisma';

const runId = `${Date.now().toString(36)}${crypto.randomBytes(3).toString('hex')}`.toUpperCase();
const prefix = `IT-${runId}`;

type Fixture = {
  departmentId?: bigint;
  studyProgramId?: bigint;
  tenantIds: bigint[];
  userIds: bigint[];
  memberIds: bigint[];
  periodId?: bigint;
  workProgramId?: bigint;
  financeRequestId?: bigint;
  tokens: Record<'ormaA' | 'ormaB' | 'hima' | 'hmj', string>;
  tenant: Partial<Record<'ormaA' | 'ormaB' | 'hima' | 'hmj', bigint>>;
  user: Partial<Record<'ormaA' | 'ormaB' | 'hima' | 'hmj', bigint>>;
};

const fixture: Fixture = {
  tenantIds: [],
  userIds: [],
  memberIds: [],
  tokens: {
    ormaA: `${prefix}-session-orma-a`,
    ormaB: `${prefix}-session-orma-b`,
    hima: `${prefix}-session-hima`,
    hmj: `${prefix}-session-hmj`,
  },
  tenant: {},
  user: {},
};

function assertSafeIntegrationDatabase() {
  const databaseUrl = new URL(env.DATABASE_URL);
  const databaseName = databaseUrl.pathname.replace(/^\//, '');
  const localHosts = new Set(['localhost', '127.0.0.1', '::1']);

  if (!localHosts.has(databaseUrl.hostname)) {
    throw new Error(
      `Integration test hanya boleh berjalan pada MySQL lokal, bukan ${databaseUrl.hostname}`,
    );
  }
  if (!['sim_ormawa_hmj', 'sim_ormawa_hmj_test'].includes(databaseName)) {
    throw new Error(`Database integration test tidak diizinkan: ${databaseName}`);
  }
}

function tokenHash(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function authenticated(token: string) {
  return { Cookie: `${env.COOKIE_NAME}=${token}` };
}

function authenticatedMutation(token: string) {
  return { ...authenticated(token), Origin: env.FRONTEND_URL };
}

async function cleanupFixture() {
  const financeRequestId = fixture.financeRequestId;
  const userIds = fixture.userIds;
  const tenantIds = fixture.tenantIds;

  if (financeRequestId) {
    await prisma.financial_transactions.deleteMany({
      where: { finance_request_id: financeRequestId },
    });
    await prisma.notifications.deleteMany({
      where: { object_type: 'finance_request', object_id: financeRequestId },
    });
    await prisma.audit_logs.deleteMany({
      where: { object_type: 'finance_request', object_id: financeRequestId },
    });
    await prisma.finance_request_status_history.deleteMany({
      where: { finance_request_id: financeRequestId },
    });
    await prisma.finance_request_items.deleteMany({
      where: { finance_request_id: financeRequestId },
    });
    await prisma.finance_requests.deleteMany({ where: { id: financeRequestId } });
  }

  if (userIds.length) {
    await prisma.audit_logs.deleteMany({ where: { actor_user_id: { in: userIds } } });
    await prisma.notifications.deleteMany({ where: { recipient_user_id: { in: userIds } } });
  }
  if (fixture.workProgramId) {
    await prisma.work_program_status_history.deleteMany({
      where: { work_program_id: fixture.workProgramId },
    });
    await prisma.work_programs.deleteMany({ where: { id: fixture.workProgramId } });
  }
  if (fixture.periodId) {
    await prisma.periods.deleteMany({ where: { id: fixture.periodId } });
  }
  if (fixture.memberIds.length) {
    await prisma.members.deleteMany({ where: { id: { in: fixture.memberIds } } });
  }
  if (tenantIds.length) {
    await prisma.transaction_categories.deleteMany({ where: { tenant_id: { in: tenantIds } } });
  }
  if (userIds.length) {
    await prisma.auth_sessions.deleteMany({ where: { user_id: { in: userIds } } });
    await prisma.user_roles.deleteMany({ where: { user_id: { in: userIds } } });
    await prisma.users.deleteMany({ where: { id: { in: userIds } } });
  }

  const himaId = fixture.tenant.hima;
  if (himaId) await prisma.tenants.deleteMany({ where: { id: himaId } });
  const remainingTenantIds = tenantIds.filter((id) => id !== himaId);
  if (remainingTenantIds.length) {
    await prisma.tenants.deleteMany({ where: { id: { in: remainingTenantIds } } });
  }
  if (fixture.studyProgramId) {
    await prisma.study_programs.deleteMany({ where: { id: fixture.studyProgramId } });
  }
  if (fixture.departmentId) {
    await prisma.departments.deleteMany({ where: { id: fixture.departmentId } });
  }
}

async function createTenantUser(
  key: 'ormaA' | 'ormaB' | 'hima' | 'hmj',
  roleCode: 'ORMAWA_ADMIN' | 'HIMA_ADMIN' | 'HMJ_ADMIN',
) {
  const tenantId = fixture.tenant[key];
  if (!tenantId) throw new Error(`Tenant fixture ${key} belum dibuat`);

  const role = await prisma.roles.findUnique({ where: { code: roleCode } });
  if (!role)
    throw new Error(`Role ${roleCode} tidak ditemukan; impor baseline SQL terlebih dahulu`);

  const user = await prisma.users.create({
    data: {
      email: `${key.toLowerCase()}.${runId.toLowerCase()}@example.test`,
      password_hash: 'integration-test-password-hash',
      full_name: `Integration ${key}`,
      status: 'ACTIVE',
      email_verified_at: new Date(),
    },
  });
  fixture.user[key] = user.id;
  fixture.userIds.push(user.id);

  await prisma.user_roles.create({
    data: { user_id: user.id, role_id: role.id, tenant_id: tenantId },
  });
  await prisma.auth_sessions.create({
    data: {
      user_id: user.id,
      token_hash: tokenHash(fixture.tokens[key]),
      active_tenant_id: tenantId,
      expires_at: new Date(Date.now() + 60 * 60 * 1000),
      user_agent: 'vitest-mysql-integration',
    },
  });
}

beforeAll(async () => {
  assertSafeIntegrationDatabase();

  try {
    const department = await prisma.departments.create({
      data: { code: `${prefix}-D`, name: `${prefix} Department` },
    });
    fixture.departmentId = department.id;

    const studyProgram = await prisma.study_programs.create({
      data: {
        department_id: department.id,
        code: `${prefix}-SP`,
        name: `${prefix} Study Program`,
        degree_level: 'D4',
      },
    });
    fixture.studyProgramId = studyProgram.id;

    const ormaA = await prisma.tenants.create({
      data: {
        tenant_type: 'ORMAWA',
        code: `${prefix}-OA`,
        name: `${prefix} ORMAWA A`,
        slug: `${prefix.toLowerCase()}-ormawa-a`,
        status: 'ACTIVE',
        approved_at: new Date(),
      },
    });
    const ormaB = await prisma.tenants.create({
      data: {
        tenant_type: 'ORMAWA',
        code: `${prefix}-OB`,
        name: `${prefix} ORMAWA B`,
        slug: `${prefix.toLowerCase()}-ormawa-b`,
        status: 'ACTIVE',
        approved_at: new Date(),
      },
    });
    const hmj = await prisma.tenants.create({
      data: {
        tenant_type: 'HMJ',
        department_id: department.id,
        code: `${prefix}-HMJ`,
        name: `${prefix} HMJ`,
        slug: `${prefix.toLowerCase()}-hmj`,
        status: 'ACTIVE',
        approved_at: new Date(),
      },
    });
    const hima = await prisma.tenants.create({
      data: {
        tenant_type: 'HIMA',
        parent_tenant_id: hmj.id,
        department_id: department.id,
        study_program_id: studyProgram.id,
        code: `${prefix}-HIMA`,
        name: `${prefix} HIMA`,
        slug: `${prefix.toLowerCase()}-hima`,
        status: 'ACTIVE',
        approved_at: new Date(),
      },
    });

    fixture.tenant = { ormaA: ormaA.id, ormaB: ormaB.id, hmj: hmj.id, hima: hima.id };
    fixture.tenantIds.push(ormaA.id, ormaB.id, hmj.id, hima.id);

    await createTenantUser('ormaA', 'ORMAWA_ADMIN');
    await createTenantUser('ormaB', 'ORMAWA_ADMIN');
    await createTenantUser('hmj', 'HMJ_ADMIN');
    await createTenantUser('hima', 'HIMA_ADMIN');

    const memberA = await prisma.members.create({
      data: {
        tenant_id: ormaA.id,
        student_number: `${prefix}-A-001`,
        full_name: `${prefix} Member A`,
      },
    });
    const memberB = await prisma.members.create({
      data: {
        tenant_id: ormaB.id,
        student_number: `${prefix}-B-001`,
        full_name: `${prefix} Member B`,
      },
    });
    fixture.memberIds.push(memberA.id, memberB.id);

    const himaUserId = fixture.user.hima;
    if (!himaUserId) throw new Error('User HIMA fixture belum dibuat');
    const period = await prisma.periods.create({
      data: {
        tenant_id: hima.id,
        name: `${prefix} Period`,
        start_date: new Date('2026-01-01'),
        end_date: new Date('2026-12-31'),
        status: 'ACTIVE',
        created_by_user_id: himaUserId,
      },
    });
    fixture.periodId = period.id;

    const program = await prisma.work_programs.create({
      data: {
        tenant_id: hima.id,
        period_id: period.id,
        reviewer_tenant_id: hmj.id,
        code: `${prefix}-PROG`,
        name: `${prefix} Program`,
        start_date: new Date('2026-06-01'),
        end_date: new Date('2026-06-30'),
        proposed_budget: '25001.10',
        created_by_user_id: himaUserId,
      },
    });
    fixture.workProgramId = program.id;
  } catch (error) {
    await cleanupFixture();
    throw error;
  }
});

afterAll(async () => {
  await cleanupFixture();
  await prisma.$disconnect();
});

describe('MySQL tenant and finance workflows', () => {
  it('QA-003 mengisolasi query anggota berdasarkan tenant aktif', async () => {
    const memberAId = fixture.memberIds[0];
    const memberBId = fixture.memberIds[1];

    const listResponse = await request(app)
      .get('/api/v1/members?limit=100')
      .set(authenticated(fixture.tokens.ormaA))
      .expect(200);

    expect(listResponse.body.success).toBe(true);
    expect(listResponse.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: memberAId.toString(), full_name: `${prefix} Member A` }),
      ]),
    );
    expect(listResponse.body.data).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: memberBId.toString() })]),
    );

    await request(app)
      .get(`/api/v1/members/${memberBId.toString()}`)
      .set(authenticated(fixture.tokens.ormaA))
      .expect(404);
  });

  it('QA-004 menyimpan approval dana, histori, audit, notifikasi, dan transaksi secara konsisten', async () => {
    const workProgramId = fixture.workProgramId;
    if (!workProgramId) throw new Error('Program fixture belum dibuat');

    const createResponse = await request(app)
      .post('/api/v1/finance-requests')
      .set(authenticatedMutation(fixture.tokens.hima))
      .send({
        workProgramId: workProgramId.toString(),
        requestNumber: `${prefix}-FR`,
        title: `${prefix} Finance Request`,
        description: 'Integration workflow',
        items: [
          {
            description: 'Integration item',
            quantity: 2,
            unit: 'item',
            requestedUnitPrice: 12500.55,
          },
        ],
      })
      .expect(201);

    const financeRequestId = BigInt(createResponse.body.data.id);
    fixture.financeRequestId = financeRequestId;

    await request(app)
      .post(`/api/v1/finance-requests/${financeRequestId.toString()}/submit`)
      .set(authenticatedMutation(fixture.tokens.hima))
      .send({})
      .expect(200);

    await request(app)
      .post(`/api/v1/finance-requests/${financeRequestId.toString()}/review`)
      .set(authenticatedMutation(fixture.tokens.hmj))
      .send({ decision: 'APPROVED', note: 'Integration approval' })
      .expect(200);

    const [financeRequest, transactions, history, audits, notifications] = await Promise.all([
      prisma.finance_requests.findUnique({ where: { id: financeRequestId } }),
      prisma.financial_transactions.findMany({ where: { finance_request_id: financeRequestId } }),
      prisma.finance_request_status_history.findMany({
        where: { finance_request_id: financeRequestId },
        orderBy: { created_at: 'asc' },
      }),
      prisma.audit_logs.findMany({
        where: { object_type: 'finance_request', object_id: financeRequestId },
      }),
      prisma.notifications.findMany({
        where: { object_type: 'finance_request', object_id: financeRequestId },
      }),
    ]);

    expect(financeRequest?.status).toBe('APPROVED');
    expect(financeRequest?.requested_amount.toFixed(2)).toBe('25001.10');
    expect(financeRequest?.approved_amount?.toFixed(2)).toBe('25001.10');
    expect(history.map((entry) => entry.to_status)).toEqual(['DRAFT', 'SUBMITTED', 'APPROVED']);
    expect(transactions).toHaveLength(1);
    expect(transactions[0]).toMatchObject({ transaction_type: 'INCOME', status: 'DRAFT' });
    expect(transactions[0].amount.toFixed(2)).toBe('25001.10');
    expect(audits.map((entry) => entry.action)).toEqual(
      expect.arrayContaining([
        'FINANCE_REQUEST_CREATED',
        'FINANCE_REQUEST_SUBMITTED',
        'FINANCE_REQUEST_APPROVED',
      ]),
    );
    expect(notifications).toHaveLength(1);
    expect(notifications[0].recipient_user_id).toBe(fixture.user.hima);

    await request(app)
      .post(`/api/v1/finance-requests/${financeRequestId.toString()}/review`)
      .set(authenticatedMutation(fixture.tokens.hmj))
      .send({ decision: 'APPROVED', note: 'Duplicate approval must fail' })
      .expect(404);

    expect(
      await prisma.financial_transactions.count({
        where: { finance_request_id: financeRequestId },
      }),
    ).toBe(1);
  });
});
