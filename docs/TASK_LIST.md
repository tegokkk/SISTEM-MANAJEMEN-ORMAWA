# Task List

[Kembali ke README](../README.md) · [Struktur Proyek](PROJECT_STRUCTURE.md) · [Backend](BACKEND.md) · [Frontend](FRONTEND.md) · [Style Guide](STYLEGUIDE.md) · [Database](DATABASE.md)

## Cara Menggunakan

- Checklist ini disusun berdasarkan dependensi, bukan hanya berdasarkan modul.
- Prioritas `P0` wajib untuk sistem berjalan dan aman, `P1` penting untuk lingkup utama, dan `P2` merupakan peningkatan.
- Jangan memulai modul tenant sebelum autentikasi, tenant context, dan tenant guard selesai diuji.
- Setiap task dianggap selesai hanya jika memenuhi Definition of Done di akhir dokumen.

## Milestone

| Milestone          | Hasil                                                                   |
| ------------------ | ----------------------------------------------------------------------- |
| M0 — Discovery     | Kebutuhan, skema, dan aturan bisnis tervalidasi                         |
| M1 — Foundation    | Proyek berjalan, database terhubung, autentikasi dan tenant guard aktif |
| M2 — Organization  | Tenant, anggota, periode, jabatan, dan struktur selesai                 |
| M3 — Programs      | Program kerja, proposal, kebutuhan, dan review selesai                  |
| M4 — Resources     | Keuangan dan inventaris selesai                                         |
| M5 — Communication | Pesan, notifikasi, dan audit selesai                                    |
| M6 — Release       | Pengujian, dokumentasi, deployment, dan demo selesai                    |

## Catatan Progres Terakhir — 29 September 2026

Validasi yang sudah lulus pada workspace:

- `pnpm typecheck` — lulus untuk contracts, backend, dan frontend.
- `pnpm lint` — lulus tanpa error maupun warning.
- `pnpm test` — 58 unit/component test lulus.
- `pnpm build` — build produksi backend dan Next.js lulus.
- `pnpm test:e2e` — 24 pengujian lulus dan 12 skenario mutasi/login yang sengaja dilewati pada viewport non-desktop; cakupan meliputi smoke/aksesibilitas dasar, login empat aktor, pengajuan tenant, dan workflow program kerja HIMA.

Pekerjaan yang ditutup pada validasi ini:

- kartu dashboard menuju daftar detail dengan filter yang sama dengan query ringkasan;
- rekonsiliasi angka dashboard, saldo, dan query organisasi dalam tenant scope;
- pengujian IDOR lintas resource serta XSS pada teks dan metadata nama file;
- keyboard navigation, kontras tombol utama, semantic heading, dan responsive overflow halaman publik/autentikasi;
- UI lupa/reset password dan invalidasi seluruh sesi setelah password berubah. Pengiriman email token masih menunggu provider deployment sehingga `AUTH-016` belum ditutup.

Validasi yang masih membutuhkan perluasan data workflow lengkap:

- E2E kebutuhan, keuangan, inventaris, dan pesan;
- pengujian responsif serta aksesibilitas untuk seluruh portal operasional.

Portal operasional yang kini terhubung langsung ke API:

- dashboard Super Admin, ORMAWA, HMJ, dan HIMA memakai metrik database;
- monitoring tenant, anggota, periode, jabatan, struktur, dan program kerja;
- review program kerja HIMA oleh HMJ, transaksi keuangan, dan pergerakan inventaris;
- pesan HMJ–HIMA, notifikasi, mark as read, dan daftar audit;
- pengajuan kebutuhan dan pengajuan dana dengan rincian item, submit, serta antrian review;
- filter, pencarian, loading/error/empty state, serta pagination server pada daftar utama.

Konfigurasi Docker frontend/backend/MySQL dan reverse proxy Nginx telah dibuat, tetapi `SETUP-016` dan `SETUP-017` tetap terbuka karena Docker belum tersedia pada mesin ini untuk menjalankan `docker compose config`, build image, dan smoke test container.

## Catatan Progres Lanjutan — 29 September 2026

