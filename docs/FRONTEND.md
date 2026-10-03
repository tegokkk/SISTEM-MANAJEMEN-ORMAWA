# Frontend Specification

[Kembali ke README](../README.md) · [Struktur Proyek](PROJECT_STRUCTURE.md) · [Backend](BACKEND.md) · [Style Guide](STYLEGUIDE.md) · [Database](DATABASE.md) · [Task List](TASK_LIST.md)

## Tujuan

Frontend menyediakan pengalaman yang konsisten untuk pengunjung, Super Admin, ORMAWA, HMJ, dan HIMA. Antarmuka membantu pengguna memahami status proses, menjalankan tugas sesuai kewenangan, dan menemukan data tanpa menampilkan informasi tenant lain.

Frontend bukan lapisan keamanan utama. Penyembunyian menu tetap harus disertai validasi pada backend.

## Teknologi Awal

- Next.js dan React.
- TypeScript dengan strict mode.
- Tailwind CSS.
- Komponen UI aksesibel.
- React Hook Form dan Zod untuk formulir.
- API client terpusat untuk berkomunikasi dengan backend Express.
- Server Components dapat mengambil data awal melalui REST API bila sesuai.
- Client Components hanya untuk interaksi yang memerlukan state browser.
- Playwright dan React Testing Library.

## Prinsip UX

- Setiap halaman menunjukkan konteks organisasi aktif.
- Pengguna hanya melihat menu yang relevan dengan perannya.
- Status selalu memiliki label teks, bukan hanya warna.
- Aksi sensitif meminta konfirmasi dan menjelaskan dampaknya.
- Formulir mempertahankan input ketika validasi gagal.
- Empty state menjelaskan keadaan dan tindakan berikutnya.
- Tabel panjang mendukung pencarian, filter, pagination, dan loading state.
- Istilah menggunakan Bahasa Indonesia secara konsisten.

## Information Architecture

### Area publik

| Route konseptual        | Halaman                                      |
| ----------------------- | -------------------------------------------- |
| `/`                     | Landing page                                 |
| `/organisasi`           | Direktori organisasi                         |
| `/organisasi/[slug]`    | Profil publik organisasi                     |
| `/portal/login`         | Login                                        |
| `/portal/daftar`        | Pilih jenis pengajuan akun                   |
| `/portal/daftar/ormawa` | Pengajuan ORMAWA/UKM                         |
| `/portal/daftar/hmj`    | Pengajuan HMJ                                |
| `/portal/daftar/hima`   | Pengajuan HIMA                               |
| `/portal/status`        | Pemeriksaan status pengajuan bila disediakan |

### Area terautentikasi

| Route konseptual       | Halaman umum                          |
| ---------------------- | ------------------------------------- |
| `/dashboard`           | Dashboard sesuai aktor                |
| `/anggota`             | Data anggota                          |
| `/kepengurusan`        | Periode, jabatan, dan struktur        |
| `/program-kerja`       | Daftar dan detail program kerja       |
| `/pengajuan/kebutuhan` | Pengajuan kebutuhan                   |
| `/pengajuan/keuangan`  | Pengajuan keuangan                    |
| `/inventaris`          | Inventaris dan alat                   |
| `/keuangan`            | Pemasukan, pengeluaran, dan ringkasan |
| `/pesan`               | Percakapan HMJ–HIMA                   |
| `/notifikasi`          | Daftar notifikasi                     |
| `/pengaturan`          | Profil akun dan tenant sesuai izin    |

Route final dapat menggunakan prefix per aktor, tetapi jangan menggandakan komponen dan logika yang sama tanpa kebutuhan.

## Navigasi per Aktor

### Super Admin

- Dashboard.
- Pengajuan ORMAWA/HMJ.
- Daftar tenant.
- Master jurusan.
- Master program studi.
- Pengguna/akun sesuai kewenangan.
- Audit log.
- Notifikasi.

### ORMAWA

- Dashboard.
- Anggota.
- Kepengurusan.
- Program kerja dan proposal.
- Pengajuan kebutuhan.
- Pengajuan keuangan.
- Inventaris.
- Keuangan.
- Notifikasi dan pengaturan.

### HMJ

- Dashboard.
- Anggota dan kepengurusan HMJ.
- Program kerja HMJ.
- Daftar serta pengajuan akun HIMA anak.
- Review program kerja/pengajuan HIMA.
- Inventaris dan keuangan HMJ.
- Pesan HMJ–HIMA.
- Notifikasi dan pengaturan.

