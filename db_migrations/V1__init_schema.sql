-- =============================================================================
-- Security Architecture DB — полная схема
-- Применяется автоматически при первом старте PostgreSQL-контейнера
-- =============================================================================

-- ── Последовательности ────────────────────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS org_domain_seq START 1;
CREATE SEQUENCE IF NOT EXISTS org_domain_versions_id_seq START 1;

CREATE SEQUENCE IF NOT EXISTS tech_domain_seq START 1;
CREATE SEQUENCE IF NOT EXISTS tech_domain_versions_id_seq START 1;

CREATE SEQUENCE IF NOT EXISTS tags_id_seq START 1;

CREATE SEQUENCE IF NOT EXISTS technology_seq START 1;
CREATE SEQUENCE IF NOT EXISTS technology_versions_id_seq START 1;
CREATE SEQUENCE IF NOT EXISTS technology_files_id_seq START 1;
CREATE SEQUENCE IF NOT EXISTS mermaid_diagrams_id_seq START 1;

CREATE SEQUENCE IF NOT EXISTS requirement_versions_id_seq START 1;

CREATE SEQUENCE IF NOT EXISTS decision_seq START 1;
CREATE SEQUENCE IF NOT EXISTS decision_versions_id_seq START 1;
CREATE SEQUENCE IF NOT EXISTS decision_mermaid_id_seq START 1;
CREATE SEQUENCE IF NOT EXISTS decision_files_id_seq START 1;

CREATE SEQUENCE IF NOT EXISTS hardening_seq START 1;
CREATE SEQUENCE IF NOT EXISTS hardening_versions_id_seq START 1;
CREATE SEQUENCE IF NOT EXISTS hardening_req_content_id_seq START 1;
CREATE SEQUENCE IF NOT EXISTS hardening_req_env_status_id_seq START 1;
CREATE SEQUENCE IF NOT EXISTS hardening_req_images_id_seq START 1;

CREATE SEQUENCE IF NOT EXISTS arch_template_seq START 1;
CREATE SEQUENCE IF NOT EXISTS arch_template_versions_id_seq START 1;
CREATE SEQUENCE IF NOT EXISTS arch_template_mermaid_id_seq START 1;
CREATE SEQUENCE IF NOT EXISTS arch_template_files_id_seq START 1;

