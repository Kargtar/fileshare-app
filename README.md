# fileshare-app

Aplikacja do tymczasowego udostępniania plików: wysyłasz plik, dostajesz link ważny 7 dni.
Pliki idą prosto z przeglądarki do S3 przez presigned URL-e, backend zajmuje się tylko
metadanymi w Valkey.

- `backend/` – Node.js + Express, API pod `/api`
- `frontend/` – React + Vite

Infrastruktura jest w fileshare-infra, a wdrożenie w fileshare-gitops.

## Lokalnie

```sh
cd backend && npm install && npm run dev     # http://localhost:3000
cd frontend && npm install && npm run dev    # http://localhost:5173, /api przekierowane na backend
```
