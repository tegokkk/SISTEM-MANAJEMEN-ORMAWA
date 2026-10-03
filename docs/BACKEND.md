# Backend Specification

[Kembali ke README](../README.md) · [Struktur Proyek](PROJECT_STRUCTURE.md) · [Frontend](FRONTEND.md) · [Style Guide](STYLEGUIDE.md) · [Database](DATABASE.md) · [Task List](TASK_LIST.md)

## Tujuan

Backend bertanggung jawab atas autentikasi, otorisasi, isolasi tenant, validasi aturan bisnis, transaksi database, workflow persetujuan, pengelolaan file privat, notifikasi, dan audit log. Pemeriksaan pada frontend tidak boleh dianggap sebagai pengamanan akses.

## Teknologi Awal

- Node.js dan Express dengan TypeScript.
- REST API versioned di bawah `/api/v1` sebagai transport layer.
- Service layer untuk aturan bisnis.
- Prisma ORM dengan provider MySQL.
- Zod untuk validasi payload dan environment variable.
- Sesi server berbasis cookie `HttpOnly` dengan penyimpanan sesi di database.
- Argon2id atau bcrypt untuk hashing kata sandi jika kredensial dikelola sendiri.
- Vitest/Jest untuk unit dan integration test.
- Playwright untuk pengujian end-to-end.

Versi dan paket final ditetapkan ketika proyek mulai dibuat dan harus dikunci melalui lockfile.

## Arsitektur

```text
HTTP Request
    ↓
Express Route
    ↓
Controller
    ↓
Authentication Guard
    ↓
Authorization + Tenant Guard
    ↓
Validation
    ↓
Service Layer
    ↓
Repository / Prisma
    ↓
MySQL

Service Layer ──→ Audit Log
              ├─→ Notification
              └─→ Private File Storage
```

### Pembagian tanggung jawab

| Lapisan        | Tanggung jawab                                                                 |
| -------------- | ------------------------------------------------------------------------------ |
| Transport      | Menerima request, membaca parameter, memanggil service, dan memformat response |
| Guard          | Memastikan sesi, peran, tenant, status akun, dan relasi organisasi valid       |
| Validation     | Memvalidasi tipe, format, panjang, nilai, dan kombinasi field                  |
| Service        | Menjalankan aturan bisnis, workflow, transaksi, audit, dan notifikasi          |
| Repository     | Melakukan query yang selalu memiliki scope tenant                              |
| Infrastructure | Database, file storage, logger, email/notifikasi, dan konfigurasi              |

Route dan controller tidak boleh berisi query bisnis kompleks. Repository juga tidak boleh menentukan aturan peran; keputusan akses berada pada guard, policy, dan service.

## Authentication Context

Sesi server minimal membawa identitas berikut:

```ts
type AuthContext = {
  userId: string;
  role: "SUPER_ADMIN" | "TENANT_ADMIN" | "OFFICER" | "MEMBER";
  tenantId: string | null;
  tenantType: "ORMAWA" | "HMJ" | "HIMA" | null;
  parentTenantId: string | null;
  tenantStatus: "PENDING" | "ACTIVE" | "REJECTED" | "SUSPENDED" | null;
};
```

Nama enum harus disesuaikan dengan skema MySQL asli. `tenantId` dari body, query string, maupun URL tidak boleh menggantikan tenant pada sesi tanpa pemeriksaan otorisasi eksplisit.

## Aturan Otorisasi

### Super Admin

- Memproses pengajuan ORMAWA dan HMJ.
- Mengelola master jurusan dan program studi.
- Memonitor tenant sesuai fungsi sistem.
- Tidak membaca percakapan privat HMJ–HIMA secara default.
- Setiap tindakan lintas tenant yang sensitif wajib tercatat.

### ORMAWA

- Hanya dapat menjalankan CRUD pada data dengan `tenant_id` sendiri.
- Tidak dapat mengakses data ORMAWA, HMJ, atau HIMA lain.
- Tidak mempunyai relasi parent-child dengan HMJ/HIMA.

### HMJ

- Mengelola data internal dengan `tenant_id` sendiri.
- Dapat membaca atau meninjau data tertentu dari HIMA dengan `parent_tenant_id = tenantId HMJ`.
- Dapat memproses pendaftaran HIMA anak.
- Tidak boleh mengubah data internal HIMA kecuali aksi tersebut didefinisikan sebagai review/persetujuan.

### HIMA

