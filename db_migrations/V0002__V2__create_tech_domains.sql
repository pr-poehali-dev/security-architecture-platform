
CREATE SEQUENCE tech_domain_seq START 1;

CREATE TABLE tech_domains (
    id          TEXT PRIMARY KEY DEFAULT 'tech-dom-' || nextval('tech_domain_seq'),
    name        TEXT NOT NULL,
    owner       TEXT NOT NULL DEFAULT '',
    status      TEXT NOT NULL DEFAULT 'in_development'
                CHECK (status IN ('active', 'in_development', 'inactive', 'archived')),
    description TEXT NOT NULL DEFAULT '',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Связь M:M с org_domains
CREATE TABLE tech_domain_org_links (
    tech_domain_id TEXT NOT NULL REFERENCES tech_domains(id),
    org_domain_id  TEXT NOT NULL REFERENCES org_domains(id),
    PRIMARY KEY (tech_domain_id, org_domain_id)
);

CREATE TABLE tech_domain_versions (
    id             SERIAL PRIMARY KEY,
    tech_domain_id TEXT NOT NULL REFERENCES tech_domains(id),
    version        TEXT NOT NULL,
    name           TEXT NOT NULL,
    owner          TEXT NOT NULL DEFAULT '',
    status         TEXT NOT NULL,
    description    TEXT NOT NULL DEFAULT '',
    org_domain_ids TEXT[] NOT NULL DEFAULT '{}',
    changed_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    change_note    TEXT NOT NULL DEFAULT ''
);

CREATE INDEX idx_tdv_tech_domain_id ON tech_domain_versions(tech_domain_id);
CREATE INDEX idx_tdol_org_domain_id ON tech_domain_org_links(org_domain_id);
