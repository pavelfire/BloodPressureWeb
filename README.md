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

## Production deploy (GitHub Actions + VPS)

```bash
git tag v0.0.1
git push origin v0.0.1
```

Сборка выполняется в CI, сервер только скачивает готовый Docker-образ из GHCR.

### 1. GitHub Secrets

В репозитории `BloodPressureWeb` → Settings → Secrets and variables → Actions:

| Secret | Описание |
|--------|----------|
| `VITE_DEFAULT_API_URL` | URL API без `/api/v1`, например `https://apibp.tmp.ru` |
| `SSH_HOST` | IP или домен VPS |
| `SSH_USER` | пользователь SSH |
| `SSH_PRIVATE_KEY` | приватный SSH-ключ для деплоя |
| `DEPLOY_PATH` | путь на сервере; на production VPS: `/opt/bloodpressure-web/BloodPressureWeb` (fallback в CI, если secret не задан) |

### 2. Подготовка сервера (один раз)

На VPS, где уже работает [BloodPressureBackend](https://github.com/pavelfire/BloodPressureBackend) в `/opt/bloodpressure-api/BloodPressureBackend` с [nginx-proxy](https://github.com/nginx-proxy/nginx-proxy) и Docker-сетью `web`:

**Deploy path на VPS:**

```
/opt/bloodpressure-web/BloodPressureWeb
```

Проверка после установки:

```bash
ls /opt/bloodpressure-web/BloodPressureWeb/docker-compose.prod.yml
```

Установка:

```bash
mkdir -p /opt/bloodpressure-web
cd /opt/bloodpressure-web
git clone https://github.com/pavelfire/BloodPressureWeb.git
cd BloodPressureWeb
cp .env.example .env
```

Отредактируйте `.env`:

| Переменная | Описание |
|------------|----------|
| `WEB_IMAGE` | образ из GHCR, например `ghcr.io/pavelfire/bloodpressureweb:latest` |
| `VIRTUAL_HOST` | домен веб-приложения, например `bp.tmp.ru` |
| `LETSENCRYPT_HOST` | тот же домен для SSL |
| `LETSENCRYPT_EMAIL` | email для Let's Encrypt |

Если репозиторий приватный, на сервере один раз выполните login в GHCR:

```bash
echo YOUR_GITHUB_PAT | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin
```

Первый запуск:

```bash
docker compose -f docker-compose.prod.yml --env-file .env pull
docker compose -f docker-compose.prod.yml --env-file .env up -d
```
так же вариант
docker build \
  --build-arg VITE_DEFAULT_API_URL=https://apibp.tmp.ru \
  -t ghcr.io/pavelfire/bloodpressureweb:latest .
docker compose -f docker-compose.prod.yml --env-file .env up -d

### 3. Автодеплой

При push тега `v*` (например `v0.0.1`):

1. GitHub Actions запускает `npm test`
2. Собирает Docker-образ с `VITE_DEFAULT_API_URL` из secrets
3. Публикует образ в `ghcr.io/pavelfire/bloodpressureweb` (теги `latest` и версия, например `v0.0.1`)
4. По SSH на сервере выполняет `docker compose pull && up -d`

Повторный деплой существующего тега: Actions → Deploy → Run workflow → указать тег.

Проверка:

```bash
curl -I https://bp.tmp.ru
```

### 4. Ручной деплой (без CI)

```bash
cd /opt/bloodpressure-web/BloodPressureWeb
docker compose -f docker-compose.prod.yml --env-file .env pull
docker compose -f docker-compose.prod.yml --env-file .env up -d
```

### CORS

Убедитесь, что backend разрешает origin веб-приложения. В `BloodPressureBackend` для production можно задать `CORS_ORIGIN=https://bp.tmp.ru` или `*` для разработки.

Файл `.env` на сервер не коммитить — он в `.gitignore`.
