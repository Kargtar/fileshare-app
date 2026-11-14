# fileshare-app

Aplikacja do tymczasowego udostępniania plików: wysyłasz plik, dostajesz link ważny 7 dni.
Pliki idą prosto z przeglądarki do S3 przez presigned URL-e, backend zajmuje się tylko
metadanymi w Valkey.

- `backend/` – Node.js + Express, API pod `/api`
- `frontend/` – React + Vite

Infrastruktura jest w fileshare-infra, a wdrożenie w fileshare-gitops.

## Lokalnie

Backend potrzebuje Valkey:

```sh
podman run -d --name valkey -p 6379:6379 valkey/valkey:9.1-alpine
cd backend && npm install && npm run dev    # http://localhost:3000
cd frontend && npm install && npm run dev    # http://localhost:5173, /api przekierowane na backend
```

## CI

Każdy push na `main` buduje oba obrazy, wypycha je na DockerHub z tagiem = SHA commita
i podbija ten tag w fileshare-gitops, a ArgoCD wdraża nową wersję. W ustawieniach repo
(Settings → Secrets and variables → Actions) potrzebne są:

- zmienna `DOCKERHUB_USERNAME`
- sekret `DOCKERHUB_TOKEN` – access token z DockerHub (Read & Write)
- sekret `GITOPS_TOKEN` – fine-grained token GitHub z `Contents: Read and write` tylko na fileshare-gitops
