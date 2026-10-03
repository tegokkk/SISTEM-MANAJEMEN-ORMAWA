# Database Specification

[Kembali ke README](../README.md) · [Struktur Proyek](PROJECT_STRUCTURE.md) · [Backend](BACKEND.md) · [Frontend](FRONTEND.md) · [Style Guide](STYLEGUIDE.md) · [Task List](TASK_LIST.md)

## Status Dokumen

Database target adalah **MySQL 8**. Baseline SQL hasil perancangan tersedia pada [`database/sim_ormawa_hmj.sql`](../database/sim_ormawa_hmj.sql). Skema tersebut tetap perlu direview bersama daftar master akademik resmi dan aturan institusi sebelum digunakan pada produksi.

## Tujuan Desain

- Mendukung banyak tenant dalam satu aplikasi.
- Menjaga isolasi data ORMAWA, HMJ, dan HIMA.
- Merepresentasikan hubungan HMJ sebagai tenant induk HIMA.
- Menyimpan histori kepengurusan dan workflow.
- Menjaga konsistensi transaksi keuangan.
- Mendukung audit log dan notifikasi.
- Menyediakan indeks yang sesuai untuk query dashboard dan daftar data.

## Model Multi-Tenant

Model awal menggunakan **shared database, shared schema**, dengan `tenant_id` pada seluruh tabel milik organisasi.

```text
tenants
├── ORMAWA (parent_tenant_id = NULL)
├── HMJ     (parent_tenant_id = NULL)
└── HIMA    (parent_tenant_id = tenant HMJ)
```

Keuntungan pendekatan ini:

- sesuai untuk banyak organisasi dengan struktur data serupa;
- migrasi dan pelaporan lebih sederhana;
- biaya operasional lebih rendah dibanding database terpisah per tenant.

Konsekuensinya, seluruh query wajib menerapkan tenant scope secara konsisten dan diuji terhadap IDOR/kebocoran lintas tenant.

## Entitas Konseptual

### Identitas dan tenant

| Entitas                           | Fungsi                                               |
| --------------------------------- | ---------------------------------------------------- |
| `tenants`                         | Identitas ORMAWA, HMJ, dan HIMA serta hubungan induk |
| `users`                           | Akun pengguna dan status autentikasi                 |
| `roles`                           | Definisi role sistem                                 |
| `user_tenants` atau `memberships` | Hubungan pengguna dengan tenant dan role             |
| `tenant_applications`             | Pengajuan, reviewer, status, dan catatan akun tenant |

### Master akademik

| Entitas          | Fungsi                                     |
| ---------------- | ------------------------------------------ |
| `departments`    | Master 8 jurusan                           |
| `study_programs` | Master 31 program studi dan relasi jurusan |

### Organisasi

| Entitas                    | Fungsi                                      |
| -------------------------- | ------------------------------------------- |
| `members`                  | Data anggota milik tenant                   |
| `periods`                  | Periode kepengurusan tenant                 |
| `positions`                | Definisi jabatan                            |
| `organization_assignments` | Penempatan anggota pada jabatan dan periode |

### Program kerja dan pengajuan

| Entitas                       | Fungsi                                 |
| ----------------------------- | -------------------------------------- |
| `work_programs`               | Data utama program kerja               |
| `work_program_status_history` | Histori status dan reviewer            |
| `proposals`                   | Metadata proposal dan versi file       |
| `requirement_requests`        | Pengajuan barang, jasa, atau fasilitas |
| `requirement_request_items`   | Rincian item kebutuhan                 |
| `finance_requests`            | Pengajuan dana program kerja           |
| `finance_request_items`       | Rincian anggaran                       |

### Sumber daya

| Entitas                  | Fungsi                                 |
| ------------------------ | -------------------------------------- |
| `inventory_items`        | Barang atau alat milik tenant          |
| `inventory_movements`    | Histori jumlah/kondisi bila diperlukan |
| `transaction_categories` | Kategori transaksi                     |
| `financial_transactions` | Pemasukan dan pengeluaran              |
| `file_attachments`       | Metadata file privat                   |

### Komunikasi dan sistem

