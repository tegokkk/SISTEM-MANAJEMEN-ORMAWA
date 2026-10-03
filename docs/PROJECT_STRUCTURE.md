# Project Structure — Frontend dan Backend Terpisah

[Kembali ke README](../README.md) · [Backend](BACKEND.md) · [Frontend](FRONTEND.md) · [Style Guide](STYLEGUIDE.md) · [Database](DATABASE.md) · [Task List](TASK_LIST.md)

## Tujuan

SIM ORMAWA & HMJ menggunakan dua aplikasi yang dipisahkan secara tegas:

- `frontend/`: Next.js, React, TypeScript, dan Tailwind CSS.
- `backend/`: Node.js, Express, TypeScript, Prisma, dan MySQL.

Frontend tidak mengakses MySQL atau Prisma secara langsung. Seluruh data, autentikasi, otorisasi, workflow, audit log, notifikasi, dan file privat diproses oleh backend melalui REST API `/api/v1`.

## Gambaran Arsitektur

```text
┌──────────────────────────────┐
│ FRONTEND                     │
│ Next.js + React + TypeScript │
│ Port development: 3000       │
└──────────────┬───────────────┘
               │ HTTPS / JSON
               │ /api/v1
┌──────────────▼───────────────┐
│ BACKEND                      │
│ Express + TypeScript         │
│ Port development: 4000       │
│ Auth + Tenant Guard + API    │
└───────┬──────────────┬───────┘
        │              │
┌───────▼──────┐ ┌─────▼──────────────┐
│ MySQL 8      │ │ Private File Store │
│ Port: 3306   │ │ Local/S3-compatible│
└──────────────┘ └────────────────────┘
```

## Prinsip Struktur

1. Frontend dan backend mempunyai dependency, konfigurasi, test, serta build masing-masing.
2. Database hanya boleh diakses backend.
3. Frontend memakai API client terpusat, bukan memanggil `fetch` secara acak pada setiap komponen.
4. Backend dikelompokkan per domain/module dan menggunakan alur route → controller → service → repository.
5. Route/controller tidak berisi query atau aturan bisnis kompleks.
6. Semua repository data organisasi menerima tenant context yang tervalidasi.
7. Kontrak request/response yang aman dapat dibagikan melalui `packages/contracts`.
8. Model Prisma tidak dibagikan ke frontend.
9. Workflow memakai endpoint command khusus seperti `submit`, `approve`, dan `reject`.
10. Unit, integration, dan end-to-end test ditempatkan sesuai lapisan yang diuji.

## Struktur Direktori Lengkap

