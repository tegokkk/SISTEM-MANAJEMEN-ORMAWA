import { AuthContextDTO, CreateApplicationRequest, ReviewApplicationRequest } from '@sim-ormawa/contracts';
import slugify from 'slugify';
import { prisma } from '../../core/prisma';
import { ApiError } from '../../utils/ApiError';
import { writeAudit } from '../../services/audit.service';
import { createNotification } from '../../services/notification.service';

export class ApplicationsService {
  private static async assertRequestReferences(dto: CreateApplicationRequest) {
    if (dto.requested_type === 'HMJ') {
      const department = await prisma.departments.findFirst({
        where: { id: BigInt(dto.requested_department_id!), is_active: true },
      });
      if (!department) throw new ApiError(422, 'Jurusan yang dipilih tidak valid');
    }

    if (dto.requested_type === 'HIMA') {
      const [parent, studyProgram] = await Promise.all([
        prisma.tenants.findFirst({
          where: { id: BigInt(dto.requested_parent_tenant_id!), tenant_type: 'HMJ', status: 'ACTIVE' },
        }),
        prisma.study_programs.findFirst({
          where: { id: BigInt(dto.requested_study_program_id!), is_active: true },
        }),
      ]);
      if (!parent) throw new ApiError(422, 'HMJ induk yang dipilih tidak valid');
      if (!studyProgram || studyProgram.department_id !== parent.department_id) {
        throw new ApiError(422, 'Program studi harus berada di jurusan HMJ induk');
      }
    }
  }

  /**
   * Buat pengajuan baru (Status DRAFT)
   */
  static async create(dto: CreateApplicationRequest, userId: string) {
    await this.assertRequestReferences(dto);
    const data: any = {
      applicant_user_id: BigInt(userId),
      requested_type: dto.requested_type,
      organization_code: dto.organization_code,
      organization_name: dto.organization_name,
      organization_email: dto.organization_email || null,
      organization_phone: dto.organization_phone || null,
      description: dto.description || null,
      reason: dto.reason,
      status: 'DRAFT',
    };

    if (dto.requested_department_id) {
      data.requested_department_id = BigInt(dto.requested_department_id);
    }
    if (dto.requested_parent_tenant_id) {
      data.requested_parent_tenant_id = BigInt(dto.requested_parent_tenant_id);
    }
    if (dto.requested_study_program_id) {
      data.requested_study_program_id = BigInt(dto.requested_study_program_id);
    }

    return prisma.$transaction(async (tx) => {
      const application = await tx.tenant_applications.create({ data });
      await tx.tenant_application_status_history.create({
        data: {
          tenant_application_id: application.id,
          to_status: 'DRAFT',
          actor_user_id: BigInt(userId),
          note: 'Pengajuan dibuat (DRAFT)',
        },
      });
      await writeAudit({
        actorUserId: BigInt(userId), action: 'TENANT_APPLICATION_CREATED', objectType: 'tenant_application',
        objectId: application.id, after: { requestedType: application.requested_type, status: application.status },
      }, tx);
      return application;
    });
  }

  /**
   * Submit pengajuan (DRAFT -> SUBMITTED)
   */
  static async submit(id: string, userId: string) {
    const appId = BigInt(id);
    const app = await prisma.tenant_applications.findUnique({ where: { id: appId } });
    if (!app) throw new ApiError(404, 'Pengajuan tidak ditemukan');
    if (app.applicant_user_id !== BigInt(userId)) throw new ApiError(403, 'Tidak memiliki akses ke pengajuan ini');
    if (app.status !== 'DRAFT' && app.status !== 'REVISION_REQUESTED') {
      throw new ApiError(409, 'Hanya pengajuan DRAFT atau REVISI yang dapat di-submit');
    }

    return prisma.$transaction(async (tx) => {
      const updated = await tx.tenant_applications.update({
        where: { id: appId },
        data: { status: 'SUBMITTED', submitted_at: new Date() },
      });
      await tx.tenant_application_status_history.create({
        data: {
          tenant_application_id: appId,
          from_status: app.status,
          to_status: 'SUBMITTED',
          actor_user_id: BigInt(userId),
          note: 'Pengajuan dikirim untuk direview',
        },
      });
      await writeAudit({
        actorUserId: BigInt(userId), action: 'TENANT_APPLICATION_SUBMITTED', objectType: 'tenant_application',
        objectId: appId, before: { status: app.status }, after: { status: 'SUBMITTED' },
      }, tx);
      return updated;
    });
  }

