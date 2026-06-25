# Платформа управления архитектурой безопасности

SPA-приложение для проектирования, документирования и управления архитектурой информационной безопасности. Охватывает весь цикл: от организационных доменов и требований до харденинг-конфигураций и шаблонов архитектур.

---

## Стек технологий

| Слой | Технологии |
|------|-----------|
| Frontend | React 18 + TypeScript 5, Vite (Rolldown) |
| Роутинг | React Router DOM 6 |
| Стили | Tailwind CSS 3, shadcn/ui, Radix UI |
| Формы | React Hook Form 7 + Zod 3 |
| Диаграммы | Mermaid 11 |
| Markdown | react-markdown + remark-gfm |
| Иконки | Lucide React |
| Уведомления | Sonner |
| Темизация | next-themes |

---

## Структура проекта

```
src/
├── App.tsx                        # Маршруты приложения
├── main.tsx                       # Точка входа
├── index.css                      # Глобальные стили + CSS-переменные
│
├── api/                           # REST-клиенты для каждой сущности
│   ├── orgDomains.ts
│   ├── techDomains.ts
│   ├── technologies.ts
│   ├── requirements.ts
│   ├── decisions.ts
│   ├── hardening.ts
│   └── archTemplates.ts
│
├── components/
│   ├── Layout.tsx                 # Основной layout с навигацией
│   ├── SectionContent.tsx        # Контент для fallback-роутов
│   └── ui/                       # shadcn/ui компоненты
│       ├── icon.tsx              # Обёртка Lucide с fallback
│       └── ...
│
├── pages/
│   ├── library/
│   │   └── LibraryPage.tsx       # Пользовательская библиотека
│   ├── org-domains/
│   ├── tech-domains/
│   ├── technologies/
│   ├── requirements/
│   ├── decisions/
│   ├── hardening/
│   ├── arch-templates/
│   │   ├── ArchTemplateList.tsx
│   │   ├── ArchTemplateView.tsx
│   │   ├── ArchTemplateForm.tsx
│   │   ├── ArchTemplateFormTabs.tsx
│   │   ├── ArchTemplateExportModal.tsx
│   │   ├── RequirementsSection.tsx
│   │   └── SuggestPicker.tsx
│   └── NotFound.tsx
```

---

## Навигация и маршруты

### Группы меню

| Группа | Раздел | URL | Статус |
|--------|--------|-----|--------|
| **Основное** | Пользовательская библиотека | `/library` | ✅ Активен |
| **Домены** | Организационный домен | `/org-domain` | ✅ Активен |
| | Технический домен | `/tech-domain` | ✅ Активен |
| | Технологии | `/technologies` | ✅ Активен |
| **Управление** | Требования | `/requirements` | ✅ Активен |
| | Орг. и технические решения | `/solutions` | ✅ Активен |
| | Харденинг и конфигурации | `/hardening` | ✅ Активен |
| **Конструктор** | Архитектуры | `/architectures` | 🚧 Placeholder |
| | Шаблоны архитектур | `/templates` | ✅ Активен |
| **Система** | Настройки | `/settings` | 🚧 Placeholder |

### Полный список роутов

```
/                          → redirect → /library
/library                   → LibraryPage

/org-domain                → OrgDomainList
/org-domain/new            → OrgDomainForm
/org-domain/:id            → OrgDomainView
/org-domain/:id/edit       → OrgDomainForm

/tech-domain               → TechDomainList
/tech-domain/new           → TechDomainForm
/tech-domain/:id           → TechDomainView
/tech-domain/:id/edit      → TechDomainForm

/technologies              → TechnologyList
/technologies/new          → TechnologyForm
/technologies/:id          → TechnologyView
/technologies/:id/edit     → TechnologyForm

/requirements              → RequirementList
/requirements/new          → RequirementForm
/requirements/:id          → RequirementView
/requirements/:id/edit     → RequirementForm

/solutions                 → DecisionList
/solutions/new             → DecisionForm
/solutions/:id             → DecisionView
/solutions/:id/edit        → DecisionForm

/hardening                 → HardeningList
/hardening/new             → HardeningForm
/hardening/:id             → HardeningView
/hardening/:id/edit        → HardeningForm

/templates                 → ArchTemplateList
/templates/new             → ArchTemplateForm
/templates/:id             → ArchTemplateView
/templates/:id/edit        → ArchTemplateForm

/:section                  → Layout + SectionContent (fallback)
*                          → NotFound
```

