# Keamanan dan Operasional

[Kembali ke README](../README.md) · [Backend](BACKEND.md) · [Task List](TASK_LIST.md)

## Threat Model Ringkas

| Area | Ancaman utama | Kontrol yang diterapkan |
|---|---|---|
| Sesi | pencurian/fiksasi sesi, brute force | token acak ter-hash, cookie HttpOnly/SameSite, expiry/revoke, rate limit |
| Multi-tenant | IDOR dan perubahan tenant ID | tenant dari sesi, query selalu membawa scope tenant, relasi HMJ–HIMA divalidasi server |
| Workflow | transisi atau approval tidak sah | allowlist transisi, role guard, transaksi database, audit log |
| Input/API | injection, XSS tersimpan, payload berlebih | Zod allowlist, Prisma parameterized query, React escaping, batas JSON 1 MB |
| CSRF/CORS | mutasi lintas origin | validasi Origin untuk metode mutasi, CORS origin tunggal, SameSite cookie |
| File | path traversal, malware, akses dokumen lintas tenant | storage privat, nama acak, validasi signature/ukuran, download melalui endpoint berotorisasi; pemindaian malware otomatis belum tersedia |
| Secret/log | kebocoran kredensial dan token | environment variable, redaksi logger, respons error generik, audit tidak menyimpan secret |

## Event Notifikasi

Event berikut merupakan sumber notifikasi domain yang didukung aplikasi:

| Event | Penerima | Pemicu |
|---|---|---|
| `TENANT_APPLICATION_APPROVED` | pemohon | akun ORMAWA/HMJ/HIMA disetujui |
| `TENANT_APPLICATION_REJECTED` | pemohon | pengajuan ditolak |
| `TENANT_APPLICATION_REVISION_REQUESTED` | pemohon | reviewer meminta revisi |
| `WORK_PROGRAM_APPROVED/REJECTED/REVISION_REQUESTED` | pembuat program | keputusan reviewer program kerja |
| `REQUIREMENT_APPROVED/REJECTED/REVISION_REQUESTED` | pembuat pengajuan | keputusan pengajuan kebutuhan |
| `FINANCE_REQUEST_APPROVED/REJECTED/REVISION_REQUESTED` | pembuat pengajuan | keputusan pengajuan dana |
| `MESSAGE_RECEIVED` | pengguna tenant lawan bicara | pesan HMJ–HIMA baru |

Setiap target notifikasi tetap melewati autentikasi dan otorisasi resource ketika dibuka; URL notifikasi bukan bukti hak akses.

## Retention Policy

Default operasional berikut berlaku sampai institusi menetapkan kebijakan lain:

- audit log: 2 tahun, lalu arsip terenkripsi atau hapus terkontrol;
- notifikasi telah dibaca: 90 hari;
- notifikasi belum dibaca: 180 hari;
- token reset password: hapus maksimal 24 jam setelah digunakan atau kedaluwarsa;
- sesi revoked/kedaluwarsa: hapus setelah 30 hari;
- proposal dan bukti transaksi: mengikuti masa retensi dokumen organisasi, minimal 2 tahun setelah periode berakhir.

Penghapusan dijalankan sebagai maintenance job terjadwal, dicatat, dan tidak boleh menghapus audit yang sedang dibutuhkan untuk investigasi.

## Audit Dependency dan Secret

Jalankan sebelum release dan setelah pembaruan dependency:

```bash
pnpm audit --prod
rg -n --hidden -g '!node_modules/**' -g '!.next/**' 'PRIVATE KEY|sk-|AKIA|mysql://' .
```

Audit terakhir pada 25 September 2026: tidak ada advisory dependency yang diketahui setelah override `deepmerge-ts >= 8`; temuan pola koneksi hanya nilai development/contoh. Secret production wajib disimpan pada secret manager platform, bukan repository.

## Prosedur Penanganan Insiden

1. Catat waktu, pelapor, sistem terdampak, dan request ID; jangan mengubah bukti asli.
2. Klasifikasikan dampak: akses lintas tenant, kredensial, integritas keuangan, file privat, atau availability.
3. Batasi insiden: revoke sesi/token, nonaktifkan akun atau tenant terdampak, rotasi secret, dan hentikan endpoint hanya bila perlu.
4. Simpan log aplikasi, audit log, konfigurasi, dan snapshot database secara read-only dengan akses terbatas.
5. Perbaiki akar masalah, tambahkan regression test, jalankan `pnpm check`, audit dependency, dan smoke test.
6. Pulihkan layanan bertahap dan verifikasi isolasi tenant serta rekonsiliasi data.
7. Beri tahu pemilik sistem dan pihak terdampak sesuai kebijakan institusi; jangan mengirim data sensitif melalui kanal umum.
8. Buat postmortem berisi penyebab, dampak, timeline, tindakan, dan pencegahan tanpa menyalahkan individu.

Kontak insiden, SLA, dan kewajiban notifikasi hukum harus ditetapkan oleh institusi sebelum production.
