-- Раздел "Харденинг и конфигурации"

CREATE SEQUENCE hardening_seq START 1;

CREATE TABLE hardenings (
  id          TEXT PRIMARY KEY DEFAULT ('hts-' || nextval('hardening_seq')),
  name        TEXT NOT NULL,
  owner       TEXT NOT NULL DEFAULT '',
  status      TEXT NOT NULL DEFAULT 'in_development',
  description TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE hardening_versions (
  id            SERIAL PRIMARY KEY,
  hardening_id  TEXT NOT NULL REFERENCES hardenings(id),
  version       TEXT NOT NULL,
  name          TEXT NOT NULL,
  owner         TEXT,
  status        TEXT,
  description   TEXT,
  tags_snapshot TEXT[],
  changed_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  change_note   TEXT NOT NULL DEFAULT ''
);

CREATE TABLE hardening_tags (
  hardening_id  TEXT NOT NULL REFERENCES hardenings(id),
  tag_id        INTEGER NOT NULL REFERENCES tags(id),
  PRIMARY KEY (hardening_id, tag_id)
);

CREATE TABLE hardening_solutions (
  hardening_id  TEXT NOT NULL REFERENCES hardenings(id),
  solution_id   TEXT NOT NULL REFERENCES decisions(id),
  PRIMARY KEY (hardening_id, solution_id)
);

CREATE INDEX idx_hardening_versions_hid ON hardening_versions(hardening_id);
CREATE INDEX idx_hardening_tags_hid ON hardening_tags(hardening_id);
CREATE INDEX idx_hardening_solutions_hid ON hardening_solutions(hardening_id);
