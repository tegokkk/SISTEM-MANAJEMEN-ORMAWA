import { PrismaClient } from '../src/generated/prisma';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === 'production') throw new Error('Seed akun demo tidak boleh dijalankan pada production');
  console.log('Seeding database...');

  // 0. Buat Department untuk HMJ
  console.log('Creating department...');
  const deptPertanian = await prisma.departments.upsert({
    where: { code: 'BTP' },
    update: {},
    create: {
      code: 'BTP',
      name: 'Budidaya Tanaman Pangan'
    }
  });
  const studyProgram = await prisma.study_programs.findUnique({ where: { code: 'BTP-D4-TBN' } });
  if (!studyProgram) throw new Error('Impor database/sim_ormawa_hmj.sql sebelum menjalankan seed demo');

  // 1. Buat Roles
  console.log('Creating roles...');
  const roleSuperAdmin = await prisma.roles.upsert({
    where: { code: 'SUPER_ADMIN' },
    update: {},
    create: { code: 'SUPER_ADMIN', name: 'Super Administrator', scope: 'SYSTEM' }
  });

  const roleOrmawaAdmin = await prisma.roles.upsert({
    where: { code: 'ORMAWA_ADMIN' },
    update: {},
    create: { code: 'ORMAWA_ADMIN', name: 'Admin ORMAWA', scope: 'TENANT' }
  });

  const roleHmjAdmin = await prisma.roles.upsert({
    where: { code: 'HMJ_ADMIN' },
    update: {},
    create: { code: 'HMJ_ADMIN', name: 'Admin HMJ', scope: 'TENANT' }
  });
  const roleHimaAdmin = await prisma.roles.upsert({
    where: { code: 'HIMA_ADMIN' },
    update: {},
    create: { code: 'HIMA_ADMIN', name: 'Admin HIMA', scope: 'TENANT' }
  });

  // 2. Buat Tenants (Organisasi)
  console.log('Creating tenants...');
  const bem = await prisma.tenants.upsert({
    where: { code: 'BEM' },
    update: {},
    create: {
      code: 'BEM',
      slug: 'bem-polinela',
      name: 'BEM Polinela',
      tenant_type: 'ORMAWA',
      status: 'ACTIVE',
      email: 'bem@polinela.ac.id'
    }
  });

  const hmjPangan = await prisma.tenants.upsert({
    where: { code: 'HMJ-PANGAN' },
    update: {},
    create: {
      code: 'HMJ-PANGAN',
      slug: 'hmj-budidaya-tanaman-pangan',
      name: 'HMJ Budidaya Tanaman Pangan',
      tenant_type: 'HMJ',
      department_id: deptPertanian.id,
      active_hmj_department_id: deptPertanian.id,
      status: 'ACTIVE',
      email: 'hmj.pangan@polinela.ac.id'
    }
  });
  const himaTbn = await prisma.tenants.upsert({
    where: { code: 'HIMA-TBN-DEMO' },
    update: {},
    create: {
      code: 'HIMA-TBN-DEMO', slug: 'hima-teknologi-perbenihan-demo', name: 'HIMA Teknologi Perbenihan (Demo)',
      tenant_type: 'HIMA', parent_tenant_id: hmjPangan.id, department_id: deptPertanian.id,
      study_program_id: studyProgram.id, active_hima_study_program_id: studyProgram.id,
      status: 'ACTIVE', email: 'hima.demo@example.test'
    }
  });

  // 3. Buat Users dan Roles
  console.log('Creating users...');
  const passwordHash = await bcrypt.hash('password123', 10);

  // Super Admin
  const adminUser = await prisma.users.upsert({
    where: { email: 'admin@polinela.ac.id' },
    update: {},
    create: {
      email: 'admin@polinela.ac.id',
      password_hash: passwordHash,
      full_name: 'Super Admin',
      status: 'ACTIVE',
      auth_provider: 'LOCAL',
    }
  });

  const existingSuperAdminRole = await prisma.user_roles.findFirst({
    where: { user_id: adminUser.id, role_id: roleSuperAdmin.id }
  });
  
  if (!existingSuperAdminRole) {
    await prisma.user_roles.create({
      data: { user_id: adminUser.id, role_id: roleSuperAdmin.id }
    });
  }

  // BEM Admin
  const bemAdminUser = await prisma.users.upsert({
    where: { email: 'bem@polinela.ac.id' },
    update: {},
    create: {
      email: 'bem@polinela.ac.id',
      password_hash: passwordHash,
      full_name: 'Admin BEM',
      status: 'ACTIVE',
      auth_provider: 'LOCAL',
    }
  });

  const existingBemRole = await prisma.user_roles.findFirst({
    where: { user_id: bemAdminUser.id, role_id: roleOrmawaAdmin.id, tenant_id: bem.id }
  });
  
  if (!existingBemRole) {
    await prisma.user_roles.create({
      data: { user_id: bemAdminUser.id, role_id: roleOrmawaAdmin.id, tenant_id: bem.id }
    });
  }

  // HMJ Admin
  const hmjAdminUser = await prisma.users.upsert({
    where: { email: 'hmjpangan@polinela.ac.id' },
    update: {},
    create: {
      email: 'hmjpangan@polinela.ac.id',
      password_hash: passwordHash,
      full_name: 'Admin HMJ Pangan',
      status: 'ACTIVE',
      auth_provider: 'LOCAL',
    }
  });

  const existingHmjRole = await prisma.user_roles.findFirst({
    where: { user_id: hmjAdminUser.id, role_id: roleHmjAdmin.id, tenant_id: hmjPangan.id }
  });
  
  if (!existingHmjRole) {
    await prisma.user_roles.create({
      data: { user_id: hmjAdminUser.id, role_id: roleHmjAdmin.id, tenant_id: hmjPangan.id }
    });
  }

  const himaAdminUser = await prisma.users.upsert({
    where: { email: 'hima.demo@example.test' }, update: {},
    create: { email: 'hima.demo@example.test', password_hash: passwordHash,
      full_name: 'Admin HIMA Demo', status: 'ACTIVE', auth_provider: 'LOCAL' }
  });
  const existingHimaRole = await prisma.user_roles.findFirst({
    where: { user_id: himaAdminUser.id, role_id: roleHimaAdmin.id, tenant_id: himaTbn.id }
  });
  if (!existingHimaRole) await prisma.user_roles.create({
    data: { user_id: himaAdminUser.id, role_id: roleHimaAdmin.id, tenant_id: himaTbn.id }
  });

  for (const { tenant, owner, label } of [
    { tenant: bem, owner: bemAdminUser, label: 'BEM' },
    { tenant: hmjPangan, owner: hmjAdminUser, label: 'HMJ' },
    { tenant: himaTbn, owner: himaAdminUser, label: 'HIMA' },
  ]) {
    await prisma.periods.upsert({
      where: { tenant_id_name: { tenant_id: tenant.id, name: 'Periode Demo 2026' } },
      update: {},
      create: { tenant_id: tenant.id, name: 'Periode Demo 2026',
        start_date: new Date('2026-01-01'), end_date: new Date('2026-12-31'),
        status: 'ACTIVE', active_tenant_id: tenant.id, created_by_user_id: owner.id }
    });
    await prisma.members.upsert({
      where: { tenant_id_student_number: { tenant_id: tenant.id, student_number: `DEMO-${label}-001` } },
      update: {},
      create: { tenant_id: tenant.id, student_number: `DEMO-${label}-001`,
        full_name: `Anggota ${label} Demo`, status: 'ACTIVE',
        study_program_id: label === 'HIMA' ? studyProgram.id : null }
    });
  }

  const himaPeriod = await prisma.periods.findUniqueOrThrow({
    where: { tenant_id_name: { tenant_id: himaTbn.id, name: 'Periode Demo 2026' } }
  });
  await prisma.work_programs.upsert({
    where: { tenant_id_code: { tenant_id: himaTbn.id, code: 'PROJA-DEMO-001' } },
    update: {},
    create: { tenant_id: himaTbn.id, period_id: himaPeriod.id, code: 'PROJA-DEMO-001',
      name: 'Lokakarya Benih Demo', start_date: new Date('2026-10-01'), end_date: new Date('2026-10-02'),
      proposed_budget: 2500000, status: 'DRAFT', created_by_user_id: himaAdminUser.id }
  });

  console.log('Database seeded successfully!');
  console.log('Test Accounts:');
  console.log('1. admin@polinela.ac.id / password123 (SUPER_ADMIN)');
  console.log('2. bem@polinela.ac.id / password123 (ORMAWA_ADMIN)');
  console.log('3. hmjpangan@polinela.ac.id / password123 (HMJ_ADMIN)');
  console.log('4. hima.demo@example.test / password123 (HIMA_ADMIN)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