-- ── Организационные домены ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS org_domains (
    id          text        NOT NULL PRIMARY KEY DEFAULT ('org-dom-' || nextval('org_domain_seq')),
    name        text        NOT NULL,
    owner       text        NOT NULL DEFAULT '',
    status      text        NOT NULL DEFAULT 'in_development',
    description text        NOT NULL DEFAULT '',
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS org_domain_versions (
    id          integer     NOT NULL PRIMARY KEY DEFAULT nextval('org_domain_versions_id_seq'),
    domain_id   text        NOT NULL REFERENCES org_domains(id) ON DELETE CASCADE,
    version     text        NOT NULL,
    name        text        NOT NULL,
    owner       text        NOT NULL DEFAULT '',
    status      text        NOT NULL,
    description text        NOT NULL DEFAULT '',
    changed_at  timestamptz NOT NULL DEFAULT now(),
    change_note text        NOT NULL DEFAULT ''
);

-- ── Технические домены ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tech_domains (
    id          text        NOT NULL PRIMARY KEY DEFAULT ('tech-dom-' || nextval('tech_domain_seq')),
    name        text        NOT NULL,
    owner       text        NOT NULL DEFAULT '',
    status      text        NOT NULL DEFAULT 'in_development',
    description text        NOT NULL DEFAULT '',
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tech_domain_versions (
    id              integer     NOT NULL PRIMARY KEY DEFAULT nextval('tech_domain_versions_id_seq'),
    tech_domain_id  text        NOT NULL REFERENCES tech_domains(id) ON DELETE CASCADE,
    version         text        NOT NULL,
    name            text        NOT NULL,
    owner           text        NOT NULL DEFAULT '',
    status          text        NOT NULL,
    description     text        NOT NULL DEFAULT '',
    org_domain_ids  text[]      NOT NULL DEFAULT '{}',
    changed_at      timestamptz NOT NULL DEFAULT now(),
    change_note     text        NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS tech_domain_org_links (
    tech_domain_id  text NOT NULL REFERENCES tech_domains(id) ON DELETE CASCADE,
    org_domain_id   text NOT NULL REFERENCES org_domains(id) ON DELETE CASCADE,
    PRIMARY KEY (tech_domain_id, org_domain_id)
);

-- ── Теги ──────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tags (
    id   integer NOT NULL PRIMARY KEY DEFAULT nextval('tags_id_seq'),
    name text    NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS tags_name_unique ON tags (name);

-- ── Технологии ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS technologies (
    id          text        NOT NULL PRIMARY KEY DEFAULT ('tech-' || nextval('technology_seq')),
    name        text        NOT NULL,
    owner       text        NOT NULL DEFAULT '',
    status      text        NOT NULL DEFAULT 'in_development',
    description text        NOT NULL DEFAULT '',
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS technology_versions (
    id             integer     NOT NULL PRIMARY KEY DEFAULT nextval('technology_versions_id_seq'),
    technology_id  text        NOT NULL REFERENCES technologies(id) ON DELETE CASCADE,
    version        text        NOT NULL,
    name           text        NOT NULL,
    owner          text        NOT NULL DEFAULT '',
    status         text        NOT NULL,
    description    text        NOT NULL DEFAULT '',
    tags_snapshot  text[]      NOT NULL DEFAULT '{}',
    changed_at     timestamptz NOT NULL DEFAULT now(),
    change_note    text        NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS technology_tags (
    technology_id text    NOT NULL REFERENCES technologies(id) ON DELETE CASCADE,
    tag_id        integer NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (technology_id, tag_id)
);

CREATE TABLE IF NOT EXISTS technology_files (
    id            integer     NOT NULL PRIMARY KEY DEFAULT nextval('technology_files_id_seq'),
    technology_id text        NOT NULL REFERENCES technologies(id) ON DELETE CASCADE,
    filename      text        NOT NULL,
    s3_key        text        NOT NULL,
    content_type  text        NOT NULL DEFAULT 'application/octet-stream',
    size_bytes    bigint      NOT NULL DEFAULT 0,
    uploaded_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mermaid_diagrams (
    id            integer     NOT NULL PRIMARY KEY DEFAULT nextval('mermaid_diagrams_id_seq'),
    technology_id text        NOT NULL REFERENCES technologies(id) ON DELETE CASCADE,
    title         text        NOT NULL DEFAULT '',
    code          text        NOT NULL,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now()
);

-- ── Требования ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS requirements (
    id                  text        NOT NULL PRIMARY KEY,
    short_desc          text        NOT NULL DEFAULT '',
    description         text        NOT NULL DEFAULT '',
    req_type            text        NOT NULL DEFAULT 'functional',
    owner               text        NOT NULL DEFAULT '',
    status              text        NOT NULL DEFAULT 'active',
    normative_doc       text        NOT NULL DEFAULT '',
    control_metrics     text        NOT NULL DEFAULT '',
    fulfillment_method  text        NOT NULL DEFAULT '',
    is_procurement      boolean     NOT NULL DEFAULT false,
    score_point         integer     NOT NULL DEFAULT 1,
    score_weight        integer     NOT NULL DEFAULT 1,
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS requirement_versions (
    id             integer     NOT NULL PRIMARY KEY DEFAULT nextval('requirement_versions_id_seq'),
    requirement_id text        NOT NULL REFERENCES requirements(id) ON DELETE CASCADE,
    version        text        NOT NULL,
    change_note    text        NOT NULL DEFAULT '',
    changed_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS requirement_tags (
    requirement_id text    NOT NULL REFERENCES requirements(id) ON DELETE CASCADE,
    tag_id         integer NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (requirement_id, tag_id)
);

CREATE TABLE IF NOT EXISTS requirement_technologies (
    requirement_id text NOT NULL REFERENCES requirements(id) ON DELETE CASCADE,
    technology_id  text NOT NULL REFERENCES technologies(id) ON DELETE CASCADE,
    PRIMARY KEY (requirement_id, technology_id)
);

CREATE TABLE IF NOT EXISTS requirement_tech_domain (
    requirement_id text NOT NULL PRIMARY KEY REFERENCES requirements(id) ON DELETE CASCADE,
    tech_domain_id text NOT NULL REFERENCES tech_domains(id) ON DELETE CASCADE
);

-- ── Решения (ТОС) ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS decisions (
    id             text        NOT NULL PRIMARY KEY DEFAULT ('tos-' || nextval('decision_seq')),
    name           text        NOT NULL,
    owner          text        NOT NULL DEFAULT '',
    status         text        NOT NULL DEFAULT 'in_development',
    decision_type  text        NOT NULL DEFAULT 'technical',
    description    text        NOT NULL DEFAULT '',
    created_at     timestamptz NOT NULL DEFAULT now(),
    updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS decision_versions (
    id          integer     NOT NULL PRIMARY KEY DEFAULT nextval('decision_versions_id_seq'),
    decision_id text        NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
    version     text        NOT NULL,
    change_note text        NOT NULL DEFAULT '',
    changed_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS decision_tags (
    decision_id text    NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
    tag_id      integer NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (decision_id, tag_id)
);

CREATE TABLE IF NOT EXISTS decision_technologies (
    decision_id   text NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
    technology_id text NOT NULL REFERENCES technologies(id) ON DELETE CASCADE,
    PRIMARY KEY (decision_id, technology_id)
);

CREATE TABLE IF NOT EXISTS decision_links (
    decision_id text NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
    related_id  text NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
    PRIMARY KEY (decision_id, related_id)
);

CREATE TABLE IF NOT EXISTS decision_mermaid (
    id          integer     NOT NULL PRIMARY KEY DEFAULT nextval('decision_mermaid_id_seq'),
    decision_id text        NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
    title       text        NOT NULL DEFAULT '',
    code        text        NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS decision_files (
    id          integer     NOT NULL PRIMARY KEY DEFAULT nextval('decision_files_id_seq'),
    decision_id text        NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
    filename    text        NOT NULL,
    s3_key      text        NOT NULL,
    content_type text       NOT NULL DEFAULT '',
    size_bytes  bigint      NOT NULL DEFAULT 0,
    created_at  timestamptz NOT NULL DEFAULT now()
);

-- ── Харденинг ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hardenings (
    id          text        NOT NULL PRIMARY KEY DEFAULT ('hts-' || nextval('hardening_seq')),
    name        text        NOT NULL,
    owner       text        NOT NULL DEFAULT '',
    status      text        NOT NULL DEFAULT 'in_development',
    description text        NOT NULL DEFAULT '',
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS hardening_versions (
    id           integer     NOT NULL PRIMARY KEY DEFAULT nextval('hardening_versions_id_seq'),
    hardening_id text        NOT NULL REFERENCES hardenings(id) ON DELETE CASCADE,
    version      text        NOT NULL,
    name         text,
    owner        text,
    status       text,
    description  text,
    tags_snapshot text[],
    changed_at   timestamptz NOT NULL DEFAULT now(),
    change_note  text        NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS hardening_tags (
    hardening_id text    NOT NULL REFERENCES hardenings(id) ON DELETE CASCADE,
    tag_id       integer NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (hardening_id, tag_id)
);

CREATE TABLE IF NOT EXISTS hardening_solutions (
    hardening_id text NOT NULL REFERENCES hardenings(id) ON DELETE CASCADE,
    solution_id  text NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
    PRIMARY KEY (hardening_id, solution_id)
);

CREATE TABLE IF NOT EXISTS hardening_req_content (
    id             integer     NOT NULL PRIMARY KEY DEFAULT nextval('hardening_req_content_id_seq'),
    hardening_id   text        NOT NULL REFERENCES hardenings(id) ON DELETE CASCADE,
    requirement_id text        NOT NULL,
    markdown       text        NOT NULL DEFAULT '',
    updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS hardening_req_env_status (
    id             integer     NOT NULL PRIMARY KEY DEFAULT nextval('hardening_req_env_status_id_seq'),
    hardening_id   text        NOT NULL REFERENCES hardenings(id) ON DELETE CASCADE,
    requirement_id text        NOT NULL,
    env            text        NOT NULL,
    status         text        NOT NULL DEFAULT 'not_required',
    updated_at     timestamptz NOT NULL DEFAULT now(),
    iod            boolean     NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS hardening_req_images (
    id             integer     NOT NULL PRIMARY KEY DEFAULT nextval('hardening_req_images_id_seq'),
    hardening_id   text        NOT NULL REFERENCES hardenings(id) ON DELETE CASCADE,
    requirement_id text        NOT NULL,
    filename       text        NOT NULL,
    s3_key         text        NOT NULL,
    content_type   text        NOT NULL DEFAULT 'image/png',
    size_bytes     integer     NOT NULL DEFAULT 0,
    sort_order     integer     NOT NULL DEFAULT 0,
    created_at     timestamptz NOT NULL DEFAULT now()
);

-- ── Шаблоны архитектур ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS arch_templates (
    id            text        NOT NULL PRIMARY KEY DEFAULT ('arch-sec-' || nextval('arch_template_seq')),
    name          text        NOT NULL DEFAULT '',
    owner         text        NOT NULL DEFAULT '',
    status        text        NOT NULL DEFAULT 'in_development',
    template_type text        NOT NULL DEFAULT 'technical',
    description   text        NOT NULL DEFAULT '',
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS arch_template_versions (
    id          integer     NOT NULL PRIMARY KEY DEFAULT nextval('arch_template_versions_id_seq'),
    template_id text        NOT NULL REFERENCES arch_templates(id) ON DELETE CASCADE,
    version     text        NOT NULL,
    change_note text        NOT NULL DEFAULT '',
    changed_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS arch_template_tags (
    template_id text    NOT NULL REFERENCES arch_templates(id) ON DELETE CASCADE,
    tag_id      integer NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    is_active   boolean NOT NULL DEFAULT true,
    PRIMARY KEY (template_id, tag_id)
);

CREATE TABLE IF NOT EXISTS arch_template_technologies (
    template_id   text    NOT NULL REFERENCES arch_templates(id) ON DELETE CASCADE,
    technology_id text    NOT NULL REFERENCES technologies(id) ON DELETE CASCADE,
    is_active     boolean NOT NULL DEFAULT true,
    PRIMARY KEY (template_id, technology_id)
);

CREATE TABLE IF NOT EXISTS arch_template_decisions (
    template_id text    NOT NULL REFERENCES arch_templates(id) ON DELETE CASCADE,
    decision_id text    NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
    is_active   boolean NOT NULL DEFAULT true,
    PRIMARY KEY (template_id, decision_id)
);

CREATE TABLE IF NOT EXISTS arch_template_links (
    template_id text    NOT NULL REFERENCES arch_templates(id) ON DELETE CASCADE,
    related_id  text    NOT NULL REFERENCES arch_templates(id) ON DELETE CASCADE,
    is_active   boolean NOT NULL DEFAULT true,
    PRIMARY KEY (template_id, related_id)
);

CREATE TABLE IF NOT EXISTS arch_template_mermaid (
    id          integer     NOT NULL PRIMARY KEY DEFAULT nextval('arch_template_mermaid_id_seq'),
    template_id text        NOT NULL REFERENCES arch_templates(id) ON DELETE CASCADE,
    title       text        NOT NULL DEFAULT '',
    code        text        NOT NULL DEFAULT '',
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS arch_template_files (
    id           integer     NOT NULL PRIMARY KEY DEFAULT nextval('arch_template_files_id_seq'),
    template_id  text        NOT NULL REFERENCES arch_templates(id) ON DELETE CASCADE,
    filename     text        NOT NULL,
    s3_key       text        NOT NULL,
    content_type text        NOT NULL DEFAULT '',
    size_bytes   bigint      NOT NULL DEFAULT 0,
    created_at   timestamptz NOT NULL DEFAULT now()
);
