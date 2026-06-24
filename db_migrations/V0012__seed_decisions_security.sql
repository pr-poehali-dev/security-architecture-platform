-- =====================================================================
-- SEED: Технические и организационные решения
-- =====================================================================

-- Технические решения
INSERT INTO t_p84706301_security_architectur.decisions
  (id, name, owner, status, decision_type, description)
VALUES
  ('tos-4', 'PostgreSQL Hardening', 'Security Team', 'active', 'technical',
   'Комплекс мер по защите СУБД PostgreSQL: включает настройку SSL, SCRAM-SHA-256, pg_hba.conf, pgAudit и ограничение привилегий. Применяется на всех средах начиная от Stage.'),

  ('tos-5', 'Nginx Secure Gateway', 'Infra Team', 'active', 'technical',
   'Стандартная конфигурация Nginx как безопасного обратного прокси: TLS 1.2/1.3, HSTS, rate limiting, отключение небезопасных методов HTTP.'),

  ('tos-6', 'Управление секретами через HashiCorp Vault', 'Security Team', 'active', 'technical',
   'Все приложения получают секреты исключительно через Vault. Используется Vault Agent для автоматической ротации. Динамические credentials для PostgreSQL через Database Secrets Engine.'),

  -- Организационные решения
  ('tos-7', 'Политика управления доступом к базам данных', 'CISO', 'active', 'organizational',
   'Организационная политика, запрещающая использование суперпользователей в прикладных системах. Все запросы на доступ к БД согласуются с Security Team. Пересмотр прав каждые 90 дней.'),

  ('tos-8', 'Политика обращения с секретами и учётными данными', 'CISO', 'active', 'organizational',
   'Запрет хранить пароли, ключи и токены в коде, конфигурационных файлах и git-репозитории. Обязательное использование Vault. Нарушение является инцидентом безопасности категории HIGH.')

ON CONFLICT (id) DO NOTHING;

-- Версии решений
INSERT INTO t_p84706301_security_architectur.decision_versions (decision_id, version, change_note)
VALUES
  ('tos-4', '1.0', 'Начальная версия'),
  ('tos-5', '1.0', 'Начальная версия'),
  ('tos-6', '1.0', 'Начальная версия'),
  ('tos-7', '1.0', 'Начальная версия'),
  ('tos-8', '1.0', 'Начальная версия');

-- Связь технических решений с технологиями
INSERT INTO t_p84706301_security_architectur.decision_technologies (decision_id, technology_id)
VALUES
  ('tos-4', 'tech-4'),  -- PostgreSQL Hardening -> PostgreSQL
  ('tos-5', 'tech-5'),  -- Nginx Gateway -> Nginx
  ('tos-6', 'tech-6'),  -- Vault -> HashiCorp Vault
  ('tos-6', 'tech-4'),  -- Vault -> PostgreSQL (dynamic creds)
  ('tos-3', 'tech-4')   -- Keycloak -> PostgreSQL (БД для хранения)
ON CONFLICT DO NOTHING;

-- Связи между решениями
INSERT INTO t_p84706301_security_architectur.decision_links (decision_id, related_id)
VALUES
  ('tos-4', 'tos-7'),  -- PostgreSQL Hardening <-> Политика доступа к БД
  ('tos-6', 'tos-8'),  -- Vault <-> Политика секретов
  ('tos-4', 'tos-6'),  -- PostgreSQL Hardening <-> Vault (dynamic creds)
  ('tos-5', 'tos-4')   -- Nginx Gateway <-> PostgreSQL Hardening (TLS)
ON CONFLICT DO NOTHING;

-- Теги решений
INSERT INTO t_p84706301_security_architectur.decision_tags (decision_id, tag_id)
SELECT r, t.id FROM
  (VALUES
    ('tos-4','postgresql'), ('tos-4','hardening'), ('tos-4','ssl'),
    ('tos-5','nginx'), ('tos-5','tls'), ('tos-5','rate-limit'),
    ('tos-6','vault'), ('tos-6','secrets'), ('tos-6','dynamic-secrets'),
    ('tos-7','postgresql'), ('tos-7','least-privilege'),
    ('tos-8','secrets'), ('tos-8','vault')
  ) AS vals(r, tname)
JOIN t_p84706301_security_architectur.tags t ON t.name = vals.tname
ON CONFLICT DO NOTHING;
