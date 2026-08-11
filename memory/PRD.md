# Arsip Digital Pemuatan Truk — PRD

## Original Problem Statement
PWA mobile-first untuk arsip digital dokumen pemuatan truk gudang, menggantikan arsip kertas fisik (retensi 2 tahun). Prioritas: kecepatan input di lapangan. ~20 foto per truk.

## Personas
- **Operator lapangan**: input truk baru, ambil foto kategori, mark selesai. Tidak boleh hapus.
- **Admin/Supervisor**: input + edit + hapus + export PDF + akses dashboard + kelola user.

## Architecture
- Backend: FastAPI + MongoDB + Emergent Object Storage
- Frontend: React 19 + Tailwind + Shadcn base, sonner, jsPDF, browser-image-compression
- Auth: JWT (cookie + Bearer fallback via localStorage)
- Path storage: `truck-archive/{year}/{month}/{day}/{nopol}/{uuid}.jpg`

## Core Requirements (all implemented ✅)
1. Input truk mode sesi (auto-pull dari antrian by nopol) ✅
2. Chip kategori foto + kamera langsung + kompresi client-side (1920px, JPEG 78%) ✅
3. Auto-rename `{nopol}_{tanggal}_{kategori}_{urut}.jpg` + auto-organize path ✅
4. Progress bar per-foto + upload queue (retry on reconnect) ✅
5. Checklist kelengkapan (min 1 Surat Jalan + 1 Foto Kendaraan) ✅
6. Storage: Object Storage + MongoDB index ✅
7. Search + filter kombinasi (nopol/no_do/tujuan/jenis/status/range tanggal) ✅
8. Gallery per-truk dengan lightbox ✅
9. Export PDF (jsPDF, header + foto per kategori) ✅
10. Dashboard supervisor (hari ini, lengkap/belum, EKSPOR/LOKAL, needs attention) ✅
11. Role Admin/Operator (admin bisa hapus) ✅
12. Flag retensi 2 tahun otomatis + halaman retensi ✅
13. PWA installable (manifest + meta) ✅

## Skipped for MVP (deferred)
- OCR auto-extract No. DO/SO dari foto Surat Jalan (per user pilihan skip)
- Autocomplete tujuan/buyer (bisa ditambah nanti)

## Backlog (P1)
- OCR Surat Jalan (Gemini 3 Flash Vision)
- Autocomplete buyer/tujuan
- Bulk export multiple trucks
- Push notification untuk truk belum lengkap end-of-day

## Backlog (P2)
- Analytics chart trend mingguan
- Auto-generate seal number QR
- Export ke Google Sheets sync
