# BloodPressureWeb

React + Vite + TypeScript web client with Android parity over the same API:

- Auth: register/login/refresh/logout/me
- Offline-first readings storage in IndexedDB
- Sync protocol via `POST /api/v1/sync`
- Home, History, Add/Edit, Analytics, Export/Import, Settings

## Local development

```bash
npm install
npm run dev
```

Default API URL in dev: `http://localhost:8080` (override in Settings).

## Test

```bash
npm test
npm run test:e2e
```

## Production (VPS + nginx-proxy)

На том же сервере, где уже развёрнут [BloodPressureBackend](https://github.com/pavelfire/BloodPressureBackend) с [jwilder/nginx-proxy](https://github.com/nginx-proxy/nginx-proxy) и Let's Encrypt (Docker-сеть `web`).

### 1. Подготовка на сервере

```bash
git clone https://github.com/pavelfire/BloodPressureWeb.git
cd BloodPressureWeb
cp .env.example .env
```

Отредактируйте `.env`:

| Переменная | Описание |
|------------|----------|
| `VITE_DEFAULT_API_URL` | URL API без `/api/v1`, например `https://apibp.tmp.ru` |
| `VIRTUAL_HOST` | домен веб-приложения, например `bp.tmp.ru` |
| `LETSENCRYPT_HOST` | тот же домен для SSL |
| `LETSENCRYPT_EMAIL` | email для Let's Encrypt |

### 2. Запуск

```bash
docker compose -f docker-compose.prod.yml --env-file .env up -d --build
```

Проверка:

```bash
curl -I https://bp.tmp.ru
```

В браузере откройте `https://bp.tmp.ru` — по умолчанию API уже указывает на production backend.

### 3. Обновление после изменений

```bash
git pull
docker compose -f docker-compose.prod.yml --env-file .env up -d --build
```

### CORS

Убедитесь, что backend разрешает origin веб-приложения. В `BloodPressureBackend` для production можно задать `CORS_ORIGIN=https://bp.tmp.ru` или `*` для разработки.

Файл `.env` с доменами на сервер не коммитить — он в `.gitignore`.