```text
sim-ormawa-hmj/
├── frontend/                          # Aplikasi web Next.js
│   ├── public/
│   │   ├── brand/
│   │   │   ├── institution-logo.svg
│   │   │   └── portal-mark.svg
│   │   ├── icons/
│   │   ├── illustrations/
│   │   ├── images/
│   │   ├── favicon.ico
│   │   └── manifest.webmanifest
│   │
│   ├── src/
│   │   ├── app/                       # Route Next.js; hanya presentation/composition
│   │   │   ├── (public)/
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── page.tsx
│   │   │   │   ├── organisasi/
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   └── [slug]/
│   │   │   │   │       ├── page.tsx
│   │   │   │   │       └── not-found.tsx
│   │   │   │   ├── tentang/page.tsx
│   │   │   │   └── kontak/page.tsx
│   │   │   │
│   │   │   ├── (auth)/
│   │   │   │   ├── layout.tsx
│   │   │   │   └── portal/
│   │   │   │       ├── login/page.tsx
│   │   │   │       ├── lupa-password/page.tsx
│   │   │   │       ├── reset-password/page.tsx
│   │   │   │       ├── daftar/
│   │   │   │       │   ├── page.tsx
│   │   │   │       │   ├── ormawa/page.tsx
│   │   │   │       │   ├── hmj/page.tsx
│   │   │   │       │   └── hima/page.tsx
│   │   │   │       └── status-pengajuan/page.tsx
│   │   │   │
│   │   │   ├── (portal)/
│   │   │   │   └── portal/
│   │   │   │       ├── layout.tsx
│   │   │   │       ├── loading.tsx
│   │   │   │       ├── error.tsx
│   │   │   │       ├── page.tsx
│   │   │   │       ├── dashboard/page.tsx
│   │   │   │       ├── anggota/
│   │   │   │       │   ├── page.tsx
│   │   │   │       │   ├── baru/page.tsx
│   │   │   │       │   └── [memberId]/
│   │   │   │       │       ├── page.tsx
│   │   │   │       │       └── edit/page.tsx
│   │   │   │       ├── kepengurusan/
│   │   │   │       │   ├── page.tsx
│   │   │   │       │   ├── periode/page.tsx
│   │   │   │       │   ├── jabatan/page.tsx
│   │   │   │       │   └── struktur/page.tsx
│   │   │   │       ├── program-kerja/
│   │   │   │       │   ├── page.tsx
│   │   │   │       │   ├── baru/page.tsx
│   │   │   │       │   └── [programId]/
│   │   │   │       │       ├── page.tsx
│   │   │   │       │       ├── edit/page.tsx
│   │   │   │       │       └── proposal/page.tsx
│   │   │   │       ├── pengajuan/
│   │   │   │       │   ├── kebutuhan/
│   │   │   │       │   │   ├── page.tsx
│   │   │   │       │   │   ├── baru/page.tsx
│   │   │   │       │   │   └── [requestId]/page.tsx
│   │   │   │       │   └── keuangan/
│   │   │   │       │       ├── page.tsx
│   │   │   │       │       ├── baru/page.tsx
│   │   │   │       │       └── [requestId]/page.tsx
│   │   │   │       ├── inventaris/
│   │   │   │       │   ├── page.tsx
│   │   │   │       │   ├── baru/page.tsx
│   │   │   │       │   └── [itemId]/page.tsx
│   │   │   │       ├── keuangan/
│   │   │   │       │   ├── page.tsx
│   │   │   │       │   ├── transaksi/
│   │   │   │       │   │   ├── page.tsx
│   │   │   │       │   │   ├── pemasukan/baru/page.tsx
│   │   │   │       │   │   ├── pengeluaran/baru/page.tsx
│   │   │   │       │   │   └── [transactionId]/page.tsx
│   │   │   │       │   └── laporan/page.tsx
│   │   │   │       ├── pesan/
│   │   │   │       │   ├── page.tsx
│   │   │   │       │   └── [conversationId]/page.tsx
│   │   │   │       ├── notifikasi/page.tsx
│   │   │   │       ├── organisasi/
│   │   │   │       │   └── pengaturan/page.tsx
│   │   │   │       ├── hmj/
│   │   │   │       │   ├── hima/
│   │   │   │       │   │   ├── page.tsx
│   │   │   │       │   │   └── [tenantId]/page.tsx
│   │   │   │       │   └── review/
│   │   │   │       │       ├── akun-hima/page.tsx
│   │   │   │       │       ├── program-kerja/page.tsx
│   │   │   │       │       ├── kebutuhan/page.tsx
│   │   │   │       │       └── keuangan/page.tsx
│   │   │   │       ├── admin/
│   │   │   │       │   ├── tenant/
│   │   │   │       │   │   ├── page.tsx
│   │   │   │       │   │   └── [tenantId]/page.tsx
│   │   │   │       │   ├── pengajuan-akun/
│   │   │   │       │   │   ├── page.tsx
│   │   │   │       │   │   └── [applicationId]/page.tsx
│   │   │   │       │   ├── master/
│   │   │   │       │   │   ├── jurusan/page.tsx
│   │   │   │       │   │   └── program-studi/page.tsx
│   │   │   │       │   ├── pengguna/page.tsx
│   │   │   │       │   └── audit-log/page.tsx
│   │   │   │       └── akun/
│   │   │   │           ├── profil/page.tsx
│   │   │   │           └── keamanan/page.tsx
│   │   │   │
│   │   │   ├── error.tsx
│   │   │   ├── forbidden.tsx
│   │   │   ├── globals.css
│   │   │   ├── layout.tsx
│   │   │   ├── loading.tsx
│   │   │   ├── not-found.tsx
│   │   │   ├── robots.ts
│   │   │   └── sitemap.ts
│   │   │
│   │   ├── features/                  # UI dan state per domain
│   │   │   ├── auth/
│   │   │   ├── public-directory/
│   │   │   ├── tenants/
│   │   │   ├── tenant-applications/
│   │   │   ├── dashboards/
│   │   │   ├── members/
│   │   │   ├── governance/
│   │   │   ├── work-programs/
│   │   │   ├── proposals/
│   │   │   ├── requirement-requests/
│   │   │   ├── finance-requests/
│   │   │   ├── finance/
│   │   │   ├── inventory/
│   │   │   ├── messaging/
│   │   │   ├── notifications/
│   │   │   ├── audit/
│   │   │   ├── academic-master/
│   │   │   └── file-management/
│   │   │
│   │   ├── shared/
│   │   │   ├── components/
│   │   │   │   ├── ui/
│   │   │   │   │   ├── button.tsx
│   │   │   │   │   ├── input.tsx
│   │   │   │   │   ├── select.tsx
│   │   │   │   │   ├── textarea.tsx
│   │   │   │   │   ├── checkbox.tsx
│   │   │   │   │   ├── dialog.tsx
│   │   │   │   │   ├── dropdown-menu.tsx
│   │   │   │   │   ├── badge.tsx
│   │   │   │   │   ├── table.tsx
│   │   │   │   │   ├── tabs.tsx
│   │   │   │   │   ├── tooltip.tsx
│   │   │   │   │   ├── skeleton.tsx
│   │   │   │   │   └── toast.tsx
│   │   │   │   ├── forms/
│   │   │   │   │   ├── form-field.tsx
│   │   │   │   │   ├── date-field.tsx
│   │   │   │   │   ├── money-field.tsx
│   │   │   │   │   ├── file-upload.tsx
│   │   │   │   │   └── submit-button.tsx
│   │   │   │   ├── data-display/
│   │   │   │   │   ├── data-table.tsx
│   │   │   │   │   ├── pagination.tsx
│   │   │   │   │   ├── status-badge.tsx
│   │   │   │   │   ├── stat-card.tsx
│   │   │   │   │   ├── timeline.tsx
│   │   │   │   │   ├── empty-state.tsx
│   │   │   │   │   └── error-state.tsx
│   │   │   │   └── layout/
│   │   │   │       ├── public-header.tsx
│   │   │   │       ├── utility-bar.tsx
│   │   │   │       ├── portal-sidebar.tsx
│   │   │   │       ├── portal-topbar.tsx
│   │   │   │       ├── page-header.tsx
│   │   │   │       └── breadcrumb.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── use-debounce.ts
│   │   │   │   ├── use-media-query.ts
│   │   │   │   └── use-unsaved-changes.ts
│   │   │   ├── lib/
│   │   │   │   ├── cn.ts
│   │   │   │   ├── dates.ts
│   │   │   │   ├── currency.ts
│   │   │   │   └── pagination.ts
│   │   │   └── types/
│   │   │       ├── pagination.ts
│   │   │       └── select-option.ts
│   │   │
│   │   ├── services/                    # Komunikasi ke backend
│   │   │   ├── api-client.ts
│   │   │   ├── api-error.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── tenant.service.ts
│   │   │   ├── member.service.ts
│   │   │   ├── program.service.ts
│   │   │   ├── finance.service.ts
│   │   │   ├── inventory.service.ts
│   │   │   ├── messaging.service.ts
│   │   │   └── notification.service.ts
│   │   │
│   │   ├── config/
│   │   │   ├── env.ts
│   │   │   ├── navigation.ts
│   │   │   ├── permissions.ts
│   │   │   └── site.ts
│   │   ├── providers/
│   │   │   ├── auth-provider.tsx
│   │   │   ├── query-provider.tsx
│   │   │   └── toast-provider.tsx
│   │   ├── styles/
│   │   │   └── tokens.css
│   │   └── middleware.ts
│   │
│   ├── tests/
│   │   ├── unit/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   └── formatters/
│   │   ├── integration/
│   │   │   ├── forms/
│   │   │   └── services/
│   │   ├── fixtures/
│   │   └── setup.ts
│   │
│   ├── .env.example
│   ├── .gitignore
│   ├── Dockerfile
│   ├── eslint.config.mjs
│   ├── next.config.ts
│   ├── package.json
│   ├── playwright.config.ts
│   ├── postcss.config.mjs
│   ├── tsconfig.json
│   └── vitest.config.ts
│
├── backend/                           # REST API Node.js/Express
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── migrations/
│   │   │   └── .gitkeep
│   │   └── seed/
│   │       ├── index.ts
│   │       ├── academic.seed.ts
│   │       ├── permissions.seed.ts
│   │       └── demo.seed.ts
│   │
│   ├── src/
│   │   ├── app.ts                     # Membentuk instance Express
│   │   ├── server.ts                  # Menjalankan HTTP server
│   │   │
│   │   ├── config/
│   │   │   ├── env.ts
│   │   │   ├── cors.ts
│   │   │   ├── logger.ts
│   │   │   ├── security.ts
│   │   │   └── upload.ts
│   │   │
│   │   ├── core/                      # Infrastruktur lintas domain
│   │   │   ├── auth/
│   │   │   │   ├── password.ts
│   │   │   │   ├── session.service.ts
│   │   │   │   ├── token.service.ts
│   │   │   │   └── auth-context.ts
│   │   │   ├── authorization/
│   │   │   │   ├── permissions.ts
│   │   │   │   ├── require-auth.ts
│   │   │   │   ├── require-permission.ts
│   │   │   │   ├── require-tenant.ts
│   │   │   │   └── require-parent-relation.ts
│   │   │   ├── database/
│   │   │   │   ├── prisma.ts
│   │   │   │   ├── transaction.ts
│   │   │   │   └── pagination.ts
│   │   │   ├── errors/
│   │   │   │   ├── app-error.ts
│   │   │   │   ├── error-codes.ts
│   │   │   │   └── error-handler.ts
│   │   │   ├── http/
│   │   │   │   ├── async-handler.ts
│   │   │   │   ├── request-context.ts
│   │   │   │   ├── response.ts
│   │   │   │   └── validate-request.ts
│   │   │   ├── audit/
│   │   │   │   ├── audit.service.ts
│   │   │   │   └── sanitize-metadata.ts
│   │   │   ├── notifications/
│   │   │   │   ├── notification.service.ts
│   │   │   │   └── notification.events.ts
│   │   │   ├── storage/
│   │   │   │   ├── storage.interface.ts
│   │   │   │   ├── local-storage.adapter.ts
│   │   │   │   ├── object-storage.adapter.ts
│   │   │   │   └── file-validation.ts
│   │   │   └── observability/
│   │   │       ├── metrics.ts
│   │   │       └── tracing.ts
│   │   │
│   │   ├── middleware/
│   │   │   ├── authenticate.ts
│   │   │   ├── authorize.ts
│   │   │   ├── tenant-context.ts
│   │   │   ├── rate-limit.ts
│   │   │   ├── csrf.ts
│   │   │   ├── request-id.ts
│   │   │   ├── not-found.ts
│   │   │   └── error-handler.ts
│   │   │
│   │   ├── modules/                   # Domain backend
│   │   │   ├── auth/
│   │   │   ├── public-directory/
│   │   │   ├── tenants/
│   │   │   ├── tenant-applications/
│   │   │   ├── dashboards/
│   │   │   ├── members/
│   │   │   ├── governance/
│   │   │   ├── work-programs/
│   │   │   ├── proposals/
│   │   │   ├── requirement-requests/
│   │   │   ├── finance-requests/
│   │   │   ├── finance/
│   │   │   ├── inventory/
│   │   │   ├── messaging/
│   │   │   ├── notifications/
│   │   │   ├── audit/
│   │   │   ├── academic-master/
│   │   │   └── files/
│   │   │
│   │   ├── routes/
│   │   │   ├── index.ts
│   │   │   └── v1.routes.ts
│   │   ├── jobs/
│   │   │   ├── cleanup-expired-sessions.job.ts
│   │   │   ├── cleanup-files.job.ts
│   │   │   └── notification-dispatch.job.ts
│   │   └── shared/
│   │       ├── constants/
│   │       ├── types/
│   │       └── utils/
│   │
│   ├── tests/
│   │   ├── unit/
│   │   │   ├── policies/
│   │   │   ├── services/
│   │   │   ├── workflows/
│   │   │   └── validation/
│   │   ├── integration/
│   │   │   ├── api/
│   │   │   ├── database/
│   │   │   ├── repositories/
│   │   │   └── services/
│   │   ├── fixtures/
│   │   │   ├── users.ts
│   │   │   ├── tenants.ts
│   │   │   └── programs.ts
│   │   ├── helpers/
│   │   │   ├── database.ts
│   │   │   ├── factories.ts
│   │   │   └── request.ts
│   │   └── setup.ts
│   │
│   ├── storage/                       # Development only; tidak masuk Git
│   │   └── uploads/.gitkeep
│   ├── .env.example
│   ├── .gitignore
│   ├── Dockerfile
│   ├── eslint.config.mjs
│   ├── package.json
│   ├── tsconfig.json
│   └── vitest.config.ts
│
├── packages/                          # Paket aman yang dipakai dua aplikasi
│   ├── contracts/
│   │   ├── src/
│   │   │   ├── auth.contract.ts
│   │   │   ├── tenant.contract.ts
│   │   │   ├── member.contract.ts
│   │   │   ├── program.contract.ts
│   │   │   ├── finance.contract.ts
│   │   │   ├── inventory.contract.ts
│   │   │   ├── messaging.contract.ts
│   │   │   ├── api-response.ts
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── config/
│       ├── eslint/
│       ├── typescript/
│       └── package.json
│
├── database/
│   ├── sim_ormawa_hmj.sql             # Baseline schema MySQL
│   ├── seeds/
│   │   ├── academic-master.sql
│   │   └── development-demo.sql
│   └── README.md
│
├── tests/                              # Pengujian lintas aplikasi
│   └── e2e/
│       ├── auth/
│       ├── tenant-isolation/
│       ├── tenant-approval/
│       ├── work-programs/
│       ├── finance/
│       ├── inventory/
│       └── messaging/
│
├── docs/
│   ├── README.md
│   ├── BACKEND.md
│   ├── DATABASE.md
│   ├── FRONTEND.md
│   ├── PROJECT_STRUCTURE.md
│   ├── STYLEGUIDE.md
│   ├── TASK_LIST.md
│   ├── api/
│   │   ├── authentication.md
│   │   ├── endpoints.md
│   │   └── error-codes.md
│   ├── diagrams/
│   │   ├── architecture.md
│   │   ├── entity-relationship.md
│   │   ├── tenant-approval-flow.md
│   │   └── work-program-flow.md
│   └── operations/
│       ├── backup-restore.md
│       ├── deployment.md
│       └── incident-response.md
│
├── infrastructure/
│   ├── nginx/
│   │   └── default.conf
│   ├── mysql/
│   │   └── init/.gitkeep
│   └── docker/
│       ├── frontend.Dockerfile
│       └── backend.Dockerfile
│
├── scripts/
│   ├── check-environment.mjs
│   ├── database-health.mjs
│   ├── create-demo-data.mjs
│   └── verify-tenant-scope.mjs
│
├── .dockerignore
├── .editorconfig
├── .env.example
├── .gitignore
├── docker-compose.yml
├── eslint.config.mjs
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── prettier.config.mjs
├── README.md
├── turbo.json
└── tsconfig.base.json
```

