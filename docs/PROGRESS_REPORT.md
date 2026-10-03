# Laporan Progres Pengembangan PBL

**Pembaruan backlog:** 3 Oktober 2026
**Validasi teknis terakhir:** 30 September 2026
**Sumber:** [`TASK_LIST.md`](TASK_LIST.md)

## Ringkasan Eksekutif

| Status                                |     Jumlah |
| ------------------------------------- | ---------: |
| Total task terdaftar                  |        216 |
| Task selesai                          |        201 |
| Task belum ditutup                    |         15 |
| Progres berdasarkan checklist         |      93,1% |
| Skenario penerimaan tervalidasi       |  3 dari 14 |
| Skenario penerimaan belum tervalidasi | 11 dari 14 |

Sebagian besar fitur utama aplikasi telah diimplementasikan. Pekerjaan yang tersisa terkonsentrasi pada verifikasi Docker/reverse proxy, validasi aksesibilitas dan UAT, konfigurasi reset password pada deployment, kesiapan production, dan dokumentasi akhir. Beberapa task terbuka sudah memiliki implementasi awal, tetapi belum dapat dinyatakan selesai karena belum diuji pada lingkungan yang diperlukan. Dari 14 skenario penerimaan, 3 telah dicentang dan 11 masih menunggu validasi serta pencatatan bukti.

## Hasil Validasi Terakhir

Validasi berikut telah berhasil dijalankan:

- `pnpm typecheck` lulus untuk contracts, backend, dan frontend.
- `pnpm lint` lulus tanpa error maupun warning.
- `pnpm test` meluluskan 58 unit/component test.
- `pnpm build` berhasil membangun backend dan frontend Next.js untuk production.
- `pnpm test:e2e` meluluskan 42 pengujian dan melewati 24 skenario mutasi/login/keyboard/performa yang hanya dijalankan pada Chromium desktop.
- `pnpm test:integration` meluluskan 2 integration test MySQL untuk isolasi tenant dan workflow approval/keuangan.

Cakupan E2E yang sudah lulus meliputi landing page, pendaftaran, lupa/reset password, login seluruh aktor, approval tenant, program kerja HIMA dari draf sampai selesai setelah disetujui HMJ, alur pengajuan kebutuhan/dana, inventaris, pesan HIMA–HMJ, pemeriksaan responsif halaman portal pada tiga viewport, serta keyboard dan nama aksesibel kontrol. Screen reader masih menunggu validasi manual.

## Progres per Modul

| Modul                            | Selesai | Total | Status                                                                          |
| -------------------------------- | ------: | ----: | ------------------------------------------------------------------------------- |
| Discovery dan Validasi           |      12 |    12 | Selesai                                                                         |
| Audit dan Desain Database        |      16 |    16 | Selesai                                                                         |
| Project Foundation               |      16 |    18 | Perlu verifikasi Docker dan reverse proxy                                       |
| Design System dan Layout         |      13 |    13 | Selesai                                                                         |
| Autentikasi dan Tenant Security  |      15 |    16 | Provider email reset password belum tersedia                                    |
| Landing Page dan Direktori       |      10 |    10 | Selesai                                                                         |
| Pengajuan dan Persetujuan Tenant |      12 |    12 | Selesai                                                                         |
| Dashboard                        |       9 |     9 | Selesai                                                                         |
| Anggota dan Kepengurusan         |      10 |    10 | Selesai                                                                         |
| Program Kerja dan Proposal       |      13 |    13 | Selesai                                                                         |
| Pengajuan Kebutuhan              |       7 |     7 | Selesai                                                                         |
| Pengajuan Keuangan               |       8 |     8 | Selesai                                                                         |
| Keuangan                         |      10 |    10 | Selesai                                                                         |
| Inventaris                       |       8 |     8 | Selesai                                                                         |
| Pesan HMJ-HIMA                   |       8 |     9 | Attachment masih opsional                                                       |
| Notifikasi dan Audit Log         |       9 |     9 | Selesai                                                                         |
| Keamanan dan Hardening           |      10 |    10 | Selesai                                                                         |
| Quality Assurance                |      10 |    12 | Workflow, responsif, dan performa daftar besar lulus; screen reader/UAT tersisa |
| Deployment dan Dokumentasi       |       5 |    14 | Lingkungan production dan keluaran akhir belum selesai                          |