- MySQL lokal dari XAMPP telah terhubung dan baseline database berhasil di-seed.
- Suite integration test MySQL terpisah telah ditambahkan melalui `pnpm test:integration`.
- `QA-003` lulus dengan verifikasi endpoint anggota bahwa tenant A hanya memperoleh datanya sendiri dan akses langsung ke resource tenant B menghasilkan `404`.
- `QA-004` lulus untuk alur pembuatan, submit, dan approval pengajuan dana; nominal, histori status, audit log, notifikasi, transaksi keuangan, serta pencegahan transaksi duplikat telah diverifikasi pada database nyata.
- `QA-005` lulus untuk login Super Admin, Admin ORMAWA, Admin HMJ, dan Admin HIMA hingga dashboard masing-masing. Skenario memakai alamat IP uji terpisah agar dapat dijalankan ulang tanpa menonaktifkan rate limit.
- `QA-006` lulus untuk registrasi pemohon, pengajuan ORMAWA, review Super Admin, aktivasi tenant dan role, serta login pemohon ke dashboard organisasi. Fixture database dibersihkan otomatis setelah pengujian.
- `QA-007` lulus untuk program kerja HIMA dari DRAFT, SUBMITTED, APPROVED oleh HMJ induk, RUNNING, sampai COMPLETED beserta histori statusnya.
- Suite E2E penuh lulus dengan hasil 24 passed dan 12 skipped pada Chromium desktop, mobile, dan tablet.
- Alur ini sekaligus memperbaiki redirect akun pemohon tanpa role dan submit form ORMAWA/HMJ/HIMA yang sebelumnya tidak mengirim body JSON.
- Regresi backend tetap lulus: typecheck, 53 unit test, dan 2 integration test MySQL.

## Catatan Progres QA-008 — 30 September 2026

- `QA-008` lulus: E2E membuat dan mengirim pengajuan kebutuhan serta dana, HMJ meninjau dan menyetujui keduanya, stok inventaris dibuat lalu berkurang dari 5 menjadi 4 melalui pergerakan keluar, dan pesan HIMA dapat dikirim lalu dibaca oleh HMJ.
- Fixture dan data turunan E2E dibersihkan otomatis sesudah test.
- `pnpm typecheck` lulus untuk contracts, backend, dan frontend.
- `pnpm test:e2e` lulus dengan 25 passed dan 14 skipped pada Chromium desktop, mobile, dan tablet. Skenario mutasi/login hanya berjalan pada Chromium desktop.

## Catatan Progres QA-009 — 30 September 2026

- `QA-009` lulus: 12 skenario responsif memeriksa dashboard dan halaman operasional sesuai kewenangan Super Admin, ORMAWA, HMJ, dan HIMA pada viewport mobile, tablet, serta desktop.
- Tidak ditemukan overflow horizontal pada halaman yang diperiksa.
- Regresi `pnpm test:e2e` lulus dengan 37 passed dan 14 skipped.
- Pemeriksaan gabungan `pnpm check` lulus: lint, typecheck, 58 unit/component test, dan build produksi.

## Catatan Progres QA-010 — 30 September 2026

- Pemeriksaan keyboard dan nama aksesibel ditambahkan untuk halaman operasional empat jenis akun; 4 skenario desktop lulus untuk landmark `main`, heading utama, fokus keyboard terlihat, dan kontrol interaktif yang bernama.
- Audit menemukan dua filter tanggal keuangan tidak terhubung dengan label; semua filter keuangan kini mempunyai ID unik sehingga label terbaca oleh teknologi bantu.
- `pnpm check` dan regresi E2E penuh lulus dengan 42 passed dan 24 skipped setelah perbaikan.
- `QA-010` belum dicentang karena pembacaan dengan screen reader nyata masih memerlukan validasi manual.

## Catatan Progres QA-011 — 30 September 2026

- `QA-011` lulus untuk daftar anggota dengan 500 fixture tambahan: endpoint tetap memakai pagination 10 baris/halaman, menghitung setidaknya 50 halaman, dan merespons di bawah 5 detik.
- Seluruh fixture QA-008 dan QA-011 terverifikasi bersih setelah pengujian.
- Regresi E2E terakhir lulus dengan 42 passed dan 24 skipped.

## 0. Discovery dan Validasi