| Entitas                     | Fungsi                                          |
| --------------------------- | ----------------------------------------------- |
| `conversations`             | Percakapan antara HMJ dan HIMA                  |
| `conversation_participants` | Peserta percakapan bila model generik digunakan |
| `messages`                  | Pesan dan status pengiriman                     |
| `message_reads`             | Status dibaca per pengguna bila diperlukan      |
| `notifications`             | Notifikasi pengguna atau tenant                 |
| `audit_logs`                | Jejak aktivitas penting                         |

## Struktur Konseptual Tenant

```text
tenants
- id
- type                  ORMAWA | HMJ | HIMA
- parent_tenant_id      nullable; wajib untuk HIMA
- department_id         nullable/required sesuai type
- study_program_id      hanya HIMA
- code
- name
- slug
- description
- logo_file_id
- status                PENDING | ACTIVE | REJECTED | SUSPENDED
- approved_at
- created_at
- updated_at
- deleted_at            jika soft delete digunakan
```

### Constraint tenant

- `type = HIMA` mewajibkan `parent_tenant_id`.
- Parent HIMA harus bertipe HMJ.
- Jurusan program studi HIMA harus sama dengan jurusan HMJ induk.
- `type = ORMAWA` dan `type = HMJ` tidak boleh memiliki parent.
- HMJ harus terhubung pada satu jurusan.
- HIMA harus terhubung pada satu program studi.
- Satu jurusan hanya memiliki satu HMJ aktif.
- Satu program studi hanya memiliki satu HIMA aktif jika aturan bisnis menetapkannya.
- `code` dan `slug` harus unik sesuai ruang lingkup yang dipilih.

MySQL tidak selalu dapat mengekspresikan constraint lintas tabel melalui `CHECK`. Aturan parent type dan kesesuaian jurusan perlu ditegakkan pada service transaction, serta dapat diperkuat dengan trigger hanya bila benar-benar dibutuhkan dan terdokumentasi.

## Hubungan Utama

```text
departments 1 ─── n study_programs
departments 1 ─── 0..1 tenant:HMJ
study_programs 1 ─── 0..1 tenant:HIMA
tenant:HMJ 1 ─── n tenant:HIMA

tenants 1 ─── n members
tenants 1 ─── n periods
periods 1 ─── n organization_assignments
members 1 ─── n organization_assignments
positions 1 ─── n organization_assignments

tenants 1 ─── n work_programs
work_programs 1 ─── n status_history
work_programs 1 ─── n proposals
work_programs 1 ─── n requirement_requests
work_programs 1 ─── n finance_requests

tenants 1 ─── n inventory_items
tenants 1 ─── n financial_transactions
tenant:HMJ n ─── n tenant:HIMA conversations (dibatasi relasi parent)
```

## Kolom Scope Tenant

Tabel berikut secara prinsip wajib memiliki `tenant_id` langsung:

- members;
- periods;
- positions jika jabatan dapat dikustomisasi per tenant;
- work_programs;
- requirement_requests;
- finance_requests;
- inventory_items;
- transaction_categories;
- financial_transactions;
- notifications yang ditujukan pada tenant;
- file_attachments bila file dimiliki tenant.

Child table boleh memperoleh tenant melalui parent untuk normalisasi, tetapi penambahan `tenant_id` terdenormalisasi dapat dipertimbangkan jika membantu keamanan/query. Jika digunakan, konsistensinya wajib dijaga melalui transaksi dan constraint yang memadai.

## Pengguna dan Keanggotaan

Dua model yang perlu dibandingkan dengan skema asli:

### Model satu pengguna satu tenant

`users.tenant_id` dan `users.role` langsung pada tabel pengguna. Lebih sederhana, tetapi sulit jika seseorang memiliki beberapa peran/tenant.

### Model membership

```text
users 1 ─── n memberships n ─── 1 tenants
roles 1 ─── n memberships
```

Model membership lebih fleksibel untuk perubahan periode dan pengguna yang memiliki hubungan dengan lebih dari satu tenant. Sesi harus memilih konteks tenant aktif dan server wajib memvalidasi membership tersebut.

Keputusan final mengikuti skema MySQL dan aturan kampus.

