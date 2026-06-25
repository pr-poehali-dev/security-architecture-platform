# Локальная разработка

Руководство по запуску проекта полностью локально в Docker.  
В локальном режиме облачные функции заменяются локальным Python-сервером, а S3 — MinIO.

---

## Требования

| Инструмент | Версия |
|-----------|--------|
| Docker | 24+ |
| Docker Compose | 2.20+ |
| (опционально) bun | 1.x — для запуска без Docker |

---

## Быстрый старт

```bash
# 1. Клонировать репозиторий
git clone <repo-url>
cd <repo>

# 2. Создать файл переменных окружения
cp .env.local.example .env.local

# 3. Запустить все сервисы
docker compose -f docker-compose.local.yml up --build
```

После запуска доступны:

| Сервис | URL |
|--------|-----|
| Frontend (Vite dev) | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| MinIO Console | http://localhost:9001 |
| PostgreSQL | localhost:5432 |

---

## Архитектура локального окружения

```
┌─────────────────────────────────────────────────────────────┐
│  docker-compose.local.yml                                   │
│                                                             │
│  ┌──────────┐    HTTP     ┌─────────────────────────────┐  │
│  │ frontend │ ──:8000──▶  │        backend              │  │
│  │  Vite    │             │  local_runner.py (Flask)    │  │
│  │  :5173   │             │  /org-domains               │  │
│  └──────────┘             │  /tech-domains              │  │
│                           │  /technologies              │  │
│                           │  /requirements              │  │
│                           │  /decisions                 │  │
│                           │  /hardening                 │  │
│                           │  /arch-templates            │  │
│                           └──────────┬──────────────────┘  │
│                                      │                      │
│                           ┌──────────▼──────────────────┐  │
│                           │       db (PostgreSQL)        │  │
│                           │       :5432                  │  │
│                           └─────────────────────────────┘  │
│                           ┌─────────────────────────────┐  │
│                           │       minio (S3)             │  │
│                           │       API :9000              │  │
│                           │       Console :9001          │  │
│                           └─────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## Переменные окружения (.env.local)

Файл `.env.local` содержит переменные для всех сервисов:

### Frontend (VITE_*)
Передаются в Vite как env-переменные и используются в `src/api/*.ts`.

```bash
VITE_ORG_DOMAINS_URL=http://localhost:8000/org-domains
VITE_TECH_DOMAINS_URL=http://localhost:8000/tech-domains
VITE_TECHNOLOGIES_URL=http://localhost:8000/technologies
VITE_REQUIREMENTS_URL=http://localhost:8000/requirements
VITE_DECISIONS_URL=http://localhost:8000/decisions
VITE_HARDENING_URL=http://localhost:8000/hardening
VITE_ARCH_TEMPLATES_URL=http://localhost:8000/arch-templates
```

> Внутри Docker Compose фронтенд доступен на `localhost:5173`, а запросы к backend
> идут на `localhost:8000`. В `Dockerfile.dev` `VITE_*` читаются из `.env.local`.

### Backend
```bash
# PostgreSQL — строка подключения
DATABASE_URL=postgresql://sa_user:sa_pass@db:5432/security_arch

# S3 (MinIO)
AWS_ACCESS_KEY_ID=minioadmin
AWS_SECRET_ACCESS_KEY=minioadmin
S3_ENDPOINT_URL=http://minio:9000
```

> Внутри контейнера `backend` хост БД — `db` (имя сервиса в Compose), не `localhost`.

---

## Как работает backend/local_runner.py

Cloud Functions в продакшене принимают вызов в формате:

```python
def handler(event: dict, context) -> dict:
    ...
```

`local_runner.py` — Flask-сервер, который:
1. Принимает HTTP-запросы на `/org-domains`, `/tech-domains`, и т.д.
2. Преобразует Flask-запрос в словарь `event` нужного формата
3. Динамически загружает `backend/<name>/index.py` и вызывает `handler(event, context)`
4. Возвращает ответ клиенту

Это позволяет запускать ровно тот же Python-код, что уходит в облако, без изменений.

---

## Миграции БД

**Миграции применяются автоматически** при первом старте контейнера `db`.

### Как это работает

При первом запуске PostgreSQL выполняет скрипт `docker/db-init/01_migrations.sh`, который:
1. Создаёт схему `t_p84706301_security_architectur`
2. Применяет все `*.sql` из `db_migrations/` в алфавитном (версионном) порядке
3. Пропускает файлы с ошибкой (уже применённые повторно не ломают БД)

```
db_migrations/
  V0001__create_org_domains.sql       ← применится 1-м
  V0002__create_tech_domains.sql      ← применится 2-м
  ...
  V0018__add_iod_to_env_status.sql    ← применится последним
```

> Скрипт запускается **только при первом старте** (пустой том `pg_data`).  
> При повторных запусках `docker compose up` данные и схема уже существуют.

### Сброс и повторное применение миграций

```bash
# Полный сброс БД (удаляет том pg_data) и повторный запуск с миграциями
docker compose -f docker-compose.local.yml down -v
docker compose -f docker-compose.local.yml up --build
```

### Добавление новой миграции

```bash
# Создать файл с следующим номером версии
touch db_migrations/V0019__my_change.sql
# Написать SQL, затем пересоздать БД или применить вручную:
docker compose -f docker-compose.local.yml exec db \
  psql -U sa_user -d security_arch -f /migrations/V0019__my_change.sql
```

### Прямое подключение к БД

```bash
psql postgresql://sa_user:sa_pass@localhost:5432/security_arch
```

---

## S3 / MinIO локально

MinIO полностью совместим с S3 API. После запуска:

- **Console**: http://localhost:9001 (login: `minioadmin` / `minioadmin`)
- **API**: http://localhost:9000

Bucket `files` создаётся автоматически сервисом `minio-init`.

> В продакшене S3 endpoint — `https://bucket.poehali.dev`.  
> В локальной среде backend использует `http://minio:9000` из переменной `S3_ENDPOINT_URL`.

**Важно**: если в `backend/*/index.py` endpoint захардкожен, нужно убедиться что `S3_ENDPOINT_URL`
или `endpoint_url` в `boto3.client()` переопределён через переменную окружения.

---

## Полезные команды

```bash
# Запустить все сервисы (с пересборкой)
docker compose -f docker-compose.local.yml up --build

