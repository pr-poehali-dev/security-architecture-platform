CREATE SEQUENCE IF NOT EXISTS t_p84706301_security_architectur.product_seq START 1;

CREATE TABLE IF NOT EXISTS t_p84706301_security_architectur.products (
    id          text        NOT NULL PRIMARY KEY DEFAULT ('prod-' || nextval('t_p84706301_security_architectur.product_seq')),
    name        text        NOT NULL,
    owner       text        NOT NULL DEFAULT '',
    status      text        NOT NULL DEFAULT 'in_development',
    description text        NOT NULL DEFAULT '',
    version     text        NOT NULL DEFAULT '1.0',
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS t_p84706301_security_architectur.product_tags (
    product_id text    NOT NULL REFERENCES t_p84706301_security_architectur.products(id),
    tag_id     integer NOT NULL REFERENCES t_p84706301_security_architectur.tags(id),
    PRIMARY KEY (product_id, tag_id)
);

CREATE TABLE IF NOT EXISTS t_p84706301_security_architectur.product_technologies (
    product_id    text NOT NULL REFERENCES t_p84706301_security_architectur.products(id),
    technology_id text NOT NULL REFERENCES t_p84706301_security_architectur.technologies(id),
    PRIMARY KEY (product_id, technology_id)
);

CREATE TABLE IF NOT EXISTS t_p84706301_security_architectur.product_decisions (
    product_id  text NOT NULL REFERENCES t_p84706301_security_architectur.products(id),
    decision_id text NOT NULL REFERENCES t_p84706301_security_architectur.decisions(id),
    PRIMARY KEY (product_id, decision_id)
);

CREATE TABLE IF NOT EXISTS t_p84706301_security_architectur.product_requirement_assessment (
    product_id     text        NOT NULL REFERENCES t_p84706301_security_architectur.products(id),
    requirement_id text        NOT NULL REFERENCES t_p84706301_security_architectur.requirements(id),
    status         text        NOT NULL DEFAULT 'not_assessed',
    comment        text        NOT NULL DEFAULT '',
    updated_at     timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (product_id, requirement_id)
);