## Struktur Internal Frontend Feature

Setiap feature frontend berisi UI dan komunikasi API untuk satu domain.

```text
frontend/src/features/work-programs/
├── api/
│   ├── create-program.ts
│   ├── get-program.ts
│   ├── list-programs.ts
│   ├── update-program.ts
│   └── review-program.ts
├── components/
│   ├── program-form.tsx
│   ├── program-list.tsx
│   ├── program-detail.tsx
│   ├── program-review-panel.tsx
│   └── program-status-timeline.tsx
├── hooks/
│   ├── use-programs.ts
│   └── use-program-filters.ts
├── schemas/
│   ├── program-form.schema.ts
│   └── program-filter.schema.ts
├── types/
│   └── program-view-model.ts
├── utils/
│   └── program-status-label.ts
└── index.ts
```

| Folder       | Tanggung jawab                                     |
| ------------ | -------------------------------------------------- |
| `api`        | Memanggil endpoint backend melalui `api-client`    |
| `components` | UI khusus program kerja                            |
| `hooks`      | Query/mutation dan state browser                   |
| `schemas`    | Validasi formulir untuk pengalaman pengguna        |
| `types`      | View model frontend; tidak menggunakan Prisma type |
| `utils`      | Formatter atau helper khusus feature               |
| `index.ts`   | Public API feature                                 |

