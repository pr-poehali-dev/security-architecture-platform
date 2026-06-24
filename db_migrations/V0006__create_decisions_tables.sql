
-- Sequence for decisions IDs
CREATE SEQUENCE IF NOT EXISTS t_p84706301_security_architectur.decision_seq START 1;

-- Main decisions table
CREATE TABLE IF NOT EXISTS t_p84706301_security_architectur.decisions (
    id TEXT NOT NULL PRIMARY KEY DEFAULT ('tos-' || nextval('t_p84706301_security_architectur.decision_seq')),
    name TEXT NOT NULL,
    owner TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'in_development',
    decision_type TEXT NOT NULL DEFAULT 'technical',
    description TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Versions
CREATE TABLE IF NOT EXISTS t_p84706301_security_architectur.decision_versions (
    id SERIAL PRIMARY KEY,
    decision_id TEXT NOT NULL REFERENCES t_p84706301_security_architectur.decisions(id),
    version TEXT NOT NULL,
    change_note TEXT NOT NULL DEFAULT '',
    changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tags link (reuse existing tags table)
CREATE TABLE IF NOT EXISTS t_p84706301_security_architectur.decision_tags (
    decision_id TEXT NOT NULL REFERENCES t_p84706301_security_architectur.decisions(id),
    tag_id INTEGER NOT NULL REFERENCES t_p84706301_security_architectur.tags(id),
    PRIMARY KEY (decision_id, tag_id)
);

-- Files
CREATE TABLE IF NOT EXISTS t_p84706301_security_architectur.decision_files (
    id SERIAL PRIMARY KEY,
    decision_id TEXT NOT NULL REFERENCES t_p84706301_security_architectur.decisions(id),
    filename TEXT NOT NULL,
    s3_key TEXT NOT NULL,
    content_type TEXT NOT NULL DEFAULT '',
    size_bytes BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Mermaid diagrams for decisions
CREATE TABLE IF NOT EXISTS t_p84706301_security_architectur.decision_mermaid (
    id SERIAL PRIMARY KEY,
    decision_id TEXT NOT NULL REFERENCES t_p84706301_security_architectur.decisions(id),
    title TEXT NOT NULL DEFAULT '',
    code TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Related decisions (many-to-many)
CREATE TABLE IF NOT EXISTS t_p84706301_security_architectur.decision_links (
    decision_id TEXT NOT NULL REFERENCES t_p84706301_security_architectur.decisions(id),
    related_id TEXT NOT NULL REFERENCES t_p84706301_security_architectur.decisions(id),
    PRIMARY KEY (decision_id, related_id)
);

-- Related technologies (many-to-many)
CREATE TABLE IF NOT EXISTS t_p84706301_security_architectur.decision_technologies (
    decision_id TEXT NOT NULL REFERENCES t_p84706301_security_architectur.decisions(id),
    technology_id TEXT NOT NULL REFERENCES t_p84706301_security_architectur.technologies(id),
    PRIMARY KEY (decision_id, technology_id)
);
