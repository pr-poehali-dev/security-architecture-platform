-- Таблица требований
CREATE TABLE requirements (
    id TEXT PRIMARY KEY,
    short_desc TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    req_type TEXT NOT NULL DEFAULT 'functional' CHECK (req_type IN ('technical', 'functional', 'non_functional', 'organizational')),
    owner TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'in_development', 'inactive', 'archived')),
    normative_doc TEXT NOT NULL DEFAULT '',
    control_metrics TEXT NOT NULL DEFAULT '',
    fulfillment_method TEXT NOT NULL DEFAULT '',
    is_procurement BOOLEAN NOT NULL DEFAULT FALSE,
    score_point INTEGER NOT NULL DEFAULT 1 CHECK (score_point BETWEEN 1 AND 4),
    score_weight INTEGER NOT NULL DEFAULT 1 CHECK (score_weight BETWEEN 1 AND 10),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Версионирование требований
CREATE TABLE requirement_versions (
    id SERIAL PRIMARY KEY,
    requirement_id TEXT NOT NULL REFERENCES requirements(id),
    version TEXT NOT NULL,
    change_note TEXT NOT NULL DEFAULT '',
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Теги требований
CREATE TABLE requirement_tags (
    requirement_id TEXT NOT NULL REFERENCES requirements(id),
    tag_id INTEGER NOT NULL REFERENCES tags(id),
    PRIMARY KEY (requirement_id, tag_id)
);

-- Связь требований и технологий
CREATE TABLE requirement_technologies (
    requirement_id TEXT NOT NULL REFERENCES requirements(id),
    technology_id TEXT NOT NULL REFERENCES technologies(id),
    PRIMARY KEY (requirement_id, technology_id)
);

-- Последовательность для req-N
CREATE SEQUENCE requirement_seq START 1;

-- Индексы
CREATE INDEX idx_requirement_versions_req_id ON requirement_versions(requirement_id);
CREATE INDEX idx_requirement_tags_req_id ON requirement_tags(requirement_id);
CREATE INDEX idx_requirement_technologies_req_id ON requirement_technologies(requirement_id);
