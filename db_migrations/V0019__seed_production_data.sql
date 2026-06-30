-- =============================================================================
-- V0019: Миграция текущих production-данных (экспорт 2026-06-30)
-- Порядок вставки соблюдает FK-зависимости
-- =============================================================================

SET search_path TO t_p84706301_security_architectur, public;

-- ── 1. tags ──────────────────────────────────────────────────────────────────
INSERT INTO tags (id, name) VALUES
  (1,  'frontend'),
  (2,  'javascript'),
  (37, 'back'),
  (39, 'backend'),
  (40, 'токены'),
  (41, 'доступ'),
  (42, 'jwt'),
  (51, 'postgresql'),
  (52, 'database'),
  (53, 'nginx'),
  (54, 'reverse-proxy'),
  (55, 'vault'),
  (56, 'secrets'),
  (57, 'tls'),
  (58, 'hardening'),
  (59, 'authentication'),
  (60, 'encryption'),
  (61, 'scram-sha-256'),
  (62, 'pg_hba'),
  (63, 'ssl'),
  (64, 'audit'),
  (65, 'pgaudit'),
  (66, 'rate-limit'),
  (67, 'least-privilege'),
  (68, 'network'),
  (69, 'mtls'),
  (70, 'dynamic-secrets'),
  (71, 'zero-trust'),
  (72, 'iam'),
  (73, 'api-security'),
  (74, 'microservices'),
  (75, 'web-application'),
  (76, 'cloud'),
  (77, 'compliance'),
  (78, 'monitoring'),
  (79, 'incident-response'),
  (80, 'patch-management')
ON CONFLICT (id) DO NOTHING;

SELECT setval('tags_id_seq', (SELECT MAX(id) FROM tags));

-- ── 2. org_domains ───────────────────────────────────────────────────────────
INSERT INTO org_domains (id, name, owner, status, description) VALUES
  ('org-dom-1', 'тестовый организационный домен', 'Вася пупки', 'in_development', 'описание тестового домена ввв')
ON CONFLICT (id) DO NOTHING;

SELECT setval('org_domain_seq', 1);

-- ── 3. org_domain_versions ───────────────────────────────────────────────────
INSERT INTO org_domain_versions (id, domain_id, version, name, owner, status, description, change_note) VALUES
  (1, 'org-dom-1', '1.0', 'тестовый домен',              'Вася пупки', 'in_development', 'описание тестового домена',     'Создан'),
  (2, 'org-dom-1', '1.1', 'тестовый домен',              'Вася пупки', 'in_development', 'описание тестового домена ввв', ''),
  (3, 'org-dom-1', '1.2', 'тестовый организационный домен', 'Вася пупки', 'in_development', 'описание тестового домена ввв', '')
ON CONFLICT (id) DO NOTHING;

SELECT setval('org_domain_versions_id_seq', (SELECT MAX(id) FROM org_domain_versions));

-- ── 4. tech_domains ──────────────────────────────────────────────────────────
INSERT INTO tech_domains (id, name, owner, status, description) VALUES
  ('tech-dom-1',  'Тестовый тех. домен',                         'Admin', 'active',         'Тест'),
  ('tech-dom-2',  'домен авторизации',                           '',      'in_development',  ''),
  ('tech-dom-3',  'Домен управления доступом',                   '',      'in_development',  ''),
  ('tech-dom-4',  'Домен аудита и подотчётности',                '',      'in_development',  ''),
  ('tech-dom-5',  'Домен управления конфигурации',               '',      'in_development',  ''),
  ('tech-dom-6',  'Домен целостности систем и информации',       '',      'in_development',  ''),
  ('tech-dom-7',  'Домен управление рисками цепочки поставок',   '',      'in_development',  ''),
  ('tech-dom-8',  'домен сетевой безопасности',                  '',      'in_development',  ''),
  ('tech-dom-9',  'Домен Идентификация',                         '',      'in_development',  ''),
  ('tech-dom-10', 'Домен Аутентификации',                        '',      'in_development',  ''),
  ('tech-dom-11', 'домен авторизации',                           '',      'in_development',  '')
ON CONFLICT (id) DO NOTHING;

SELECT setval('tech_domain_seq', 11);

-- ── 5. tech_domain_versions ──────────────────────────────────────────────────
INSERT INTO tech_domain_versions (id, tech_domain_id, version, name, owner, status, description, org_domain_ids, change_note) VALUES
  (1,  'tech-dom-1',  '1.0', 'Тестовый тех. домен',                       'Admin', 'active',        'Тест', '{}',          'Создан'),
  (2,  'tech-dom-1',  '1.1', 'Тестовый тех. домен',                       'Admin', 'active',        'Тест', '{org-dom-1}', ''),
  (3,  'tech-dom-2',  '1.0', 'домен авторизации',                         '',      'in_development', '',    '{}',          'Создан'),
  (4,  'tech-dom-3',  '1.0', 'Управление доступом',                       '',      'in_development', '',    '{}',          'Создан'),
  (5,  'tech-dom-4',  '1.0', 'Аудит и подотчётность',                     '',      'in_development', '',    '{}',          'Создан'),
  (6,  'tech-dom-5',  '1.0', 'Управление конфигурацией',                  '',      'in_development', '',    '{}',          'Создан'),
  (7,  'tech-dom-6',  '1.0', 'Целостность систем и информации',           '',      'in_development', '',    '{}',          'Создан'),
  (8,  'tech-dom-7',  '1.0', 'Управление рисками цепочки поставок',       '',      'in_development', '',    '{}',          'Создан'),
  (9,  'tech-dom-8',  '1.0', 'Сетевая безопасность',                      '',      'in_development', '',    '{}',          'Создан'),
  (10, 'tech-dom-9',  '1.0', 'Идентификация',                             '',      'in_development', '',    '{}',          'Создан'),
  (11, 'tech-dom-10', '1.0', 'аутентификация',                            '',      'in_development', '',    '{}',          'Создан'),
  (12, 'tech-dom-11', '1.0', 'авторизация',                               '',      'in_development', '',    '{}',          'Создан'),
  (13, 'tech-dom-8',  '1.1', 'домен сетевой безопасности',                '',      'in_development', '',    '{}',          ''),
  (14, 'tech-dom-11', '1.1', 'домен авторизации',                         '',      'in_development', '',    '{}',          ''),
  (15, 'tech-dom-10', '1.1', 'Домен Аутентификации',                      '',      'in_development', '',    '{}',          ''),
  (16, 'tech-dom-9',  '1.1', 'Домен Идентификация',                       '',      'in_development', '',    '{}',          ''),
  (17, 'tech-dom-7',  '1.1', 'Домен управление рисками цепочки поставок', '',      'in_development', '',    '{}',          ''),
  (18, 'tech-dom-6',  '1.1', 'Домен целостности систем и информации',     '',      'in_development', '',    '{}',          ''),
  (19, 'tech-dom-5',  '1.1', 'Домен управления конфигурации',             '',      'in_development', '',    '{}',          ''),
  (20, 'tech-dom-4',  '1.1', 'Домен аудита и подотчётности',              '',      'in_development', '',    '{}',          ''),
  (21, 'tech-dom-3',  '1.1', 'Домен управления доступом',                 '',      'in_development', '',    '{}',          '')