---

## Сущности системы

### OrgDomain — Организационный домен
Верхний уровень иерархии. Описывает организационную структуру и политики.

| Поле | Тип | Описание |
|------|-----|---------|
| `id` | string | Идентификатор |
| `name` | string | Название |
| `owner` | string | Владелец |
| `description` | string | Описание (Markdown) |
| `status` | `active \| in_development \| inactive \| archived` | Статус |
| `version` | string | Текущая версия |
| `versions[]` | OrgDomainVersion[] | История версий |

---

### TechDomain — Технический домен
Техническая инфраструктура. Привязывается к организационным доменам.

| Поле | Тип | Описание |
|------|-----|---------|
| `orgDomains[]` | OrgDomainRef[] | Связанные орг. домены |
| `status` | `active \| in_development \| inactive \| archived` | Статус |
| `versions[]` | TechDomainVersion[] | История версий |

---

### Technology — Технология
Каталог технологий, продуктов и средств защиты.

| Поле | Тип | Описание |
|------|-----|---------|
| `tags[]` | TagRef[] | Теги |
| `mermaidDiagrams[]` | MermaidDiagram[] | Диаграммы |
| `files[]` | TechFile[] | Прикреплённые файлы (S3) |
| `versions[]` | TechVersion[] | История версий |

---

### Requirement — Требование
Реестр требований ИБ с трассировкой, метриками и привязкой к технологиям.

| Поле | Тип | Описание |
|------|-----|---------|
| `shortDesc` | string | Краткое описание |
| `description` | string | Полное описание (Markdown) |
| `reqType` | `technical \| functional \| non_functional \| organizational` | Тип |
| `normativeDoc` | string | Нормативная документация |
| `controlMetrics` | string | Метрики контроля |
| `fulfillmentMethod` | string | Способ исполнения |
| `isProcurement` | boolean | Признак закупки |
| `scorePoint` | number | Балл |
| `scoreWeight` | number | Вес |
| `techDomain` | TechDomainRef \| null | Технический домен |
| `technologies[]` | TechRef[] | Связанные технологии |
| `tags[]` | TagRef[] | Теги |
| `versions[]` | RequirementVersion[] | История версий |

---

### Decision — Решение
Библиотека организационных и технических решений для выполнения требований ИБ.

| Поле | Тип | Описание |
|------|-----|---------|
| `decisionType` | `technical \| organizational` | Тип решения |
| `relatedDecisions[]` | DecisionRef[] | Связанные решения |
| `technologies[]` | TechRef[] | Технологии |
| `requirementsByDomain[]` | RequirementDomainGroup[] | Требования по доменам |
| `mermaidDiagrams[]` | MermaidDiagram[] | Диаграммы |
| `files[]` | DecisionFile[] | Файлы |
| `versions[]` | DecisionVersion[] | История версий |

---

### Hardening — Харденинг и конфигурации
Руководства по усилению защиты с привязкой к требованиям и средам эксплуатации.

| Поле | Тип | Описание |
|------|-----|---------|
| `solutions[]` | SolutionRef[] | Связанные решения |
| `requirementsByDomain[]` | RequirementDomainGroup[] | Требования по доменам |
| `versions[]` | HardeningVersion[] | История версий |

**Контент по требованию** (`fetchReqContent(hardeningId, requirementId)`):

| Поле | Описание |
|------|---------|
| `markdown` | Текст конфигурации в Markdown |
| `images[]` | Иллюстрации (S3) |
| `envStatus` | Статусы сред: `{noIod, iod}` × `{prod, prodlike, stage, test, dev}` |

**Статусы сред:** `required` / `conditional` / `not_required`

---

### ArchTemplate — Шаблон архитектуры
Переиспользуемые эталонные архитектуры. Объединяет технологии, решения и требования.