  /**
   * Daftar pengajuan.
   * Super Admin dapat melihat semua.
   * HMJ hanya dapat melihat HIMA di bawah jurusannya.
   */
  static async list(filters: { status?: string; reviewerTenantId?: string; reviewerType?: string; applicantUserId?: string }) {
    const where: any = {};
    if (filters.status) where.status = filters.status;
    if (filters.applicantUserId) where.applicant_user_id = BigInt(filters.applicantUserId);

    // Jika yang request adalah HMJ, pastikan mereka mereview HIMA
    if (filters.reviewerType === 'HMJ') {
      where.requested_type = 'HIMA';
      where.requested_parent_tenant_id = BigInt(filters.reviewerTenantId!);
    } else if (filters.reviewerType === 'SUPER_ADMIN') {
      // Super admin mereview ORMAWA dan HMJ
      where.requested_type = { in: ['ORMAWA', 'HMJ'] };
    }

    const applications = await prisma.tenant_applications.findMany({
      where,
      orderBy: { created_at: 'desc' },
      include: {
        users_tenant_applications_applicant_user_idTousers: {
          select: { id: true, full_name: true, email: true },
        },
      },
    });

    return applications.map((a) => ({
      id: a.id.toString(),
      requested_type: a.requested_type,
      organization_code: a.organization_code,
      organization_name: a.organization_name,
      organization_email: a.organization_email,
      status: a.status,
      submitted_at: a.submitted_at?.toISOString(),
      reviewed_at: a.reviewed_at?.toISOString(),
      applicant: {
        id: a.users_tenant_applications_applicant_user_idTousers.id.toString(),
        fullName: a.users_tenant_applications_applicant_user_idTousers.full_name,
        email: a.users_tenant_applications_applicant_user_idTousers.email,
      },
    }));
  }

  static async findOne(id: string) {
    const application = await prisma.tenant_applications.findUnique({
      where: { id: BigInt(id) },
      include: {
        users_tenant_applications_applicant_user_idTousers: { select: { id: true, full_name: true, email: true } },
        tenant_application_status_history: {
          orderBy: { created_at: 'desc' },
          include: {
            users: { select: { id: true, full_name: true } },
          },
        },
      },
    });

    if (!application) throw new ApiError(404, 'Pengajuan tidak ditemukan');

    // Mapped fields
    let department, parent_tenant, study_program;
    if (application.requested_department_id) {
      const d = await prisma.departments.findUnique({ where: { id: application.requested_department_id } });
      if (d) department = { id: d.id.toString(), name: d.name };
    }
    if (application.requested_parent_tenant_id) {
      const t = await prisma.tenants.findUnique({ where: { id: application.requested_parent_tenant_id } });
      if (t) parent_tenant = { id: t.id.toString(), name: t.name };
    }
    if (application.requested_study_program_id) {
      const s = await prisma.study_programs.findUnique({ where: { id: application.requested_study_program_id } });
      if (s) study_program = { id: s.id.toString(), name: s.name };
    }

    return {
      id: application.id.toString(),
      requested_type: application.requested_type,
      organization_code: application.organization_code,
      organization_name: application.organization_name,
      organization_email: application.organization_email,
      status: application.status,
      description: application.description,
      reason: application.reason,
      reviewer_note: application.reviewer_note,
      submitted_at: application.submitted_at?.toISOString(),
      reviewed_at: application.reviewed_at?.toISOString(),
      applicant: {
        id: application.users_tenant_applications_applicant_user_idTousers.id.toString(),
        fullName: application.users_tenant_applications_applicant_user_idTousers.full_name,
        email: application.users_tenant_applications_applicant_user_idTousers.email,
      },
      department,
      parent_tenant,
      study_program,
      history: application.tenant_application_status_history.map(h => ({
        from_status: h.from_status,
        to_status: h.to_status,
        actor: h.users.full_name,
        note: h.note,
        created_at: h.created_at.toISOString(),
      })),
    };
  }