## Fitur yang Telah Dikerjakan

### Fondasi dan arsitektur

- Workspace pnpm dan Turborepo.
- Frontend Next.js dengan TypeScript dan Tailwind CSS.
- Backend Express dengan TypeScript, Zod, middleware keamanan, dan error handler.
- Prisma dan pemetaan database MySQL.
- Shared API contracts, validasi environment, logging aman, CI, unit test, integration test setup, dan Playwright.

### Antarmuka dan website publik

- Design system, form controls, dialog, badge, tabel, filter, pagination, dan berbagai state UI.
- Layout portal untuk seluruh aktor.
- Landing page responsif, direktori organisasi, pencarian/filter, profil publik, footer, dan metadata SEO.

### Autentikasi dan keamanan tenant

- Login, logout, sesi aman, role guard, tenant guard, serta validasi relasi HMJ-HIMA.
- Pembatasan dashboard bagi tenant nonaktif.
- Rate limit endpoint sensitif.
- Pengujian isolasi tenant dan IDOR untuk resource utama.
- Proteksi CSRF, XSS, upload/download privat, cookie dan security headers, serta sanitasi error dan audit log.

### Modul operasional

- Pengajuan dan persetujuan tenant.
- Dashboard Super Admin, ORMAWA, HMJ, dan HIMA dengan data dari API.
- Anggota, periode kepengurusan, jabatan, dan struktur organisasi.
- Program kerja, proposal privat, versi proposal, review, histori, audit, dan notifikasi.
- Pengajuan kebutuhan dan pengajuan dana beserta rincian item dan workflow review.
- Transaksi keuangan, saldo, laporan, ekspor, bukti privat, serta reversal.
- Inventaris dan histori pergerakan.
- Pesan HMJ-HIMA, status dibaca, unread count, dan notifikasi.
- Daftar notifikasi dan audit log.

### Perbaikan yang sudah tervalidasi

- Kartu dashboard membuka daftar detail dengan filter yang sesuai.
- Angka dashboard, saldo, dan query organisasi menggunakan tenant scope.
- Teks dan metadata nama file telah diuji terhadap XSS.
- Navigasi keyboard, kontras tombol, semantic heading, dan responsive overflow pada halaman publik/autentikasi.
- UI lupa/reset password dan invalidasi seluruh sesi setelah password berubah.
- Redirect akun pemohon tanpa role menuju status pengajuan dan dukungan parameter redirect internal yang aman.
- Submit pengajuan ORMAWA, HMJ, dan HIMA mengirim body JSON yang sesuai dengan middleware keamanan backend.

## Pekerjaan yang Masih Kurang

### 1. Project Foundation

- [ ] `SETUP-016` Menjalankan dan memverifikasi Docker untuk frontend, backend, serta MySQL development.
- [ ] `SETUP-017` Menjalankan dan memverifikasi reverse proxy `/api` menuju backend.

Konfigurasi Docker Compose dan Nginx sudah dibuat, tetapi belum diuji karena Docker belum tersedia pada mesin pengembangan saat validasi terakhir.

### 2. Autentikasi

- [ ] `AUTH-016` Menuntaskan reset password pada lingkungan deployment.

UI, token flow, dan invalidasi sesi sudah tersedia. Kekurangannya adalah konfigurasi provider email untuk mengirim token reset kepada pengguna.

### 3. Pesan

- [ ] `MSG-009` Menambahkan attachment pesan jika fitur ini tetap masuk ruang lingkup proyek.

Task ini berprioritas P2 dan dapat dikeluarkan apabila attachment tidak menjadi kebutuhan PBL.

### 4. Quality Assurance