ON CONFLICT (id) DO NOTHING;

SELECT setval('tech_domain_versions_id_seq', (SELECT MAX(id) FROM tech_domain_versions));

-- ── 6. tech_domain_org_links ─────────────────────────────────────────────────
INSERT INTO tech_domain_org_links (tech_domain_id, org_domain_id) VALUES
  ('tech-dom-1', 'org-dom-1')
ON CONFLICT DO NOTHING;

-- ── 7. technologies ──────────────────────────────────────────────────────────
INSERT INTO technologies (id, name, owner, status, description) VALUES
  ('tech-1', 'React',            'Frontend Team', 'active',        E'# Заголовок первого уровня\n## Заголовок второго уровня ##\n### Заголовок третьего уровня\n#### Заголовок четвёртого уровня #\n##### Заголовок пятого уровня ############\n###### Заголовок шестого уровня'),
  ('tech-2', 'JWT',              '',              'in_development', E'# JWT (JSON Web Token)\n\n## Что это?\nJWT — открытый стандарт (RFC 7519) для создания токенов доступа, которые позволяют безопасно передавать информацию между сторонами в виде JSON-объекта.\n\n## Структура\nТокен состоит из трёх частей, разделённых точками:\n\n```\nheader.payload.signature\n```\n\n### 1. Header (Заголовок)\nСодержит:\n- Тип токена (`JWT`)\n- Алгоритм шифрования (`HS256`, `RS256` и др.)\n\n### 2. Payload (Полезная нагрузка)\nСодержит claims (утверждения).\n\n### 3. Signature (Подпись)\nОбеспечивает целостность токена.'),
  ('tech-3', 'TLS шифрование',   '',              'in_development', ''),
  ('tech-4', 'PostgreSQL',        'DBA Team',      'active',         'СУБД PostgreSQL 15.x — основное хранилище данных. Используется для хранения пользовательских данных, конфигураций и аудит-логов.'),
  ('tech-5', 'Nginx',             'Infra Team',    'active',         'Nginx 1.24+ — высокопроизводительный HTTP-сервер и обратный прокси. Применяется для терминации TLS, балансировки нагрузки и rate limiting.'),
  ('tech-6', 'HashiCorp Vault',   'Security Team', 'active',         'HashiCorp Vault 1.15+ — централизованное управление секретами, динамические учётные данные для БД, PKI и выпуск сертификатов.')
ON CONFLICT (id) DO NOTHING;

SELECT setval('technology_seq', 6);

-- ── 8. technology_tags ───────────────────────────────────────────────────────
INSERT INTO technology_tags (technology_id, tag_id) VALUES
  ('tech-1', 1),
  ('tech-1', 2),
  ('tech-1', 37),
  ('tech-2', 1),
  ('tech-2', 39),
  ('tech-4', 51),
  ('tech-4', 52),
  ('tech-4', 58),
  ('tech-5', 53),
  ('tech-5', 54),
  ('tech-5', 57),
  ('tech-6', 55),
  ('tech-6', 56),
  ('tech-6', 60)
ON CONFLICT DO NOTHING;

-- ── 9. technology_versions ───────────────────────────────────────────────────
INSERT INTO technology_versions (id, technology_id, version, name, owner, status, description, tags_snapshot, change_note) VALUES
  (1,  'tech-1', '1.0',  'React', 'Frontend Team', 'active', 'UI библиотека',                       '{frontend,javascript}',       'Создана'),
  (2,  'tech-1', '1.1',  'React', 'Frontend Team', 'active', E'# Заголовок первого уровня\n## Заголовок второго уровня', '{frontend,javascript}', ''),
  (3,  'tech-1', '1.2',  'React', 'Frontend Team', 'active', E'# Заголовок первого уровня\n## Заголовок второго уровня', '{frontend,javascript}', ''),
  (4,  'tech-1', '1.3',  'React', 'Frontend Team', 'active', E'# Заголовок первого уровня\n## Заголовок второго уровня', '{frontend,javascript}', ''),
  (5,  'tech-1', '1.4',  'React', 'Frontend Team', 'active', E'# Заголовок первого уровня\n## Заголовок второго уровня', '{frontend,javascript}', ''),
  (6,  'tech-1', '1.5',  'React', 'Frontend Team', 'active', E'# Заголовок первого уровня\n## Заголовок второго уровня', '{frontend,javascript}', ''),
  (7,  'tech-1', '1.6',  'React', 'Frontend Team', 'active', E'# Заголовок первого уровня\n## Заголовок второго уровня', '{frontend,javascript}', ''),
  (8,  'tech-1', '1.7',  'React', 'Frontend Team', 'active', E'# Заголовок первого уровня\n## Заголовок второго уровня', '{frontend,javascript}', ''),
  (9,  'tech-1', '1.8',  'React', 'Frontend Team', 'active', E'# Заголовок первого уровня\n## Заголовок второго уровня', '{frontend,javascript}', ''),
  (10, 'tech-1', '1.9',  'React', 'Frontend Team', 'active', E'# Заголовок первого уровня\n## Заголовок второго уровня', '{frontend,javascript}', ''),
  (11, 'tech-1', '1.10', 'React', 'Frontend Team', 'active', E'# Заголовок первого уровня\n## Заголовок второго уровня', '{frontend,javascript}', ''),
  (12, 'tech-1', '1.11', 'React', 'Frontend Team', 'active', E'# Заголовок первого уровня\n## Заголовок второго уровня', '{frontend,javascript}', ''),
  (13, 'tech-1', '1.12', 'React', 'Frontend Team', 'active', E'# Заголовок первого уровня\n## Заголовок второго уровня', '{frontend,javascript}', ''),
  (14, 'tech-1', '1.13', 'React', 'Frontend Team', 'active', E'# Заголовок первого уровня\n## Заголовок второго уровня', '{frontend,javascript}', ''),
  (15, 'tech-1', '1.14', 'React', 'Frontend Team', 'active', E'# Заголовок первого уровня\n## Заголовок второго уровня', '{frontend,javascript}', ''),
  (16, 'tech-1', '1.15', 'React', 'Frontend Team', 'active', E'# Заголовок первого уровня\n## Заголовок второго уровня', '{frontend,javascript}', ''),
  (17, 'tech-1', '1.16', 'React', 'Frontend Team', 'active', E'# Заголовок первого уровня\n## Заголовок второго уровня', '{frontend,javascript}', ''),
  (18, 'tech-1', '1.17', 'React', 'Frontend Team', 'active', E'# Заголовок первого уровня\n## Заголовок второго уровня', '{back,frontend,javascript}', ''),
  (19, 'tech-2', '1.0',  'JWT',   '',              'in_development', E'# JWT (JSON Web Token)\n\nJWT — открытый стандарт (RFC 7519).', '{}', 'Создана'),
  (20, 'tech-3', '1.0',  'TLS шифрование', '', 'in_development', '', '{}', 'Создана'),
  (21, 'tech-3', '1.1',  'TLS шифрование', '', 'in_development', '', '{}', ''),
  (22, 'tech-2', '1.1',  'JWT',   '',              'in_development', E'# JWT (JSON Web Token)\n\nJWT — открытый стандарт (RFC 7519).', '{токены,доступ,jwt}', ''),
  (23, 'tech-4', '1.0',  'PostgreSQL', 'DBA Team', 'active', 'СУБД PostgreSQL 15.x — основное хранилище данных.', '{postgresql,database,hardening}', 'Создана'),
  (24, 'tech-5', '1.0',  'Nginx',  'Infra Team',   'active', 'Nginx 1.24+ — высокопроизводительный HTTP-сервер.', '{nginx,reverse-proxy,tls}', 'Создана'),
  (25, 'tech-6', '1.0',  'HashiCorp Vault', 'Security Team', 'active', 'HashiCorp Vault 1.15+ — централизованное управление секретами.', '{vault,secrets,encryption}', 'Создана')
