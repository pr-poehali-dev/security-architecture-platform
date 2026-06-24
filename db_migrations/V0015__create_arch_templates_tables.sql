CREATE SEQUENCE IF NOT EXISTS t_p84706301_security_architectur.arch_template_seq START 1;

CREATE TABLE t_p84706301_security_architectur.arch_templates (
    id            text NOT NULL PRIMARY KEY DEFAULT ('arch-sec-' || nextval('t_p84706301_security_architectur.arch_template_seq'::regclass)),
    name          text NOT NULL DEFAULT '',
    owner         text NOT NULL DEFAULT '',
    status        text NOT NULL DEFAULT 'in_development',
    template_type text NOT NULL DEFAULT 'technical',
    description   text NOT NULL DEFAULT '',
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE t_p84706301_security_architectur.arch_template_versions (
    id          serial PRIMARY KEY,
    template_id text NOT NULL REFERENCES t_p84706301_security_architectur.arch_templates(id),
    version     text NOT NULL,
    change_note text NOT NULL DEFAULT '',
    changed_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE t_p84706301_security_architectur.arch_template_tags (
    template_id text NOT NULL REFERENCES t_p84706301_security_architectur.arch_templates(id),
    tag_id      integer NOT NULL REFERENCES t_p84706301_security_architectur.tags(id),
    PRIMARY KEY (template_id, tag_id)
);

CREATE TABLE t_p84706301_security_architectur.arch_template_links (
    template_id text NOT NULL REFERENCES t_p84706301_security_architectur.arch_templates(id),
    related_id  text NOT NULL REFERENCES t_p84706301_security_architectur.arch_templates(id),
    PRIMARY KEY (template_id, related_id),
    CHECK (template_id <> related_id)
);

CREATE TABLE t_p84706301_security_architectur.arch_template_technologies (
    template_id   text NOT NULL REFERENCES t_p84706301_security_architectur.arch_templates(id),
    technology_id text NOT NULL REFERENCES t_p84706301_security_architectur.technologies(id),
    PRIMARY KEY (template_id, technology_id)
);

CREATE TABLE t_p84706301_security_architectur.arch_template_decisions (
    template_id text NOT NULL REFERENCES t_p84706301_security_architectur.arch_templates(id),
    decision_id text NOT NULL REFERENCES t_p84706301_security_architectur.decisions(id),
    PRIMARY KEY (template_id, decision_id)
);

CREATE TABLE t_p84706301_security_architectur.arch_template_files (
    id           serial PRIMARY KEY,
    template_id  text NOT NULL REFERENCES t_p84706301_security_architectur.arch_templates(id),
    filename     text NOT NULL,
    s3_key       text NOT NULL,
    content_type text NOT NULL DEFAULT '',
    size_bytes   bigint NOT NULL DEFAULT 0,
    created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE t_p84706301_security_architectur.arch_template_mermaid (
    id          serial PRIMARY KEY,
    template_id text NOT NULL REFERENCES t_p84706301_security_architectur.arch_templates(id),
    title       text NOT NULL DEFAULT '',
    code        text NOT NULL DEFAULT '',
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);
