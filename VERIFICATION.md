# Direct API migration and publication verification

Latest check: 31 October 2026, WIB. This section supersedes the earlier browser-backed implementation notes below.

- Existing-session migration was explicitly authorized by the user. Session material is stored only in data/sessions.dpapi, encrypted with Windows DPAPI CurrentUser. A real encrypt/decrypt round trip succeeded. No token or cookie values were written to application logs, evidence notes, source or Git.
- OpenRouter direct HTTP returned the same annual total as Activity. After the 60-second JWT expired, direct Clerk renewal returned HTTP 200 and analytics returned HTTP 200 without a browser request.
- Telkomsel direct profile, active-bonuses and active-offers requests all returned HTTP 200 using scoped cookies, device-id and the verified browser-compatible headers.
- Tri direct signed dashboard POST returned HTTP 200. DATA allowances are rendered before VOICE, with quota units kept distinct.
- The production Sources module imports no browser/MCP/minimized-window collector. All four source cards completed live refresh after the server was restarted with direct readers.
- Legacy collector source files were moved to archive/browser-sync and are not active dependencies. Source tabs from the old collector were closed, while unrelated user tabs were preserved.
- node --test: 21 tests pass, including provider contracts, renewal/error handling, quota normalization, encryption and cache behavior. Legacy archive tests remain isolated fixtures.
- Public screenshot docs/images/dashboard-redacted.png was captured only after replacing the account email and both phone numbers in a dedicated page. Polling on that screenshot page was also masked to prevent a rerender exposing identities. No unredacted screenshot was saved by the capture tool.
- GitHub target is fathahnoor/any-usage-tracker, retaining its existing private visibility. Cache, DPAPI sessions, logs and research downloads are ignored by Git. The About description and README were updated at the user's request.

# Revisi layout ringkas dan ukuran font

Pemeriksaan terbaru: 30 Oktober 2026, sekitar pukul 20.03 WIB. Bagian ini menggantikan hasil pemeriksaan UI versi awal di bawah.

- Skill ui-ux-pro-max dipakai untuk memilih tata letak padat, hierarki data dan skala tipografi. Keputusan disimpan dalam design-system/MASTER.md.
- Screenshot pengguna diperiksa. Area browser aktual 755 x 1067 CSS piksel dijadikan acuan, dengan sidebar browser tetap terbuka.
- Hero, navigasi samping, grafik, legenda dan tabel per model dihilangkan. Dashboard memuat empat sumber dengan paket operator tetap terpisah.
- Font diperbesar dua tahap sesuai masukan pengguna. Ukuran akhir pada viewport utama: judul kartu 19 px, nama paket 15 px, nomor telepon 13 px, teks data pendukung 12 px, nilai pulsa 30 px dan spend 40 px.
- Pada 755 x 1067, footer berakhir pada sekitar y=1002. scrollWidth=755 dan scrollHeight=1067: tidak ada scroll horizontal atau vertikal, tanpa clipping atau transform skala halaman.
- Emulasi setara zoom 110 persen (686 x 970, DPR 1,1) juga muat tanpa scroll ke kedua arah. Footer berakhir pada sekitar y=886.
- Pemeriksaan 755 x 900 dan 640 x 900 juga muat tanpa scroll. Pada viewport ponsel 375 px, kartu ditumpuk agar terbaca dan scroll vertikal tetap tersedia.
- Tombol Detail pada OpenRouter, Telkomsel dan Tri mengarah ke situs sumber yang benar dan memakai target _blank serta rel noopener noreferrer. OpenRouter mempertahankan parameter rentang setahun.
- Seluruh pengaturan emulasi viewport dibersihkan setelah pengujian agar tidak memengaruhi mode setengah layar pengguna.
- Enam pengujian pembaca sumber/cache tetap lulus; node --check public/app.js berhasil.

# Pemeriksaan awal NEXUS (sebelum revisi layout)

Tanggal pemeriksaan: 30 Oktober 2026, WIB.

## Sumber live