- Hanya mengelola data dengan `tenant_id` sendiri.
- Hanya berkomunikasi dan mengirim pengajuan kepada HMJ induknya.
- Tidak dapat membaca HIMA lain meskipun berada pada HMJ yang sama.

## Pola Tenant Scope

Semua repository tenant harus menerima konteks yang sudah tervalidasi.

```ts
await programRepository.findMany({
  tenantId: auth.tenantId,
  filters,
});
```

Pola yang harus dihindari:

```ts
// Berbahaya bila tenantId langsung berasal dari request pengguna.
await prisma.program.findMany({ where: { tenantId: input.tenantId } });
```

Akses HMJ terhadap data HIMA harus menggunakan fungsi eksplisit, misalnya `findHimaProgramForParentReview`, yang sekaligus memeriksa relasi induk.

## Modul Backend

| Modul                  | Service utama                                  | Catatan otorisasi                          |
| ---------------------- | ---------------------------------------------- | ------------------------------------------ |
| Auth                   | login, logout, refresh/session, password reset | Validasi status akun dan tenant            |
| Tenant registration    | create, submit, revise, approve, reject        | Reviewer ditentukan dari jenis tenant      |
| Member                 | list, detail, create, update, deactivate       | Scope tenant sendiri                       |
| Period/position        | CRUD periode, jabatan, assignment              | Satu periode aktif per tenant              |
| Organization structure | struktur per periode                           | Histori periode tidak ditimpa              |
| Work program           | CRUD, submit, review, start, finish, cancel    | Transisi status dan reviewer tervalidasi   |
| Proposal               | upload, version, download, review              | File privat dan scope tenant               |
| Requirement request    | create, submit, revise, review                 | HIMA hanya ke HMJ induk                    |
| Finance request        | detail anggaran dan keputusan                  | Nominal diajukan dan disetujui dipisahkan  |
| Inventory              | CRUD item, condition, stock movement           | Scope tenant dan histori perubahan         |
| Transaction            | income, expense, attachment, report            | Gunakan transaksi DB untuk perubahan saldo |
| Messaging              | conversation, message, read status             | Hanya pasangan HMJ–HIMA yang valid         |
| Academic master        | department dan study program                   | Hanya role berwenang yang mengubah         |
| Notification           | create, list, mark as read                     | Penerima dihitung pada server              |
| Audit                  | append log dan query terbatas                  | Log bersifat append-only secara aplikasi   |

## Workflow Status

### Pengajuan tenant

```text
DRAFT → SUBMITTED → APPROVED
                  ├→ REVISION_REQUESTED → SUBMITTED
                  └→ REJECTED
```

- ORMAWA/HMJ direview oleh Super Admin.
- HIMA direview oleh HMJ induk yang valid.
- Persetujuan mengaktifkan tenant dan akun awal dalam satu transaksi bila skema mendukung.
- Revisi atau penolakan wajib memiliki catatan.

### Program kerja

```text
DRAFT → SUBMITTED → APPROVED → RUNNING → COMPLETED
                  ├→ REVISION_REQUESTED → SUBMITTED
                  └→ REJECTED

DRAFT / APPROVED → CANCELLED, jika aturan bisnis mengizinkan
```

Status tidak boleh diperbarui menggunakan endpoint CRUD umum. Gunakan command khusus seperti `/submit`, `/approve`, `/request-revision`, `/start`, dan `/complete`.

## Kontrak API

Gunakan pola response yang konsisten:

```json
{
  "data": {},
  "meta": {},
  "error": null
}
```

Respons gagal:

```json
{
  "data": null,
  "error": {
    "code": "FORBIDDEN_TENANT_ACCESS",
    "message": "Anda tidak memiliki akses ke data ini.",
    "fields": null
  }
}
```

Status HTTP yang digunakan:

- `200` untuk operasi baca/perubahan berhasil.
- `201` untuk data baru.
- `204` untuk operasi tanpa response body.
- `400` untuk payload tidak valid.
- `401` untuk sesi tidak ada atau tidak valid.
- `403` untuk aksi yang diketahui tetapi tidak diizinkan.
- `404` untuk resource tidak ditemukan atau disamarkan demi mencegah enumerasi tenant.
- `409` untuk konflik data atau transisi status.
- `422` untuk aturan bisnis yang tidak terpenuhi bila diperlukan.
- `429` untuk rate limit.

## Validasi