- [x] `P0 DOC-001` Kumpulkan file skema/dump MySQL asli.
- [x] `P0 DOC-002` Konfirmasi teknologi yang diwajibkan kampus.
- [x] `P0 DOC-003` Konfirmasi identitas institusi, logo, warna, dan referensi landing page.
- [x] `P0 DOC-004` Validasi daftar 8 jurusan dan 31 program studi dari sumber resmi.
- [x] `P0 DOC-005` Validasi aktor, role, dan batas kewenangan.
- [x] `P0 DOC-006` Konfirmasi alur reviewer program kerja ORMAWA dan HMJ.
- [x] `P0 DOC-007` Konfirmasi field wajib setiap modul.
- [x] `P0 DOC-008` Konfirmasi kebijakan file: tipe, ukuran, retensi, dan storage.
- [x] `P0 DOC-009` Buat use case diagram.
- [x] `P0 DOC-010` Buat activity diagram untuk pendaftaran tenant dan program kerja.
- [x] `P1 DOC-011` Susun acceptance criteria setiap modul.
- [x] `P1 DOC-012` Susun data pribadi yang boleh disimpan dan ditampilkan.

## 1. Audit dan Desain Database

- [x] `P0 DB-001` Inventaris tabel, view, trigger, procedure, dan seed dari file SQL.
- [x] `P0 DB-002` Dokumentasikan primary key, foreign key, unique constraint, dan enum.
- [x] `P0 DB-003` Petakan tabel database ke setiap modul aplikasi.
- [x] `P0 DB-004` Identifikasi kolom/tabel yang menjadi tenant scope.
- [x] `P0 DB-005` Validasi model hubungan ORMAWA, HMJ, HIMA, jurusan, dan prodi.
- [x] `P0 DB-006` Validasi model user, role, membership, dan approval.
- [x] `P0 DB-007` Buat ERD berdasarkan skema aktual.
- [x] `P0 DB-008` Buat daftar gap antara skema aktual dan kebutuhan aplikasi.
- [x] `P0 DB-009` Rancang constraint untuk satu HMJ per jurusan dan relasi HIMA–prodi.
- [x] `P0 DB-010` Rancang indeks awal untuk query tenant dan dashboard.
- [x] `P0 DB-011` Petakan skema ke Prisma tanpa mengubah database terlebih dahulu.
- [x] `P0 DB-012` Buat rencana migrasi yang disetujui.
- [x] `P1 DB-013` Buat seed 8 jurusan dan 31 program studi.
- [x] `P1 DB-014` Buat seed akun dan tenant khusus demo/development.
- [x] `P1 DB-015` Dokumentasikan strategi backup dan restore.
- [x] `P1 DB-016` Uji migrasi pada database kosong dan staging.

## 2. Project Foundation

- [x] `P0 SETUP-001` Inisialisasi root workspace dengan pnpm dan Turborepo.
- [x] `P0 SETUP-002` Inisialisasi `frontend/` menggunakan Next.js + TypeScript.
- [x] `P0 SETUP-003` Pasang dan konfigurasi Tailwind CSS pada frontend.
- [x] `P0 SETUP-004` Inisialisasi `backend/` menggunakan Express + TypeScript.
- [x] `P0 SETUP-005` Pasang Zod, middleware keamanan, dan error handler backend.
- [x] `P0 SETUP-006` Pasang Prisma pada backend dan buat koneksi MySQL.
- [x] `P0 SETUP-007` Buat `packages/contracts` untuk kontrak API yang aman.
- [x] `P0 SETUP-008` Aktifkan TypeScript strict mode, ESLint, dan formatter pada workspace.
- [x] `P0 SETUP-009` Buat validasi environment frontend dan backend.
- [x] `P0 SETUP-010` Tambahkan `.env.example` terpisah tanpa secret.
- [x] `P0 SETUP-011` Susun module backend dan feature frontend.
- [x] `P0 SETUP-012` Buat API client frontend dan response/error model backend.
- [x] `P0 SETUP-013` Buat logger backend dengan sanitasi data sensitif.
- [x] `P0 SETUP-014` Konfigurasi unit/integration test pada kedua aplikasi.
- [x] `P0 SETUP-015` Konfigurasi Playwright untuk E2E lintas aplikasi.
- [ ] `P1 SETUP-016` Siapkan Docker untuk frontend, backend, dan MySQL development.
- [ ] `P1 SETUP-017` Siapkan reverse proxy `/api` menuju backend.
- [x] `P1 SETUP-018` Siapkan CI untuk lint, typecheck, test, dan build seluruh workspace.