## Struktur Internal Backend Module

Setiap module backend mengikuti alur HTTP hingga database yang jelas.

```text
backend/src/modules/work-programs/
├── work-program.routes.ts
├── work-program.controller.ts
├── work-program.service.ts
├── work-program.repository.ts
├── work-program.policy.ts
├── work-program.mapper.ts
├── work-program.schema.ts
├── work-program.types.ts
├── work-program.events.ts
└── index.ts
```

| File         | Tanggung jawab                                 |
| ------------ | ---------------------------------------------- |
| `routes`     | Mendefinisikan URL, middleware, dan controller |
| `controller` | Membaca request dan membentuk response         |
| `service`    | Aturan bisnis, workflow, dan transaksi         |
| `repository` | Query Prisma/MySQL dengan tenant scope         |
| `policy`     | Keputusan role, tenant, dan hubungan HMJ–HIMA  |
| `mapper`     | Mengubah database record menjadi DTO aman      |
| `schema`     | Validasi params, query, dan body dengan Zod    |
| `types`      | Tipe internal module                           |
| `events`     | Event audit dan notifikasi domain              |
| `index.ts`   | Public API module                              |

## Daftar Feature dan Module

| Domain             | Frontend                        | Backend                        |
| ------------------ | ------------------------------- | ------------------------------ |
| Autentikasi        | `features/auth`                 | `modules/auth`                 |
| Direktori publik   | `features/public-directory`     | `modules/public-directory`     |
| Tenant             | `features/tenants`              | `modules/tenants`              |
| Pengajuan tenant   | `features/tenant-applications`  | `modules/tenant-applications`  |
| Dashboard          | `features/dashboards`           | `modules/dashboards`           |
| Anggota            | `features/members`              | `modules/members`              |
| Kepengurusan       | `features/governance`           | `modules/governance`           |
| Program kerja      | `features/work-programs`        | `modules/work-programs`        |
| Proposal           | `features/proposals`            | `modules/proposals`            |
| Kebutuhan          | `features/requirement-requests` | `modules/requirement-requests` |
| Pengajuan keuangan | `features/finance-requests`     | `modules/finance-requests`     |
| Keuangan           | `features/finance`              | `modules/finance`              |
| Inventaris         | `features/inventory`            | `modules/inventory`            |
| Pesan              | `features/messaging`            | `modules/messaging`            |
| Notifikasi         | `features/notifications`        | `modules/notifications`        |
| Audit              | `features/audit`                | `modules/audit`                |
| Master akademik    | `features/academic-master`      | `modules/academic-master`      |
| File               | `features/file-management`      | `modules/files`                |