ON CONFLICT (id) DO NOTHING;

SELECT setval('technology_versions_id_seq', (SELECT MAX(id) FROM technology_versions));

-- ── 10. mermaid_diagrams ─────────────────────────────────────────────────────
INSERT INTO mermaid_diagrams (id, technology_id, title, code) VALUES
  (1, 'tech-1', 'reakt test', E'flowchart TD\n    A[Начало] --> B{Условие}\n    B -->|Да| C[Действие]\n    B -->|Нет| D[Конец]')
ON CONFLICT (id) DO NOTHING;

SELECT setval('mermaid_diagrams_id_seq', (SELECT MAX(id) FROM mermaid_diagrams));

-- ── 11. requirements ─────────────────────────────────────────────────────────
INSERT INTO requirements (id, short_desc, description, req_type, owner, status, normative_doc, control_metrics, fulfillment_method, is_procurement, score_point, score_weight) VALUES
  ('req-1',  'JWT токен должен быть со строго ограниченным временем жизни',
             E'### В описании указываем причины и другую информацию которая может касаться сред применения',
             'functional', '', 'active', 'ссылки на нормативную документацию', 'токен должен дыть не больше 10 минут', 'индивидуальная настройки в ИС', true, 2, 7),
  ('req-2',  'Соединение должно быть защищено TLS шифрованием',
             '', 'organizational', '', 'active', '', 'Допустима версия не ниже 1.2', '', true, 2, 5),
  ('req-3',  'SSL/TLS шифрование всех подключений к СУБД',
             'Все подключения к PostgreSQL должны выполняться только через SSL/TLS. Параметр ssl=on в postgresql.conf. Незашифрованные подключения должны быть запрещены через pg_hba.conf (hostssl вместо host).',
             'functional', 'Security Team', 'active', '', '', '', false, 1, 1),
  ('req-4',  'SCRAM-SHA-256 как метод аутентификации',
             'Метод аутентификации md5 устарел и уязвим. Необходимо использовать scram-sha-256 во всех записях pg_hba.conf. Параметр password_encryption=scram-sha-256 в postgresql.conf.',
             'functional', 'Security Team', 'active', '', '', '', false, 1, 1),
  ('req-5',  'Фильтрация подключений по IP через pg_hba.conf',
             'Доступ к PostgreSQL должен быть разрешён только с известных IP-адресов и подсетей. Использовать запись типа hostssl с указанием конкретных CIDR. Запрещать 0.0.0.0/0.',
             'functional', 'Security Team', 'active', '', '', '', false, 1, 1),
  ('req-6',  'Аудит всех DDL и привилегированных операций через pgAudit',
             'Расширение pgAudit должно быть установлено и настроено для логирования DDL (CREATE, DROP, ALTER) и всех операций суперпользователя. Логи должны направляться в syslog или отдельный файл.',
             'functional', 'Security Team', 'in_development', 'ВНД', 'Метрика контроля', 'Способ исполнения', true, 2, 5),
  ('req-7',  'Принцип наименьших привилегий для прикладных пользователей БД',
             'Прикладной пользователь PostgreSQL не должен иметь права SUPERUSER, CREATEDB, CREATEROLE. Права только на необходимые схемы и таблицы. Использовать REVOKE ALL с последующим GRANT на конкретные объекты.',
             'functional', 'Security Team', 'active', '', '', '', false, 1, 1),
  ('req-8',  'Терминация TLS 1.2+ на уровне Nginx',
             'Nginx должен принимать только TLS 1.2 и TLS 1.3. Директивы ssl_protocols TLSv1.2 TLSv1.3. Использовать современные cipher suites: ssl_ciphers HIGH:!aNULL:!MD5.',
             'functional', 'Infra Team', 'active', '', '', '', false, 1, 1),
  ('req-9',  'Rate limiting для защиты от brute-force и DDoS',
             'Настроить limit_req_zone и limit_req для ограничения числа запросов. Для auth-эндпоинтов не более 5r/m. Возвращать 429 при превышении лимита.',
             'functional', 'Infra Team', 'active', '', '', '', false, 1, 1),
  ('req-10', 'Все секреты приложений хранятся исключительно в Vault',
             'Запрещено хранить пароли, токены, ключи в переменных окружения, конфигурационных файлах или git-репозитории. Все секреты получаются через Vault API или Vault Agent.',
             'functional', 'Security Team', 'active', '', 'отсутсвие секретов в Git репозиториях', '', false, 2, 4),
  ('req-11', 'Динамические учётные данные для PostgreSQL через Vault Database Engine',
             'Vault Database Secrets Engine генерирует временные учётные данные для PostgreSQL с TTL 1 час. После истечения TTL учётная запись автоматически удаляется. Исключает использование долгоживущих паролей.',
             'functional', 'Security Team', 'in_development', '', '', '', false, 2, 4)
ON CONFLICT (id) DO NOTHING;

-- ── 12. requirement_versions ─────────────────────────────────────────────────
INSERT INTO requirement_versions (id, requirement_id, version, change_note) VALUES
  (1,  'req-1',  '1.0', ''),
  (2,  'req-1',  '1.1', ''),
  (3,  'req-1',  '1.2', ''),
  (4,  'req-2',  '1.0', ''),
  (5,  'req-2',  '1.1', ''),
  (6,  'req-2',  '1.2', ''),
  (7,  'req-1',  '1.3', ''),
  (8,  'req-3',  '1.0', 'Начальная версия'),
  (9,  'req-4',  '1.0', 'Начальная версия'),
  (10, 'req-5',  '1.0', 'Начальная версия'),
  (11, 'req-6',  '1.0', 'Начальная версия'),
  (12, 'req-7',  '1.0', 'Начальная версия'),
  (13, 'req-8',  '1.0', 'Начальная версия'),
  (14, 'req-9',  '1.0', 'Начальная версия'),
  (15, 'req-10', '1.0', 'Начальная версия'),
  (16, 'req-11', '1.0', 'Начальная версия'),
  (17, 'req-10', '1.1', ''),
  (18, 'req-6',  '1.1', 'Заполнитл пустые поля для теста'),
  (19, 'req-11', '1.1', '')
