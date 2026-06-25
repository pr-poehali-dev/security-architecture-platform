# Инструкция по развёртыванию

## Быстрый старт

### Вариант 1 — Локально без Docker

**Требования:** Node.js 20+, Bun, Python 3.11+

```bash
# 1. Зависимости frontend
bun install

# 2. Настроить переменные окружения
cp .env.local.example .env.local
# Заменить в .env.local: db → localhost, minio → localhost

# 3. Запустить backend (локальный Flask-сервер на порту 8000)
pip install flask psycopg2-binary pydantic
python backend/webapp/local_runner.py

# 4. В отдельном терминале — запустить frontend (порт 5173)
bun run dev
```

Открыть: http://localhost:5173

---

### Вариант 2 — Docker (полный стек с hot reload)

**Требования:** Docker Engine 24+, Docker Compose v2

```bash
# 1. Скопировать файл переменных окружения
cp .env.local.example .env.local

# 2. Поднять все сервисы (PostgreSQL + MinIO + Backend + Frontend)
docker compose -f docker-compose.local.yml up --build
```

Доступные адреса:

| Сервис | Адрес |
|--------|-------|
| Frontend (Vite dev + HMR) | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| MinIO Console (S3 UI) | http://localhost:9001 (admin/minioadmin) |
| PostgreSQL | localhost:5432 |

```bash
# Остановить
docker compose -f docker-compose.local.yml down

# Остановить и сбросить все данные (БД + хранилище)
docker compose -f docker-compose.local.yml down -v
```

---

### Вариант 3 — Docker production-сборка

Собирает оптимизированный статический frontend, раздаёт через Nginx.  
Backend-функции при этом должны быть задеплоены отдельно (Cloud Functions).

```bash
# 1. Скопировать и заполнить env с URL облачных функций
cp .env.example .env
# Указать реальные VITE_*_URL

# 2. Собрать и запустить
docker compose up --build
```

Открыть: http://localhost

---

## Переменные окружения

### `.env.local` — локальная разработка (Docker)

```bash
# Frontend: куда отправлять запросы
VITE_ORG_DOMAINS_URL=http://localhost:8000/org-domains
VITE_TECH_DOMAINS_URL=http://localhost:8000/tech-domains
VITE_TECHNOLOGIES_URL=http://localhost:8000/technologies
VITE_REQUIREMENTS_URL=http://localhost:8000/requirements
VITE_DECISIONS_URL=http://localhost:8000/decisions
VITE_HARDENING_URL=http://localhost:8000/hardening
VITE_ARCH_TEMPLATES_URL=http://localhost:8000/arch-templates

# Backend: подключение к БД
# При запуске через Docker — оставить db:5432
# При запуске без Docker — заменить db → localhost
DATABASE_URL=postgresql://sa_user:sa_pass@db:5432/security_arch

# Backend: S3 (MinIO)
# При запуске через Docker — оставить minio:9000
# При запуске без Docker — заменить minio → localhost
AWS_ACCESS_KEY_ID=minioadmin
AWS_SECRET_ACCESS_KEY=minioadmin
S3_ENDPOINT_URL=http://minio:9000
```

---

## Структура Docker-файлов

| Файл | Назначение |
|------|------------|
| `Dockerfile` | Production: multi-stage сборка → Nginx |
| `Dockerfile.dev` | Dev: Vite dev server с HMR |
| `backend/webapp/Dockerfile.backend` | Backend: Python Flask runner |
| `docker-compose.yml` | Production (frontend + Nginx) |
| `docker-compose.dev.yml` | Dev: только frontend в Docker |
| `docker-compose.local.yml` | Полный локальный стек: DB + S3 + backend + frontend |

---

## Миграции БД

SQL-файлы в `db_migrations/` применяются автоматически при первом старте PostgreSQL-контейнера.

```bash
# Войти в БД вручную
docker compose -f docker-compose.local.yml exec db \
  psql -U sa_user -d security_arch
```

---

## Полезные команды

```bash
# Логи конкретного сервиса
docker compose -f docker-compose.local.yml logs -f backend
docker compose -f docker-compose.local.yml logs -f frontend

# Пересборка одного сервиса после изменений
docker compose -f docker-compose.local.yml up --build backend

# Войти в контейнер backend
docker compose -f docker-compose.local.yml exec backend bash

# Проверить работу backend
curl http://localhost:8000/health
```

---

## Развёртывание на poehali.dev

1. Открыть [poehali.dev](https://poehali.dev) → проект
2. В разделе **Ядро → Функции** убедиться, что все 7 функций задеплоены
3. Скопировать URL каждой функции в переменные окружения проекта
4. Нажать **Опубликовать** — frontend соберётся автоматически

Документация платформы: https://docs.poehali.dev/deploy/publish