## Pemetaan Route Frontend

| URL frontend              | Aktor              | Feature                   |
| ------------------------- | ------------------ | ------------------------- |
| `/`                       | Publik             | Direktori/landing page    |
| `/organisasi`             | Publik             | Direktori organisasi      |
| `/portal/login`           | Publik             | Autentikasi               |
| `/portal/daftar/*`        | Publik             | Pengajuan tenant          |
| `/portal/dashboard`       | Semua akun aktif   | Dashboard sesuai role     |
| `/portal/anggota`         | ORMAWA/HMJ/HIMA    | Anggota                   |
| `/portal/kepengurusan/*`  | ORMAWA/HMJ/HIMA    | Kepengurusan              |
| `/portal/program-kerja/*` | ORMAWA/HMJ/HIMA    | Program dan proposal      |
| `/portal/pengajuan/*`     | Tenant sesuai izin | Kebutuhan/keuangan        |
| `/portal/inventaris/*`    | ORMAWA/HMJ/HIMA    | Inventaris                |
| `/portal/keuangan/*`      | ORMAWA/HMJ/HIMA    | Keuangan                  |
| `/portal/pesan/*`         | HMJ/HIMA           | Pesan                     |
| `/portal/hmj/*`           | HMJ                | HIMA anak dan review      |
| `/portal/admin/*`         | Super Admin        | Tenant, master, dan audit |
| `/portal/notifikasi`      | Semua akun         | Notifikasi                |
| `/portal/akun/*`          | Semua akun         | Profil dan keamanan       |

## Pemetaan Route Backend

Semua endpoint bisnis berada di bawah `/api/v1`.