## 3. Design System dan Layout

- [x] `P0 UI-001` Implementasikan color dan spacing tokens.
- [x] `P0 UI-002` Konfigurasi font dan skala tipografi.
- [x] `P0 UI-003` Buat komponen Button dan IconButton.
- [x] `P0 UI-004` Buat komponen input, select, checkbox, radio, dan textarea.
- [x] `P0 UI-005` Buat FormField, helper text, dan error state.
- [x] `P0 UI-006` Buat Modal/ConfirmDialog yang aksesibel.
- [x] `P0 UI-007` Buat StatusBadge untuk seluruh status domain.
- [x] `P0 UI-008` Buat DataTable, FilterBar, dan Pagination.
- [x] `P0 UI-009` Buat loading, empty, error, dan forbidden state.
- [x] `P0 UI-010` Buat PortalSidebar, Topbar, Breadcrumb, dan PageHeader.
- [x] `P1 UI-011` Buat StatCard, Timeline, ActivityList, dan DetailList.
- [x] `P1 UI-012` Dokumentasikan contoh penggunaan komponen.
- [x] `P1 UI-013` Uji keyboard navigation dan kontras warna.

## 4. Autentikasi dan Tenant Security

- [x] `P0 AUTH-001` Implementasikan login dan logout.
- [x] `P0 AUTH-002` Implementasikan hashing password jika kredensial dikelola sendiri.
- [x] `P0 AUTH-003` Konfigurasi cookie sesi yang aman.
- [x] `P0 AUTH-004` Bentuk `AuthContext` dari sesi server.
- [x] `P0 AUTH-005` Implementasikan role guard.
- [x] `P0 AUTH-006` Implementasikan tenant guard.
- [x] `P0 AUTH-007` Implementasikan validasi parent HMJ–HIMA.
- [x] `P0 AUTH-008` Blokir dashboard untuk tenant nonaktif.
- [x] `P0 AUTH-009` Buat rate limit untuk login dan endpoint sensitif.
- [x] `P0 AUTH-010` Buat halaman login dan state error.
- [x] `P0 AUTH-011` Buat redirect dashboard sesuai aktor.
- [x] `P0 AUTH-012` Uji ORMAWA A tidak dapat mengakses ORMAWA B.
- [x] `P0 AUTH-013` Uji HMJ A tidak dapat mengakses HMJ B.
- [x] `P0 AUTH-014` Uji HIMA A tidak dapat mengakses HIMA B.
- [x] `P0 AUTH-015` Uji HIMA hanya dapat mengakses HMJ induknya.
- [ ] `P1 AUTH-016` Implementasikan reset password bila masuk lingkup proyek.

## 5. Landing Page dan Direktori

- [x] `P1 WEB-001` Buat utility bar hijau.
- [x] `P1 WEB-002` Buat navbar putih dan tombol portal kuning.
- [x] `P1 WEB-003` Buat hero section responsif.
- [x] `P1 WEB-004` Buat section manfaat dan penjelasan jenis organisasi.
- [x] `P1 WEB-005` Buat direktori organisasi publik.
- [x] `P1 WEB-006` Tambahkan pencarian/filter jenis organisasi, jurusan, dan prodi.
- [x] `P1 WEB-007` Buat halaman profil publik organisasi.
- [x] `P1 WEB-008` Pastikan hanya field publik yang dikirim ke browser.
- [x] `P1 WEB-009` Buat footer dan metadata SEO dasar.
- [x] `P2 WEB-010` Tambahkan statistik publik yang aman.

## 6. Pengajuan dan Persetujuan Tenant

- [x] `P0 TEN-001` Buat form pengajuan ORMAWA.
- [x] `P0 TEN-002` Buat form pengajuan HMJ.
- [x] `P0 TEN-003` Buat form pengajuan HIMA dengan pilihan HMJ/prodi tervalidasi.
- [x] `P0 TEN-004` Implementasikan status draft dan submit.
- [x] `P0 TEN-005` Buat daftar review ORMAWA/HMJ untuk Super Admin.
- [x] `P0 TEN-006` Buat daftar review HIMA untuk HMJ induk.
- [x] `P0 TEN-007` Implementasikan approve, reject, dan request revision.
- [x] `P0 TEN-008` Wajibkan catatan untuk reject/revision.
- [x] `P0 TEN-009` Aktifkan tenant dan akun awal secara atomik setelah approval.
- [x] `P0 TEN-010` Buat histori status pengajuan.
- [x] `P0 TEN-011` Buat audit log dan notifikasi untuk setiap keputusan.
- [x] `P0 TEN-012` Uji HMJ tidak dapat mereview HIMA milik HMJ lain.

