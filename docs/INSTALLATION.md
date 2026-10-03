# Instalasi dan Konfigurasi

[Kembali ke README](../README.md) · [Task List](TASK_LIST.md)

## Prasyarat

- Node.js 20 atau lebih baru;
- pnpm 9 atau lebih baru;
- MySQL 8;
- Git (opsional untuk mengambil source code).

## Menjalankan Secara Lokal

1. Instal dependency dari root proyek:

   ```bash
   pnpm install
   ```

2. Salin file environment:

   ```powershell
   Copy-Item backend/.env.example backend/.env
   Copy-Item frontend/.env.example frontend/.env.local
   ```

3. Ubah `DATABASE_URL` dan buat `SESSION_SECRET` acak minimal 16 karakter pada `backend/.env`. Untuk production, aktifkan `COOKIE_SECURE=true` dan gunakan HTTPS.

4. Buat database `sim_ormawa_hmj`, lalu impor [`database/sim_ormawa_hmj.sql`](../database/sim_ormawa_hmj.sql). Contoh melalui Command Prompt atau Bash:

   ```bash
   mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS sim_ormawa_hmj CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
   mysql -u root -p sim_ormawa_hmj < database/sim_ormawa_hmj.sql
   ```

5. Generate Prisma Client dan isi data awal:

   ```bash
   pnpm --filter backend db:generate
   pnpm --filter backend db:seed
   ```

6. Jalankan frontend dan backend:

   ```bash
   pnpm dev
   ```

Frontend tersedia di `http://localhost:3000`, API di `http://localhost:4000/api/v1`, liveness di `http://localhost:4000/health`, dan readiness database di `http://localhost:4000/health/ready`.

## Akun Development

| Peran | Email | Password |
|---|---|---|
| Super Admin | `admin@polinela.ac.id` | `password123` |
| Admin ORMAWA | `bem@polinela.ac.id` | `password123` |
| Admin HMJ | `hmjpangan@polinela.ac.id` | `password123` |
| Admin HIMA | `hima.demo@example.test` | `password123` |

Seed juga membuat periode, anggota, dan satu program kerja fiktif pada tenant demo. Kredensial serta data ini hanya untuk development; script seed menolak `NODE_ENV=production`. Akun wajib diganti atau dihapus sebelum deployment.

## Menjalankan dengan Docker

Docker Compose sudah memuat frontend, backend, MySQL, volume upload, dan reverse proxy Nginx:

```bash
docker compose up --build
```

Aplikasi tersedia di `http://localhost:8080`. Nilai secret dan password pada `docker-compose.yml` hanya untuk development; gunakan secret platform pada staging/production.

## Validasi Sebelum Commit

```bash
pnpm check
pnpm test:e2e
```

`pnpm check` menjalankan lint, typecheck, unit/component test, dan build produksi. E2E memerlukan browser Playwright yang telah terpasang.

## Masalah Umum

- API gagal start: periksa `backend/.env` dan koneksi MySQL.
- Readiness `503`: database belum siap atau `DATABASE_URL` salah.
- Cookie login tidak tersimpan: samakan origin dengan `FRONTEND_URL`; pada production gunakan HTTPS dan `COOKIE_SECURE=true`.
- Prisma Client tidak sinkron: jalankan kembali `pnpm --filter backend db:generate`.
