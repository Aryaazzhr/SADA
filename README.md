# SADA — Sistem Auditori Deteksi AI

Platform web untuk mendeteksi apakah suara berasal dari AI atau manusia.
Stack: **React 19 + Tailwind + shadcn/ui + FastAPI + MongoDB**.

## Struktur
```
backend/        FastAPI (mock detection engine)
frontend/       React app (glassmorphism UI, bilingual ID/EN)
design_guidelines.json
```

## Menjalankan secara lokal

### Backend
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# .env (contoh)
# MONGO_URL="mongodb://localhost:27017"
# DB_NAME="sada"
# CORS_ORIGINS="*"

uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

### Frontend
```bash
cd frontend
yarn install

# .env (contoh)
# REACT_APP_BACKEND_URL=http://localhost:8001

yarn start
```

## Endpoints
- `GET  /api/`                   health check
- `POST /api/detect`             body: `{filename, duration_seconds, source, size_bytes, mime_type}` → returns `{label: "ai"|"human", confidence, breakdown}`
- `GET  /api/history?limit=&label=`
- `GET  /api/history/{id}`
- `DELETE /api/history/{id}`
- `DELETE /api/history`
- `GET  /api/stats`              total, ratio, last_7_days

## Mengganti mesin deteksi (mock → ML real)
Buka `backend/server.py` → fungsi `_mock_detect()`.
Ganti isinya dengan panggilan ke model ML / Hugging Face / endpoint internal Anda.
Bentuk return tetap: `{"label": "ai|human", "confidence": float, "breakdown": {ai, human, noise}}`.

## Bilingual
Semua string ada di `frontend/src/lib/i18n.js` (objek `dictionary.id` & `dictionary.en`).
Toggle bahasa tersimpan di `localStorage` (`sada_lang`).

## Halaman
- `/`           Landing (hero + fitur)
- `/detector`   Upload / Record + Result
- `/dashboard`  Statistik + chart 7 hari + history
- `/about`      Penjelasan sistem
