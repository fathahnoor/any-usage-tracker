# Current runtime contract

As of 31 October 2026, all routine source reads are browser-free: official Codex CLI and direct authenticated HTTP for OpenRouter, Telkomsel and Tri. Windows DPAPI CurrentUser protects the locally authorized provider sessions. BrowserOS is used only when the user explicitly imports a new session or generates a redacted screenshot. There is no automatic browser fallback.

The following earlier design notes are historical where they describe a browser-backed collector.

# Any Usage Tracker

Dashboard pribadi lokal untuk kuota Codex, biaya dan token OpenRouter, serta pulsa dan paket Telkomsel/Tri.

## Kontrak

- Codex memakai `codex app-server account/rateLimits/read`, independen dari server lama. Persentase sisa, waktu reset, akun dan reset credit tetap terlihat. Forecast komunitas tidak disertakan.
- OpenRouter menampilkan total pengeluaran satu tahun berjalan dalam USD, total token dan permintaan. Rincian harian per model dibuka langsung di situs sumber melalui tombol Detail.
- Telkomsel dan Tri menampilkan pulsa, masa aktif, nama paket, sisa/total kuota dan kedaluwarsa yang tersedia di akun.
- Sumber web dibaca lewat MCP BrowserOS neo lokal, memakai sesi login di browser. Credential tetap di browser. Dashboard hanya mendengarkan 127.0.0.1.
- Setiap sumber diperbarui mandiri, memiliki waktu pembacaan dan status gagal/data lama. Salinan terakhir bertahan setelah server dimulai ulang.
- Node.js 24 bawaan, HTML/CSS/JS biasa, tanpa pemasangan dependency. Tombol refresh dan pembaruan berkala. Launcher Windows di workspace.

## Struktur dan verifikasi

`server.js`, `lib/` pembaca sumber dan MCP, `public/` UI, `test/` pengujian Node. `data/` cache privat dan tidak untuk Git.

Jalankan: `node server.js --no-open`. Uji: `node --test`. Cek sintaks: `node --check server.js`.

Gaya: CommonJS, fungsi kecil, validasi input di batas HTTP, escape teks sumber sebelum dirender. Tidak menyimpan token/kata sandi. Tidak membeli paket atau mengubah akun.

## Desain

Acuan ruang utama: browser setengah kiri layar, dengan sidebar browser terbuka, sekitar 756 x 1066 CSS piksel. Semua empat sumber dan paket aktif terlihat tanpa scroll horizontal maupun vertikal pada ruang ini. Header kecil, kartu Codex melintang, ringkasan OpenRouter, lalu Telkomsel dan Tri berdampingan. Tidak ada hero besar, navigasi samping, grafik atau tabel per model. Tetap futuristik dengan warna cyan, panel gelap dan indikator melingkar. Tombol Detail pada OpenRouter/Telkomsel/Tri membuka situs sumber dalam tab baru. Layout harus benar-benar muat, tanpa menyembunyikan konten lewat overflow hidden atau mengecilkan seluruh halaman dengan transform.

## Sinkronisasi di latar belakang

Pembaca sumber web dipin secara ketat ke jendela BrowserOS neo khusus yang diminimalkan. Semua navigasi dan pembacaan web tetap melalui MCP BrowserOS neo. Helper Windows hanya meminimalkan jendela dengan judul penanda NEXUS Background Sync. Kegagalan menyiapkan jendela khusus membatalkan pembacaan dan mempertahankan cache; tidak ada fallback membuka tab di jendela utama.
