-- =====================================================================
-- SEED: Технологии — PostgreSQL, Nginx, HashiCorp Vault
-- =====================================================================

-- Теги
INSERT INTO t_p84706301_security_architectur.tags (name) VALUES
  ('postgresql'), ('database'), ('nginx'), ('reverse-proxy'), ('vault'),
  ('secrets'), ('tls'), ('hardening'), ('authentication'), ('encryption')
ON CONFLICT (name) DO NOTHING;

-- Технологии
INSERT INTO t_p84706301_security_architectur.technologies (id, name, owner, status, description)
VALUES
  ('tech-4', 'PostgreSQL', 'DBA Team', 'active',
   'СУБД PostgreSQL 15.x — основное хранилище данных. Используется для хранения пользовательских данных, конфигураций и аудит-логов.'),
  ('tech-5', 'Nginx', 'Infra Team', 'active',
   'Nginx 1.24+ — высокопроизводительный HTTP-сервер и обратный прокси. Применяется для терминации TLS, балансировки нагрузки и rate limiting.'),
  ('tech-6', 'HashiCorp Vault', 'Security Team', 'active',
   'HashiCorp Vault 1.15+ — централизованное управление секретами, динамические учётные данные для БД, PKI и выпуск сертификатов.')
ON CONFLICT (id) DO NOTHING;

-- Версии технологий
INSERT INTO t_p84706301_security_architectur.technology_versions (technology_id, version, name, owner, status, description, change_note)
VALUES
  ('tech-4', '1.0', 'PostgreSQL', 'DBA Team', 'active', '', 'Начальная версия'),
  ('tech-5', '1.0', 'Nginx', 'Infra Team', 'active', '', 'Начальная версия'),
  ('tech-6', '1.0', 'HashiCorp Vault', 'Security Team', 'active', '', 'Начальная версия');

-- Теги технологий
INSERT INTO t_p84706301_security_architectur.technology_tags (technology_id, tag_id)
SELECT 'tech-4', id FROM t_p84706301_security_architectur.tags WHERE name IN ('postgresql','database','hardening')
ON CONFLICT DO NOTHING;

INSERT INTO t_p84706301_security_architectur.technology_tags (technology_id, tag_id)
SELECT 'tech-5', id FROM t_p84706301_security_architectur.tags WHERE name IN ('nginx','reverse-proxy','tls')
ON CONFLICT DO NOTHING;

INSERT INTO t_p84706301_security_architectur.technology_tags (technology_id, tag_id)
SELECT 'tech-6', id FROM t_p84706301_security_architectur.tags WHERE name IN ('vault','secrets','encryption')
ON CONFLICT DO NOTHING;
