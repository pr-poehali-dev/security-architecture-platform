# Security Architecture Portal — Руководство

Корпоративный портал управления архитектурными артефактами безопасности. SPA-приложение для ведения организационных и технических доменов, технологий, требований, архитектурных решений, харденинга и шаблонов архитектур.

---

## Содержание

- [Стек технологий](#стек-технологий)
- [Архитектура системы](#архитектура-системы)
- [Структура проекта](#структура-проекта)
- [Модули приложения](#модули-приложения)
- [База данных](#база-данных)
- [Запуск в Docker](#запуск-в-docker)
- [Переменные окружения](#переменные-окружения)
- [Backend API](#backend-api)

---

## Стек технологий

| Слой | Технология |
|---|---|
| Frontend | React 18, TypeScript, Vite 7, Tailwind CSS 3 |
| UI-компоненты | shadcn/ui, Radix UI, lucide-react |
| Диаграммы | Mermaid 11, Recharts |
| Формы | react-hook-form + Zod |
| Backend | Python 3.11, Cloud Functions |
| БД | PostgreSQL (psycopg2, Simple Query Protocol) |
| Файлы | S3-совместимое хранилище (bucket.poehali.dev) |
| CDN | cdn.poehali.dev |

---

## Архитектура системы

```
┌─────────────────────────────────┐
│         Browser (SPA)           │
│    React + Vite + TypeScript    │
│         port 5173 / 80          │
└────────────┬────────────────────┘
             │ HTTP (fetch)
             │ URLs из func2url.json
             ▼
┌─────────────────────────────────┐
│       Cloud Functions           │
│   7 Python 3.11 функций         │
│   (org-domains, tech-domains,   │
│    technologies, requirements,  │
│    decisions, hardening,        │
│    arch-templates)              │
└──────┬──────────────┬───────────┘
       │              │
       ▼              ▼
┌──────────┐   ┌─────────────┐
│PostgreSQL│   │  S3 Storage │
│   БД     │   │  (файлы)    │
└──────────┘   └─────────────┘
```

---

## Структура проекта

```
/
├── src/
│   ├── App.tsx                   # Роутинг
│   ├── main.tsx                  # Точка входа
│   ├── index.css                 # Глобальные стили / CSS-переменные
│   ├── api/                      # HTTP-клиенты для каждого модуля
│   │   ├── orgDomains.ts
│   │   ├── techDomains.ts
│   │   ├── technologies.ts
│   │   ├── requirements.ts
│   │   ├── decisions.ts
│   │   ├── hardening.ts
│   │   └── archTemplates.ts
│   ├── components/
│   │   ├── Layout.tsx            # Основной лейаут с навигацией
│   │   ├── SectionContent.tsx
│   │   ├── ui/                   # shadcn/ui компоненты (46 штук)
│   │   └── technologies/         # Специфичные компоненты
│   │       ├── MermaidEditor.tsx
│   │       ├── MermaidPreview.tsx
│   │       ├── MarkdownViewer.tsx
│   │       ├── FileAttachments.tsx
│   │       └── TagInput.tsx
│   ├── hooks/
│   │   ├── useNavCounts.ts       # Счётчики в навигации
│   │   ├── useFormCache.ts       # Кэш черновиков форм
│   │   └── use-mobile.tsx
│   └── pages/
│       ├── org-domains/          # Организационные домены
│       ├── tech-domains/         # Технические домены
│       ├── technologies/         # Технологии
│       ├── requirements/         # Требования
│       ├── decisions/            # Решения (ТОС)
│       ├── hardening/            # Харденинг
│       └── arch-templates/       # Шаблоны архитектур
├── backend/
│   ├── org-domains/index.py
│   ├── tech-domains/index.py
│   ├── technologies/index.py
│   ├── requirements/index.py
│   ├── decisions/index.py
│   ├── hardening/index.py
│   └── arch-templates/index.py
├── db_migrations/                # SQL-миграции (Flyway-совместимые)
├── func2url.json                 # Маппинг функций → URL облачных функций
├── Dockerfile                    # Многоэтапная сборка frontend
├── Dockerfile.dev                # Dev-контейнер с hot reload
├── docker-compose.yml            # Production-стек
├── docker-compose.dev.yml        # Dev-стек
├── nginx.conf                    # Nginx SPA-конфиг
└── .env.example                  # Пример переменных окружения
```

---

## Модули приложения

### 1. Организационные домены `/org-domain`
Верхний уровень иерархии. Бизнес-области организации.

**Поля:** Название, Владелец, Статус, Описание  
**Статусы:** `active` | `in_development` | `inactive` | `archived`  
**Версионирование:** X.Y (minor инкремент при каждом изменении)

---

### 2. Технические домены `/tech-domain`
Технические области, привязанные к организационным доменам (M:M).

**Поля:** Название, Владелец, Статус, Описание, Org Domains  
**Особенность:** Snapshot org_domain_ids сохраняется в каждой версии

---

### 3. Технологии `/technologies`
Технологический стек с тегами, Mermaid-диаграммами и файлами.

**Поля:** Название, Владелец, Статус, Описание, Теги  
**Вложения:** Mermaid-схемы, файлы (S3)  
**Автодополнение тегов:** `GET /?tags_suggest=<query>`

---

### 4. Требования `/requirements`
Архитектурные требования и требования безопасности с типизацией и весами для оценки.

**Поля:** ID, Краткое описание, Тип, Владелец, Статус, Нормативный документ, Метрики контроля, Метод выполнения, Закупочное, Балл (1–4), Вес (1–10)  
**Типы:** `technical` | `functional` | `non_functional` | `organizational`  
**Связи:** Теги, Технологии, Технический домен

---

### 5. Решения (ТОС) `/solutions`
Технические и организационные решения с перекрёстными ссылками.

**Поля:** Название, Тип (technical/organizational), Владелец, Статус, Описание  
**Вложения:** Теги, Технологии, Mermaid-схемы, Файлы, Связанные решения (M:M самосвязь)

---

### 6. Харденинг `/hardening`
Практики усиления безопасности с секционированными требованиями и оценкой по средам.

**Поля:** Название, Владелец, Статус, Описание, Теги  
**Требования:** секции с markdown-телом, изображениями и статусами по средам  
**Среды:** `development` | `staging` | `production` | `test`  
**Статусы требования:** `compliant` | `partial` | `non_compliant` | `not_applicable`  
**Связанные решения:** M:M через `hardening_solutions`

---

### 7. Шаблоны архитектур `/templates`
Переиспользуемые шаблоны технических и организационных архитектурных решений.

**Поля:** Название, Тип (technical/organizational), Владелец, Статус, Описание, Версия  
**Вложения:** Теги, Технологии, Решения, Mermaid-схемы, Файлы, Внешние ссылки, Требования

---

## База данных

### Схема: `t_p84706301_security_architectur`

```mermaid
erDiagram

    org_domains {
        text id PK
        text name
        text owner
        text status
        text description
        timestamptz created_at
        timestamptz updated_at
    }
    org_domain_versions {
        serial id PK
        text domain_id FK
        text version
        text name
        text owner
        text status
        text description
        timestamptz changed_at
        text change_note
    }

    tech_domains {
        text id PK
        text name
        text owner
        text status
        text description
        timestamptz created_at
        timestamptz updated_at
    }
    tech_domain_org_links {
        text tech_domain_id FK
        text org_domain_id FK
    }
    tech_domain_versions {
        serial id PK
        text tech_domain_id FK
        text version
        text[] org_domain_ids
        timestamptz changed_at
        text change_note
    }

    technologies {
        text id PK
        text name
        text owner
        text status
        text description
        timestamptz created_at
        timestamptz updated_at
    }
    technology_versions {
        serial id PK
        text technology_id FK
        text version
        text[] tags_snapshot
        timestamptz changed_at
    }
    tags {
        serial id PK
        text name
    }
    technology_tags {
        text technology_id FK
        int tag_id FK
    }
    mermaid_diagrams {
        serial id PK
        text technology_id FK
        text title
        text code
        timestamptz created_at
        timestamptz updated_at
    }
    technology_files {
        serial id PK
        text technology_id FK
        text filename
        text s3_key
        text content_type
        bigint size_bytes
        timestamptz uploaded_at
    }

    requirements {
        text id PK
        text short_desc
        text description
        text req_type
        text owner
        text status
        text normative_doc
        text control_metrics
        text fulfillment_method
        boolean is_procurement
        int score_point
        int score_weight
        timestamptz created_at
        timestamptz updated_at
    }
    requirement_versions {
        serial id PK
        text requirement_id FK
        text version
        timestamptz changed_at
    }
    requirement_tags {
        text requirement_id FK
        int tag_id FK
    }
    requirement_technologies {
        text requirement_id FK
        text technology_id FK
    }
    requirement_tech_domain {
        text requirement_id FK
        text tech_domain_id FK
    }

    decisions {
        text id PK
        text name
        text owner
        text status
        text decision_type
        text description
        timestamptz created_at
        timestamptz updated_at
    }
    decision_versions {
        serial id PK
        text decision_id FK
        text version
        timestamptz changed_at
    }
    decision_tags {
        text decision_id FK
        int tag_id FK
    }
    decision_technologies {
        text decision_id FK
        text technology_id FK
    }
    decision_links {
        text decision_id FK
        text related_id FK
    }
    decision_mermaid {
        serial id PK
        text decision_id FK
        text title
        text code
        timestamptz created_at
        timestamptz updated_at
    }
    decision_files {
        serial id PK
        text decision_id FK
        text filename
        text s3_key
        bigint size_bytes
        timestamptz created_at
    }

    hardenings {
        text id PK
        text name
        text owner
        text status
        text description
        timestamptz created_at
        timestamptz updated_at
    }
    hardening_versions {
        serial id PK
        text hardening_id FK
        text version
        timestamptz changed_at
    }
    hardening_tags {
        text hardening_id FK
        int tag_id FK
    }
    hardening_req_content {
        serial id PK
        text hardening_id FK
        int sort_order
        text title
        text body
        timestamptz created_at
        timestamptz updated_at
    }
    hardening_req_env_status {
        serial id PK
        int req_content_id FK
        text environment
        text status
        text note
    }
    hardening_req_images {
        serial id PK
        int req_content_id FK
        text s3_key
        text filename
        bigint size_bytes
        timestamptz uploaded_at
    }
    hardening_solutions {
        text hardening_id FK
        text decision_id FK
    }

    arch_templates {
        text id PK
        text name
        text owner
        text status
        text template_type
        text description
        timestamptz created_at
        timestamptz updated_at
    }
    arch_template_versions {
        serial id PK
        text template_id FK
        text version
        timestamptz changed_at
    }
    arch_template_tags {
        text template_id FK
        int tag_id FK
    }
    arch_template_technologies {
        text template_id FK
        text technology_id FK
    }
    arch_template_decisions {
        text template_id FK
        text decision_id FK
    }
    arch_template_mermaid {
        serial id PK
        text template_id FK
        text title
        text code
        timestamptz created_at
        timestamptz updated_at
    }
    arch_template_files {
        serial id PK
        text template_id FK
        text filename
        text s3_key
        bigint size_bytes
        timestamptz uploaded_at
    }
    arch_template_links {
        serial id PK
        text template_id FK
        text url
        text label
        timestamptz created_at
    }

    org_domains ||--o{ org_domain_versions : "версии"
    org_domains ||--o{ tech_domain_org_links : "входит в"
    tech_domains ||--o{ tech_domain_org_links : "содержит"
    tech_domains ||--o{ tech_domain_versions : "версии"
    tech_domains ||--o{ requirement_tech_domain : "требования"

    technologies ||--o{ technology_versions : "версии"
    technologies ||--o{ technology_tags : "теги"
    technologies ||--o{ mermaid_diagrams : "схемы"
    technologies ||--o{ technology_files : "файлы"
    technologies ||--o{ requirement_technologies : "требования"
    technologies ||--o{ decision_technologies : "решения"
    technologies ||--o{ arch_template_technologies : "шаблоны"

    tags ||--o{ technology_tags : ""
    tags ||--o{ requirement_tags : ""
    tags ||--o{ decision_tags : ""
    tags ||--o{ hardening_tags : ""
    tags ||--o{ arch_template_tags : ""

    requirements ||--o{ requirement_versions : "версии"
    requirements ||--o{ requirement_tags : "теги"
    requirements ||--o{ requirement_technologies : "технологии"
    requirements ||--o{ requirement_tech_domain : "домен"

    decisions ||--o{ decision_versions : "версии"
    decisions ||--o{ decision_tags : "теги"
    decisions ||--o{ decision_technologies : "технологии"
    decisions ||--o{ decision_links : "связанные (from)"
    decisions ||--o{ decision_mermaid : "схемы"
    decisions ||--o{ decision_files : "файлы"
    decisions ||--o{ hardening_solutions : "харденинг"
    decisions ||--o{ arch_template_decisions : "шаблоны"

    hardenings ||--o{ hardening_versions : "версии"
    hardenings ||--o{ hardening_tags : "теги"
    hardenings ||--o{ hardening_req_content : "требования"
    hardenings ||--o{ hardening_solutions : "решения"
    hardening_req_content ||--o{ hardening_req_env_status : "среды"
    hardening_req_content ||--o{ hardening_req_images : "изображения"

    arch_templates ||--o{ arch_template_versions : "версии"
    arch_templates ||--o{ arch_template_tags : "теги"
    arch_templates ||--o{ arch_template_technologies : "технологии"
    arch_templates ||--o{ arch_template_decisions : "решения"
    arch_templates ||--o{ arch_template_mermaid : "схемы"
    arch_templates ||--o{ arch_template_files : "файлы"
    arch_templates ||--o{ arch_template_links : "ссылки"
```

### Описание таблиц

| Таблица | Строк | Описание |
|---|---|---|
| `org_domains` | 1 | Организационные домены — верхний уровень иерархии |
| `org_domain_versions` | 3 | История изменений орг. доменов |
| `tech_domains` | 11 | Технические домены |
| `tech_domain_org_links` | 1 | M:M связь тех. доменов с орг. доменами |
| `tech_domain_versions` | 12 | История тех. доменов со snapshot org_domain_ids |
| `technologies` | 6 | Технологии |
| `technology_versions` | — | История технологий со snapshot тегов |
| `tags` | 37 | Глобальный справочник тегов (shared) |
| `technology_tags` | 14 | M:M теги ↔ технологии |
| `mermaid_diagrams` | 1 | Mermaid-схемы для технологий |
| `technology_files` | 0 | Файлы технологий (ключи S3) |
| `requirements` | 11 | Требования с типизацией и весами |
| `requirement_versions` | 18 | История требований |
| `requirement_tags` | 22 | M:M теги ↔ требования |
| `requirement_technologies` | 13 | M:M требования ↔ технологии |
| `requirement_tech_domain` | 11 | 1:1 требование → технический домен |
| `decisions` | 8 | Технические и организационные решения |
| `decision_versions` | 16 | История решений |
| `decision_tags` | 13 | M:M теги ↔ решения |
| `decision_technologies` | 8 | M:M решения ↔ технологии |
| `decision_links` | 4 | M:M самосвязь решений |
| `decision_mermaid` | 1 | Mermaid-схемы решений |
| `decision_files` | 0 | Файлы решений (S3) |
| `hardenings` | 4 | Практики харденинга |
| `hardening_versions` | 9 | История харденинга |
| `hardening_tags` | 9 | M:M теги ↔ харденинг |
| `hardening_req_content` | 11 | Секции требований харденинга (markdown) |
| `hardening_req_env_status` | 55 | Статус каждого требования по средам |
| `hardening_req_images` | 1 | Изображения в требованиях (S3) |
| `hardening_solutions` | 4 | M:M харденинг ↔ решения |
| `arch_templates` | 8 | Архитектурные шаблоны |
| `arch_template_versions` | 17 | История шаблонов |
| `arch_template_tags` | 17 | M:M теги ↔ шаблоны |
| `arch_template_technologies` | 9 | M:M шаблоны ↔ технологии |
| `arch_template_decisions` | 12 | M:M шаблоны ↔ решения |
| `arch_template_mermaid` | 1 | Mermaid-схемы шаблонов |
| `arch_template_files` | 0 | Файлы шаблонов (S3) |
| `arch_template_links` | 6 | Внешние ссылки шаблонов |

---

## Запуск в Docker

### Предварительные требования

- Docker 24+
- Docker Compose v2+

### Быстрый старт (production-сборка)

```bash
# 1. Клонировать репозиторий
git clone <repo-url>
cd <project-dir>

# 2. Создать файл с переменными окружения
cp .env.example .env
# Заполнить значения в .env (см. раздел «Переменные окружения»)

# 3. Собрать и запустить
docker compose up --build

# Приложение доступно на http://localhost:80
```

### Dev-режим с hot reload

```bash
docker compose -f docker-compose.dev.yml up --build
# Приложение доступно на http://localhost:5173
```

### Полезные команды

```bash
# Остановить все контейнеры
docker compose down

# Пересобрать образ с нуля
docker compose up --build --force-recreate

# Посмотреть логи в реальном времени
docker compose logs -f app

# Войти в оболочку контейнера
docker compose exec app sh

# Сборка только образа (без запуска)
docker build -t security-arch-portal .
```

---

## Переменные окружения

Создайте `.env` в корне на основе `.env.example`:

### Frontend (встраиваются в сборку через Vite, префикс `VITE_`)

| Переменная | Описание | Пример |
|---|---|---|
| `VITE_ORG_DOMAINS_URL` | URL функции org-domains | `https://functions.example.com/org-domains` |
| `VITE_TECH_DOMAINS_URL` | URL функции tech-domains | `https://functions.example.com/tech-domains` |
| `VITE_TECHNOLOGIES_URL` | URL функции technologies | `https://functions.example.com/technologies` |
| `VITE_REQUIREMENTS_URL` | URL функции requirements | `https://functions.example.com/requirements` |
| `VITE_DECISIONS_URL` | URL функции decisions | `https://functions.example.com/decisions` |
| `VITE_HARDENING_URL` | URL функции hardening | `https://functions.example.com/hardening` |
| `VITE_ARCH_TEMPLATES_URL` | URL функции arch-templates | `https://functions.example.com/arch-templates` |

> В production на poehali.dev URLs берутся из `func2url.json` (генерируется платформой автоматически).

### Backend (Cloud Functions / локальный Python)

| Переменная | Описание |
|---|---|
| `DATABASE_URL` | PostgreSQL DSN: `postgresql://user:pass@host:5432/dbname` |
| `AWS_ACCESS_KEY_ID` | Ключ доступа S3 (также используется в CDN-путях) |
| `AWS_SECRET_ACCESS_KEY` | Секрет S3 |

> В production секреты хранятся в зашифрованном хранилище poehali.dev и доступны через `os.environ` автоматически.

---

## Backend API

Все функции — Python 3.11, сигнатура: `handler(event: dict, context) -> dict`

### Формат ответа

```json
{
  "statusCode": 200,
  "headers": { "Access-Control-Allow-Origin": "*" },
  "body": "{ ... JSON ... }"
}
```

### Эндпоинты

| Функция | Метод | Query / Action | Описание |
|---|---|---|---|
| `org-domains` | GET | — | Список орг. доменов |
| `org-domains` | GET | `?id=<id>` | Карточка + история версий |
| `org-domains` | POST | — | Создать домен |
| `org-domains` | PUT | — | Обновить домен |
| `tech-domains` | GET | — | Список тех. доменов |
| `tech-domains` | GET | `?id=<id>` | Карточка + версии + org_domains |
| `tech-domains` | GET | `?orgList=1` | Список орг. доменов для picker |
| `tech-domains` | POST | — | Создать |
| `tech-domains` | PUT | — | Обновить + синхронизировать org-links |
| `technologies` | GET | — | Список с тегами |
| `technologies` | GET | `?id=<id>` | Карточка + схемы + файлы + версии |
| `technologies` | GET | `?tags_suggest=<q>` | Автодополнение тегов (ILIKE) |
| `technologies` | POST | — | Создать технологию |
| `technologies` | POST | `?action=add_mermaid` | Добавить Mermaid-схему |
| `technologies` | POST | `?action=upload_file` | Загрузить файл (base64 в JSON) |
| `technologies` | PUT | — | Обновить технологию + теги |
| `technologies` | PUT | `?action=update_mermaid` | Обновить Mermaid-схему |
| `requirements` | GET | — | Список требований |
| `requirements` | GET | `?id=<id>` | Карточка + связи |
| `requirements` | POST | — | Создать |
| `requirements` | PUT | — | Обновить |
| `decisions` | GET | — | Список решений |
| `decisions` | GET | `?id=<id>` | Карточка + связи + схемы |
| `decisions` | POST | — | Создать |
| `decisions` | PUT | — | Обновить |
| `hardening` | GET | — | Список харденингов |
| `hardening` | GET | `?id=<id>` | Карточка + требования + статусы по средам |
| `hardening` | POST | — | Создать |
| `hardening` | PUT | — | Обновить |
| `arch-templates` | GET | — | Список шаблонов |
| `arch-templates` | GET | `?id=<id>` | Карточка + все вложения |
| `arch-templates` | POST | — | Создать |
| `arch-templates` | PUT | — | Обновить |

### Версионирование

Все сущности версионируются по схеме `X.Y`:

| Событие | Действие |
|---|---|
| Создание | Версия `1.0` |
| Обновление | `major.(minor+1)`, например `1.0 → 1.1 → 1.2` |
| Хранение | Snapshot всех полей + опциональный `change_note` |
