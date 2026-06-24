-- Версии требований (правильная схема без short_desc/owner/status/description)
INSERT INTO t_p84706301_security_architectur.requirement_versions
  (requirement_id, version, change_note)
VALUES
  ('req-3',  '1.0', 'Начальная версия'),
  ('req-4',  '1.0', 'Начальная версия'),
  ('req-5',  '1.0', 'Начальная версия'),
  ('req-6',  '1.0', 'Начальная версия'),
  ('req-7',  '1.0', 'Начальная версия'),
  ('req-8',  '1.0', 'Начальная версия'),
  ('req-9',  '1.0', 'Начальная версия'),
  ('req-10', '1.0', 'Начальная версия'),
  ('req-11', '1.0', 'Начальная версия');

-- Связь требований с технологиями
INSERT INTO t_p84706301_security_architectur.requirement_technologies (requirement_id, technology_id)
VALUES
  ('req-3',  'tech-4'),
  ('req-4',  'tech-4'),
  ('req-5',  'tech-4'),
  ('req-6',  'tech-4'),
  ('req-7',  'tech-4'),
  ('req-8',  'tech-5'),
  ('req-9',  'tech-5'),
  ('req-10', 'tech-6'),
  ('req-11', 'tech-4'),
  ('req-11', 'tech-6')
ON CONFLICT DO NOTHING;

-- Связь требований с техническими доменами (PK только на requirement_id — один домен на требование)
INSERT INTO t_p84706301_security_architectur.requirement_tech_domain (requirement_id, tech_domain_id)
VALUES
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

-- Теги требований
INSERT INTO t_p84706301_security_architectur.requirement_tags (requirement_id, tag_id)
SELECT r, t.id FROM
  (VALUES ('req-3','ssl'),('req-3','tls'),('req-3','postgresql'),
          ('req-4','authentication'),('req-4','postgresql'),
          ('req-5','network'),('req-5','postgresql'),
          ('req-6','audit'),('req-6','postgresql'),
          ('req-7','postgresql'),
          ('req-8','tls'),('req-8','ssl'),('req-8','nginx'),
          ('req-9','rate-limit'),('req-9','nginx'),
          ('req-10','vault'),('req-10','secrets'),
          ('req-11','vault'),('req-11','postgresql')
  ) AS vals(r, tname)
JOIN t_p84706301_security_architectur.tags t ON t.name = vals.tname
ON CONFLICT DO NOTHING;
