-- SEED: Харденинг-карточки, теги, привязки к решениям, статусы сред
INSERT INTO t_p84706301_security_architectur.hardenings (id, name, owner, status, description)
VALUES
  ('hts-2', 'PostgreSQL Security Hardening', 'Security Team', 'active',
   'Карточка харденинга СУБД PostgreSQL: SSL/TLS, SCRAM-SHA-256, pg_hba.conf, pgAudit, минимальные привилегии.'),
  ('hts-3', 'Nginx Secure Configuration', 'Infra Team', 'active',
   'Харденинг Nginx: TLS 1.2/1.3, HSTS, cipher suites, rate limiting против brute-force.'),
  ('hts-4', 'HashiCorp Vault Hardening', 'Security Team', 'in_development',
   'Харденинг Vault: TLS, ACL-политики, аудит-логи, интеграция с PostgreSQL Database Engine.')
ON CONFLICT (id) DO NOTHING;

INSERT INTO t_p84706301_security_architectur.hardening_versions
  (hardening_id, version, name, owner, status, description, change_note)
VALUES
  ('hts-2','1.0','PostgreSQL Security Hardening','Security Team','active','','Начальная версия'),
  ('hts-3','1.0','Nginx Secure Configuration','Infra Team','active','','Начальная версия'),
  ('hts-4','1.0','HashiCorp Vault Hardening','Security Team','in_development','','Начальная версия');

INSERT INTO t_p84706301_security_architectur.hardening_tags (hardening_id, tag_id)
SELECT r, t.id FROM
  (VALUES
    ('hts-2','postgresql'),('hts-2','hardening'),('hts-2','ssl'),
    ('hts-3','nginx'),('hts-3','tls'),('hts-3','rate-limit'),
    ('hts-4','vault'),('hts-4','secrets'),('hts-4','encryption')
  ) AS vals(r, tname)
JOIN t_p84706301_security_architectur.tags t ON t.name = vals.tname
ON CONFLICT DO NOTHING;

INSERT INTO t_p84706301_security_architectur.hardening_solutions (hardening_id, solution_id)
VALUES ('hts-2','tos-4'),('hts-3','tos-5'),('hts-4','tos-6')
ON CONFLICT DO NOTHING;

-- Статусы сред
INSERT INTO t_p84706301_security_architectur.hardening_req_env_status
  (hardening_id, requirement_id, env, status)
VALUES
  ('hts-2','req-3','prod','required'),('hts-2','req-3','prodlike','required'),('hts-2','req-3','stage','conditional'),('hts-2','req-3','test','conditional'),('hts-2','req-3','dev','not_required'),
  ('hts-2','req-4','prod','required'),('hts-2','req-4','prodlike','required'),('hts-2','req-4','stage','required'),('hts-2','req-4','test','required'),('hts-2','req-4','dev','conditional'),
  ('hts-2','req-5','prod','required'),('hts-2','req-5','prodlike','required'),('hts-2','req-5','stage','required'),('hts-2','req-5','test','conditional'),('hts-2','req-5','dev','not_required'),
  ('hts-2','req-6','prod','required'),('hts-2','req-6','prodlike','required'),('hts-2','req-6','stage','conditional'),('hts-2','req-6','test','not_required'),('hts-2','req-6','dev','not_required'),
  ('hts-2','req-7','prod','required'),('hts-2','req-7','prodlike','required'),('hts-2','req-7','stage','required'),('hts-2','req-7','test','required'),('hts-2','req-7','dev','conditional'),
  ('hts-3','req-8','prod','required'),('hts-3','req-8','prodlike','required'),('hts-3','req-8','stage','required'),('hts-3','req-8','test','conditional'),('hts-3','req-8','dev','not_required'),
  ('hts-3','req-9','prod','required'),('hts-3','req-9','prodlike','required'),('hts-3','req-9','stage','conditional'),('hts-3','req-9','test','not_required'),('hts-3','req-9','dev','not_required'),
  ('hts-4','req-10','prod','required'),('hts-4','req-10','prodlike','required'),('hts-4','req-10','stage','required'),('hts-4','req-10','test','conditional'),('hts-4','req-10','dev','not_required'),
  ('hts-4','req-11','prod','required'),('hts-4','req-11','prodlike','required'),('hts-4','req-11','stage','conditional'),('hts-4','req-11','test','not_required'),('hts-4','req-11','dev','not_required')
ON CONFLICT (hardening_id, requirement_id, env) DO UPDATE SET status = EXCLUDED.status;