```text
GET    /api/v1/health

POST   /api/v1/auth/login
POST   /api/v1/auth/logout
GET    /api/v1/auth/me
POST   /api/v1/auth/forgot-password
POST   /api/v1/auth/reset-password

GET    /api/v1/public/organizations
GET    /api/v1/public/organizations/:slug

GET    /api/v1/tenant-applications
POST   /api/v1/tenant-applications
GET    /api/v1/tenant-applications/:applicationId
PATCH  /api/v1/tenant-applications/:applicationId
POST   /api/v1/tenant-applications/:applicationId/submit
POST   /api/v1/tenant-applications/:applicationId/approve
POST   /api/v1/tenant-applications/:applicationId/reject
POST   /api/v1/tenant-applications/:applicationId/request-revision

GET    /api/v1/tenants
GET    /api/v1/tenants/:tenantId
PATCH  /api/v1/tenants/:tenantId

GET    /api/v1/members
POST   /api/v1/members
GET    /api/v1/members/:memberId
PATCH  /api/v1/members/:memberId
POST   /api/v1/members/:memberId/deactivate

GET    /api/v1/periods
POST   /api/v1/periods
POST   /api/v1/periods/:periodId/activate
POST   /api/v1/periods/:periodId/close
GET    /api/v1/positions
POST   /api/v1/positions
GET    /api/v1/organization-structure

GET    /api/v1/work-programs
POST   /api/v1/work-programs
GET    /api/v1/work-programs/:programId
PATCH  /api/v1/work-programs/:programId
POST   /api/v1/work-programs/:programId/submit
POST   /api/v1/work-programs/:programId/approve
POST   /api/v1/work-programs/:programId/reject
POST   /api/v1/work-programs/:programId/request-revision
POST   /api/v1/work-programs/:programId/start
POST   /api/v1/work-programs/:programId/complete
POST   /api/v1/work-programs/:programId/cancel

GET    /api/v1/requirement-requests
POST   /api/v1/requirement-requests
GET    /api/v1/requirement-requests/:requestId
POST   /api/v1/requirement-requests/:requestId/submit
POST   /api/v1/requirement-requests/:requestId/review

GET    /api/v1/finance-requests
POST   /api/v1/finance-requests
GET    /api/v1/finance-requests/:requestId
POST   /api/v1/finance-requests/:requestId/submit
POST   /api/v1/finance-requests/:requestId/review

GET    /api/v1/inventory
POST   /api/v1/inventory
GET    /api/v1/inventory/:itemId
PATCH  /api/v1/inventory/:itemId
POST   /api/v1/inventory/:itemId/movements

GET    /api/v1/transactions
POST   /api/v1/transactions
GET    /api/v1/transactions/:transactionId
POST   /api/v1/transactions/:transactionId/post
POST   /api/v1/transactions/:transactionId/void

GET    /api/v1/conversations
POST   /api/v1/conversations
GET    /api/v1/conversations/:conversationId/messages
POST   /api/v1/conversations/:conversationId/messages
POST   /api/v1/messages/:messageId/read

GET    /api/v1/notifications
POST   /api/v1/notifications/:notificationId/read

POST   /api/v1/files
GET    /api/v1/files/:fileId/download

GET    /api/v1/master/departments
GET    /api/v1/master/study-programs
POST   /api/v1/master/departments
POST   /api/v1/master/study-programs
```

## Alur Request

```text
Frontend page/component
        ↓
Frontend feature API function
        ↓
Frontend api-client
        ↓ HTTPS
Backend route
        ↓
authenticate middleware
        ↓
tenant/permission middleware
        ↓
request schema validation
        ↓
controller
        ↓
service + policy
        ↓
repository
        ↓
Prisma → MySQL
        ↓
DTO mapper → JSON response → Frontend
```

## Batas Tanggung Jawab

### Frontend

- Menampilkan data dan status.
- Menangani interaksi serta validasi UX.
- Menampilkan menu berdasarkan permission dari sesi.
- Mengirim request ke backend.
- Menangani loading, empty, error, dan forbidden state.
- Tidak menentukan keputusan akhir otorisasi.
- Tidak menyimpan database credential atau secret.

### Backend

- Mengautentikasi pengguna.
- Menentukan tenant context dari sesi/token tervalidasi.
- Memeriksa role, permission, kepemilikan, dan hubungan HMJ–HIMA.
- Memvalidasi seluruh request.
- Menjalankan workflow dan transaksi.
- Mengakses MySQL melalui Prisma.
- Mengelola file privat, audit log, dan notifikasi.
- Mengirim DTO yang tidak mengandung data sensitif.

### Database

- Menjaga integritas melalui primary key, foreign key, unique key, check constraint, dan transaction.
- Menyimpan tenant ID pada data organisasi.
- Tidak menjadi pengganti tenant guard pada backend.

## Authentication Flow

```text
1. Frontend mengirim email + password ke POST /api/v1/auth/login.
2. Backend memverifikasi password dan status akun.
3. Backend membuat sesi serta cookie HttpOnly/Secure/SameSite.
4. Frontend meminta GET /api/v1/auth/me.
5. Backend mengembalikan user, role, permission, dan tenant context aman.
6. Frontend membangun navigasi berdasarkan response tersebut.
7. Setiap request berikutnya kembali divalidasi backend.
```

Jika frontend dan backend memakai subdomain berbeda, konfigurasi CORS, cookie domain, credentials, HTTPS, dan CSRF harus diuji secara khusus.

## Tenant Context Backend

```ts
export type AuthContext = {
  userId: string;
  roleCodes: string[];
  permissions: string[];
  tenantId: string | null;
  tenantType: "ORMAWA" | "HMJ" | "HIMA" | null;
  parentTenantId: string | null;
  tenantStatus: "PENDING" | "ACTIVE" | "REJECTED" | "SUSPENDED" | null;
};
```

- Context dibentuk backend dari session dan database.
- `tenantId` dari URL/body tidak pernah menggantikan context tanpa pemeriksaan policy.
- HMJ mengakses HIMA melalui `requireParentRelation`.
- Repository normal menerima `TenantScope`; repository review menerima `ParentReviewScope`.

