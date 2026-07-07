# Jurnal AI Assistant

Microsoft Word Add-in production-ready berbasis TypeScript, Office.js, Vite, dan Vercel Serverless Functions untuk membantu menulis, merapikan, menyusun, dan mereview naskah jurnal akademik dengan AI API pribadi.

## 1. Deskripsi Project

**Jurnal AI Assistant** membantu pengguna Microsoft Word memilih teks di dokumen, mengirim teks tersebut ke backend serverless yang aman, memanggil AI API kompatibel OpenAI Chat Completions, lalu menampilkan hasilnya sebagai preview sebelum dimasukkan kembali ke dokumen.

Frontend tidak pernah menyimpan atau mengekspos API key. Semua credential hanya digunakan di backend melalui environment variables.

## 2. Fitur Utama

- Membaca teks yang sedang dipilih di Microsoft Word.
- Mengirim teks terpilih ke endpoint backend Vercel.
- Memanggil AI API melalui serverless function.
- Preview hasil AI di task pane.
- Kontrol manual:
  - Replace selected text
  - Insert below selection
  - Copy result
  - Clear result
- Mode bahasa:
  - Indonesia
  - English
- Gaya penulisan:
  - Academic Journal
  - Formal
  - Concise
  - Critical Review
- Aksi AI:
  - Rapikan Bahasa Akademik
  - Parafrase
  - Buat Abstrak
  - Buat Outline Jurnal
  - Perkuat Argumen
  - Ringkas Teks
- Validasi request, CORS, error handling aman, dan environment variable untuk credential.

## 3. Arsitektur Singkat

```text
Microsoft Word
  ↓ Office.js
Task Pane Frontend
  ↓ fetch relative path /api/ai/*
Vercel Serverless API
  ↓ Authorization Bearer dari environment variable
AI API kompatibel OpenAI Chat Completions
  ↓
Preview hasil di task pane
  ↓ user action
Dokumen Word
```

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
- Native fetch
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
│     ├─ icon-16.png
│     ├─ icon-32.png
│     ├─ icon-64.png
│     └─ icon-80.png
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

Server development akan berjalan di:

```text
https://localhost:3000
```

Task pane development manifest diarahkan ke:

```text
https://localhost:3000/src/taskpane/taskpane.html
```

Catatan: Microsoft Office Add-in membutuhkan HTTPS. Project ini dikonfigurasi agar Vite menggunakan HTTPS lokal.

## 8. Membuat File `.env` Lokal

Copy file contoh:

```bash
cp .env.example .env
```

Isi sesuai AI API Anda:

```env
AI_API_KEY="sk-your-ai-api-key"
AI_API_BASE_URL="https://api.openai.com/v1"
AI_MODEL="gpt-3.5-turbo"
MAX_INPUT_CHARS=50000
ALLOWED_ORIGIN=""
```

Untuk development, `ALLOWED_ORIGIN` boleh dikosongkan. Untuk production, isi dengan domain Vercel Anda.

## 9. Test Endpoint API

Setelah project berjalan di Vercel atau melalui local server yang mendukung functions, test endpoint:

```bash
curl -X POST "https://YOUR-VERCEL-DOMAIN.vercel.app/api/ai/rewrite" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Penelitian ini penting untuk dilakukan karena memberikan dampak terhadap kualitas pembelajaran.",
    "language": "id",
    "style": "academic journal",
    "userInstructions": "buat lebih formal dan ringkas"
  }'
```

Response sukses:

```json
{
  "result": "..."
}
```

Response error:

```json
{
  "error": "pesan error yang jelas"
}
```

## 10. Sideload Add-in ke Microsoft Word

### Development

1. Jalankan:

   ```bash
   npm run dev
   ```

2. Gunakan file:

   ```text
   manifest.xml
   ```

3. Sideload ke Word sesuai platform:
   - Word desktop: gunakan shared folder catalog atau menu add-ins developer.
   - Word web: upload manifest melalui Office Add-ins.

### Production

Gunakan:

```text
manifest.production.xml
```

Pastikan semua URL `https://YOUR-VERCEL-DOMAIN.vercel.app` sudah diganti dengan domain Vercel asli.

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

Isi di dashboard Vercel:

```env
AI_API_KEY=isi_api_key_anda
AI_API_BASE_URL=https://api.openai.com/v1
AI_MODEL=gpt-3.5-turbo
MAX_INPUT_CHARS=50000
ALLOWED_ORIGIN=https://YOUR-VERCEL-DOMAIN.vercel.app
```

Catatan keamanan:

- Jangan commit `.env`.
- Jangan hardcode API key.
- Jangan menaruh API key di frontend.
- Jangan membagikan API key ke teman.
- Jika API key bocor, segera rotate/regenerate API key.

## 14. Mengganti `manifest.production.xml` ke Domain Vercel

Setelah deploy, ganti semua:

```text
https://YOUR-VERCEL-DOMAIN.vercel.app
```

menjadi domain asli, contoh:

```text
https://jurnal-ai-assistant.vercel.app
```

Pastikan URL task pane dapat diakses:

```text
https://jurnal-ai-assistant.vercel.app/src/taskpane/taskpane.html
```

## 15. Membagikan Add-in ke Teman

1. Deploy project ke Vercel.
2. Set environment variables di Vercel.
3. Update `manifest.production.xml` dengan domain Vercel asli.
4. Kirim file `manifest.production.xml` ke teman.
5. Teman melakukan sideload manifest ke Microsoft Word.

API key tetap aman karena hanya berada di backend Vercel Anda.

## 16. Catatan Keamanan API Key

- Frontend hanya memanggil relative endpoint `/api/ai/*`.
- API key hanya dibaca di backend dari environment variable.
- Backend tidak mengirim API key ke client.
- Backend tidak menampilkan stack trace ke frontend.
- Hindari logging full text user di production.
- Gunakan `ALLOWED_ORIGIN` di production untuk membatasi origin.
- Pertimbangkan rate limit dan auth tambahan jika add-in dibagikan luas.

## 17. Catatan Etika Akademik

Add-in ini adalah alat bantu penulisan, bukan pengganti tanggung jawab akademik penulis.

Rekomendasi penggunaan:

- Gunakan untuk memperbaiki kejelasan bahasa, struktur argumen, dan ringkasan.
- Tetap verifikasi semua hasil AI.
- Jangan menggunakan AI untuk membuat data, referensi, kutipan, atau klaim palsu.
- Pastikan penggunaan AI sesuai kebijakan kampus, jurnal, atau institusi.
- Jika diperlukan, nyatakan penggunaan AI secara transparan sesuai aturan publikasi.

## 18. Future Improvement: Long Document Chunking

Untuk MVP, add-in memproses selected text dalam satu request.

Untuk dokumen panjang, teks sebaiknya diproses per paragraf atau per heading, bukan langsung mengirim seluruh dokumen dalam satu request. Chunking membantu:

- Mengurangi risiko timeout.
- Menjaga kualitas output.
- Memudahkan review perubahan.
- Menghindari konteks terlalu panjang.
- Memberikan kontrol granular kepada user.

Mode masa depan:

1. Process selected paragraphs
2. Process current section
3. Process full document by chunks
4. Review changes one by one

## 19. Future Improvement Lainnya

- History hasil AI.
- Mode komentar/review.
- Sitasi dan referensi.
- Multi-user auth.
- Usage limit.
- Custom prompt profile.