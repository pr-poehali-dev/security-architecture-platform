
-- Основная таблица технологий
CREATE SEQUENCE technology_seq START 1;

CREATE TABLE technologies (
    id          TEXT PRIMARY KEY DEFAULT 'tech-' || nextval('technology_seq'),
    name        TEXT NOT NULL,
    owner       TEXT NOT NULL DEFAULT '',
    status      TEXT NOT NULL DEFAULT 'in_development'
                CHECK (status IN ('active', 'in_development', 'inactive', 'archived')),
    description TEXT NOT NULL DEFAULT '',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Версионирование
CREATE TABLE technology_versions (
    id            SERIAL PRIMARY KEY,
    technology_id TEXT NOT NULL REFERENCES technologies(id),
    version       TEXT NOT NULL,
    name          TEXT NOT NULL,
    owner         TEXT NOT NULL DEFAULT '',
    status        TEXT NOT NULL,
    description   TEXT NOT NULL DEFAULT '',
    tags_snapshot TEXT[] NOT NULL DEFAULT '{}',
    changed_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    change_note   TEXT NOT NULL DEFAULT ''
);
CREATE INDEX idx_tv_technology_id ON technology_versions(technology_id);

-- Глобальный справочник тегов
CREATE TABLE tags (
    id   SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
);

-- Связь технология — тег
CREATE TABLE technology_tags (
    technology_id TEXT NOT NULL REFERENCES technologies(id),
    tag_id        INTEGER NOT NULL REFERENCES tags(id),
    PRIMARY KEY (technology_id, tag_id)
);
CREATE INDEX idx_tt_tag_id ON technology_tags(tag_id);

-- Mermaid-схемы (хранятся отдельно)
CREATE TABLE mermaid_diagrams (
    id            SERIAL PRIMARY KEY,
    technology_id TEXT NOT NULL REFERENCES technologies(id),
    title         TEXT NOT NULL DEFAULT '',
    code          TEXT NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_md_technology_id ON mermaid_diagrams(technology_id);

-- Файлы (метаданные; контент хранится в S3)
CREATE TABLE technology_files (
    id            SERIAL PRIMARY KEY,
    technology_id TEXT NOT NULL REFERENCES technologies(id),
    filename      TEXT NOT NULL,
    s3_key        TEXT NOT NULL,
    content_type  TEXT NOT NULL DEFAULT 'application/octet-stream',
    size_bytes    BIGINT NOT NULL DEFAULT 0,
    uploaded_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_tf_technology_id ON technology_files(technology_id);
