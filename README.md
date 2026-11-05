# E-Cuti — Dinas Kesehatan Kota Tangerang Selatan

Aplikasi Sistem Informasi Pengelolaan dan Penjagaan Cuti Pegawai (PNS & PPPK) berbasis web dengan integrasi Google Sheets (Google Apps Script).

## 🚀 Fitur Utama

- **Pembedaan PNS & PPPK**: Otomatis menyesuaikan formulir permohonan BKN 8 bagian (PNS) atau Surat Permohonan (PPPK) serta label NIP / NI PPPK.
- **Perhitungan Saldo Cuti FIFO BKN**: Sesuai Peraturan BKN No. 24 Tahun 2017 jo. Peraturan BKN No. 7 Tahun 2021 (N-2, N-1, N berjalan).
- **Cetak Dokumen Resmi (A4)**: Cetak Formulir Cuti, Surat Permohonan Pegawai, dan Surat Izin Cuti Resmi Berkop Dinas Kesehatan dengan Nomor & Tanggal Surat.
- **Pencarian Cepat & Pagination**: Tabel Master Pegawai, Rekapitulasi Saldo Cuti, dan Daftar Permohonan cuti searchable dengan tampilan 20 data per halaman.
- **Sinkronisasi Otomatis**: Input manual pegawai langsung memperbarui database master pegawai secara instan.

## 📁 Struktur Proyek

```text
penjagaancuti1/
├── assets/
│   ├── css/
│   │   └── style.css            # Styling & aturan media cetak @print A4
│   ├── images/
│   │   └── brand/logo.png       # Logo Pemkot Tangerang Selatan
│   └── js/
│       ├── auth.js              # Manajemen login & proteksi sesi petugas
│       ├── loader-pegawai.js    # Master data pegawai & perhitungan cuti FIFO BKN
│       └── app.js               # Logika CRUD cuti, UI, & render cetak
├── .gitignore                   # Ignore file sementara
├── Code.gs                      # Backend API Google Apps Script untuk Google Spreadsheet
├── index.html                   # Halaman utama aplikasi (Single Page App)
├── netlify.toml                 # Konfigurasi publish otomatis ke Netlify
└── package.json                 # Metadata proyek
```

## 🌐 Cara Deploy ke Netlify via GitHub

1. Push repository ini ke GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial commit e-cuti dinkes"
   git branch -M main
   git remote add origin <URL_REPO_GITHUB_ANDA>
   git push -u origin main
   ```
2. Buka [Netlify](https://app.netlify.com/) dan login.
3. Klik **Add new site** $\rightarrow$ **Import an existing project**.
4. Pilih **GitHub** dan pilih repository Anda.
5. Pada pengaturan build:
   - **Publish directory**: `.` (titik atau root)
   - Klik **Deploy site**.
6. Anda akan mendapatkan URL share resmi Netlify (misal: `https://e-cuti-dinkes.netlify.app`).

## ⚙️ Menghubungkan ke Google Spreadsheet

1. Buka Google Spreadsheet baru.
2. Buka menu **Extensions** $\rightarrow$ **Apps Script**.
3. Salin seluruh isi file [`Code.gs`](file:///d:/fd%20me/bahan%20sppd%20app/1.Pengajuan%20cuti/penjagaancuti1/Code.gs) ke editor Apps Script.
4. Klik fungsi `setupSheets` lalu klik **Run** sekali untuk membuat sheet otomatis.
5. Klik **Deploy** $\rightarrow$ **New deployment** $\rightarrow$ Pilih jenis **Web app**:
   - Execute as: **Me**
   - Who has access: **Anyone**
6. Salin URL Web App yang didapat, lalu masukkan di menu **Pengaturan API** (ikon gear di aplikasi web) $\rightarrow$ Simpan.