## Kontrak Bersama

`packages/contracts` hanya berisi hal yang aman untuk kedua aplikasi:

- request/response DTO;
- enum status publik;
- pagination metadata;
- error response;
- schema validasi format publik jika diperlukan.

Jangan menaruh berikut di shared package:

- Prisma model;
- password hash;
- database utility;
- secret atau environment privat;
- internal audit metadata;
- repository/service backend.

Contoh response:

```ts
export type ApiResponse<T> = {
  data: T | null;
  meta?: {
    page?: number;
    pageSize?: number;
    total?: number;
  };
  error: {
    code: string;
    message: string;
    fields?: Record<string, string[]>;
  } | null;
};
```

## Arah Dependensi

```text
frontend/app
    ↓
frontend/features
    ↓
frontend/services/api-client
    ↓
packages/contracts

backend/routes
    ↓
backend/controllers
    ↓
backend/services + policies
    ↓
backend/repositories
    ↓
backend/core/database
    ↓
Prisma / MySQL

backend dan frontend → packages/contracts
packages/contracts -X→ backend/frontend internal code
```

Aturan:

- Frontend tidak mengimpor file dari `backend/`.
- Backend tidak mengimpor komponen dari `frontend/`.
- Backend module tidak mengakses repository module lain secara langsung; gunakan service publik.
- Shared contracts tidak bergantung pada Prisma.
- Hindari circular dependency antar-module.

## Konvensi Penamaan

| Objek                 | Konvensi                    | Contoh                     |
| --------------------- | --------------------------- | -------------------------- |
| Folder route frontend | kebab-case Bahasa Indonesia | `program-kerja`            |
| Folder feature/module | kebab-case Inggris          | `work-programs`            |
| React component       | PascalCase export           | `ProgramForm`              |
| File komponen         | kebab-case                  | `program-form.tsx`         |
| Controller            | `*.controller.ts`           | `member.controller.ts`     |
| Service               | `*.service.ts`              | `member.service.ts`        |
| Repository            | `*.repository.ts`           | `member.repository.ts`     |
| Policy                | `*.policy.ts`               | `member.policy.ts`         |
| Schema                | `*.schema.ts`               | `member.schema.ts`         |
| Unit/integration test | `*.test.ts(x)`              | `member.policy.test.ts`    |
| E2E test              | `*.spec.ts`                 | `tenant-isolation.spec.ts` |
| Table database        | snake_case plural           | `work_programs`            |
| Kolom database        | snake_case                  | `tenant_id`                |
| Environment variable  | SCREAMING_SNAKE_CASE        | `DATABASE_URL`             |

## Environment Frontend

`frontend/.env.example`:

```env
NODE_ENV=development
NEXT_PUBLIC_APP_NAME=SIM ORMAWA & HMJ
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
```

Variable `NEXT_PUBLIC_*` dapat terlihat di browser dan tidak boleh berisi secret.

## Environment Backend

`backend/.env.example`:

```env
NODE_ENV=development
PORT=4000
FRONTEND_URL=http://localhost:3000
DATABASE_URL=mysql://user:password@localhost:3306/sim_ormawa_hmj
SESSION_SECRET=replace-with-a-random-secret
COOKIE_NAME=sim_session
COOKIE_SECURE=false
FILE_STORAGE_DRIVER=local
FILE_STORAGE_PATH=./storage/uploads
FILE_STORAGE_BUCKET=
MAX_UPLOAD_SIZE_MB=10
LOG_LEVEL=info
```

Backend memvalidasi seluruh environment variable saat startup.

## Struktur Database

Source of truth database berada di backend:

```text
backend/prisma/
├── schema.prisma
├── migrations/
└── seed/
```

Folder root `database/` digunakan untuk baseline SQL, dump yang telah disanitasi, atau seed SQL yang harus dapat diimpor tanpa Prisma:

```text
database/
├── sim_ormawa_hmj.sql
├── seeds/
│   ├── academic-master.sql
│   └── development-demo.sql
└── README.md
```

Jangan menyimpan dump produksi atau data pribadi pada repository.

## Strategi Testing

### Frontend unit/integration

- komponen dan accessibility;
- validasi form;
- hook dan API client;
- loading, empty, error, forbidden state;
- navigasi berbasis permission.

### Backend unit

- role/tenant policy;
- workflow status;
- validasi payload;
- service murni;
- mapper DTO.

### Backend integration

- repository tenant scope;
- endpoint dan middleware;
- transaksi database;
- audit/notifikasi;
- upload/download file.

### Root E2E

Menjalankan frontend, backend, dan database sekaligus untuk menguji:

- login semua aktor;
- pengajuan serta persetujuan tenant;
- isolasi ORMAWA A/B, HMJ A/B, dan HIMA A1/A2/B1;
- workflow program kerja;
- keuangan dan inventaris;
- pesan HMJ–HIMA;
- akses file privat.

## File Storage

```text
Development:
backend/storage/uploads/<tenant-id>/<random-storage-key>

Production:
private-bucket/<environment>/<tenant-id>/<random-storage-key>
```

