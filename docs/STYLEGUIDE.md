# UI Style Guide

[Kembali ke README](../README.md) · [Struktur Proyek](PROJECT_STRUCTURE.md) · [Backend](BACKEND.md) · [Frontend](FRONTEND.md) · [Database](DATABASE.md) · [Task List](TASK_LIST.md)

## Arah Visual

Antarmuka menggunakan karakter **institusional, modern, bersih, dan terpercaya**. Landing page memakai utility bar hijau, navbar putih, serta tombol portal kuning. Dashboard mempertahankan identitas tersebut dengan penggunaan warna yang lebih terkontrol agar data tetap mudah dibaca.

Style guide ini merupakan baseline. Warna final perlu disesuaikan dengan identitas resmi institusi setelah logo dan pedoman merek tersedia.

## Design Tokens

### Warna merek

| Token        | Nilai awal | Penggunaan                                |
| ------------ | ---------- | ----------------------------------------- |
| `brand-50`   | `#ECFDF3`  | Latar hijau sangat muda                   |
| `brand-100`  | `#D1FAE0`  | Hover ringan dan highlight                |
| `brand-500`  | `#16834B`  | Elemen merek sekunder                     |
| `brand-600`  | `#0F6B3C`  | Warna utama                               |
| `brand-700`  | `#0B5430`  | Hover tombol utama                        |
| `brand-900`  | `#07351F`  | Utility bar atau teks hijau gelap         |
| `accent-400` | `#FACC15`  | Tombol portal dan aksen                   |
| `accent-500` | `#EAB308`  | Hover/pressed aksen                       |
| `accent-900` | `#422006`  | Teks di atas latar kuning bila diperlukan |

### Warna netral

| Token         | Nilai awal | Penggunaan       |
| ------------- | ---------- | ---------------- |
| `neutral-0`   | `#FFFFFF`  | Surface utama    |
| `neutral-50`  | `#F8FAFC`  | Latar aplikasi   |
| `neutral-100` | `#F1F5F9`  | Surface sekunder |
| `neutral-200` | `#E2E8F0`  | Border           |
| `neutral-500` | `#64748B`  | Teks sekunder    |
| `neutral-700` | `#334155`  | Teks pendukung   |
| `neutral-900` | `#0F172A`  | Teks utama       |

### Warna semantik

| Token     | Nilai awal | Penggunaan                      |
| --------- | ---------- | ------------------------------- |
| `success` | `#15803D`  | Disetujui, aktif, selesai       |
| `warning` | `#B45309`  | Menunggu, revisi, perhatian     |
| `danger`  | `#B91C1C`  | Ditolak, gagal, aksi destruktif |
| `info`    | `#1D4ED8`  | Diajukan, informasi, berjalan   |

Seluruh pasangan warna teks dan latar harus diperiksa agar memenuhi kontras WCAG AA.

## Implementasi Token

Gunakan CSS custom properties agar tema konsisten.

```css
:root {
  --color-brand: #0f6b3c;
  --color-brand-hover: #0b5430;
  --color-accent: #facc15;
  --color-background: #f8fafc;
  --color-surface: #ffffff;
  --color-border: #e2e8f0;
  --color-text: #0f172a;
  --color-text-muted: #64748b;
  --color-success: #15803d;
  --color-warning: #b45309;
  --color-danger: #b91c1c;
  --color-info: #1d4ed8;
}
```

Jangan menulis nilai warna acak pada setiap komponen. Tambahkan token baru hanya jika kebutuhan semantiknya jelas.

## Tipografi

- Gunakan sans-serif yang mudah dibaca, misalnya **Inter**, **Plus Jakarta Sans**, atau font resmi institusi.
- Sediakan fallback sistem: `system-ui, -apple-system, "Segoe UI", sans-serif`.
- Body menggunakan ukuran minimum 16px pada halaman publik dan 14–16px pada tabel dashboard.
- Gunakan weight 400 untuk isi, 500–600 untuk label, dan 600–700 untuk heading.
- Hindari seluruh teks kapital untuk paragraf atau tombol panjang.

### Skala ukuran

| Token       | Ukuran/line-height | Penggunaan            |
| ----------- | ------------------ | --------------------- |
| `text-xs`   | 12/16              | Metadata terbatas     |
| `text-sm`   | 14/20              | Isi tabel dan bantuan |
| `text-base` | 16/24              | Isi utama             |
| `text-lg`   | 18/28              | Lead atau subjudul    |
| `text-xl`   | 20/28              | Heading kartu/section |
| `text-2xl`  | 24/32              | Judul halaman         |
| `text-4xl`  | 36/44              | Hero mobile/tablet    |
| `text-5xl`  | 48/56              | Hero desktop          |

