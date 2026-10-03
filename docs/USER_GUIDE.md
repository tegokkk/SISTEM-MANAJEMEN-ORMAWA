# Panduan Pengguna SIM ORMAWA & HMJ

[Kembali ke README](../README.md) · [Instalasi](INSTALLATION.md) · [Task List](TASK_LIST.md)

## Masuk ke Portal

1. Buka `/login`, isi email dan kata sandi, lalu pilih **Masuk**.
2. Akun dengan satu tenant langsung memakai tenant tersebut. Jika akun memiliki beberapa tenant, pilih tenant aktif sebelum membuka modul operasional.
3. Menu yang tampil mengikuti peran dan tenant aktif. Keluar melalui menu akun setelah selesai, terutama di komputer bersama.

Untuk data demo lokal, jalankan `pnpm --filter backend db:seed` setelah impor skema SQL. Akun dan kata sandi contoh ada pada [panduan instalasi](INSTALLATION.md#akun-development). Jangan gunakan data demo di production.

## Pengajuan Akun Organisasi

- Dari landing page pilih **Daftar**, kemudian pilih ORMAWA, HMJ, atau HIMA.
- ORMAWA dan HMJ diperiksa Super Admin. HIMA diperiksa HMJ pada jurusan induknya.
- Setelah mengisi formulir, kirim pengajuan dan pantau hasilnya di **Status pengajuan**.
- Bila diminta revisi, perbaiki data sesuai catatan reviewer lalu ajukan kembali. Akun baru dapat memakai dashboard ketika tenant disetujui dan aktif.

## Super Admin

- **Dashboard** menampilkan jumlah tenant aktif, pengajuan menunggu, pengguna aktif, dan aktivitas audit 24 jam.
- **Pengajuan akun** dipakai untuk menyetujui, menolak, atau meminta revisi akun ORMAWA/HMJ.
- **Master tenant** menampilkan organisasi, jenis, afiliasi, jumlah anggota/akun, dan status. Gunakan pencarian serta filter untuk mempersempit daftar.
- **Audit log** menampilkan jejak tindakan penting. Data ini digunakan untuk penelusuran, bukan sebagai pengganti backup.

## Admin ORMAWA, HMJ, dan HIMA

### Organisasi dan Anggota

Di **Organisasi**, buat periode, jabatan, dan susunan pengurus. Di **Anggota**, tambahkan atau ubah data anggota. Anggota yang dinonaktifkan tidak lagi termasuk ringkasan anggota aktif. Pilih periode dan anggota dari tenant yang sama ketika menyusun struktur.
Struktur periode aktif dapat diunduh sebagai CSV melalui tombol **Ekspor CSV**. File berisi nama dan nomor anggota, jadi simpan sesuai kebijakan data pribadi institusi.

### Program Kerja

1. Buat program kerja sebagai draf, isi periode, jadwal, penanggung jawab, dan anggaran.
2. Pilih **Ajukan** untuk mengirim draf. Program HIMA dikirim ke HMJ induk; HMJ membuka **Antrian review HIMA**.
3. Reviewer dapat menyetujui, menolak, atau meminta revisi. Catatan wajib untuk penolakan dan revisi.
4. Program yang disetujui dapat ditandai **Mulai**, lalu **Selesai**. Gunakan tombol riwayat untuk melihat perubahan status.
5. Buka ikon **Proposal** pada program. Pemilik dapat mengunggah versi baru ketika status masih draf atau perlu revisi. Reviewer HMJ dapat mengunduh versi yang dikirim HIMA.

### Pengajuan Kebutuhan dan Dana

- Buat draf berisi rincian item, jumlah, satuan, dan perkiraan harga. Pengajuan dana harus terkait program kerja.
- Periksa total, lalu pilih **Kirim**. HIMA mengirim ke HMJ induk.
- HMJ melihat pengajuan HIMA pada **Antrian review**. Nominal disetujui dicatat terpisah dari nominal diajukan.
- Jika diminta revisi, edit draf yang dikembalikan dan kirim lagi.
- Draf kebutuhan yang tidak jadi dipakai dapat **Dibatalkan**. Riwayat keputusan tetap tersimpan.

### Keuangan

- Tambahkan kategori pemasukan atau pengeluaran, kemudian catat transaksi sebagai draf.
- Periksa tanggal, kategori, nominal, dan kaitan program kerja sebelum **Posting**. Hanya transaksi berstatus POSTED masuk saldo.
- Transaksi POSTED yang salah dapat dibatalkan menjadi VOID dengan alasan. Histori transaksi tetap tersimpan.
- Gunakan filter jenis, kategori, program kerja, dan rentang tanggal untuk menelusuri transaksi.
- Gunakan **Unggah bukti** untuk melampirkan satu berkas pada transaksi. Bukti hanya dapat diunduh oleh tenant pemilik transaksi.
- Panel laporan menampilkan pemasukan, pengeluaran, saldo, dan rincian kategori untuk transaksi POSTED sesuai filter. **Ekspor CSV** mengunduh transaksi POSTED yang sama; jika lebih dari 10.000 baris, persempit filter tanggal.

### Inventaris

- Tambahkan item dengan kode unik dalam tenant, stok awal, kondisi, lokasi, dan stok minimum.
- Gunakan **Stok** untuk mencatat masuk, keluar, rusak, hilang, atau penyesuaian. Stok tidak boleh menjadi negatif.
- Pengarsipan menyembunyikan item dari daftar aktif tanpa menghapus histori stok dan audit.

### Pesan dan Notifikasi

- Pesan hanya tersedia antara HMJ dan HIMA di bawahnya. Pilih percakapan yang tersedia atau mulai percakapan dengan pasangan yang sah.
- Notifikasi keputusan dan pesan masuk berada di **Notifikasi**. Saat memilih **Buka**, sistem memeriksa ulang hak akses terhadap objek terkait; pilih tenant penerima jika diminta.

## Batasan dan Bantuan

- Setiap organisasi hanya melihat data tenant sendiri, kecuali review HIMA yang secara khusus diberikan kepada HMJ induk.
- Jika daftar kosong, periksa tenant aktif, filter, serta status data.
- Jika operasi gagal, baca pesan pada halaman. Masuk kembali jika sesi telah berakhir.
- Unggahan menerima PDF, PNG, atau JPEG maksimal sesuai `MAX_UPLOAD_SIZE_MB` (default 10 MB). Berkas tersimpan di lokasi privat dan diunduh sebagai lampiran. Pemindaian malware otomatis belum tersedia; jangan unggah berkas dari sumber tidak tepercaya.
- Ekspor laporan serta backup production masih dalam backlog; lihat [Task List](TASK_LIST.md) sebelum menggunakan aplikasi untuk operasional nyata.
