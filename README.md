# fileshare-app

Aplikacja do tymczasowego udostępniania plików: wysyłasz plik, dostajesz link ważny 7 dni.
Pliki idą prosto z przeglądarki do S3 przez presigned URL-e, a backend zajmuje się tylko
metadanymi w Valkey. Dzięki temu duże pliki nie obciążają klastra, a backend jest lekki
i bezstanowy.

Infrastruktura jest w fileshare-infra, a wdrożenie w fileshare-gitops.

## Zawartość

| Plik | Co robi |
|---|---|
| `backend/src/index.js` | Całe API: Express 5, klient Valkey (`iovalkey`), presigned URL-e z AWS SDK v3 |
| `frontend/src/App.jsx` | Wybór strony po adresie: `/d/{kod}` to pobieranie, wszystko inne to wysyłka |
| `frontend/src/Upload.jsx` | Formularz wysyłki i przycisk kopiowania linku |
| `frontend/src/Download.jsx` | Strona pobierania: nazwa, rozmiar, data wygaśnięcia i link do S3 |
| `frontend/src/api.js` | `fetch` z obsługą błędów API |
| `*/Containerfile` | Obrazy: backend na `node:24-alpine`, frontend budowany przez Vite i serwowany przez `nginx:1.30-alpine` |
| `.github/workflows/build.yml` | CI: obrazy na DockerHub i podbicie tagów w fileshare-gitops |

## Jak to działa

Wysyłka:

1. Frontend wysyła `POST /api/files` z nazwą, typem i rozmiarem pliku.
2. Backend sprawdza limit rozmiaru, losuje 8-znakowy kod i zapisuje w Valkey wpis `file:{kod}`
   ze statusem `pending` i TTL 1 godziny. W odpowiedzi daje kod i presigned URL do `PUT`.
3. Przeglądarka wysyła plik bezpośrednio do S3 pod klucz `files/{kod}`.
4. Frontend wywołuje `POST /api/files/{kod}/complete`. Backend sprawdza w S3 (`HeadObject`),
   czy plik dotarł i ma zgłoszony rozmiar, po czym zmienia status na `ready` z TTL 7 dni.

Pobieranie:

1. Odbiorca otwiera `/d/{kod}`, a frontend pyta `GET /api/files/{kod}`.
2. Brak wpisu albo status `pending` daje 404. W przeciwnym razie backend zwraca metadane
   i presigned URL do pobrania, ważny godzinę, z oryginalną nazwą pliku w `Content-Disposition`.

Kiedy TTL w Valkey minie, wpis znika i link przestaje działać. Sam plik usuwa z S3 reguła
lifecycle po 8 dniach.

## API

| Metoda i ścieżka | Odpowiedź |
|---|---|
| `POST /api/files` | `201 { code, uploadUrl }`, `400` złe dane, `413` za duży plik |
| `POST /api/files/{kod}/complete` | `200 { code, expiresAt }`, `400` pliku nie ma w S3, `404` |
| `GET /api/files/{kod}` | `200 { filename, contentType, size, expiresAt, downloadUrl }`, `404` |
| `GET /healthz` | `200`, gdy proces działa (liveness) |
| `GET /ready` | `200`, gdy jest połączenie z Valkey, inaczej `503` (readiness) |

Błędy mają postać `{ "error": { "code": "...", "message": "..." } }`, a `message` jest gotowym
komunikatem dla użytkownika.

Konfiguracja backendu przez zmienne środowiskowe: `S3_BUCKET`, `AWS_REGION`, `VALKEY_URL`,
`VALKEY_PASSWORD`, `MAX_FILE_SIZE` (bajty, domyślnie 100 MB), `PORT` (domyślnie 3000).

## Decyzje projektowe

- **Credentials AWS z IRSA.** W kodzie nie ma kluczy. SDK sam bierze tymczasowe poświadczenia
  roli `fileshare-backend`, które EKS wstrzykuje do poda. Rola ma tylko `GetObject` i `PutObject`.
- **Rozmiar sprawdzany przy `complete`.** Presigned `PUT` nie pozwala wymusić rozmiaru, więc
  backend porównuje go z tym, co faktycznie jest w S3.
- **Bez sum kontrolnych w presigned URL** (`requestChecksumCalculation: 'WHEN_REQUIRED'`).
  Domyślnie SDK dopisuje do URL-a sumę pustego body i upload z przeglądarki się nie udaje.
- **Valkey bez kolejki offline.** Gdy Valkey nie działa, zapytania od razu dostają błąd, a `/ready`
  zwraca 503, więc Kubernetes przestaje kierować ruch do poda.
- **Bez biblioteki routingu.** Są dwie strony, a nginx (`try_files`) dla każdej ścieżki zwraca
  `index.html`, więc wystarczy sprawdzić adres.
- **Kopiowanie linku przez zaznaczenie tekstu.** `navigator.clipboard` wymaga HTTPS, a aplikacja
  działa po HTTP, więc przycisk zaznacza link i używa `document.execCommand('copy')`.

## Lokalnie

Backend potrzebuje Valkey, a do wysyłania plików także bucketu S3 i credentials AWS
(np. `AWS_PROFILE`):

```sh
podman run -d --name valkey -p 6379:6379 valkey/valkey:9.1-alpine
cd backend && npm install && S3_BUCKET=fileshare-files-<ID konta> npm run dev   # http://localhost:3000
cd frontend && npm install && npm run dev   # http://localhost:5173, /api przekierowane na backend
```

## CI

Każdy push na `main` buduje oba obrazy, wypycha je na DockerHub z tagiem = SHA commita
i podbija ten tag w fileshare-gitops, a ArgoCD wdraża nową wersję. W ustawieniach repo
(Settings → Secrets and variables → Actions) potrzebne są:

- zmienna `DOCKERHUB_USERNAME`
- sekret `DOCKERHUB_TOKEN` – access token z DockerHub (Read & Write)
- sekret `GITOPS_TOKEN` – fine-grained token GitHub z `Contents: Read and write` tylko na fileshare-gitops