## Spacing

Gunakan kelipatan 4px:

```text
1 = 4px
2 = 8px
3 = 12px
4 = 16px
5 = 20px
6 = 24px
8 = 32px
10 = 40px
12 = 48px
16 = 64px
20 = 80px
```

- Jarak antar label dan input: 8px.
- Jarak antar field: 20–24px.
- Padding kartu: 20–24px.
- Jarak antar section dashboard: 24–32px.
- Padding section landing page: 64–96px pada desktop, 40–64px pada mobile.

## Radius, Border, dan Shadow

- Input dan tombol: radius 8px.
- Kartu: radius 12px.
- Modal: radius 16px pada desktop.
- Badge: radius penuh/pill.
- Border standar: 1px `neutral-200`.
- Shadow digunakan tipis untuk elevasi; jangan menjadikan setiap elemen mengambang.
- Focus ring: minimal 2px dengan offset dan kontras jelas.

## Grid dan Layout

- Lebar konten landing page maksimal sekitar 1200–1280px.
- Lebar area baca/form utama maksimal 720–880px bila tidak membutuhkan tabel penuh.
- Dashboard menggunakan grid 12 kolom pada desktop.
- Kartu statistik: empat kolom desktop, dua kolom tablet, satu kolom mobile.
- Sidebar desktop sekitar 256px dan dapat menjadi drawer pada mobile.
- Pertahankan ruang putih yang cukup agar dashboard padat tetap mudah dipindai.

## Tombol

### Variants

| Variant       | Penggunaan                                 |
| ------------- | ------------------------------------------ |
| Primary hijau | Aksi utama halaman: simpan, tambah, kirim  |
| Accent kuning | Aksi portal pada landing page              |
| Secondary     | Aksi pendukung seperti filter atau kembali |
| Ghost         | Aksi ringan pada toolbar atau menu         |
| Danger        | Tolak, hapus, nonaktifkan, batalkan        |

Aturan:

- Satu area sebaiknya memiliki satu aksi utama yang paling menonjol.
- Tombol memakai kata kerja: “Simpan perubahan”, bukan “OK”.
- Loading state mempertahankan lebar tombol dan mencegah klik ganda.
- Ikon pada tombol mendukung teks, bukan menggantikannya untuk aksi yang ambigu.
- Tombol destruktif selalu meminta konfirmasi jika dampaknya sulit dipulihkan.

## Form

- Label diletakkan di atas input.
- Placeholder hanya sebagai contoh, bukan pengganti label.
- Helper text menjelaskan format sebelum terjadi error.
- Error text menggunakan warna danger dan ikon/teks yang jelas.
- Disabled state tetap terbaca dan menjelaskan alasan jika tidak jelas.
- Kelompok radio/checkbox memiliki legend.
- Input uang rata kanan bila membantu pembacaan, dengan prefix `Rp` yang konsisten.
- Textarea menampilkan batas karakter untuk input yang dibatasi.

## Status Badge

| Status               | Warna         | Label Indonesia |
| -------------------- | ------------- | --------------- |
| `DRAFT`              | Netral        | Draf            |
| `SUBMITTED`          | Biru          | Diajukan        |
| `REVISION_REQUESTED` | Oranye        | Perlu revisi    |
| `APPROVED`           | Hijau         | Disetujui       |
| `REJECTED`           | Merah         | Ditolak         |
| `RUNNING`            | Biru/teal     | Berjalan        |
| `COMPLETED`          | Hijau gelap   | Selesai         |
| `CANCELLED`          | Abu-abu/merah | Dibatalkan      |
| `ACTIVE`             | Hijau         | Aktif           |
| `SUSPENDED`          | Merah         | Ditangguhkan    |

Badge selalu menampilkan teks. Jangan menyampaikan status hanya melalui titik atau warna.

## Kartu

### Stat card

- Label singkat.
- Nilai utama yang dominan.
- Ikon opsional.
- Perbandingan/tren hanya jika maknanya benar.
- Link ke detail bila dapat ditindaklanjuti.

### Organization card

- Logo dengan fallback inisial.
- Nama dan tipe organisasi.
- Jurusan/prodi jika relevan.
- Deskripsi publik singkat.
- Status hanya ditampilkan bila aman untuk publik.

