
CREATE SEQUENCE org_domain_seq START 1;

CREATE TABLE org_domains (
    id          TEXT PRIMARY KEY DEFAULT 'org-dom-' || nextval('org_domain_seq'),
    name        TEXT NOT NULL,
    owner       TEXT NOT NULL DEFAULT '',
    status      TEXT NOT NULL DEFAULT 'in_development'
                CHECK (status IN ('active', 'in_development', 'inactive', 'archived')),
    description TEXT NOT NULL DEFAULT '',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE org_domain_versions (
    id          SERIAL PRIMARY KEY,
    domain_id   TEXT NOT NULL REFERENCES org_domains(id),
    version     TEXT NOT NULL,
    name        TEXT NOT NULL,
    owner       TEXT NOT NULL DEFAULT '',
    status      TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    changed_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    change_note TEXT NOT NULL DEFAULT ''
);

CREATE INDEX idx_odv_domain_id ON org_domain_versions(domain_id);