- [ ] `QA-010` Uji keyboard dan screen reader dasar pada seluruh portal.
- [ ] `QA-012` User acceptance test bersama perwakilan aktor.

QA-008, QA-009, dan QA-011 sudah lulus. QA-010 memiliki pemeriksaan keyboard dan nama kontrol otomatis untuk halaman empat aktor; audit juga memperbaiki label dua filter tanggal pada halaman keuangan. Task tetap terbuka sampai alur diumumkan dengan screen reader nyata. QA-011 menggunakan 500 anggota uji dan memastikan pagination serta respons API tetap berjalan.

### 5. Deployment dan Dokumentasi Akhir

- [ ] `REL-001` Menyiapkan environment development, staging, dan production.
- [ ] `REL-002` Mengonfigurasi secret pada platform deployment.
- [ ] `REL-003` Mengonfigurasi domain dan HTTPS.
- [ ] `REL-004` Mengonfigurasi database production dan backup.
- [ ] `REL-005` Mengonfigurasi private file storage.
- [ ] `REL-006` Menjalankan migrasi dengan prosedur terkontrol.
- [ ] `REL-012` Membuat presentasi dan video demonstrasi PBL.
- [ ] `REL-013` Membuat laporan analisis, desain, implementasi, pengujian, dan evaluasi.
- [ ] `REL-014` Menjalankan smoke test setelah deployment.

## Skenario Penerimaan yang Belum Divalidasi

- [ ] ORMAWA A tidak dapat membuka program kerja ORMAWA B melalui perubahan URL.
- [ ] HMJ A tidak dapat membuka data HMJ B.
- [ ] HIMA A tidak dapat membuka data HIMA B meskipun memiliki parent yang sama.
- [ ] HIMA tidak dapat mengirim pesan kepada HMJ noninduk.
- [ ] HMJ hanya dapat mereview HIMA anak.
- [ ] Super Admin hanya dapat memproses akun ORMAWA/HMJ sesuai aturan.
- [ ] Tenant berstatus `PENDING`, `REJECTED`, atau `SUSPENDED` tidak dapat memakai dashboard operasional.
- [ ] Perubahan status workflow yang tidak sah ditolak.
- [ ] Approval, rejection, revision, dan perubahan keuangan tercatat dalam audit log.
- [ ] Notifikasi hanya diterima oleh pengguna yang berhak.
- [ ] Aplikasi dapat digunakan pada mobile dan menggunakan keyboard.

Skenario yang sudah tervalidasi adalah otorisasi download proposal/bukti transaksi, kesesuaian ringkasan dashboard dengan daftar detail, dan rekonsiliasi saldo dari transaksi.

## Urutan Pengerjaan Berikutnya

1. Selesaikan `SETUP-016` dan `SETUP-017`: validasi Docker Compose, MySQL, frontend/backend, dan reverse proxy `/api`.
2. Selesaikan `QA-010` dengan screen reader nyata dan `QA-012` lewat UAT; validasi 11 skenario penerimaan yang belum dicentang dan simpan bukti.
3. Siapkan deployment berurutan melalui `REL-001`–`REL-006`: environment, secrets, HTTPS/domain, database/backup, private storage, dan migrasi terkontrol.
4. Tentukan lingkup `AUTH-016`, lalu konfigurasi provider email dan verifikasi reset password pada deployment.
5. Deploy dan jalankan `REL-014` smoke test; setelah itu selesaikan `REL-012` presentasi/video dan `REL-013` laporan akhir.
6. Putuskan apakah `MSG-009` attachment pesan masuk lingkup proyek; jika tidak, catat sebagai out of scope.

## Kesimpulan

Aplikasi telah mencapai tahap fitur utama selesai dan build stabil, tetapi belum siap dinyatakan release. Integration test MySQL, E2E pengajuan, inventaris, pesan, login seluruh aktor, approval tenant, program kerja, dan responsivitas portal telah lulus. Hambatan utama berikutnya adalah uji keyboard/screen reader, performa/UAT, serta kesiapan lingkungan deployment.