## 7. Dashboard

- [x] `P1 DASH-001` Buat shell dashboard umum.
- [x] `P1 DASH-002` Buat dashboard Super Admin.
- [x] `P1 DASH-003` Buat dashboard ORMAWA.
- [x] `P1 DASH-004` Buat dashboard HMJ.
- [x] `P1 DASH-005` Buat dashboard HIMA.
- [x] `P1 DASH-006` Pastikan setiap metrik dihitung menggunakan tenant scope.
- [x] `P1 DASH-007` Tautkan kartu statistik ke daftar detail berfilter.
- [x] `P1 DASH-008` Buat loading, empty, dan error state setiap widget.
- [x] `P1 DASH-009` Uji angka ringkasan terhadap query detail.

## 8. Anggota dan Kepengurusan

- [x] `P0 ORG-001` Implementasikan CRUD dan deaktivasi anggota.
- [x] `P0 ORG-002` Tambahkan pencarian, filter, dan pagination anggota.
- [x] `P0 ORG-003` Implementasikan periode kepengurusan.
- [x] `P0 ORG-004` Terapkan satu periode aktif per tenant.
- [x] `P0 ORG-005` Implementasikan jabatan.
- [x] `P0 ORG-006` Implementasikan assignment anggota-jabatan-periode.
- [x] `P1 ORG-007` Buat tampilan struktur organisasi.
- [x] `P1 ORG-008` Tampilkan histori periode tanpa menimpa data lama.
- [x] `P1 ORG-009` Implementasikan ekspor data sesuai izin bila dibutuhkan.
- [x] `P0 ORG-010` Uji seluruh query menggunakan tenant scope.

## 9. Program Kerja dan Proposal

- [x] `P0 PROG-001` Implementasikan CRUD program kerja.
- [x] `P0 PROG-002` Implementasikan penanggung jawab, jadwal, target, dan anggaran.
- [x] `P0 PROG-003` Implementasikan command submit.
- [x] `P0 PROG-004` Implementasikan approve, reject, dan request revision.
- [x] `P0 PROG-005` Implementasikan status running, completed, dan cancelled.
- [x] `P0 PROG-006` Simpan histori setiap perubahan status.
- [x] `P0 PROG-007` Validasi seluruh transisi status pada server.
- [x] `P0 PROG-008` Implementasikan upload proposal privat.
- [x] `P1 PROG-009` Implementasikan versi proposal.
- [x] `P0 PROG-010` Implementasikan download terotorisasi.
- [x] `P1 PROG-011` Buat timeline status dan catatan reviewer.
- [x] `P0 PROG-012` Buat audit dan notifikasi workflow.
- [x] `P0 PROG-013` Uji HIMA hanya mengirim kepada HMJ induk.

## 10. Pengajuan Kebutuhan

- [x] `P1 REQ-001` Implementasikan CRUD pengajuan kebutuhan.
- [x] `P1 REQ-002` Implementasikan rincian item, jumlah, estimasi, dan prioritas.
- [x] `P1 REQ-003` Hubungkan pengajuan dengan program kerja.
- [x] `P1 REQ-004` Implementasikan submit, revision, approve, dan reject.
- [x] `P1 REQ-005` Buat daftar review HMJ untuk HIMA anak.
- [x] `P1 REQ-006` Buat histori status, audit, dan notifikasi.
- [x] `P0 REQ-007` Uji pengajuan lintas tenant ditolak.

## 11. Pengajuan Keuangan

