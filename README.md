# SIM ORMAWA & HMJ — Multi-Tenant

Sistem Informasi Manajemen Organisasi Mahasiswa berbasis web untuk mengelola tenant ORMAWA/UKM, HMJ, dan HIMA dalam satu aplikasi dengan isolasi data yang ketat.

Proyek ini dikembangkan sebagai **Project Based Learning (PBL)** yang mencakup analisis kebutuhan, desain database, autentikasi dan otorisasi, pengembangan full-stack, pengujian keamanan multi-tenant, serta dokumentasi perangkat lunak.

## Dokumentasi Proyek

Dokumentasi telah dipisahkan berdasarkan area kerja agar mudah digunakan oleh setiap anggota tim.

| Dokumen | Isi utama |
|---|---|
| [Struktur Proyek](docs/PROJECT_STRUCTURE.md) | Struktur folder/file lengkap, route, feature module, dependency rules, testing, dan konvensi kode |
| [Backend](docs/BACKEND.md) | Arsitektur server, autentikasi, otorisasi, tenant context, service, API, workflow, audit, notifikasi, dan keamanan |
| [Frontend](docs/FRONTEND.md) | Struktur halaman, dashboard per aktor, komponen, state, formulir, aksesibilitas, dan pengujian UI |
| [Style Guide](docs/STYLEGUIDE.md) | Warna, tipografi, spacing, layout, komponen, status, ikon, dan aturan penulisan antarmuka |
| [Database](docs/DATABASE.md) | Konsep entitas, relasi, constraint, indeks, transaksi, isolasi tenant, dan integrasi dengan skema MySQL |
| [Task List](docs/TASK_LIST.md) | Backlog implementasi per fase beserta prioritas, dependensi, dan definition of done |
| [Instalasi](docs/INSTALLATION.md) | Prasyarat, environment, database, akun development, Docker, dan validasi |
| [Keamanan](docs/SECURITY.md) | Threat model, event notifikasi, retention, audit dependency, dan respons insiden |
| [Panduan Pengguna](docs/USER_GUIDE.md) | Langkah penggunaan portal untuk Super Admin, ORMAWA, HMJ, dan HIMA |

## Latar Belakang

Administrasi organisasi mahasiswa umumnya tersebar pada dokumen, spreadsheet, aplikasi pesan, dan arsip yang berbeda. Akibatnya, data kepengurusan tidak konsisten, status program kerja sulit dipantau, proses persetujuan lambat, pencatatan keuangan dan inventaris tidak terintegrasi, serta histori perubahan sulit ditelusuri.

SIM ORMAWA & HMJ menyediakan satu portal terpusat tanpa menghilangkan batas kewenangan setiap organisasi. Sistem ditujukan agar kegiatan administrasi menjadi lebih tertib, transparan, aman, dan mudah diaudit.

## Struktur Organisasi

```text
SUPER ADMIN
├── ORMAWA / UKM      ← tenant mandiri, sejajar dengan HMJ
└── HMJ               ← satu HMJ untuk satu jurusan
    ├── HIMA / Prodi  ← tenant anak dari HMJ
    ├── HIMA / Prodi
    └── HIMA / Prodi
```

- **Super Admin** mengelola sistem tingkat institusi dan menyetujui akun ORMAWA/HMJ.
- **ORMAWA/UKM** merupakan tenant mandiri dan tidak berada di bawah HMJ.
- **HMJ** merupakan tenant induk pada satu jurusan dan menyetujui HIMA di bawahnya.
- **HIMA** merupakan tenant anak yang mewakili satu program studi.

## Aturan Inti Multi-Tenant

1. ORMAWA hanya dapat mengakses data tenant ORMAWA sendiri.
2. HMJ tidak dapat mengakses data HMJ lain.
3. HIMA tidak dapat mengakses data HIMA lain, termasuk yang berada di bawah HMJ yang sama.
4. HIMA hanya dapat berkomunikasi dan mengirim pengajuan kepada HMJ induknya.
5. HMJ hanya dapat melihat data HIMA dengan `parent_tenant_id` yang mengarah kepadanya.
6. Hubungan induk tidak otomatis memberikan HMJ hak untuk mengubah seluruh data HIMA.
7. Identitas tenant wajib ditentukan dari sesi pengguna pada server, bukan dari input bebas pengguna.
8. Semua akses lintas tenant yang sah harus eksplisit, divalidasi, dan dicatat pada audit log.