- Frontend mengunggah file ke endpoint backend.
- Backend memvalidasi MIME type, ukuran, extension, tenant, dan permission.
- File privat tidak berada di `frontend/public`.
- Download dilakukan melalui endpoint terotorisasi atau signed URL singkat.
- Nama asli disimpan sebagai metadata, bukan storage key.

## Reverse Proxy Produksi

Konfigurasi yang disarankan:

```text
https://sim-ormawa.example.ac.id/       → frontend:3000
https://sim-ormawa.example.ac.id/api/   → backend:4000
```

Satu origin menyederhanakan cookie, CORS, dan CSRF. Backend tidak diekspos menggunakan port publik langsung.

## Root Workspace

`pnpm-workspace.yaml`:

```yaml
packages:
  - frontend
  - backend
  - packages/*
```

`turbo.json`:

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^lint"]
    },
    "typecheck": {
      "dependsOn": ["^typecheck"]
    },
    "test": {
      "dependsOn": ["^build"]
    }
  }
}
```

Root `package.json`:

```json
{
  "private": true,
  "packageManager": "pnpm@10",
  "scripts": {
    "dev": "turbo dev",
    "dev:frontend": "pnpm --filter frontend dev",
    "dev:backend": "pnpm --filter backend dev",
    "build": "turbo build",
    "lint": "turbo lint",
    "typecheck": "turbo typecheck",
    "test": "turbo test",
    "test:e2e": "playwright test",
    "check": "pnpm lint && pnpm typecheck && pnpm test && pnpm build"
  },
  "devDependencies": {
    "turbo": "latest"
  }
}
```

## Script Frontend

```json
{
  "scripts": {
    "dev": "next dev --port 3000",
    "build": "next build",
    "start": "next start --port 3000",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  }
}
```

## Script Backend

```json
{
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc -p tsconfig.json",
    "start": "node dist/server.js",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "db:generate": "prisma generate",
    "db:migrate": "prisma migrate dev",
    "db:deploy": "prisma migrate deploy",
    "db:seed": "prisma db seed",
    "db:studio": "prisma studio"
  }
}
```

## Urutan Pembuatan

1. Buat root workspace dan konfigurasi Turborepo/pnpm.
2. Inisialisasi `frontend/` dengan Next.js, TypeScript, dan Tailwind CSS.
3. Inisialisasi `backend/` dengan Express, TypeScript, Zod, dan Prisma.
4. Buat `packages/contracts` untuk response, error, dan DTO aman.
5. Hubungkan backend ke MySQL dan import baseline SQL.
6. Implementasikan backend auth, session, role, dan tenant context.
7. Implementasikan API client dan auth provider frontend.
8. Uji login serta isolasi tenant sebelum membuat modul bisnis.
9. Implementasikan module backend dan feature frontend secara berpasangan.
10. Tambahkan integration/E2E test pada setiap alur kritis.

## Checklist Feature Baru

### Backend

- [ ] Tentukan endpoint, permission, dan tenant scope.
- [ ] Buat schema request.
- [ ] Buat repository dengan tenant filter.
- [ ] Buat policy dan service.
- [ ] Buat DTO mapper.
- [ ] Buat controller dan route.
- [ ] Tambahkan audit/notifikasi bila relevan.
- [ ] Tambahkan unit dan integration test.

### Shared contract

- [ ] Tambahkan request/response DTO yang aman bila perlu dibagikan.
- [ ] Jangan mengekspor model Prisma atau field rahasia.

### Frontend

- [ ] Buat fungsi API pada feature.
- [ ] Buat hook query/mutation.
- [ ] Buat form dan schema validasi UX.
- [ ] Buat halaman dan komponen.
- [ ] Tambahkan loading, empty, error, dan forbidden state.
- [ ] Uji responsif serta keyboard navigation.

### End-to-end

- [ ] Uji happy path.
- [ ] Uji role yang tidak berhak.
- [ ] Uji ID resource tenant lain.
- [ ] Uji perubahan status tidak sah.

## Anti-Pattern

- Frontend mengakses Prisma atau MySQL.
- Backend menerima `tenantId` dari frontend sebagai sumber kebenaran.
- Menyimpan token sensitif di `localStorage` tanpa alasan keamanan yang tervalidasi.
- Query database langsung di route/controller.
- Aturan bisnis ditempatkan pada React component.
- Frontend mengimpor source code backend atau sebaliknya.
- Mengirim Prisma model mentah sebagai response API.
- Mengubah status workflow melalui endpoint `PATCH` umum.
- Menyimpan file privat dalam `frontend/public`.
- Menjalankan CORS wildcard bersama cookie credentials.
- Hanya menguji happy path tanpa uji lintas tenant.

## Definition of Done Struktur

- Folder `frontend` dan `backend` memiliki dependency serta build terpisah.
- Frontend hanya berkomunikasi dengan backend melalui kontrak API.
- Prisma dan database credential hanya terdapat pada backend.
- Auth context serta tenant guard berada pada backend.
- Shared package tidak membocorkan model database.
- Setiap domain memiliki pasangan feature frontend dan module backend yang jelas.
- Unit, integration, dan E2E test memiliki lokasi serta tujuan yang jelas.
- Docker/reverse proxy dapat menjalankan kedua aplikasi dengan MySQL.
- Dokumentasi diperbarui ketika boundary atau struktur berubah.