- [x] `P0 FINREQ-001` Implementasikan pengajuan dana per program kerja.
- [x] `P0 FINREQ-002` Implementasikan rincian anggaran.
- [x] `P0 FINREQ-003` Pisahkan nominal diajukan dan nominal disetujui.
- [x] `P0 FINREQ-004` Implementasikan workflow review dan revisi.
- [x] `P0 FINREQ-005` Cegah nilai negatif dan overflow.
- [x] `P0 FINREQ-006` Hubungkan approval dengan transaksi tanpa duplikasi.
- [x] `P0 FINREQ-007` Gunakan transaksi database untuk approval.
- [x] `P0 FINREQ-008` Buat audit log dan notifikasi.

## 12. Keuangan

- [x] `P0 FIN-001` Implementasikan kategori transaksi per tenant.
- [x] `P0 FIN-002` Implementasikan pemasukan.
- [x] `P0 FIN-003` Implementasikan pengeluaran.
- [x] `P0 FIN-004` Implementasikan bukti transaksi privat.
- [x] `P0 FIN-005` Buat ringkasan saldo dari transaksi valid.
- [x] `P1 FIN-006` Buat filter periode, kategori, dan program kerja.
- [x] `P1 FIN-007` Buat laporan sederhana dan ekspor sesuai izin.
- [x] `P0 FIN-008` Implementasikan pembatalan/reversal sesuai aturan.
- [x] `P0 FIN-009` Catat perubahan penting pada audit log.
- [x] `P0 FIN-010` Uji rekonsiliasi saldo.

## 13. Inventaris

- [x] `P1 INV-001` Implementasikan CRUD item inventaris.
- [x] `P1 INV-002` Terapkan kode unik dalam scope tenant.
- [x] `P1 INV-003` Implementasikan jumlah, kondisi, lokasi, dan sumber.
- [x] `P1 INV-004` Implementasikan histori/movement bila didukung skema.
- [x] `P1 INV-005` Buat filter kondisi, lokasi, dan status.
- [x] `P1 INV-006` Cegah jumlah negatif.
- [x] `P1 INV-007` Catat perubahan sensitif pada audit log.
- [x] `P0 INV-008` Uji isolasi inventaris antar-tenant.

## 14. Pesan HMJ–HIMA

- [x] `P1 MSG-001` Implementasikan percakapan HMJ–HIMA.
- [x] `P0 MSG-002` Validasi relasi parent sebelum membuat percakapan.
- [x] `P1 MSG-003` Implementasikan kirim dan daftar pesan.
- [x] `P1 MSG-004` Implementasikan status dibaca.
- [x] `P1 MSG-005` Tampilkan jumlah pesan belum dibaca.
- [x] `P1 MSG-006` Buat notifikasi pesan baru.
- [x] `P0 MSG-007` Tolak HIMA ke HIMA dan HIMA ke HMJ noninduk.
- [x] `P0 MSG-008` Tolak HMJ menghubungi HIMA milik HMJ lain.
- [ ] `P2 MSG-009` Tambahkan attachment jika masuk lingkup proyek.

## 15. Notifikasi dan Audit Log

- [x] `P0 SYS-001` Definisikan event domain yang menghasilkan notifikasi.
- [x] `P0 SYS-002` Implementasikan pembuatan notifikasi pada server.
- [x] `P1 SYS-003` Buat daftar notifikasi dan mark as read.
- [x] `P0 SYS-004` Validasi ulang akses ketika notifikasi dibuka.
- [x] `P0 SYS-005` Implementasikan audit writer terpusat.
- [x] `P0 SYS-006` Sanitasi metadata audit.
- [x] `P1 SYS-007` Buat daftar/filter audit untuk role berwenang.
- [x] `P0 SYS-008` Pastikan password, token, dan secret tidak pernah tercatat.
- [x] `P1 SYS-009` Tentukan retention policy audit dan notifikasi.

## 16. Keamanan dan Hardening

- [x] `P0 SEC-001` Jalankan pengujian IDOR pada seluruh resource tenant.
- [x] `P0 SEC-002` Uji CSRF pada operasi mutasi.
- [x] `P0 SEC-003` Uji XSS pada input teks dan metadata file.
- [x] `P0 SEC-004` Uji validasi upload dan download file.
- [x] `P0 SEC-005` Uji brute force/rate limit login.
- [x] `P0 SEC-006` Periksa cookie dan header keamanan produksi.
- [x] `P0 SEC-007` Periksa error response agar tidak membocorkan data.
- [x] `P0 SEC-008` Audit dependency dan secret repository.
- [x] `P1 SEC-009` Lakukan threat modeling singkat per modul sensitif.
- [x] `P1 SEC-010` Dokumentasikan prosedur penanganan insiden.