ON CONFLICT (id) DO NOTHING;

SELECT setval('requirement_versions_id_seq', (SELECT MAX(id) FROM requirement_versions));

-- ── 13. requirement_tags ─────────────────────────────────────────────────────
INSERT INTO requirement_tags (requirement_id, tag_id) VALUES
  ('req-1',  40), ('req-1',  41), ('req-1',  42),
  ('req-3',  51), ('req-3',  57), ('req-3',  63),
  ('req-4',  51), ('req-4',  59),
  ('req-5',  51), ('req-5',  68),
  ('req-6',  51), ('req-6',  64),
  ('req-7',  51),
  ('req-8',  53), ('req-8',  57), ('req-8',  63),
  ('req-9',  53), ('req-9',  66),
  ('req-10', 55), ('req-10', 56),
  ('req-11', 51), ('req-11', 55)
ON CONFLICT DO NOTHING;

-- ── 14. requirement_technologies ─────────────────────────────────────────────
INSERT INTO requirement_technologies (requirement_id, technology_id) VALUES
  ('req-1',  'tech-2'),
  ('req-2',  'tech-2'), ('req-2',  'tech-3'),
  ('req-3',  'tech-4'),
  ('req-4',  'tech-4'),
  ('req-5',  'tech-4'),
  ('req-6',  'tech-4'),
  ('req-7',  'tech-4'),
  ('req-8',  'tech-5'),
  ('req-9',  'tech-5'),
  ('req-10', 'tech-6'),
  ('req-11', 'tech-4'), ('req-11', 'tech-6')
ON CONFLICT DO NOTHING;

-- ── 15. requirement_tech_domain ──────────────────────────────────────────────
INSERT INTO requirement_tech_domain (requirement_id, tech_domain_id) VALUES
  ('req-1',  'tech-dom-10'),
  ('req-2',  'tech-dom-8'),
  ('req-3',  'tech-dom-8'),
  ('req-4',  'tech-dom-10'),
  ('req-5',  'tech-dom-8'),
  ('req-6',  'tech-dom-4'),
  ('req-7',  'tech-dom-3'),
  ('req-8',  'tech-dom-8'),
  ('req-9',  'tech-dom-8'),
  ('req-10', 'tech-dom-5'),
  ('req-11', 'tech-dom-3')
ON CONFLICT DO NOTHING;

-- ── 16. decisions ────────────────────────────────────────────────────────────
INSERT INTO decisions (id, name, owner, status, decision_type, description) VALUES
  ('tos-1', 'Тестовое техническое решение',    '', 'in_development', 'technical',      ''),
  ('tos-2', 'Тестовое Организационное решение', '', 'in_development', 'organizational', ''),
  ('tos-3', 'Keycloak',                         '', 'in_development', 'technical',
            E'**Keycloak** — это мощное open-source решение для управления идентификацией и доступом (IAM), разработанное компанией Red Hat.\n\nПоддерживает SSO, OAuth 2.0, OIDC, SAML 2.0, User Federation (LDAP/AD), Social Login, RBAC/ABAC и MFA.'),
  ('tos-4', 'PostgreSQL Hardening',             'Security Team', 'active', 'technical',
            'Комплекс мер по защите СУБД PostgreSQL: включает настройку SSL, SCRAM-SHA-256, pg_hba.conf, pgAudit и ограничение привилегий. Применяется на всех средах начиная от Stage.'),
  ('tos-5', 'Nginx Secure Gateway',             'Infra Team',    'active', 'technical',
            'Стандартная конфигурация Nginx как безопасного обратного прокси: TLS 1.2/1.3, HSTS, rate limiting, отключение небезопасных методов HTTP.'),
  ('tos-6', 'Управление секретами через HashiCorp Vault', 'Security Team', 'active', 'technical',
            'Все приложения получают секреты исключительно через Vault. Используется Vault Agent для автоматической ротации. Динамические credentials для PostgreSQL через Database Secrets Engine.'),
  ('tos-7', 'Политика управления доступом к базам данных', 'CISO', 'active', 'organizational',
            'Организационная политика, запрещающая использование суперпользователей в прикладных системах. Все запросы на доступ к БД согласуются с Security Team. Пересмотр прав каждые 90 дней.'),
  ('tos-8', 'Политика обращения с секретами и учётными данными', 'CISO', 'active', 'organizational',
            'Запрет хранить пароли, ключи и токены в коде, конфигурационных файлах и git-репозитории. Обязательное использование Vault. Нарушение является инцидентом безопасности категории HIGH.')
ON CONFLICT (id) DO NOTHING;

SELECT setval('decision_seq', 8);

-- ── 17. decision_versions ────────────────────────────────────────────────────
INSERT INTO decision_versions (id, decision_id, version, change_note) VALUES
  (1,  'tos-1', '1.0', 'Создано'),
  (2,  'tos-2', '1.0', 'Создано'),
  (3,  'tos-3', '1.0', 'Создано'),
  (4,  'tos-3', '1.1', ''),
  (5,  'tos-3', '1.2', ''),
  (6,  'tos-3', '1.3', ''),
  (7,  'tos-3', '1.4', ''),
  (8,  'tos-3', '1.5', ''),
  (9,  'tos-3', '1.6', ''),
  (10, 'tos-3', '1.7', ''),
  (11, 'tos-3', '1.8', ''),
  (12, 'tos-4', '1.0', 'Начальная версия'),
  (13, 'tos-5', '1.0', 'Начальная версия'),
  (14, 'tos-6', '1.0', 'Начальная версия'),
  (15, 'tos-7', '1.0', 'Начальная версия'),
  (16, 'tos-8', '1.0', 'Начальная версия')
ON CONFLICT (id) DO NOTHING;

SELECT setval('decision_versions_id_seq', (SELECT MAX(id) FROM decision_versions));

-- ── 18. decision_tags ────────────────────────────────────────────────────────
INSERT INTO decision_tags (decision_id, tag_id) VALUES
  ('tos-4', 51), ('tos-4', 58), ('tos-4', 63),
  ('tos-5', 53), ('tos-5', 57), ('tos-5', 66),
  ('tos-6', 55), ('tos-6', 56), ('tos-6', 70),
  ('tos-7', 51), ('tos-7', 67),
  ('tos-8', 55), ('tos-8', 56)
ON CONFLICT DO NOTHING;

-- ── 19. decision_technologies ────────────────────────────────────────────────
INSERT INTO decision_technologies (decision_id, technology_id) VALUES
  ('tos-3', 'tech-1'), ('tos-3', 'tech-2'), ('tos-3', 'tech-3'), ('tos-3', 'tech-4'),
  ('tos-4', 'tech-4'),
  ('tos-5', 'tech-5'),
  ('tos-6', 'tech-4'), ('tos-6', 'tech-6')
ON CONFLICT DO NOTHING;

