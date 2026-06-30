# Инструкция по развёртыванию

## Быстрый старт — Docker (полный локальный стек)

**Требования:** Docker Desktop 4.x+, Docker Compose v2

```bash
# 1. Поднять все сервисы: PostgreSQL + MinIO + Backend + Frontend (Nginx)
docker compose -f docker-compose.local.yml up --build
```

Доступные адреса после запуска:

| Сервис | Адрес |
|--------|-------|
| Frontend (Nginx) | http://localhost |
| Backend API | http://localhost:8000 |
| MinIO Console (S3 UI) | http://localhost:9001 (minioadmin / minioadmin) |
| PostgreSQL | localhost:5432 (sa_user / sa_pass) |

```bash
# Остановить
docker compose -f docker-compose.local.yml down

# Остановить и сбросить все данные (БД + S3)
docker compose -f docker-compose.local.yml down -v
```

---

## Как это работает

```
Browser → Nginx :80 (статика React SPA)
              ↕ VITE_*_URL = http://localhost:8000/...
Backend FastAPI :8000 → PostgreSQL :5432
                      → MinIO S3    :9000
```

При первом запуске PostgreSQL автоматически применяет все SQL-миграции из `db_migrations/`.

---

## Структура Docker-файлов

| Файл | Назначение |
|------|------------|
| `Dockerfile` | Production frontend: multi-stage сборка → Nginx |
| `Dockerfile.dev` | Dev frontend: Vite dev server с HMR |
| `backend/webapp/Dockerfile.backend` | Backend: Python FastAPI |
| `backend/webapp/main.py` | Единый FastAPI-сервер со всеми 7 роутами |
| `docker-compose.local.yml` | Полный локальный стек: DB + S3 + Backend + Frontend |

---

## Пересборка после изменений

```bash
# Пересобрать только backend (после правок в backend/webapp/main.py)
docker compose -f docker-compose.local.yml up --build backend

# Пересобрать только frontend (после правок в src/)
docker compose -f docker-compose.local.yml up --build frontend

# Посмотреть логи
docker compose -f docker-compose.local.yml logs -f backend
docker compose -f docker-compose.local.yml logs -f frontend

# Войти в контейнер backend
docker compose -f docker-compose.local.yml exec backend bash

# Проверить работу backend
curl http://localhost:8000/health

# Войти в БД
docker compose -f docker-compose.local.yml exec db psql -U sa_user -d security_arch
```

---

## Локальный запуск без Docker

**Требования:** Node.js 20+, Bun, Python 3.11+, PostgreSQL 16, MinIO

```bash
# 1. Зависимости frontend
bun install

# 2. Зависимости backend
pip install -r backend/webapp/requirements.txt

# 3. Запустить backend (порт 8000)
DATABASE_URL=postgresql://sa_user:sa_pass@localhost:5432/security_arch \
  S3_ENDPOINT_URL=http://localhost:9000 \
  AWS_ACCESS_KEY_ID=minioadmin \
  AWS_SECRET_ACCESS_KEY=minioadmin \
  uvicorn backend.webapp.main:app --host 0.0.0.0 --port 8000 --reload

# 4. В отдельном терминале — запустить frontend (порт 5173)
VITE_ORG_DOMAINS_URL=http://localhost:8000/org-domains \
  VITE_TECH_DOMAINS_URL=http://localhost:8000/tech-domains \
  VITE_TECHNOLOGIES_URL=http://localhost:8000/technologies \
  VITE_REQUIREMENTS_URL=http://localhost:8000/requirements \
  VITE_DECISIONS_URL=http://localhost:8000/decisions \
  VITE_HARDENING_URL=http://localhost:8000/hardening \
  VITE_ARCH_TEMPLATES_URL=http://localhost:8000/arch-templates \
  bun run dev
```

---

## Развёртывание на poehali.dev (production)

1. Открыть [poehali.dev](https://poehali.dev) → проект
2. В разделе **Ядро → Функции** убедиться, что все 7 функций задеплоены
3. Нажать **Опубликовать** — frontend соберётся автоматически

Документация: https://docs.poehali.dev/deploy/publish