### Review card

- Nama pengaju dan organisasi.
- Jenis serta waktu pengajuan.
- Status.
- Ringkasan data penting.
- Aksi review yang tersedia.

## Tabel

- Header tetap singkat dan konsisten.
- Nilai kosong ditampilkan sebagai `—`, bukan string `null`.
- Angka dan uang diratakan kanan.
- Kolom aksi berada di sisi kanan.
- Sort indicator memiliki label aksesibel.
- Baris dapat dipindai, tetapi jangan menjadikan seluruh baris clickable jika ada banyak aksi.
- Pada mobile, pertahankan kolom prioritas atau gunakan kartu; jangan mengecilkan teks secara ekstrem.

## Modal dan Dialog

- Judul menjelaskan keputusan yang akan dibuat.
- Isi menjelaskan dampak dan data terkait.
- Tombol utama berada konsisten.
- Penolakan dan revisi mewajibkan catatan jika aturan bisnis mensyaratkan.
- Jangan menggunakan modal bertingkat.
- Untuk form kompleks, gunakan halaman atau drawer besar.

## Notifikasi dan Feedback

- Toast digunakan untuk hasil aksi singkat.
- Alert inline digunakan untuk masalah yang perlu tetap terlihat.
- Kesalahan form ditampilkan dekat field.
- Pesan sukses menjelaskan objek yang berubah.
- Jangan menampilkan pesan teknis, stack trace, atau ID internal tanpa kebutuhan dukungan.

## Ikon dan Ilustrasi

- Gunakan satu keluarga ikon outline yang konsisten.
- Ukuran umum: 16px pada teks, 20px pada tombol, dan 24px pada navigasi.
- Ikon dekoratif memakai `aria-hidden`.
- Ikon aksi tanpa teks wajib memiliki accessible name dan tooltip.
- Ilustrasi landing page mengikuti palet merek dan tidak mengurangi keterbacaan teks.

## Logo Organisasi

- Rasio tampilan diseragamkan melalui container persegi.
- Gunakan `object-fit: contain` agar logo tidak terpotong.
- Sediakan fallback inisial organisasi.
- Validasi file logo pada upload.
- Jangan mengubah warna logo organisasi tanpa izin.

## Bahasa Antarmuka

- Gunakan Bahasa Indonesia yang ringkas dan formal namun ramah.
- Gunakan “Anda”, bukan campuran “kamu/user”.
- Gunakan “Program kerja”, lalu singkatan “proker” hanya jika dipilih secara konsisten.
- Gunakan format tanggal Indonesia yang mudah dibaca, misalnya `21 September 2026`.
- Gunakan format uang `Rp1.250.000` secara konsisten.
- Hindari pesan “Terjadi kesalahan” tanpa penjelasan atau langkah berikutnya.

Contoh:

| Hindari                 | Gunakan                            |
| ----------------------- | ---------------------------------- |
| Submit                  | Ajukan                             |
| Approve                 | Setujui                            |
| Reject                  | Tolak                              |
| Data berhasil di-update | Perubahan berhasil disimpan        |
| Invalid input           | Periksa kembali data yang ditandai |

## Motion

- Animasi berlangsung singkat, umumnya 150–250ms.
- Gunakan motion untuk memperjelas perubahan state, bukan dekorasi berlebihan.
- Hormati preferensi `prefers-reduced-motion`.
- Skeleton tidak menggunakan animasi yang mengganggu.

## Aksesibilitas Visual

- Kontras teks normal minimal 4.5:1.
- Kontras teks besar minimal 3:1.
- Focus state tidak boleh dihilangkan.
- Link dapat dibedakan dari teks biasa selain dari warna jika konteksnya ambigu.
- Grafik memiliki label/legend dan ringkasan tekstual.
- Informasi penting tidak hanya dikodekan dengan warna.

## Checklist Review UI

- Menggunakan token, bukan warna atau spacing acak.
- Seluruh state komponen tersedia: default, hover, focus, disabled, loading, error.
- Label dan pesan menggunakan Bahasa Indonesia konsisten.
- Layout diuji pada mobile, tablet, dan desktop.
- Navigasi keyboard dan focus order benar.
- Kontras warna memenuhi target.
- Loading, empty, error, dan forbidden state tersedia.
- Tidak ada informasi tenant sensitif tampil pada UI publik.