| Поле | Тип | Описание |
|------|-----|---------|
| `templateType` | `technical \| organizational` | Тип |
| `status` | `active \| on_review \| in_development \| inactive \| archived` | Статус |
| `relatedTemplates[]` | TemplateRef[] | Связанные шаблоны |
| `technologies[]` | TechRef[] | Технологии |
| `decisions[]` | DecisionRef[] | Решения |
| `requirementsByDomain[]` | RequirementDomainGroup[] | Требования по доменам (с `envStatus`) |
| `mermaidDiagrams[]` | MermaidDiagram[] | Диаграммы |
| `files[]` | TemplateFile[] | Прикреплённые файлы |
| `externalLinks[]` | ExternalLink[] | Внешние ссылки |
| `versions[]` | TemplateVersion[] | История версий |

**Экспорт** (`fetchArchTemplateExport`) — `ExportData` с расширенными полями требований и контентом харденинга.

---

## Ключевые компоненты

### ArchTemplateExportModal (`src/pages/arch-templates/ArchTemplateExportModal.tsx`)

Модальное окно экспорта шаблона архитектуры.

**Режимы просмотра:**
- **Редактор** — включение/отключение отдельных элементов
- **Текст MD** — сырой Markdown
- **Рендер MD** — предпросмотр через MarkdownViewer

**Действия:**
- **Копировать MD** — буфер обмена (Clipboard API + fallback `execCommand`)
- **Скачать PDF** — `window.print()` с SVG-рендером Mermaid
- **Скачать .md** — файл Markdown

**Карточка требования в экспорте** (`ExportReqCard`):
- Таблица сред (Prod/ProdLike/Stage/Test/Dev × Без ИОД/С ИОД)
- Тип, теги, технологии, балл, вес, владелец
- Описание, нормативная документация, метрики контроля, способ исполнения
- Текст харденинга в блоке ` ```markdown ``` `

**Группы доменов** (`DomainGroups`):
- Сворачивание/разворачивание по техническому домену
- Счётчик активных/всего требований в домене

---

### LibraryPage (`src/pages/library/LibraryPage.tsx`)

Пользовательская библиотека — точка входа приложения.

**Функциональность:**
- Поиск по названию, ID, тегам
- Фильтрация по статусу и типу шаблона
- Панель деталей справа при выборе карточки
- Экспорт прямо из панели деталей

**Панель деталей (5 табов):**
1. **Обзор** — мета, связанные шаблоны, технологии, решения, описание, состав
2. **Требования** — сгруппированные по доменам
3. **Схемы** — Mermaid-диаграммы
4. **Файлы** — прикреплённые документы
5. **История** — версии

---

### RequirementsSection (`src/pages/arch-templates/RequirementsSection.tsx`)

Секция требований в `ArchTemplateView`. Каждое требование раскрывается с деталями:
- Ленивая загрузка `RequirementDetail` через `fetchRequirement`
- Ленивая загрузка контента харденинга через `fetchReqContent`
- Таблица сред (envStatus) с цветовой кодировкой
- Markdown-рендер текста харденинга

---

## Кеширование

Все кеши — модульные переменные вне компонентов. Живут в рамках сессии браузера.

| Файл | Переменная | Содержимое |
|------|-----------|-----------|
| `LibraryPage.tsx` | `listCache` | Список шаблонов |
| `LibraryPage.tsx` | `detailCache` | Детали шаблонов (Map по id) |
| `ArchTemplateExportModal.tsx` | `detailCache` | RequirementDetail (Map по id) |
| `ArchTemplateExportModal.tsx` | `hardeningCache` | Контент харденинга (Map по `hardeningId::reqId`) |
| `RequirementsSection.tsx` | `detailCache` | RequirementDetail (Map по id) |
| `RequirementsSection.tsx` | `hardeningCache` | Контент харденинга (Map по `hardeningId::reqId`) |

---

## Иконки

Всегда использовать обёртку `Icon`, не импортировать из `lucide-react` напрямую:

```tsx
import Icon from '@/components/ui/icon';

<Icon name="Home" size={24} />
<Icon name="CustomIcon" fallback="CircleAlert" size={24} />
```

---

## Запуск

```bash
bun install
bun run dev      # dev-сервер на localhost:8080
bun run build    # production-сборка
```