### HIMA

- Dashboard.
- Anggota dan kepengurusan HIMA.
- Program kerja dan proposal.
- Pengajuan kebutuhan/keuangan kepada HMJ induk.
- Inventaris dan keuangan HIMA.
- Pesan dengan HMJ induk.
- Notifikasi dan pengaturan.

## Landing Page

Susunan halaman yang direkomendasikan:

1. Utility bar hijau untuk informasi institusi atau kontak.
2. Navbar putih dengan logo, navigasi, dan tombol portal kuning.
3. Hero besar dengan judul, deskripsi singkat, CTA direktori, dan CTA portal.
4. Ringkasan manfaat sistem.
5. Direktori organisasi unggulan atau terbaru.
6. Statistik publik yang aman.
7. Penjelasan jenis ORMAWA, HMJ, dan HIMA.
8. Footer berisi tautan, kontak, dan informasi institusi.

Informasi publik berasal dari field yang secara eksplisit ditandai boleh dipublikasikan.

## Dashboard

### Super Admin

- Kartu jumlah tenant per jenis dan status.
- Jumlah pengajuan yang menunggu review.
- Grafik pertumbuhan atau aktivitas bila datanya tersedia.
- Daftar pengajuan terbaru.
- Audit aktivitas penting terbaru.

### ORMAWA

- Jumlah anggota aktif.
- Program kerja per status.
- Ringkasan saldo.
- Inventaris yang perlu perhatian.
- Pengajuan dan notifikasi terbaru.

### HMJ

- Statistik internal HMJ.
- Jumlah HIMA aktif dan menunggu persetujuan.
- Program/pengajuan HIMA yang perlu direview.
- Pesan belum dibaca.
- Aktivitas HIMA anak yang diizinkan.

### HIMA

- Jumlah anggota aktif.
- Program kerja per status.
- Pengajuan kepada HMJ induk.
- Ringkasan keuangan dan inventaris.
- Pesan serta notifikasi terbaru.

Setiap kartu ringkasan harus dapat ditelusuri ke halaman detail dengan filter yang sama.

## Komponen Utama

### Layout

- `PublicHeader`
- `UtilityBar`
- `PortalSidebar`
- `PortalTopbar`
- `TenantIdentity`
- `Breadcrumb`
- `PageHeader`
- `ContentContainer`

### Data display

- `StatCard`
- `DataTable`
- `StatusBadge`
- `EmptyState`
- `Timeline`
- `ActivityList`
- `OrganizationCard`
- `DetailList`
- `Pagination`

### Input dan aksi

- `FormField`
- `SearchInput`
- `FilterBar`
- `DatePicker`
- `MoneyInput`
- `FileUpload`
- `ConfirmDialog`
- `ReviewDialog`
- `SubmitButton`
- `Toast`

Komponen domain seperti `ProgramStatusTimeline` atau `TenantApprovalPanel` boleh membungkus komponen dasar tanpa mencampurkan query backend ke elemen presentasional.

## Pola Daftar Data

Setiap halaman daftar minimal memiliki:

- judul dan deskripsi singkat;
- tombol aksi utama sesuai izin;
- pencarian dengan debounce;
- filter status/periode/kategori yang relevan;
- indikator loading;
- empty state;
- pesan error dan tombol coba lagi;
- pagination server-side;
- aksi baris yang dapat diakses keyboard;
- informasi jumlah hasil.

Filter penting disimpan pada URL agar halaman dapat dibagikan dan dipulihkan setelah refresh.

## Pola Formulir

- Label selalu terlihat dan terkait dengan input.
- Field wajib ditandai dengan teks atau simbol yang dijelaskan.
- Kesalahan ditampilkan dekat field dan pada ringkasan bila formulir panjang.
- Nilai uang diformat untuk tampilan, tetapi dikirim dalam bentuk yang konsisten.
- Field jurusan/prodi saling bergantung dan divalidasi ulang pada server.
- Tombol submit menunjukkan loading dan mencegah pengiriman ganda.
- Formulir panjang dibagi menjadi bagian atau langkah yang logis.
- Keluar dari formulir yang berubah tetapi belum disimpan memunculkan peringatan.

## Tampilan Workflow

Gunakan kombinasi:

- badge status;
- timeline histori;
- identitas reviewer;
- catatan keputusan;
- aksi berikutnya yang tersedia;
- waktu submit dan review.