- Codex berhasil dibaca melalui app-server resmi, termasuk kedua jendela dan reset credit. Pembaca tidak bergantung pada port 8791.
- OpenRouter mengembalikan 74 baris harian dari sembilan model, metadata `truncated: false`. Jumlah biaya USD 66,785008 dibulatkan menjadi USD 66,79, cocok dengan Total spend pada halaman Activity. Total token 3.147.295.304 dan request 11.953 berasal dari penjumlahan baris, termasuk model dengan biaya nol.
- Telkomsel: pulsa dan satu paket HOT PROMO terbaca. Halaman roaming menampilkan kondisi tanpa paket aktif.
- Tri: pulsa serta tiga paket (AlwaysOn, Kuota Untukmu Harian, Kuota Spesial) terbaca, termasuk jatah telepon pada paket harian. Jumlah kuota berubah selama pengujian dan tidak diperlakukan sebagai angka tetap.

## Pengujian

`node --test`: enam pengujian lulus. Cakupan: batas hari WIB/tahun kabisat, pulsa dan kuota operator, pemisahan harga rekomendasi, validasi nilai OpenRouter dan hasil terpotong, salinan terakhir saat offline, pemulihan cache setelah restart, serta deduplikasi refresh.

Pemeriksaan sintaks Node berhasil untuk server, pembaca sumber dan skrip frontend.

BrowserOS neo digunakan untuk pemeriksaan runtime:

- Seluruh empat kartu mencapai status tersinkron dan tanpa error sumber.
- Grafik berpindah ke token (3,15B) dan request (11,95K).
- Filter GPT-6.1 Sol menghasilkan satu baris yang sesuai. Klik grafik 27 Oktober menghasilkan dua baris harian.
- Ekspor pada filter tanggal tersebut menghasilkan header CSV dan dua baris data, dengan delapan kolom yang sesuai.
- Pagination beralih ke halaman 2 dari 8, lalu kembali.
- Snapshot aksesibilitas memuat nama tombol, label filter dan nama titik grafik. Grafik dapat dioperasikan dengan Enter atau spasi.
- Tidak ada overflow halaman pada lebar 320, 768, 1024 dan 1440 piksel. Tabel memakai scroll internal pada layar sempit.
- Screenshot penuh pada desktop dan tampilan sempit diperiksa. Console setelah reload tidak memuat error atau warning.
- Folder data tidak disajikan oleh HTTP (404). Parameter sumber yang tidak dikenal ditolak (400).
- Launcher PowerShell berhasil dijalankan setelah proses dashboard lama dihentikan. Server pulih dengan cache terakhir, dan halaman tetap dapat dibuka.

## Penulisan dan batas

README diperiksa dengan humanizer-indonesia, preset semiformal. Sebelum/sesudah: rerata panjang kalimat 9,8/10,7 kata, simpangan baku 3,6/4,4. Metrik masih menandai kalimat yang pendek, sesuai format petunjuk teknis. Tidak ada frasa kosong atau tanda pisah terlarang yang terdeteksi. Kalibrasi suara Fathah tidak dilakukan; teks memakai register netral.

Situs sumber dan endpoint analytics internal dapat berubah. Login ulang tetap dilakukan oleh pengguna di BrowserOS neo. Tampilan responsif diuji lewat emulasi viewport browser, bukan pada perangkat Android fisik.
## Penyesuaian kepadatan terakhir

30 Oktober 2026: font diperbesar lagi, dashboard memakai min-height 100svh dan bagian paket menggunakan tinggi tersisa. Pada viewport aktual 755 x 1067, footer berakhir pada y=1057 dengan margin bawah 10 px. scrollWidth=755 dan scrollHeight=1067, tanpa scroll ke kedua arah. Ukuran utama: judul 20 px, nama paket 16 px, nomor 14 px, nilai pulsa 32 px, spend 43 px. Tidak ada konten yang disembunyikan untuk memaksakan tinggi.
## Sinkronisasi latar belakang

30 Oktober 2026: pembaca web memakai jendela BrowserOS neo khusus yang dipin ketat dan diminimalkan. Pembacaan live OpenRouter, Telkomsel dan Tri berhasil setelah server baru dijalankan. Pemeriksaan browser menunjukkan tepat tiga tab sumber dalam jendela sinkronisasi, nol tab sumber milik dashboard dalam jendela utama, dan windowState=minimized. Pemeriksaan native Windows juga mengembalikan Minimized=true. Jendela utama tetap aktif.

Delapan pengujian Node lulus, termasuk pemakaian ulang jendela khusus, binding sebelum pembacaan, serta pembatalan pembacaan jika jendela khusus gagal dibuat. BrowserOS neo masih diperlukan; implementasi ini mengisolasi halaman sumber di latar belakang dan bukan klien HTTP yang sepenuhnya tanpa browser.