  static async findOneForActor(id: string, auth: AuthContextDTO) {
    const application = await prisma.tenant_applications.findUnique({
      where: { id: BigInt(id) },
      select: {
        applicant_user_id: true,
        requested_type: true,
        requested_parent_tenant_id: true,
      },
    });
    if (!application) throw new ApiError(404, 'Pengajuan tidak ditemukan');

    const isOwner = application.applicant_user_id.toString() === auth.user.id;
    const isSuperAdmin = auth.user.roles.includes('SUPER_ADMIN') && application.requested_type !== 'HIMA';
    const isParentHmj =
      auth.activeTenant?.type === 'HMJ' &&
      auth.activeTenant.roles.includes('HMJ_ADMIN') &&
      application.requested_type === 'HIMA' &&
      application.requested_parent_tenant_id?.toString() === auth.activeTenant.id;

    if (!isOwner && !isSuperAdmin && !isParentHmj) {
      throw new ApiError(403, 'Tidak memiliki akses ke pengajuan ini');
    }
    return this.findOne(id);
  }

  /**
   * Review pengajuan. Apabila APPROVED, akan membuat tenant baru.
   */
  static async review(id: string, dto: ReviewApplicationRequest, reviewerUserId: string, reviewerTenantId?: string) {
    const appId = BigInt(id);
    const app = await prisma.tenant_applications.findUnique({ where: { id: appId } });
    if (!app) throw new ApiError(404, 'Pengajuan tidak ditemukan');
    if (app.status !== 'SUBMITTED') throw new ApiError(409, 'Hanya pengajuan SUBMITTED yang dapat direview');

    if (!reviewerTenantId && app.requested_type === 'HIMA') {
      throw new ApiError(403, 'Pengajuan HIMA hanya dapat direview oleh HMJ induk');
    }
    if (reviewerTenantId && app.requested_type !== 'HIMA') {
      throw new ApiError(403, 'HMJ hanya dapat mereview pengajuan HIMA');
    }

    // Jika direview oleh HMJ (reviewerTenantId ada), pastikan parent cocok
    if (reviewerTenantId && app.requested_parent_tenant_id?.toString() !== reviewerTenantId) {
      throw new ApiError(403, 'Anda tidak memiliki izin mereview pengajuan dari HMJ lain');
    }

    const now = new Date();

    if (dto.decision === 'APPROVED') {
      // ──────────────────────────────────────────────────────────
      // AKTIVASI TENANT (TRANSACTION)
      // ──────────────────────────────────────────────────────────
      const result = await prisma.$transaction(async (tx) => {
        // 1. Buat Tenant
        const slug = slugify(app.organization_name, { lower: true, strict: true });
        
        // Cek konflik kode/slug
        const conflict = await tx.tenants.findFirst({
          where: { OR: [{ code: app.organization_code }, { slug }] }
        });
        if (conflict) throw new Error('Kode atau nama organisasi sudah digunakan');

        const newTenant = await tx.tenants.create({
          data: {
            tenant_type: app.requested_type as 'ORMAWA' | 'HMJ' | 'HIMA',
            code: app.organization_code,
            name: app.organization_name,
            slug,
            description: app.description,
            email: app.organization_email,
            phone: app.organization_phone,
            status: 'ACTIVE',
            approved_at: now,
            parent_tenant_id: app.requested_parent_tenant_id,
            department_id: app.requested_department_id,
            study_program_id: app.requested_study_program_id,
            active_hmj_department_id: app.requested_type === 'HMJ' ? app.requested_department_id : null,
            active_hima_study_program_id: app.requested_type === 'HIMA' ? app.requested_study_program_id : null,
          },
        });

        // 2. Beri role admin ke applicant
        let roleCode = 'ORMAWA_ADMIN';
        if (app.requested_type === 'HMJ') roleCode = 'HMJ_ADMIN';
        else if (app.requested_type === 'HIMA') roleCode = 'HIMA_ADMIN';

        let role = await tx.roles.findUnique({ where: { code: roleCode } });
        if (!role) {
          role = await tx.roles.create({ data: { code: roleCode, name: `Admin ${app.requested_type}`, scope: 'TENANT' } });
        }

        await tx.user_roles.create({
          data: {
            user_id: app.applicant_user_id,
            role_id: role.id,
            tenant_id: newTenant.id,
            assigned_by_user_id: BigInt(reviewerUserId),
            assigned_at: now,
          },
        });

        // 3. Update pengajuan
        await tx.tenant_applications.update({
          where: { id: appId },
          data: {
            status: 'APPROVED',
            reviewer_user_id: BigInt(reviewerUserId),
            reviewer_tenant_id: reviewerTenantId ? BigInt(reviewerTenantId) : null,
            reviewer_note: dto.note || null,
            reviewed_at: now,
            approved_tenant_id: newTenant.id,
          },
        });

        // 4. Catat histori
        await tx.tenant_application_status_history.create({
          data: {
            tenant_application_id: appId,
            from_status: app.status,
            to_status: 'APPROVED',
            actor_user_id: BigInt(reviewerUserId),
            note: dto.note || 'Pengajuan disetujui. Tenant berhasil dibuat.',
          },
        });

        await createNotification({
          recipientUserId: app.applicant_user_id,
          tenantId: newTenant.id,
          type: 'TENANT_APPLICATION_APPROVED',
          title: 'Pengajuan organisasi disetujui',
          body: `${app.organization_name} telah aktif dan dapat digunakan.`,
          targetUrl: `/${app.requested_type.toLowerCase()}/dashboard`,
          objectType: 'tenant_application',
          objectId: appId,
        }, tx);
        await writeAudit({
          actorUserId: BigInt(reviewerUserId), actorTenantId: reviewerTenantId ? BigInt(reviewerTenantId) : null,
          action: 'TENANT_APPLICATION_APPROVED', objectType: 'tenant_application', objectId: appId,
          objectTenantId: newTenant.id, before: { status: app.status }, after: { status: 'APPROVED', tenantId: newTenant.id.toString() },
        }, tx);

        return newTenant;
      });
      return result;

    } else {
      // ──────────────────────────────────────────────────────────
      // REJECTED / REVISION_REQUESTED
      // ──────────────────────────────────────────────────────────
      await prisma.$transaction(async (tx) => {
        await tx.tenant_applications.update({
          where: { id: appId },
          data: {
            status: dto.decision,
            reviewer_user_id: BigInt(reviewerUserId),
            reviewer_tenant_id: reviewerTenantId ? BigInt(reviewerTenantId) : null,
            reviewer_note: dto.note,
            reviewed_at: now,
          },
        });
        await tx.tenant_application_status_history.create({
          data: {
            tenant_application_id: appId,
            from_status: app.status,
            to_status: dto.decision,
            actor_user_id: BigInt(reviewerUserId),
            note: dto.note,
          },
        });
        await createNotification({
          recipientUserId: app.applicant_user_id,
          type: `TENANT_APPLICATION_${dto.decision}`,
          title: dto.decision === 'REJECTED' ? 'Pengajuan organisasi ditolak' : 'Pengajuan perlu diperbaiki',
          body: dto.note ?? 'Silakan buka detail pengajuan.',
          targetUrl: '/status-pengajuan', objectType: 'tenant_application', objectId: appId,
        }, tx);
        await writeAudit({
          actorUserId: BigInt(reviewerUserId), actorTenantId: reviewerTenantId ? BigInt(reviewerTenantId) : null,
          action: `TENANT_APPLICATION_${dto.decision}`, objectType: 'tenant_application', objectId: appId,
          before: { status: app.status }, after: { status: dto.decision }, metadata: { note: dto.note },
        }, tx);
      });
    }

    return true;
  }
}