-- ── 20. decision_links ───────────────────────────────────────────────────────
INSERT INTO decision_links (decision_id, related_id) VALUES
  ('tos-4', 'tos-6'),
  ('tos-4', 'tos-7'),
  ('tos-5', 'tos-4'),
  ('tos-6', 'tos-8')
ON CONFLICT DO NOTHING;

-- ── 21. decision_mermaid ─────────────────────────────────────────────────────
INSERT INTO decision_mermaid (id, decision_id, title, code) VALUES
  (1, 'tos-3', 'тестовая схема развертывания',
     E'graph TD\n    User[Пользователь] --> LB[Балансировщик Нагрузки]\n    App[Приложение] --> LB\n    \n    LB --> KC1[Keycloak Node 1]\n    LB --> KC2[Keycloak Node 2]\n    LB --> KC3[Keycloak Node N]\n    \n    KC1 <--> Cache[Распределенный кэш Infinispan]\n    KC2 <--> Cache\n    KC3 <--> Cache\n    \n    KC1 --> DB[(База Данных PostgreSQL)]\n    KC2 --> DB\n    KC3 --> DB\n    \n    KC1 -.-> IdP[Внешние IdP LDAP/Google]\n\n    style KC1 fill:#f96,stroke:#333\n    style KC2 fill:#f96,stroke:#333\n    style KC3 fill:#f96,stroke:#333\n    style DB fill:#bbf,stroke:#333\n    style LB fill:#bfb,stroke:#333')
ON CONFLICT (id) DO NOTHING;

SELECT setval('decision_mermaid_id_seq', (SELECT MAX(id) FROM decision_mermaid));

-- ── 22. hardenings ───────────────────────────────────────────────────────────
INSERT INTO hardenings (id, name, owner, status, description) VALUES
  ('hts-1', 'Харденинг KeyCloak',                  'Бла бла',      'in_development', ''),
  ('hts-2', 'PostgreSQL Security Hardening',        'Security Team', 'active',
            'Карточка харденинга для СУБД PostgreSQL. Содержит инструкции по настройке SSL/TLS, аутентификации SCRAM-SHA-256, ограничению сетевого доступа, аудиту через pgAudit и управлению привилегиями.'),
  ('hts-3', 'Nginx Secure Configuration',           'Infra Team',   'active',
            'Карточка харденинга для Nginx: отключение небезопасных версий TLS, настройка cipher suites, HSTS, rate limiting для защиты от brute-force.'),
  ('hts-4', 'HashiCorp Vault Deployment Hardening', 'Security Team', 'in_development',
            'Карточка харденинга для HashiCorp Vault: TLS между агентом и сервером, политики доступа (ACL), аудит-логи, интеграция с PostgreSQL Database Engine.')
ON CONFLICT (id) DO NOTHING;

SELECT setval('hardening_seq', 4);

-- ── 23. hardening_versions ───────────────────────────────────────────────────
INSERT INTO hardening_versions (id, hardening_id, version, name, owner, status, description, tags_snapshot, change_note) VALUES
  (1, 'hts-1', '1.0', 'Харденинг KeyCloak',                  'Бла бла',       'in_development', '', NULL, ''),
  (2, 'hts-1', '1.1', 'Харденинг KeyCloak',                  'Бла бла',       'in_development', '', NULL, ''),
  (3, 'hts-2', '1.0', 'PostgreSQL Security Hardening',        'Security Team', 'active',         '', NULL, 'Начальная версия'),
  (4, 'hts-3', '1.0', 'Nginx Secure Configuration',           'Infra Team',    'active',         '', NULL, 'Начальная версия'),
  (5, 'hts-4', '1.0', 'HashiCorp Vault Deployment Hardening', 'Security Team', 'in_development', '', NULL, 'Начальная версия'),
  (6, 'hts-2', '1.0', 'PostgreSQL Security Hardening',        'Security Team', 'active',         '', NULL, 'Начальная версия'),
  (7, 'hts-3', '1.0', 'Nginx Secure Configuration',           'Infra Team',    'active',         '', NULL, 'Начальная версия'),
  (8, 'hts-4', '1.0', 'HashiCorp Vault Hardening',            'Security Team', 'in_development', '', NULL, 'Начальная версия'),
  (9, 'hts-2', '1.1', 'PostgreSQL Security Hardening',        'Security Team', 'active',
     'Карточка харденинга для СУБД PostgreSQL. Содержит инструкции по настройке SSL/TLS, аутентификации SCRAM-SHA-256, ограничению сетевого доступа, аудиту через pgAudit и управлению привилегиями.',
     NULL, '')
ON CONFLICT (id) DO NOTHING;

SELECT setval('hardening_versions_id_seq', (SELECT MAX(id) FROM hardening_versions));

-- ── 24. hardening_tags ───────────────────────────────────────────────────────
INSERT INTO hardening_tags (hardening_id, tag_id) VALUES
  ('hts-2', 51), ('hts-2', 58), ('hts-2', 63),
  ('hts-3', 53), ('hts-3', 57), ('hts-3', 66),
  ('hts-4', 55), ('hts-4', 56), ('hts-4', 60)
ON CONFLICT DO NOTHING;

-- ── 25. hardening_solutions ──────────────────────────────────────────────────
INSERT INTO hardening_solutions (hardening_id, solution_id) VALUES
  ('hts-1', 'tos-3'),
  ('hts-2', 'tos-4'),
  ('hts-3', 'tos-5'),
  ('hts-4', 'tos-6')
ON CONFLICT DO NOTHING;