## 17. Quality Assurance

- [x] `P0 QA-001` Unit test policy role dan tenant.
- [x] `P0 QA-002` Unit test transisi workflow.
- [x] `P0 QA-003` Integration test query tenant.
- [x] `P0 QA-004` Integration test transaksi approval dan keuangan.
- [x] `P0 QA-005` E2E login untuk seluruh aktor.
- [x] `P0 QA-006` E2E pengajuan dan persetujuan tenant.
- [x] `P0 QA-007` E2E program kerja HIMA sampai selesai.
- [x] `P1 QA-008` E2E kebutuhan, keuangan, inventaris, dan pesan.
- [x] `P1 QA-009` Uji responsive mobile, tablet, dan desktop.
- [ ] `P1 QA-010` Uji keyboard dan screen reader dasar.
- [x] `P1 QA-011` Uji performa daftar data besar.
- [ ] `P1 QA-012` Lakukan user acceptance test dengan perwakilan aktor.

## 18. Deployment dan Dokumentasi

- [ ] `P0 REL-001` Siapkan environment development, staging, dan production.
- [ ] `P0 REL-002` Konfigurasi secret pada platform deployment.
- [ ] `P0 REL-003` Konfigurasi HTTPS dan domain.
- [ ] `P0 REL-004` Konfigurasi database production dan backup.
- [ ] `P0 REL-005` Konfigurasi private file storage.
- [ ] `P0 REL-006` Jalankan migrasi melalui prosedur terkontrol.
- [x] `P0 REL-007` Tambahkan health check dan monitoring error.
- [x] `P0 REL-008` Buat panduan instalasi dan konfigurasi.
- [x] `P1 REL-009` Buat dokumentasi fitur dan manual pengguna.
- [x] `P1 REL-010` Siapkan akun demo setiap aktor.
- [x] `P1 REL-011` Siapkan data demo yang tidak mengandung data pribadi nyata.
- [ ] `P1 REL-012` Buat presentasi dan video demonstrasi PBL.
- [ ] `P1 REL-013` Buat laporan analisis, desain, implementasi, pengujian, dan evaluasi.
- [ ] `P0 REL-014` Jalankan smoke test setelah deployment.

## Skenario Penerimaan Wajib

- [ ] ORMAWA A tidak dapat membuka program kerja ORMAWA B melalui perubahan URL.
- [ ] HMJ A tidak dapat membuka data HMJ B.
- [ ] HIMA A tidak dapat membuka data HIMA B meskipun parent-nya sama.
- [ ] HIMA tidak dapat mengirim pesan kepada HMJ noninduk.
- [ ] HMJ hanya dapat mereview HIMA anak.
- [ ] Super Admin hanya memproses akun ORMAWA/HMJ sesuai aturan.
- [ ] Tenant `PENDING`, `REJECTED`, atau `SUSPENDED` tidak dapat memakai dashboard operasional.
- [ ] Perubahan status workflow yang tidak sah ditolak.
- [ ] Persetujuan, penolakan, revisi, dan perubahan keuangan tercatat pada audit log.
- [ ] Notifikasi hanya diterima pengguna yang berhak.
- [x] Proposal dan bukti transaksi tidak dapat diunduh tanpa otorisasi.
- [x] Ringkasan dashboard sesuai dengan daftar detail tenant.
- [x] Nilai saldo dapat direkonsiliasi dari transaksi.
- [ ] Aplikasi dapat digunakan pada mobile dan dengan keyboard.

## Definition of Done Umum

Sebuah task hanya boleh dicentang jika:

- acceptance criteria terpenuhi;
- typecheck, lint, test, dan build lulus;
- autentikasi, role, serta tenant scope telah diperiksa;
- loading, empty, error, dan forbidden state tersedia jika relevan;
- UI mengikuti style guide dan responsif;
- operasi sensitif memiliki audit log;
- notifikasi dibuat jika kejadian perlu diketahui pengguna;
- dokumentasi terkait diperbarui;
- tidak ada secret atau data pribadi nyata di repository;
- perubahan telah diuji oleh anggota tim selain pembuatnya.