Aksi seperti setujui, minta revisi, tolak, mulai, dan selesaikan hanya tampil ketika transisi tersebut tersedia. Backend tetap menjadi sumber kebenaran.

## File dan Proposal

- Tampilkan nama, ukuran, tipe, versi, dan waktu unggah.
- Jelaskan batas ukuran serta tipe file sebelum upload.
- Tampilkan progress dan kegagalan upload.
- Gunakan endpoint download terotorisasi, bukan URL storage permanen.
- Preview hanya diberikan untuk tipe aman yang didukung.

## Pesan HMJ–HIMA

- Daftar percakapan menampilkan organisasi, pesan terakhir, waktu, dan jumlah belum dibaca.
- Header percakapan menampilkan hubungan HMJ–HIMA dengan jelas.
- Composer tidak menyediakan pilihan tenant di luar relasi yang sah.
- Optimistic update hanya digunakan jika kegagalan dapat dipulihkan dengan jelas.
- Pesan kosong, terlalu panjang, atau attachment tidak valid harus dicegah.

## Data Fetching dan State

- Utamakan data server untuk halaman dan daftar utama.
- Semua data bisnis diambil dari backend melalui API client; frontend tidak mengakses Prisma/MySQL.
- Gunakan state lokal untuk dialog, tab, pilihan sementara, dan interaksi UI.
- Hindari menyimpan ulang server state global tanpa kebutuhan.
- Mutasi harus menginvalidasi atau me-refresh data terkait.
- Gunakan URL untuk filter dan pagination.
- Jangan menyimpan token akses sensitif pada `localStorage` jika autentikasi menggunakan cookie sesi.

## Loading, Empty, Error, dan Forbidden State

Setiap fitur wajib memiliki empat state tersebut:

- **Loading:** skeleton dengan ukuran yang mendekati konten akhir.
- **Empty:** menjelaskan mengapa belum ada data dan aksi yang tersedia.
- **Error:** pesan yang dapat dipahami dan opsi mencoba ulang.
- **Forbidden:** tidak membocorkan rincian resource tenant lain; arahkan ke halaman aman.

## Responsiveness

- Sidebar berubah menjadi drawer pada layar kecil.
- Tabel menggunakan kolom prioritas, horizontal scroll terkontrol, atau tampilan kartu.
- Form dua kolom berubah menjadi satu kolom.
- Target sentuh minimal sekitar 44×44 piksel.
- Dialog besar berubah menjadi full-screen sheet pada perangkat kecil bila perlu.
- Aksi utama tetap mudah ditemukan tanpa menutupi konten.

## Aksesibilitas

- Seluruh interaksi dapat dijalankan menggunakan keyboard.
- Focus indicator terlihat jelas.
- Modal mengunci fokus dan mengembalikannya setelah ditutup.
- Gunakan elemen HTML semantik.
- Ikon tanpa teks memiliki accessible name.
- Status tidak bergantung pada warna saja.
- Kontras teks dan elemen interaktif mengikuti WCAG AA.
- Pesan validasi diumumkan kepada screen reader.
- Heading mengikuti urutan hierarkis.

## Struktur Folder yang Disarankan

```text
frontend/
├── public/
├── src/
│   ├── app/
│   │   ├── (public)/
│   │   ├── (auth)/
│   │   └── (portal)/
│   ├── features/
│   │   ├── tenants/
│   │   ├── members/
│   │   ├── governance/
│   │   ├── work-programs/
│   │   ├── finance/
│   │   ├── inventory/
│   │   └── messaging/
│   ├── services/
│   │   └── api-client.ts
│   ├── shared/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── lib/
│   ├── config/
│   └── styles/
└── tests/
```

## Pengujian Frontend

- Rendering menu untuk setiap peran.
- Validasi dan error state formulir.
- Filter, pagination, dan empty state.
- Konfirmasi aksi sensitif.
- Timeline workflow dan aksi status.
- Responsiveness pada ukuran mobile, tablet, dan desktop.
- Keyboard navigation dan focus management.
- E2E alur login, pengajuan akun, review, program kerja, dan pesan.

## Definition of Done Frontend

- Halaman mengikuti style guide.
- Loading, empty, error, dan forbidden state tersedia.
- Tampilan responsif dan dapat digunakan dengan keyboard.
- Form memiliki validasi client dan menangani error server.
- Menu dan aksi mengikuti permission dari sesi.
- Tidak ada data tenant lain pada HTML, cache, maupun state client.
- Test komponen atau E2E yang relevan lulus.