## Periode dan Struktur Organisasi

- Satu tenant hanya memiliki satu periode aktif.
- Assignment menyimpan `period_id`, `member_id`, `position_id`, waktu mulai/selesai, dan status.
- Data periode lama tidak dihapus ketika periode baru dibuat.
- Perubahan nama jabatan tidak boleh mengubah histori secara tidak sengaja; gunakan snapshot nama atau versioning bila diperlukan.
- Unique constraint harus mencegah assignment ganda yang tidak sah.

## Program Kerja dan Histori Status

`work_programs.status` menyimpan status terkini untuk query cepat. Setiap perubahan juga menambah record pada tabel histori:

```text
work_program_status_history
- id
- work_program_id
- from_status
- to_status
- actor_user_id
- actor_tenant_id
- reviewer_note
- created_at
```

Pembaruan status utama dan penambahan histori harus dilakukan dalam satu transaksi.

## Keuangan

- Gunakan `DECIMAL`, bukan `FLOAT` atau `DOUBLE`, untuk nilai uang.
- Simpan mata uang jika sistem dapat berkembang lebih dari satu mata uang.
- Nominal pengajuan dan nominal disetujui disimpan terpisah.
- Pemasukan dan pengeluaran dapat menggunakan satu tabel dengan kolom `type`, atau tabel terpisah jika skema asli demikian.
- Saldo sebaiknya dihitung dari transaksi valid. Jika disimpan sebagai cache, perubahan harus atomik dan dapat direkonsiliasi.
- Transaksi yang telah dipakai untuk laporan tidak dihapus fisik; gunakan pembatalan/reversal bila sesuai.
- Bukti transaksi disimpan sebagai attachment privat.

## Inventaris

- Kode inventaris unik minimal dalam scope tenant.
- Jumlah tidak boleh negatif.
- Kondisi menggunakan master/enum konsisten.
- Perubahan stok penting dapat disimpan sebagai movement agar dapat diaudit.
- Item yang pernah digunakan tidak dihapus fisik; tandai nonaktif atau arsipkan.

## Pesan HMJ–HIMA

Percakapan harus menyimpan kedua tenant atau peserta secara eksplisit. Pada saat membuat percakapan, server memastikan:

```text
hima.parent_tenant_id = hmj.id
hima.type = HIMA
hmj.type = HMJ
```

Tambahkan unique constraint untuk mencegah percakapan duplikat jika satu pasangan hanya boleh memiliki satu thread. Bila ada percakapan per topik, gunakan kombinasi pasangan tenant dan topik/status.

## Audit Log

Struktur minimal:

```text
audit_logs
- id
- actor_user_id
- actor_tenant_id
- action
- object_type
- object_id
- object_tenant_id
- request_id
- sanitized_metadata_json
- ip_hash atau ip_address sesuai kebijakan privasi
- created_at
```

- Audit bersifat append-only dari sisi aplikasi.
- Metadata tidak menyimpan password, token, secret, atau file.
- Indeks disiapkan untuk pencarian berdasarkan aktor, tenant, objek, aksi, dan waktu.
- Retention policy ditentukan bersama institusi.

## Notifikasi

Notifikasi minimal menghubungkan:

- penerima pengguna atau tenant;
- jenis event;
- resource tujuan;
- judul dan ringkasan;
- waktu dibuat;
- waktu dibaca.

Resource tujuan harus divalidasi ulang ketika pengguna membuka notifikasi karena izin dapat berubah setelah notifikasi dibuat.

## Strategi ID

Pilihan yang dapat digunakan:

- `BIGINT UNSIGNED` auto-increment untuk performa dan kesederhanaan internal;
- UUID/ULID untuk ID yang terekspos publik dan sulit ditebak.

Jika tetap memakai auto-increment pada URL, backend wajib melindungi dari IDOR. Opaque ID bukan pengganti otorisasi tenant.

## Indeks Awal

Indeks final dibuat berdasarkan query nyata dan `EXPLAIN`, tetapi kandidat awal meliputi:

```text
tenants(type, status)
tenants(parent_tenant_id, status)
members(tenant_id, status)
members(tenant_id, student_number)
periods(tenant_id, is_active)
work_programs(tenant_id, status, start_date)
requirement_requests(tenant_id, status, created_at)
finance_requests(tenant_id, status, created_at)
inventory_items(tenant_id, status)
financial_transactions(tenant_id, transaction_date, type)
messages(conversation_id, created_at)
notifications(user_id, read_at, created_at)
audit_logs(object_tenant_id, created_at)
```

Foreign key columns harus memiliki indeks yang memadai. Hindari menambah indeks pada semua kolom tanpa pengukuran karena memperlambat operasi tulis.

## Constraint dan Integritas

- Gunakan foreign key untuk relasi inti jika skema dan deployment mendukung.
- Tentukan `ON DELETE` secara eksplisit; hindari cascade pada keuangan dan audit.
- Gunakan unique constraint untuk identitas bisnis yang benar-benar unik.
- Timestamp menggunakan strategi timezone yang konsisten, disarankan UTC di database.
- Gunakan `NOT NULL` ketika data wajib secara bisnis.
- Enum database dibandingkan dengan lookup table berdasarkan frekuensi perubahan.
- Gunakan transaksi pada operasi multi-tabel.

## Soft Delete dan Arsip

Soft delete dipertimbangkan untuk tenant, anggota, program, inventaris, dan data yang memiliki histori. Query normal harus mengecualikan data yang dihapus. Audit log dan transaksi keuangan tidak dihapus melalui fitur normal.

Soft delete bukan solusi universal. Data sementara tanpa relasi dapat dihapus fisik jika kebijakan mengizinkan.

## Migration dan Seed

- Migrasi memiliki urutan, dapat direproduksi, dan masuk version control.
- Jangan mengubah migrasi yang sudah dipakai di produksi; buat migrasi baru.
- Seed master berisi 8 jurusan dan 31 program studi dari sumber resmi.
- Seed akun demo dipisahkan dari seed produksi.
- Backup dibuat sebelum migrasi produksi.
- Setiap migrasi memiliki rencana rollback atau prosedur pemulihan.

## Backup dan Restore

- Tentukan jadwal backup penuh dan incremental/binlog sesuai kebutuhan.
- Enkripsi backup dan batasi aksesnya.
- Uji restore secara berkala; backup yang belum pernah diuji belum dapat dianggap andal.
- Dokumentasikan target RPO dan RTO.
- File storage dan database dibackup secara konsisten.

## Audit Skema MySQL yang Diberikan

Ketika file `.sql` tersedia, lakukan langkah berikut:

1. Inventaris seluruh tabel, view, trigger, procedure, dan seed.
2. Catat primary key, foreign key, unique constraint, enum, dan nullable column.
3. Petakan setiap tabel ke modul aplikasi.
4. Temukan tabel yang belum memiliki tenant scope.
5. Periksa hubungan jurusan, prodi, HMJ, dan HIMA.
6. Periksa model akun, role, dan approval.
7. Periksa konsistensi tipe uang, tanggal, dan status.
8. Identifikasi indeks yang hilang atau berlebihan.
9. Buat mapping skema-ke-model ORM tanpa mengubah database lebih dulu.
10. Susun daftar perubahan skema dan minta validasi sebelum migrasi.

## Pengujian Database

- Foreign key menolak relasi yang tidak valid.
- Unique constraint mencegah duplikasi.
- Satu tenant tidak dapat mengambil record tenant lain melalui repository.
- Transaksi rollback pada kegagalan parsial.
- Histori status selalu sesuai status utama.
- Saldo dapat direkonsiliasi dari transaksi.
- Indeks digunakan untuk query daftar dan dashboard utama.
- Migrasi dapat diterapkan pada database kosong dan salinan staging.

## Definition of Done Database

- Skema asli telah dipetakan dan terdokumentasi.
- Semua tabel domain memiliki scope tenant yang jelas.
- Relasi HMJ–HIMA memiliki constraint dan validasi service.
- Foreign key, unique constraint, dan indeks telah ditinjau.
- Migrasi serta seed dapat dijalankan ulang.
- Backup dan restore telah diuji pada lingkungan nonproduksi.
- Test isolasi tenant dan integritas transaksi lulus.