-- ── 26. hardening_req_content ────────────────────────────────────────────────
INSERT INTO hardening_req_content (id, hardening_id, requirement_id, markdown) VALUES
  (1,  'hts-1', 'req-1', 'Харденинг для первого требования'),
  (2,  'hts-1', 'req-2', 'Харденинг для второго требования'),
  (4,  'hts-2', 'req-3',
       E'## SSL/TLS для PostgreSQL\n\n**postgresql.conf:**\nssl = on\nssl_cert_file = /etc/ssl/certs/server.crt\nssl_key_file  = /etc/ssl/private/server.key\n\n**pg_hba.conf — только зашифрованные подключения:**\nhostssl all all 10.0.0.0/8   scram-sha-256\nhost    all all 0.0.0.0/0    reject\n\n**Проверка:**\nSELECT pid, ssl, client_addr FROM pg_stat_ssl JOIN pg_stat_activity USING(pid) WHERE ssl = true;'),
  (5,  'hts-2', 'req-4',
       E'## SCRAM-SHA-256\n\n**postgresql.conf:**\npassword_encryption = scram-sha-256\n\n**Сменить пароли пользователей:**\nALTER ROLE appuser PASSWORD ''strong_password'';\nALTER ROLE readonly PASSWORD ''strong_password'';\n\n**Проверка (результат должен быть пустым):**\nSELECT rolname FROM pg_authid\nWHERE rolpassword NOT LIKE ''SCRAM-SHA-256%''\n  AND rolcanlogin = true;'),
  (6,  'hts-2', 'req-5',
       E'## pg_hba.conf — фильтрация по IP\n\n**/etc/postgresql/15/main/pg_hba.conf:**\nhostssl all all 10.10.0.0/24  scram-sha-256\nhostssl all all 10.20.0.0/24  scram-sha-256\nlocal   all postgres           peer\nhost    all all 0.0.0.0/0     reject\n\n**Применить без перезапуска:**\nSELECT pg_reload_conf();\n\n**Проверка:**\nС разрешённого IP — psql -h 10.10.0.5 -U appuser -d mydb  => успех\nС другого IP — FATAL: pg_hba.conf rejects connection'),
  (7,  'hts-2', 'req-6',
       E'## pgAudit — аудит DDL\n\n**Установка:**\napt install postgresql-15-pgaudit\n\n**postgresql.conf:**\nshared_preload_libraries = ''pgaudit''\npgaudit.log = ''ddl, role, misc_set''\npgaudit.log_catalog = on\npgaudit.log_relation = on\n\n**После перезапуска:**\nCREATE EXTENSION pgaudit;\n\n**Проверка логов:**\ngrep AUDIT /var/log/postgresql/postgresql-15-main.log | tail -20'),
  (8,  'hts-2', 'req-7',
       E'## Принцип наименьших привилегий\n\n**Создать пользователя:**\nCREATE ROLE appuser LOGIN PASSWORD ''strong_password'';\n\n**Убрать права по умолчанию:**\nREVOKE ALL ON SCHEMA public FROM appuser;\nREVOKE ALL ON ALL TABLES IN SCHEMA public FROM appuser;\n\n**Выдать только необходимые:**\nGRANT CONNECT ON DATABASE mydb TO appuser;\nGRANT USAGE ON SCHEMA app TO appuser;\nGRANT SELECT, INSERT, UPDATE ON TABLE app.orders TO appuser;\n\n**Проверка (не должно быть Superuser):**\n\\du appuser'),
  (9,  'hts-3', 'req-8',
       E'## TLS 1.2+ в Nginx\n\n**nginx.conf (блок server):**\nssl_protocols TLSv1.2 TLSv1.3;\nssl_ciphers   HIGH:!aNULL:!MD5:!RC4;\nssl_prefer_server_ciphers on;\nssl_session_cache shared:SSL:10m;\nadd_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;\n\n**Редирект HTTP -> HTTPS:**\nserver { listen 80; return 301 https://$host$request_uri; }\n\n**Проверка:**\nnmap --script ssl-enum-ciphers -p 443 api.example.com\nopenssl s_client -connect api.example.com:443 -tls1_1\n# Ожидаем: handshake failure'),
  (10, 'hts-3', 'req-9',
       E'## Rate Limiting в Nginx\n\n**Зоны (блок http):**\nlimit_req_zone $binary_remote_addr zone=api:10m   rate=30r/m;\nlimit_req_zone $binary_remote_addr zone=auth:10m  rate=5r/m;\n\n**Применить к location:**\nlocation /auth/token {\n    limit_req zone=auth burst=3 nodelay;\n    limit_req_status 429;\n    proxy_pass http://auth_backend;\n}\n\n**Проверка:**\nfor i in $(seq 1 10); do\n  curl -s -o /dev/null -w "%{http_code}\\n" https://example.com/auth/token\ndone\n# Запросы 4-10 => 429'),
  (11, 'hts-4', 'req-10',
       E'## HashiCorp Vault — получение секретов\n\n**Vault Agent config:**\nauto_auth {\n  method "kubernetes" {\n    mount_path = "auth/kubernetes"\n    config = { role = "myapp-prod" }\n  }\n}\ntemplate {\n  source      = "/vault/templates/db.ctmpl"\n  destination = "/vault/secrets/db.env"\n  perms       = "0600"\n}\n\n**Шаблон /vault/templates/db.ctmpl:**\n{{ with secret "secret/data/myapp/db" }}\nDB_HOST={{ .Data.data.host }}\nDB_PASS={{ .Data.data.password }}\n{{ end }}\n\n**Проверка:**\nvault kv get secret/myapp/db\nvault audit list'),
  (12, 'hts-4', 'req-11',
       E'## Vault Database Engine — динамические credentials для PostgreSQL\n\n**1. Включить движок:**\nvault secrets enable database\n\n**2. Настроить подключение:**\nvault write database/config/pg \\\n  plugin_name=postgresql-database-plugin \\\n  connection_url="postgresql://{{username}}:{{password}}@pg-host:5432/mydb?sslmode=require" \\\n  allowed_roles="myapp-role" \\\n  username="vault_admin" password="..."\n\n**3. Создать роль с TTL 1h:**\nvault write database/roles/myapp-role \\\n  db_name=pg \\\n  default_ttl="1h" max_ttl="24h" \\\n  creation_statements="CREATE ROLE {{name}} LOGIN PASSWORD ''{{password}}'' VALID UNTIL ''{{expiration}}''; GRANT SELECT ON ALL TABLES IN SCHEMA app TO {{name}};"\n\n**4. Получить credentials:**\nvault read database/creds/myapp-role\n# username: v-myapp-xKj2-abc\n# password: A1b2-...\n# lease_duration: 1h')
ON CONFLICT (id) DO NOTHING;

SELECT setval('hardening_req_content_id_seq', (SELECT MAX(id) FROM hardening_req_content));

-- ── 27. hardening_req_images ─────────────────────────────────────────────────
-- Изображение хранится в S3 — вставляем только метаданные записи
INSERT INTO hardening_req_images (id, hardening_id, requirement_id, filename, s3_key, content_type, size_bytes, sort_order) VALUES
  (1, 'hts-1', 'req-1', 'Дополнительный шлюз в DCN.png',
     'hardening/3cdd152e040347279cd51917980447d2.png', 'image/png', 187838, 0)
ON CONFLICT (id) DO NOTHING;

SELECT setval('hardening_req_images_id_seq', (SELECT MAX(id) FROM hardening_req_images));