## Aktor

| Aktor | Ruang lingkup | Wewenang utama |
|---|---|---|
| Pengunjung | Publik | Melihat landing page dan direktori serta mengajukan akun tenant |
| Super Admin | Institusi | Memproses akun ORMAWA/HMJ, mengelola master, dan memonitor sistem |
| Admin ORMAWA | Tenant sendiri | Mengelola anggota, struktur, program kerja, kebutuhan, keuangan, dan inventaris |
| Admin HMJ | HMJ dan relasi HIMA anak | Mengelola HMJ, menyetujui HIMA, meninjau pengajuan, dan berkomunikasi dengan HIMA |
| Admin HIMA | Tenant HIMA sendiri | Mengelola HIMA serta mengirim pengajuan dan pesan kepada HMJ induk |
| Pengurus/anggota | Sesuai tenant dan jabatan | Menjalankan fungsi yang diberikan melalui peran pada periode aktif |

## Modul Utama

- Landing page dan direktori organisasi.
- Login dan pengajuan akun tenant.
- Dashboard Super Admin, ORMAWA, HMJ, dan HIMA.
- Persetujuan akun ORMAWA/HMJ oleh Super Admin.
- Persetujuan HIMA oleh HMJ induk.
- Data anggota.
- Periode, jabatan, dan struktur organisasi.
- Program kerja dan workflow review.
- Proposal program kerja.
- Pengajuan kebutuhan.
- Pengajuan keuangan program kerja.
- Inventaris dan alat.
- Pemasukan dan pengeluaran.
- Pesan HMJ–HIMA.
- Master 8 jurusan dan 31 program studi.
- Audit log dan notifikasi.

## Alur Bisnis Ringkas

### Pengajuan tenant

```text
ORMAWA/HMJ → Super Admin → Disetujui / Revisi / Ditolak
HIMA       → HMJ induk   → Disetujui / Revisi / Ditolak
```

### Program kerja HIMA

```text
Draft → Diajukan ke HMJ induk → Revisi / Ditolak / Disetujui
                                      ↓
                                  Berjalan → Selesai
```

Status hanya boleh berubah melalui transisi yang sah dan setiap keputusan reviewer wajib memiliki jejak audit.

## Rekomendasi Teknologi

| Lapisan | Teknologi awal |
|---|---|
| Frontend | Next.js, React, TypeScript, Tailwind CSS |
| Backend | Node.js, Express, TypeScript, REST API, dan service layer |
| Validasi | Zod |
| Autentikasi | Auth.js atau sesi server yang setara |
| ORM | Prisma ORM dengan provider MySQL |
| Database | MySQL sesuai skema yang diberikan |
| Pengujian | Vitest/Jest, React Testing Library, dan Playwright |
| Deployment | Docker atau platform Node.js yang mendukung MySQL |

Teknologi tersebut merupakan baseline. Implementasi final harus menyesuaikan ketentuan kampus dan skema MySQL asli.

## Kriteria Keberhasilan

- Empat dashboard aktor dapat digunakan sesuai kewenangannya.
- Registrasi dan persetujuan tenant berjalan sesuai hierarki.
- Semua modul inti terhubung dengan MySQL.
- Pengujian lintas tenant tidak menemukan kebocoran data.
- Workflow program kerja dan pengajuan memiliki histori yang jelas.
- Transaksi, inventaris, notifikasi, dan audit log konsisten.
- Antarmuka responsif dan aksesibel.
- Dokumentasi instalasi, akun demo, pengujian, dan presentasi tersedia.

## Data yang Masih Dibutuhkan

Baseline skema tersedia di [`database/sim_ormawa_hmj.sql`](database/sim_ormawa_hmj.sql). Sebelum implementasi produksi, masih diperlukan:

1. daftar resmi 8 jurusan dan 31 program studi untuk seed master;
2. ketentuan teknologi dari kampus, jika ada;
3. referensi desain landing page dan identitas visual;
4. aturan reviewer program kerja ORMAWA dan HMJ;
5. field wajib setiap formulir dan laporan;
6. kebijakan tipe serta ukuran file yang diunggah.

Setelah skema SQL tersedia, pekerjaan dimulai dari audit tabel dan relasi, pemetaan modul-ke-tabel, autentikasi, kemudian tenant guard sebelum modul bisnis lainnya.
