-- =====================================================================
-- SEED: 5 тестовых шаблонов архитектур безопасности
-- =====================================================================

-- Новые теги
INSERT INTO t_p84706301_security_architectur.tags (name) VALUES
  ('zero-trust'), ('iam'), ('api-security'), ('microservices'),
  ('web-application'), ('cloud'), ('compliance'), ('monitoring'),
  ('incident-response'), ('patch-management')
ON CONFLICT (name) DO NOTHING;

-- Шаблоны
INSERT INTO t_p84706301_security_architectur.arch_templates
  (id, name, owner, status, template_type, description)
VALUES
  ('arch-sec-4',
   'Архитектура аутентификации и авторизации (IAM)',
   'Security Team',
   'active',
   'technical',
   'Шаблон описывает стандартную архитектуру управления идентификацией и доступом для веб-приложений. Включает OAuth 2.0 / OIDC через Keycloak, JWT-токены с ограниченным TTL, ролевую модель доступа и интеграцию с HashiCorp Vault для хранения секретов.

## Ключевые компоненты

- **Identity Provider**: Keycloak — централизованная точка аутентификации
- **Токены**: JWT с TTL 15 минут, refresh-токены через httpOnly cookie
- **Авторизация**: RBAC (Role-Based Access Control) на уровне API Gateway
- **Секреты**: Vault для хранения client_secret и signing keys

## Применимость

Подходит для внутренних корпоративных приложений и SaaS-продуктов с несколькими ролями пользователей.'),

  ('arch-sec-5',
   'Безопасность API Gateway и микросервисов',
   'Infra Team',
   'active',
   'technical',
   'Шаблон для защиты API-слоя в микросервисной архитектуре. Описывает настройку Nginx как API Gateway с mTLS между сервисами, rate limiting, валидацией JWT и логированием всех запросов.

## Ключевые компоненты

- **API Gateway**: Nginx с терминацией TLS и rate limiting
- **Межсервисная аутентификация**: mTLS с сертификатами от внутреннего CA
- **Авторизация запросов**: проверка JWT на уровне gateway
- **Аудит**: централизованное логирование через syslog

## Применимость

Микросервисные архитектуры с числом сервисов от 3 и выше. Рекомендуется для Prod и ProdLike окружений.'),

  ('arch-sec-6',
   'Харденинг базы данных PostgreSQL (Production)',
   'DBA Team',
   'active',
   'technical',
   'Комплексный шаблон харденинга СУБД PostgreSQL для продуктивных сред. Покрывает сетевую изоляцию, аутентификацию SCRAM-SHA-256, аудит через pgAudit, шифрование соединений и управление привилегиями по принципу наименьших прав.

## Ключевые компоненты

- **Сеть**: ограничение доступа по IP через pg_hba.conf, только hostssl
- **Аутентификация**: SCRAM-SHA-256, запрет MD5
- **Шифрование**: SSL/TLS для всех подключений
- **Аудит**: pgAudit для DDL и привилегированных операций
- **Привилегии**: отдельные роли для read-only и read-write, без SUPERUSER

## Матрица сред

| Среда | Применимость |
|-------|-------------|
| Prod / ProdLike | Обязательно |
| Stage | Обязательно |
| Test / Dev | Рекомендуется |'),

  ('arch-sec-7',
   'Политика управления секретами и ротации ключей',
   'CISO',
   'active',
   'organizational',
   'Организационный шаблон, регламентирующий процессы работы с секретами, паролями и криптографическими ключами. Устанавливает запрет хранения секретов в коде, обязательное использование Vault и процедуры ротации.

## Область применения

Все команды разработки, DevOps и эксплуатации.

## Ключевые правила

1. **Запрет хранения в коде** — любой секрет в git-репозитории является инцидентом категории HIGH
2. **Централизованное хранение** — все секреты только в HashiCorp Vault
3. **Ротация** — пароли БД ротируются каждые 90 дней, API-ключи — каждые 180 дней
4. **Динамические credentials** — для БД использовать Vault Database Engine с TTL 1 час
5. **Аудит доступа** — все обращения к Vault логируются и проверяются ежемесячно

## Ответственные

- **Владелец политики**: CISO
- **Технический владелец**: Security Team
- **Ревью**: ежегодно или при инцидентах'),

  ('arch-sec-8',
   'Мониторинг безопасности и реагирование на инциденты',
   'Security Team',
   'in_development',
   'organizational',
   'Организационный шаблон для построения процессов мониторинга событий безопасности и реагирования на инциденты. Определяет источники событий, классификацию инцидентов и процедуры эскалации.

## Источники событий

- Логи pgAudit (PostgreSQL)
- Логи Nginx (access + error)
- Аудит-логи Vault
- Системные логи (syslog / journald)

## Классификация инцидентов

| Уровень | Критерии | SLA реакции |
|---------|----------|-------------|
| CRITICAL | Утечка секретов, взлом | 1 час |
| HIGH | Брутфорс, аномальный доступ | 4 часа |
| MEDIUM | Превышение rate limit | 24 часа |
| LOW | Ошибки конфигурации | 72 часа |

## Процесс реагирования

1. Обнаружение → автоматическое оповещение
2. Классификация → дежурный Security Engineer
3. Изоляция → блокировка учётных данных / IP
4. Расследование → анализ логов
5. Устранение → патч или конфигурационное исправление
6. Постмортем → документирование и улучшения')

ON CONFLICT (id) DO NOTHING;

-- Версии
INSERT INTO t_p84706301_security_architectur.arch_template_versions
  (template_id, version, change_note)
VALUES
  ('arch-sec-4', '1.0', 'Начальная версия'),
  ('arch-sec-5', '1.0', 'Начальная версия'),
  ('arch-sec-6', '1.0', 'Начальная версия'),
  ('arch-sec-7', '1.0', 'Начальная версия'),
  ('arch-sec-8', '1.0', 'Начальная версия');

-- Технологии
INSERT INTO t_p84706301_security_architectur.arch_template_technologies
  (template_id, technology_id, is_active)
VALUES
  ('arch-sec-4', 'tech-2', true),  -- IAM -> JWT
  ('arch-sec-4', 'tech-3', true),  -- IAM -> TLS
  ('arch-sec-5', 'tech-5', true),  -- API GW -> Nginx
  ('arch-sec-5', 'tech-3', true),  -- API GW -> TLS
  ('arch-sec-6', 'tech-4', true),  -- DB Hardening -> PostgreSQL
  ('arch-sec-7', 'tech-6', true),  -- Secrets -> Vault
  ('arch-sec-7', 'tech-4', true)   -- Secrets -> PostgreSQL (dynamic creds)
ON CONFLICT DO NOTHING;

-- Решения
INSERT INTO t_p84706301_security_architectur.arch_template_decisions
  (template_id, decision_id, is_active)
VALUES
  ('arch-sec-4', 'tos-3', true),   -- IAM -> Keycloak
  ('arch-sec-4', 'tos-7', true),   -- IAM -> Политика доступа к БД
  ('arch-sec-5', 'tos-5', true),   -- API GW -> Nginx Secure Gateway
  ('arch-sec-6', 'tos-4', true),   -- DB Hardening -> PostgreSQL Hardening
  ('arch-sec-6', 'tos-7', true),   -- DB Hardening -> Политика доступа к БД
  ('arch-sec-7', 'tos-6', true),   -- Secrets -> Vault
  ('arch-sec-7', 'tos-8', true),   -- Secrets -> Политика секретов
  ('arch-sec-8', 'tos-7', true),   -- Monitoring -> Политика доступа к БД
  ('arch-sec-8', 'tos-8', true)    -- Monitoring -> Политика секретов
ON CONFLICT DO NOTHING;

-- Связи между шаблонами
INSERT INTO t_p84706301_security_architectur.arch_template_links
  (template_id, related_id, is_active)
VALUES
  ('arch-sec-4', 'arch-sec-5', true),  -- IAM <-> API GW
  ('arch-sec-5', 'arch-sec-6', true),  -- API GW <-> DB Hardening
  ('arch-sec-6', 'arch-sec-7', true),  -- DB Hardening <-> Secrets Policy
  ('arch-sec-7', 'arch-sec-8', true)   -- Secrets <-> Monitoring
ON CONFLICT DO NOTHING;

-- Теги
INSERT INTO t_p84706301_security_architectur.arch_template_tags
  (template_id, tag_id, is_active)
SELECT r, t.id, true FROM
  (VALUES
    ('arch-sec-4','authentication'), ('arch-sec-4','jwt'), ('arch-sec-4','iam'),
    ('arch-sec-5','nginx'), ('arch-sec-5','tls'), ('arch-sec-5','api-security'), ('arch-sec-5','microservices'),
    ('arch-sec-6','postgresql'), ('arch-sec-6','hardening'), ('arch-sec-6','database'), ('arch-sec-6','pgaudit'),
    ('arch-sec-7','vault'), ('arch-sec-7','secrets'), ('arch-sec-7','compliance'),
    ('arch-sec-8','audit'), ('arch-sec-8','monitoring'), ('arch-sec-8','incident-response')
  ) AS vals(r, tname)
JOIN t_p84706301_security_architectur.tags t ON t.name = vals.tname
ON CONFLICT DO NOTHING;