-- ── 28. hardening_req_env_status ─────────────────────────────────────────────
INSERT INTO hardening_req_env_status (id, hardening_id, requirement_id, env, status, iod) VALUES
  (1,   'hts-1', 'req-2', 'prod',     'required',     false),
  (2,   'hts-1', 'req-2', 'prodlike', 'required',     false),
  (3,   'hts-1', 'req-2', 'stage',    'required',     false),
  (4,   'hts-1', 'req-2', 'test',     'not_required', false),
  (5,   'hts-1', 'req-2', 'dev',      'not_required', false),
  (31,  'hts-2', 'req-3', 'prod',     'required',     false),
  (32,  'hts-2', 'req-3', 'prodlike', 'required',     false),
  (33,  'hts-2', 'req-3', 'stage',    'conditional',  false),
  (34,  'hts-2', 'req-3', 'test',     'conditional',  false),
  (35,  'hts-2', 'req-3', 'dev',      'not_required', false),
  (36,  'hts-2', 'req-4', 'prod',     'required',     false),
  (37,  'hts-2', 'req-4', 'prodlike', 'required',     false),
  (38,  'hts-2', 'req-4', 'stage',    'required',     false),
  (39,  'hts-2', 'req-4', 'test',     'required',     false),
  (40,  'hts-2', 'req-4', 'dev',      'conditional',  false),
  (41,  'hts-2', 'req-5', 'prod',     'required',     false),
  (42,  'hts-2', 'req-5', 'prodlike', 'required',     false),
  (43,  'hts-2', 'req-5', 'stage',    'required',     false),
  (44,  'hts-2', 'req-5', 'test',     'conditional',  false),
  (45,  'hts-2', 'req-5', 'dev',      'not_required', false),
  (46,  'hts-2', 'req-6', 'prod',     'required',     false),
  (47,  'hts-2', 'req-6', 'prodlike', 'required',     false),
  (48,  'hts-2', 'req-6', 'stage',    'conditional',  false),
  (49,  'hts-2', 'req-6', 'test',     'required',     false),
  (50,  'hts-2', 'req-6', 'dev',      'not_required', false),
  (51,  'hts-2', 'req-7', 'prod',     'required',     false),
  (52,  'hts-2', 'req-7', 'prodlike', 'required',     false),
  (53,  'hts-2', 'req-7', 'stage',    'required',     false),
  (54,  'hts-2', 'req-7', 'test',     'required',     false),
  (55,  'hts-2', 'req-7', 'dev',      'conditional',  false),
  (56,  'hts-3', 'req-8', 'prod',     'required',     false),
  (57,  'hts-3', 'req-8', 'prodlike', 'required',     false),
  (58,  'hts-3', 'req-8', 'stage',    'required',     false),
  (59,  'hts-3', 'req-8', 'test',     'conditional',  false),
  (60,  'hts-3', 'req-8', 'dev',      'not_required', false),
  (61,  'hts-3', 'req-9', 'prod',     'required',     false),
  (62,  'hts-3', 'req-9', 'prodlike', 'required',     false),
  (63,  'hts-3', 'req-9', 'stage',    'conditional',  false),
  (64,  'hts-3', 'req-9', 'test',     'not_required', false),
  (65,  'hts-3', 'req-9', 'dev',      'not_required', false),
  (66,  'hts-4', 'req-10', 'prod',     'required',     false),
  (67,  'hts-4', 'req-10', 'prodlike', 'required',     false),
  (68,  'hts-4', 'req-10', 'stage',    'required',     false),
  (69,  'hts-4', 'req-10', 'test',     'conditional',  false),
  (70,  'hts-4', 'req-10', 'dev',      'not_required', false),
  (71,  'hts-4', 'req-11', 'prod',     'required',     false),
  (72,  'hts-4', 'req-11', 'prodlike', 'required',     false),
  (73,  'hts-4', 'req-11', 'stage',    'conditional',  false),
  (74,  'hts-4', 'req-11', 'test',     'not_required', false),
  (75,  'hts-4', 'req-11', 'dev',      'not_required', false),
  -- IOD-записи (iod=true) для req-4 и req-6
  (81,  'hts-2', 'req-6', 'prod',     'not_required', true),
  (82,  'hts-2', 'req-6', 'prodlike', 'required',     true),
  (83,  'hts-2', 'req-6', 'stage',    'required',     true),
  (84,  'hts-2', 'req-6', 'test',     'not_required', true),
  (85,  'hts-2', 'req-6', 'dev',      'conditional',  true),
  (131, 'hts-2', 'req-4', 'prod',     'conditional',  true),
  (132, 'hts-2', 'req-4', 'prodlike', 'required',     true),
  (133, 'hts-2', 'req-4', 'stage',    'conditional',  true),
  (134, 'hts-2', 'req-4', 'test',     'not_required', true),
  (135, 'hts-2', 'req-4', 'dev',      'not_required', true)
ON CONFLICT (id) DO NOTHING;

SELECT setval('hardening_req_env_status_id_seq', (SELECT MAX(id) FROM hardening_req_env_status));

-- ── 29. arch_templates ───────────────────────────────────────────────────────
INSERT INTO arch_templates (id, name, owner, status, description) VALUES
  ('arch-sec-1', 'Test Template', 'Test', 'in_development', ''),
  ('arch-sec-2', 'Test Template', 'Test', 'in_development', 'описание бла бла бла'),
  ('arch-sec-3', 'Test Template', 'Test', 'in_development', ''),
  ('arch-sec-4', 'Архитектура аутентификации и авторизации (IAM)', 'Security Team', 'active',
   E'Шаблон описывает стандартную архитектуру управления идентификацией и доступом для веб-приложений. Включает OAuth 2.0 / OIDC через Keycloak, JWT-токены с ограниченным TTL, ролевую модель доступа и интеграцию с HashiCorp Vault для хранения секретов.\n\n## Ключевые компоненты\n\n- **Identity Provider**: Keycloak\n- **Токены**: JWT с TTL 15 минут\n- **Авторизация**: RBAC на уровне API Gateway\n- **Секреты**: Vault для хранения client_secret и signing keys'),
  ('arch-sec-5', 'Безопасность API Gateway и микросервисов', 'Infra Team', 'active',
   E'Шаблон для защиты API-слоя в микросервисной архитектуре. Описывает настройку Nginx как API Gateway с mTLS между сервисами, rate limiting, валидацией JWT и логированием всех запросов.\n\n## Ключевые компоненты\n\n- **API Gateway**: Nginx с терминацией TLS и rate limiting\n- **Межсервисная аутентификация**: mTLS\n- **Авторизация запросов**: проверка JWT на уровне gateway\n- **Аудит**: централизованное логирование через syslog'),
  ('arch-sec-6', 'Харденинг базы данных PostgreSQL (Production)', 'DBA Team', 'active',
   E'Комплексный шаблон харденинга СУБД PostgreSQL для продуктивных сред. Покрывает сетевую изоляцию, аутентификацию SCRAM-SHA-256, аудит через pgAudit, шифрование соединений и управление привилегиями.\n\n## Ключевые компоненты\n\n- **Сеть**: ограничение доступа по IP через pg_hba.conf\n- **Аутентификация**: SCRAM-SHA-256, запрет MD5\n- **Шифрование**: SSL/TLS для всех подключений\n- **Аудит**: pgAudit для DDL и привилегированных операций\n- **Привилегии**: отдельные роли для read-only и read-write'),
  ('arch-sec-7', 'Политика управления секретами и ротации ключей', 'CISO', 'active',
   E'Организационный шаблон, регламентирующий процессы работы с секретами, паролями и криптографическими ключами. Устанавливает запрет хранения секретов в коде, обязательное использование Vault и процедуры ротации.\n\n## Ключевые правила\n\n1. **Запрет хранения в коде** — любой секрет в git является инцидентом HIGH\n2. **Централизованное хранение** — только в HashiCorp Vault\n3. **Ротация** — пароли БД каждые 90 дней, API-ключи — каждые 180 дней'),
  ('arch-sec-8', 'Мониторинг безопасности и реагирование на инциденты', 'Security Team', 'in_development',
   E'Организационный шаблон для построения процессов мониторинга событий безопасности и реагирования на инциденты.\n\n## Источники событий\n\n- Логи pgAudit (PostgreSQL)\n- Логи Nginx (access + error)\n- Аудит-логи Vault\n- Системные логи (syslog / journald)')
