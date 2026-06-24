-- Харденинг: контент (Markdown + изображения) по требованиям

-- Таблица Markdown-контента для требований в контексте харденинга
CREATE TABLE hardening_req_content (
  id              SERIAL PRIMARY KEY,
  hardening_id    TEXT NOT NULL REFERENCES hardenings(id),
  requirement_id  TEXT NOT NULL,
  markdown        TEXT NOT NULL DEFAULT '',
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (hardening_id, requirement_id)
);

-- Таблица изображений (GUI-инструкций) для требований в контексте харденинга
CREATE TABLE hardening_req_images (
  id              SERIAL PRIMARY KEY,
  hardening_id    TEXT NOT NULL REFERENCES hardenings(id),
  requirement_id  TEXT NOT NULL,
  filename        TEXT NOT NULL,
  s3_key          TEXT NOT NULL,
  content_type    TEXT NOT NULL DEFAULT 'image/png',
  size_bytes      INTEGER NOT NULL DEFAULT 0,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_hreqcontent_hid ON hardening_req_content(hardening_id);
CREATE INDEX idx_hreqcontent_req ON hardening_req_content(hardening_id, requirement_id);
CREATE INDEX idx_hreqimages_hid ON hardening_req_images(hardening_id);
CREATE INDEX idx_hreqimages_req ON hardening_req_images(hardening_id, requirement_id);
