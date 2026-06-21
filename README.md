# 🌌 Portal Sekala Niskala Universe (SNU)

Selamat datang di repositori web portal **Sekala Niskala Universe**. Website ini dibangun menggunakan **Astro v5 (Static Output)**, **React**, **Tailwind CSS v4**, dan **Keystatic CMS** untuk menghadirkan pengalaman membaca yang cepat, modern, estetik, dan mudah dikelola oleh komunitas.

Website ini **sudah 100% siap untuk rilis (Production Ready)** dengan performa LCP yang dioptimalkan, integrasi komentar Waline bebas konflik, serta dukungan otomatisasi CI/CD menggunakan Travis CI.

---

## 🚀 Panduan Memulai Cepat (Quick Start)

### Persyaratan Sistem
* **Node.js** v24 atau lebih baru.
* **pnpm** (Package Manager).

### Pengembangan Lokal (Development)
Untuk menjalankan website di komputer lokal:
```bash
# 1. Install dependensi
pnpm install

# 2. Jalankan server dev lokal
pnpm run dev
```
Buka `http://localhost:4321` di browser Anda.

### Pengembangan via GitHub Codespaces (Tanpa Install Lokal)
Jika Anda ingin menjalankan dan menguji website menggunakan Codespace Anda (`super-space-guacamole-xg59v7jgq7q2v445`) langsung dari komputer lokal Anda:

#### Opsi A: Lewat Terminal Lokal (GitHub CLI)
1. **Nyalakan Server Dev di Codespace:**
   ```bash
   gh codespace ssh -c super-space-guacamole-xg59v7jgq7q2v445 -- "cd /workspaces/web-snu && pnpm run dev"
   ```
2. **Teruskan Port (Port Forwarding) ke Browser Lokal:**
   Buka jendela terminal baru di komputer lokal Anda, lalu jalankan:
   ```bash
   gh codespace ports forward 4321:4321 -c super-space-guacamole-xg59v7jgq7q2v445
   ```
3. **Akses di Browser Anda:**
   * Website: `http://localhost:4321`
   * Keystatic CMS: `http://localhost:4321/keystatic`

#### Opsi B: Menggunakan Aplikasi VS Code Lokal
1. Instal ekstensi **GitHub Codespaces** di aplikasi VS Code lokal Anda.
2. Tekan `Ctrl + Shift + P` (atau `Cmd + Shift + P` di Mac), pilih **Codespaces: Connect to Codespace...**, lalu pilih `super-space-guacamole-xg59v7jgq7q2v445`.
3. Buka terminal terintegrasi di VS Code tersebut, lalu jalankan `pnpm run dev`. VS Code akan melakukan port forwarding secara otomatis.

### Uji Coba Build Produksi (Production Build)
Untuk melakukan kompilasi file statis lokal sebelum dipublikasikan:
```bash
pnpm run build
```
Hasil build akan tersimpan di direktori `dist/` dan siap disajikan secara statis.

---

## ✍️ Panduan Penulis & Pengelola Konten (CMS)

Kami menggunakan **Keystatic CMS** yang memungkinkan penulisan konten langsung melalui antarmuka web (WYSIWYG) yang intuitif.

### 1. Cara Masuk ke Halaman Admin (Keystatic)
* **Di Lokal (Development):** Akses link `http://localhost:4321/keystatic` saat server dev lokal berjalan. Anda bisa langsung membuat, mengedit, atau menghapus artikel. Perubahan akan langsung disimpan dalam bentuk file Markdown (`.mdx`) di folder proyek Anda.
* **Di Live Website (Production):** Akses `https://domain-anda.com/keystatic`. Keystatic dikonfigurasi menggunakan **GitHub Storage Mode**. Penulis akan diminta login menggunakan akun GitHub mereka. Setiap perubahan yang disimpan penulis di web akan otomatis membuat commit baru langsung ke repositori GitHub ini.

### 2. Panduan Menulis Artikel Baru
Saat membuat artikel baru di Keystatic, harap lengkapi kolom berikut:
1. **Title:** Judul artikel.
2. **Slug:** URL halaman (otomatis dibuat dari judul).
3. **Description:** Ringkasan artikel untuk pembaca dan SEO (pastikan menarik).
4. **Author:** Nama penulis/kontributor.
5. **Publish Date:** Tanggal tayang.
6. **Tags:** Pilih tag tema yang sesuai (misal: `spiritual`, `niskala`, `wpm-saga`).
7. **Seri:** Pilih seri jika artikel termasuk dalam rangkaian cerita (misal: `wpm-saga`).
8. **Cover Image:** Unggah gambar sampul (format JPG/PNG/WebP). Gambar ini otomatis dikompresi oleh Astro untuk performa LCP yang cepat.
9. **Draft:** Centang ini jika artikel masih dalam tahap penyusunan dan belum ingin dipublikasikan di live website.

---

## 🔗 Panduan Menyematkan (Embed) Postingan Quora

Karena anggota komunitas masih aktif menulis di Quora Space Sekala Niskala, Anda dapat menyisipkan postingan Quora pilihan ke dalam badan artikel Markdown (`.mdx`) secara estetik.

### Cara Menggunakan Komponen `<QuoraEmbed />`
Di bagian paling bawah/atas artikel Keystatic, atau langsung di dalam file `.mdx`, Anda dapat menuliskan kode berikut:

```mdx
import QuoraEmbed from "@/components/QuoraEmbed.astro"

<QuoraEmbed url="https://sekalaniskalauniverse.quora.com/Judul-Postingan-Anda" />
```

* **url (Wajib):** Tautan url postingan lengkap dari Quora Space Anda.
* **embedId (Opsional):** Jika Anda menyalin kode embed resmi dari Quora (lewat tombol titik tiga `...` > *Embed Post*), Anda bisa memasukkan kode ID-nya saja ke dalam parameter `embedId` (misal: `embedId="p8Q5rXJ8c6"`).

---

## 🔄 Sinkronisasi Otomatis Artikel Quora Space (Quora Sync)

Kami telah menyediakan script otomatisasi menggunakan **Puppeteer** untuk menyinkronkan postingan terbaru dari Quora Space [Sekala Niskala Universe](https://sekalaniskalauniverse.quora.com/) langsung menjadi file Markdown (`.mdx`) lengkap dengan gambar sampul dan gambar konten yang disimpan secara lokal (self-hosted).

### Aturan Penting Sinkronisasi
> [!IMPORTANT]
> **JANGAN menjalankan instalasi dependensi browser virtual (Puppeteer) atau script sinkronisasi ini di komputer lokal (Device Fisik Anda).**
> Jalankan proses sinkronisasi **hanya di dalam lingkungan GitHub Codespace** untuk menghindari error dependensi sistem operasi lokal, konsumsi memori tinggi, dan pemblokiran firewall.

### Cara Menjalankan Sinkronisasi di GitHub Codespace:

1. **Buka Terminal / SSH ke Codespace Anda:**
   Hubungkan terminal lokal Anda ke Codespace:
   ```bash
   gh codespace ssh -c super-space-guacamole-xg59v7jgq7q2v445 -- "cd /workspaces/web-snu"
   ```
   *Atau buka secara interaktif lewat VS Code Remote Development.*

2. **Jalankan Instalasi Dependensi (Bila Diperlukan):**
   ```bash
   pnpm install
   ```

3. **Jalankan Script Sinkronisasi:**
   Jalankan script untuk mendownload 12 artikel terbaru dari Quora Space:
   ```bash
   pnpm run sync-quora
   ```
   Script akan:
   * Membuka browser virtual (headless) di Codespace untuk melewati proteksi firewall/Cloudflare Quora.
   * Mendeteksi tautan postingan terbaru di Quora Space.
   * Mengekstrak judul, tanggal terbit, cover image, dan teks konten lengkap.
   * Melakukan konversi DOM HTML ke Markdown murni (supaya tidak bentrok dengan skema Keystatic).
   * Mengunduh semua gambar dalam artikel ke `/public/images/artikel/` dan menyesuaikan tautannya.
   * Membuat file `.mdx` baru di folder `src/content/artikel/` dengan tag `["quora-sync"]`.

4. **Verifikasi dan Kirim Perubahan (Commit & Push):**
   Setelah sinkronisasi selesai, verifikasi file `.mdx` yang baru di `src/content/artikel/`, lalu jalankan git commit untuk mempublikasikannya ke live website:
   ```bash
   git add .
   git commit -m "chore: sync postingan terbaru dari Quora Space"
   git push origin main
   ```

---

## 💬 Konfigurasi Kolom Komentar (Waline)

Kami menggunakan **Waline** untuk sistem komentar karena mendukung login umum, emoji, markdown, dan notifikasi tanpa memerlukan server berbayar.

### Menggunakan Server Waline Bersama (Shared Server)
Sistem komentar Sekala Niskala telah diprogram agar tidak bentrok dengan website lain meskipun Anda menggunakan 1 server Waline yang sama. Semua data komentar akan diberi prefix khusus `snu:` di database Anda.

### Cara Menghubungkan ke Server Waline Anda:
1. Buka file `.env` di root proyek (atau buat file `.env` baru jika belum ada).
2. Masukkan URL server Waline Anda:
   ```env
   PUBLIC_WALINE_SERVER_URL=https://nama-server-waline-anda.vercel.app
   ```
3. Saat website di-deploy, fitur komentar akan langsung aktif dan terhubung ke database Anda.

---

## 🛠️ Panduan Integrasi Travis CI & GitHub Pages

Repositori ini telah dilengkapi dengan `.travis.yml` untuk otomatisasi deploy ke GitHub Pages setiap kali Anda melakukan push ke branch `main`.

### Langkah-langkah Aktivasi:
1. Masuk ke **[travis-ci.com](https://travis-ci.com/)** menggunakan akun GitHub Anda.
2. Aktifkan repositori `PaKu211/web-snu` di dashboard Travis Anda.
3. Buka **Settings** dari repositori tersebut di Travis CI.
4. Tambahkan **Environment Variable** baru:
   * **Name:** `GITHUB_TOKEN`
   * **Value:** *[Personal Access Token GitHub Anda dengan hak akses `repo` atau `write to pages`]*
5. Selesai! Setiap ada commit baru di branch `main`, Travis CI akan otomatis membuild situs Anda dan memperbarui branch `gh-pages` untuk ditayangkan.

*(Catatan: Jika Anda menggunakan custom domain di GitHub Pages, pastikan untuk memasang file `CNAME` berisi domain Anda di dalam folder `public/` agar tidak terhapus saat deployment otomatis berjalan).*