ON CONFLICT (id) DO NOTHING;

-- ── 30. arch_template_versions ───────────────────────────────────────────────
INSERT INTO arch_template_versions (id, template_id, version, change_note) VALUES
  (1,  'arch-sec-1', '1.0', 'Создан'),
  (2,  'arch-sec-1', '1.1', 'Обновлён'),
  (3,  'arch-sec-2', '1.0', 'Создан'),
  (4,  'arch-sec-2', '1.1', 'Обновлён'),
  (5,  'arch-sec-2', '1.2', 'Обновлён'),
  (6,  'arch-sec-3', '1.0', 'Создан'),
  (7,  'arch-sec-3', '1.1', 'Обновлён'),
  (8,  'arch-sec-1', '1.2', 'Обновлён'),
  (9,  'arch-sec-1', '1.3', 'Обновлён'),
  (10, 'arch-sec-4', '1.0', 'Начальная версия'),
  (11, 'arch-sec-5', '1.0', 'Начальная версия'),
  (12, 'arch-sec-6', '1.0', 'Начальная версия'),
  (13, 'arch-sec-7', '1.0', 'Начальная версия'),
  (14, 'arch-sec-8', '1.0', 'Начальная версия'),
  (15, 'arch-sec-8', '1.1', 'Обновлён'),
  (16, 'arch-sec-6', '1.1', 'Обновлён'),
  (17, 'arch-sec-6', '1.2', 'Обновлён'),
  (18, 'arch-sec-6', '1.3', 'Обновлён')
ON CONFLICT (id) DO NOTHING;

SELECT setval('arch_template_versions_id_seq', (SELECT MAX(id) FROM arch_template_versions));

-- ── 31. arch_template_tags ───────────────────────────────────────────────────
INSERT INTO arch_template_tags (template_id, tag_id) VALUES
  ('arch-sec-4', 42), ('arch-sec-4', 59), ('arch-sec-4', 72),
  ('arch-sec-5', 53), ('arch-sec-5', 57), ('arch-sec-5', 73), ('arch-sec-5', 74),
  ('arch-sec-6', 51), ('arch-sec-6', 52), ('arch-sec-6', 58), ('arch-sec-6', 65),
  ('arch-sec-7', 55), ('arch-sec-7', 56), ('arch-sec-7', 77),
  ('arch-sec-8', 64), ('arch-sec-8', 78), ('arch-sec-8', 79)
ON CONFLICT DO NOTHING;

-- ── 32. arch_template_technologies ───────────────────────────────────────────
INSERT INTO arch_template_technologies (template_id, technology_id) VALUES
  ('arch-sec-1', 'tech-4'),
  ('arch-sec-4', 'tech-2'), ('arch-sec-4', 'tech-3'),
  ('arch-sec-5', 'tech-3'), ('arch-sec-5', 'tech-5'),
  ('arch-sec-6', 'tech-4'),
  ('arch-sec-7', 'tech-4'), ('arch-sec-7', 'tech-6'),
  ('arch-sec-8', 'tech-3')
ON CONFLICT DO NOTHING;

-- ── 33. arch_template_decisions ──────────────────────────────────────────────
INSERT INTO arch_template_decisions (template_id, decision_id, is_active) VALUES
  ('arch-sec-1', 'tos-7', true),
  ('arch-sec-2', 'tos-3', true),
  ('arch-sec-3', 'tos-4', true),
  ('arch-sec-4', 'tos-3', true), ('arch-sec-4', 'tos-7', true),
  ('arch-sec-5', 'tos-5', true),
  ('arch-sec-6', 'tos-4', true), ('arch-sec-6', 'tos-7', true),
  ('arch-sec-7', 'tos-6', true), ('arch-sec-7', 'tos-8', true),
  ('arch-sec-8', 'tos-7', true), ('arch-sec-8', 'tos-8', true)
ON CONFLICT DO NOTHING;

-- ── 34. arch_template_links ──────────────────────────────────────────────────
INSERT INTO arch_template_links (template_id, related_id, is_active) VALUES
  ('arch-sec-4', 'arch-sec-5', true),
  ('arch-sec-5', 'arch-sec-6', true),
  ('arch-sec-6', 'arch-sec-5', true),
  ('arch-sec-6', 'arch-sec-7', true),
  ('arch-sec-7', 'arch-sec-8', true),
  ('arch-sec-8', 'arch-sec-7', true)
ON CONFLICT DO NOTHING;

-- ── 35. arch_template_mermaid ────────────────────────────────────────────────
INSERT INTO arch_template_mermaid (id, template_id, title, code) VALUES
  (1, 'arch-sec-6', '',
   E'%%{init: {''security'': {''level'': ''strict''}}}%%\ngraph TB\n    subgraph INTERNET["🌐 Internet (Untrusted Zone)"]\n        EXT_USER[Внешний пользователь]\n        ATTACKER[Потенциальный злоумышленник]\n    end\n\n    subgraph DMZ["🛡️ DMZ Zone"]\n        WAF[WAF / API Gateway]\n        WEB[Web/App Servers]\n        BASTION[🔐 Bastion Host<br/>MFA + JIT Access]\n    end\n\n    subgraph INTERNAL["🔒 Internal Secure Zone"]\n        subgraph DB_CLUSTER["🗄️ Database Cluster"]\n            DB_PRIMARY[(Primary DB<br/>TLS + TDE)]\n            DB_REPLICA[(Replica DB<br/>Read-Only)]\n            DB_BACKUP[(Backup Node<br/>Encrypted)]\n        end\n        subgraph DB_SERVICES["🔧 Database Services"]\n            KMS[🔑 KMS / Vault]\n            MONITOR[📊 DAM / SIEM]\n            FIREWALL[🧱 DB Firewall]\n        end\n    end\n\n    EXT_USER -->|HTTPS/TLS 1.3| WAF\n    WAF -->|Internal TLS| WEB\n    WEB -->|App DB User + TLS| FIREWALL\n    FIREWALL -->|Allowed SQL Only| DB_PRIMARY\n    DB_PRIMARY <-->|Async Replication + TLS| DB_REPLICA\n    DB_PRIMARY -->|Encrypted Stream| DB_BACKUP\n    BASTION -->|SSH + MFA + TLS| DB_PRIMARY\n    KMS <-->|Key Wrap| DB_PRIMARY\n    ATTACKER -.-x|BLOCKED| WAF\n\n    classDef secure fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px\n    class DB_PRIMARY,DB_REPLICA,DB_BACKUP,KMS,FIREWALL secure')
ON CONFLICT (id) DO NOTHING;

SELECT setval('arch_template_mermaid_id_seq', (SELECT MAX(id) FROM arch_template_mermaid));
