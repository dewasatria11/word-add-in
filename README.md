# Jurnal AI Assistant

Microsoft Word Add-in berbasis TypeScript + Office.js untuk membantu menulis, merapikan, menyusun, dan memformat jurnal akademik menggunakan AI API pribadi melalui backend Vercel Serverless Functions.

## 1. Deskripsi Project

**Jurnal AI Assistant** adalah task pane add-in untuk Microsoft Word. User dapat memilih teks di Word, memberi instruksi akademik, memanggil AI melalui serverless backend, melihat preview hasil, lalu memilih apakah hasil akan dimasukkan ke dokumen sebagai teks biasa atau block terformat.

API key tidak pernah disimpan di frontend. Semua credential hanya dibaca dari environment variable di backend.

## 2. Fitur Utama

- Membaca teks terpilih dari Microsoft Word.
- Chat-style academic agent untuk workflow penulisan jurnal bertahap.
- Endpoint aksi cepat:
  - Rapikan bahasa akademik
  - Parafrase
  - Buat abstrak
  - Buat outline jurnal
  - Perkuat argumen
  - Ringkas teks
- Endpoint agent:
  - Rencana artikel
  - Outline
  - Research gap
  - Pendahuluan
  - Literature review
  - Metodologi
  - Hasil dan pembahasan
  - Kesimpulan
  - Abstrak
  - Revisi
- Preview hasil sebelum masuk ke dokumen.
- Insert formatted ke Word dengan gaya akademik default:
  - Times New Roman
  - Heading
  - Title
  - Abstract
  - Paragraph justify
  - Line spacing
- Replace selected text.
- Insert plain text below selection.
- Copy result.
- Loading, error, success state.
- Character counter dan warning untuk teks panjang.
- CORS helper dan validasi request.
- Siap push ke GitHub dan deploy ke Vercel.

## 3. Arsitektur Singkat

```text
Microsoft Word
  ↓ Office.js
Task Pane Frontend (Vite + TypeScript)
  ↓ relative API path /api/ai/*
Vercel Serverless Functions
  ↓ Authorization: Bearer AI_API_KEY
OpenAI-compatible Chat Completions API
```

Frontend hanya mengirim teks, konfigurasi bahasa/gaya, dan instruksi user. Backend membuat prompt, memvalidasi input, memanggil AI API, lalu mengembalikan hasil aman ke frontend.

## 4. Tech Stack

Frontend:

- TypeScript
- Office.js / Word JavaScript API
- HTML
- CSS
- Vite

Backend:

- Vercel Serverless Functions
- TypeScript
- Native `fetch`
- Environment variables

Deployment:

- GitHub
- Vercel
- Word Add-in manifest XML

## 5. Struktur Folder

```text
jurnal-ai-assistant/
├─ src/
│  ├─ taskpane/
│  │  ├─ taskpane.html
│  │  ├─ taskpane.ts
│  │  └─ taskpane.css
│  └─ shared/
│     └─ types.ts
├─ api/
│  ├─ ai/
│  │  ├─ agent.ts
│  │  ├─ rewrite.ts
│  │  ├─ paraphrase.ts
│  │  ├─ abstract.ts
│  │  ├─ outline.ts
│  │  ├─ improve-argument.ts
│  │  └─ summarize.ts
│  └─ _lib/
│     ├─ callAI.ts
│     ├─ prompts.ts
│     ├─ validateRequest.ts
│     ├─ response.ts
│     └─ cors.ts
├─ public/
│  └─ assets/
├─ manifest.xml
├─ manifest.production.xml
├─ package.json
├─ tsconfig.json
├─ vite.config.ts
├─ vercel.json
├─ .env.example
├─ .gitignore
└─ README.md
```

## 6. Install Dependency

```bash
npm install
```

## 7. Menjalankan Lokal

```bash
npm run dev
```

Vite akan menjalankan task pane. Manifest development diarahkan ke:

```text
https://localhost:3000/taskpane.html
```

Untuk sideload Word Add-in, Office biasanya membutuhkan HTTPS. Jika browser menolak sertifikat lokal, gunakan sertifikat lokal/trusted dev server sesuai setup Office Add-in Anda.

## 8. Membuat File `.env` Lokal

Salin contoh environment:

```bash
cp .env.example .env
```

Isi variabel berikut:

```env
AI_API_KEY=isi_api_key_anda
AI_API_BASE_URL=https://api.openai.com/v1
AI_MODEL=gpt-4o-mini
MAX_INPUT_CHARS=50000
ALLOWED_ORIGIN=
```

Keterangan:

- `AI_API_KEY`: API key AI Anda.
- `AI_API_BASE_URL`: base URL provider yang kompatibel dengan OpenAI Chat Completions.
- `AI_MODEL`: nama model.
- `MAX_INPUT_CHARS`: batas input, default 50000.
- `ALLOWED_ORIGIN`: origin frontend production, boleh kosong saat development.

## 9. Test Endpoint API

Setelah server Vercel/dev berjalan:

```bash
curl -X POST http://localhost:3000/api/ai/rewrite \
  -H "Content-Type: application/json" \
  -d '{
    "text": "teks akademik yang ingin diperbaiki",
    "language": "id",
    "style": "academic journal",
    "userInstructions": "buat lebih formal"
  }'
```

Test endpoint agent:

```bash
curl -X POST http://localhost:3000/api/ai/agent \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Buat outline artikel jurnal tentang penggunaan AI dalam literasi akademik mahasiswa.",
    "language": "id",
    "articleType": "research article",
    "field": "education",
    "style": "academic journal",
    "targetLength": "medium",
    "currentStep": "start",
    "history": []
  }'
```

## 10. Cara Sideload Add-in ke Microsoft Word

### Development

1. Jalankan:
   ```bash
   npm run dev
   ```
2. Buka Microsoft Word.
3. Masuk ke menu add-ins / sideload add-in sesuai platform.
4. Pilih `manifest.xml`.
5. Buka task pane **Jurnal AI Assistant**.
6. Pilih teks di dokumen Word.
7. Klik **Use Word Selection** atau kirim instruksi agent.

### Production

Gunakan `manifest.production.xml` setelah URL Vercel diganti ke domain production.

## 11. Push ke GitHub

```bash
git init
git add .
git commit -m "initial production-ready word add-in"
git branch -M main
git remote add origin https://github.com/USERNAME/jurnal-ai-assistant.git
git push -u origin main
```

## 12. Deploy ke Vercel

1. Push project ke GitHub.
2. Buka Vercel.
3. Import repository `jurnal-ai-assistant`.
4. Framework preset: Vite.
5. Build command:
   ```bash
   npm run build
   ```
6. Output directory:
   ```text
   dist
   ```
7. Tambahkan environment variables.
8. Deploy.

## 13. Environment Variables di Vercel

Isi di menu **Project Settings → Environment Variables**:

```env
AI_API_KEY=
AI_API_BASE_URL=
AI_MODEL=
MAX_INPUT_CHARS=50000
ALLOWED_ORIGIN=https://YOUR-VERCEL-DOMAIN.vercel.app
```

Catatan:

- Jangan commit file `.env`.
- Jangan taruh API key di `src/`.
- Jangan expose credential di HTML/JS frontend.

## 14. Mengganti Manifest Production ke Domain Vercel

Edit `manifest.production.xml`.

Ganti:

```text
https://YOUR-VERCEL-DOMAIN.vercel.app
```

menjadi domain Vercel Anda, contoh:

```text
https://jurnal-ai-assistant.vercel.app
```

Pastikan bagian berikut mengarah ke URL production:

- `SourceLocation`
- icon assets
- support URL jika diperlukan

## 15. Membagikan Add-in ke Teman

1. Deploy project ke Vercel.
2. Pastikan environment variables sudah benar.
3. Update `manifest.production.xml` ke domain Vercel.
4. Kirim file `manifest.production.xml` ke teman.
5. Teman melakukan sideload manifest di Microsoft Word.
6. Semua request AI akan tetap melewati backend Vercel Anda.

Jika ingin membatasi akses, tambahkan autentikasi atau allowlist user di backend.

## 16. Catatan Keamanan API Key

- API key hanya berada di environment variable backend.
- Frontend tidak menyimpan, menampilkan, atau mengirim API key.
- `.env` masuk `.gitignore`.
- Error backend dibuat aman agar tidak membocorkan stack trace.
- Jangan log full text user di production.
- Gunakan `ALLOWED_ORIGIN` untuk membatasi origin production.
- Jika manifest dibagikan, siapa pun yang memiliki manifest bisa memakai endpoint Anda selama tidak ada auth tambahan.

## 17. Catatan Etika Akademik

Add-in ini adalah alat bantu penulisan, bukan pengganti integritas akademik.

Jangan gunakan AI untuk:

- Mengarang data.
- Mengarang referensi.
- Mengarang kutipan.
- Mengarang hasil penelitian.
- Menyembunyikan plagiarisme.
- Membuat klaim yang tidak didukung bukti.

Selalu verifikasi isi, data, metode, dan referensi sebelum naskah dikirim ke jurnal.

## 18. Future Improvement: Long Document Chunking

Untuk MVP, teks terpilih diproses dalam satu request.

Untuk dokumen panjang, teks sebaiknya diproses per paragraf atau per heading. Jangan langsung mengirim seluruh dokumen dalam satu request.

Chunking membantu:

- Mengurangi timeout.
- Menjaga kualitas output.
- Memudahkan review hasil.
- Mengurangi risiko perubahan besar yang tidak terkontrol.

Mode masa depan:

1. Process selected paragraphs.
2. Process current section.
3. Process full document by chunks.
4. Review changes one by one.

## 19. Future Improvement Lain

- History hasil AI.
- Mode komentar/review di margin dokumen.
- Sitasi dan referensi dengan integrasi reference manager.
- Multi-user authentication.
- Usage limit per user.
- Custom prompt profile.
- Template jurnal per kampus/penerbit.
- Export perubahan sebagai changelog revisi.

## 20. Script Package

```bash
npm run dev
npm run build
npm run preview
npm run typecheck
npm run lint
```

## 21. Format AI API

Backend menganggap AI API kompatibel dengan OpenAI Chat Completions:

```http
POST {AI_API_BASE_URL}/chat/completions
Authorization: Bearer {AI_API_KEY}
Content-Type: application/json
```

Body:

```json
{
  "model": "AI_MODEL",
  "messages": [
    {
      "role": "system",
      "content": "systemPrompt"
    },
    {
      "role": "user",
      "content": "userText"
    }
  ],
  "temperature": 0.3
}
```

Backend mengambil hasil dari:

```text
data.choices[0].message.content
```

Jika format response berbeda atau kosong, backend mengembalikan error yang jelas.