# Запустить в фоне
docker compose -f docker-compose.local.yml up -d

# Остановить
docker compose -f docker-compose.local.yml down

# Остановить и удалить тома (полный сброс БД и MinIO)
docker compose -f docker-compose.local.yml down -v

# Логи конкретного сервиса
docker compose -f docker-compose.local.yml logs -f backend
docker compose -f docker-compose.local.yml logs -f frontend

# Перезапустить только backend после изменений в Python
docker compose -f docker-compose.local.yml restart backend

# Подключиться к БД
docker compose -f docker-compose.local.yml exec db \
  psql -U sa_user -d security_arch
```

---

## Разработка без Docker

Можно запускать сервисы по-отдельности:

### Frontend
```bash
bun install
cp .env.local.example .env.local
# Отредактируйте .env.local под локальные URL
bun run dev
```

### Backend
```bash
cd backend
pip install flask gunicorn psycopg2-binary boto3
export DATABASE_URL=postgresql://sa_user:sa_pass@localhost:5432/security_arch
export AWS_ACCESS_KEY_ID=minioadmin
export AWS_SECRET_ACCESS_KEY=minioadmin
python local_runner.py
```

### БД и MinIO через Docker
```bash
# Только инфраструктура без frontend/backend
docker compose -f docker-compose.local.yml up db minio minio-init
```

---

## Production-сборка локально

```bash
# Сборка в production-образ (nginx + статика)
cp .env.local.example .env.local
# Заполните VITE_*_URL реальными облачными URL или локальными

docker compose up --build
# Доступно на http://localhost:80
```

---

## Структура файлов локальной разработки

```
.
├── docker-compose.local.yml      # Dev-окружение: db + minio + backend + frontend
├── docker-compose.yml            # Production: только frontend (nginx)
├── Dockerfile                    # Production frontend (multi-stage: bun build → nginx)
├── Dockerfile.dev                # Dev frontend (Vite dev server с HMR)
├── backend/
│   ├── Dockerfile.local          # Backend: Python + Flask runner
│   ├── local_runner.py           # Flask-сервер, эмулирующий cloud functions
│   ├── org-domains/index.py
│   ├── tech-domains/index.py
│   ├── technologies/index.py
│   ├── requirements/index.py
│   ├── decisions/index.py
│   ├── hardening/index.py
│   └── arch-templates/index.py
├── .env.local.example            # Шаблон переменных для локальной разработки
├── .env.local                    # Ваши локальные переменные (не коммитить!)
├── db_migrations/                # SQL-миграции (V0001__... → V0018__...)
├── docker/
│   └── db-init/
│       └── 01_migrations.sh      # Авто-применение миграций при первом старте БД
└── docs/
    ├── ARCHITECTURE.md           # Архитектура проекта
    └── LOCAL_DEVELOPMENT.md      # Этот файл
```

---

## .gitignore

Убедитесь что `.env.local` добавлен в `.gitignore`:

```
.env.local
```