- Trim string dan normalisasi data sebelum disimpan.
- Gunakan decimal database untuk uang; jangan memakai floating point.
- Validasi tanggal mulai tidak melewati tanggal selesai.
- Pastikan jurusan prodi HIMA sama dengan jurusan HMJ induk.
- Pastikan parent HIMA bertipe HMJ dan berstatus aktif.
- Cegah duplikasi kode organisasi, NIM, email, atau kode inventaris sesuai constraint skema.
- Batasi pagination, ukuran pencarian, ukuran payload, serta unggahan file.
- Validasi MIME type, ekstensi, ukuran, dan nama file pada server.

## File Privat

- Simpan metadata file pada database dan konten pada storage privat.
- Gunakan ID acak, bukan nama asli sebagai storage key.
- Download harus melalui pemeriksaan autentikasi dan tenant scope.
- Signed URL harus berumur pendek dan dibuat setelah otorisasi.
- Jangan menyimpan file unggahan langsung pada direktori publik.

## Audit Log

Audit minimal memuat:

- ID aktor dan tenant aktor.
- Nama aksi.
- Jenis dan ID objek.
- Tenant pemilik objek.
- Waktu dan request/correlation ID.
- Ringkasan perubahan yang telah disanitasi.

Audit tidak boleh menyimpan password, token sesi, secret, isi file, atau data pribadi yang tidak diperlukan.

## Notifikasi

Notifikasi dibuat dari event domain, misalnya:

- tenant submitted/approved/rejected/revision requested;
- program submitted/reviewed/status changed;
- finance request reviewed;
- message received;
- account or role changed.

Penerima harus dihitung dari relasi database pada server. Client tidak boleh menentukan penerima bebas.

## Keamanan

- Lindungi dari SQL injection melalui parameter binding ORM.
- Escape output dan gunakan Content Security Policy untuk mengurangi XSS.
- Terapkan CSRF protection pada operasi yang menggunakan cookie sesi.
- Terapkan rate limit pada login, reset password, upload, dan endpoint sensitif.
- Gunakan cookie `HttpOnly`, `Secure` pada produksi, dan `SameSite` yang sesuai.
- Jangan membocorkan keberadaan data tenant lain melalui pesan error.
- Simpan secret hanya pada environment variable dan jangan commit `.env`.
- Gunakan transaksi untuk persetujuan, pencatatan keuangan, dan operasi multi-tabel.

## Struktur Folder yang Disarankan

```text
backend/
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed/
├── src/
│   ├── app.ts
│   ├── server.ts
│   ├── config/
│   ├── core/
│   │   ├── auth/
│   │   ├── authorization/
│   │   ├── database/
│   │   ├── errors/
│   │   ├── audit/
│   │   ├── notifications/
│   │   └── storage/
│   ├── middleware/
│   ├── modules/
│   ├── routes/
│   └── shared/
└── tests/
    ├── unit/
    └── integration/
```

## Konfigurasi Environment Awal

```env
DATABASE_URL=
SESSION_SECRET=
PORT=4000
FRONTEND_URL=http://localhost:3000
FILE_STORAGE_DRIVER=
FILE_STORAGE_BUCKET=
MAX_UPLOAD_SIZE_MB=
```

Gunakan `.env.example` tanpa nilai rahasia. Nama final menyesuaikan library dan lingkungan deployment.

## Strategi Pengujian

### Unit test

- Policy akses per role dan tipe tenant.
- Transisi status workflow.
- Validasi jurusan HMJ–HIMA.
- Perhitungan saldo dan ringkasan.

### Integration test

- Query selalu terfilter tenant.
- Persetujuan membuat audit dan notifikasi.
- Transaksi rollback jika salah satu operasi gagal.
- Download file ditolak untuk tenant lain.

### Security/E2E test

- ORMAWA A tidak dapat membuka resource ORMAWA B.
- HMJ A tidak dapat membuka HMJ B.
- HIMA A tidak dapat membuka HIMA B.
- HIMA tidak dapat menghubungi HMJ selain induknya.
- HMJ tidak dapat mereview HIMA milik HMJ lain.
- Tenant nonaktif tidak dapat menggunakan dashboard operasional.

## Definition of Done Backend

- Endpoint memiliki schema validasi.
- Autentikasi dan policy otorisasi diuji.
- Semua query tenant menggunakan scope yang benar.
- Error response konsisten dan tidak membocorkan data.
- Operasi penting membuat audit log.
- Event relevan membuat notifikasi.
- Unit/integration test lulus.
- Dokumentasi kontrak API diperbarui.
