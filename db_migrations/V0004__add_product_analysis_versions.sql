CREATE SEQUENCE IF NOT EXISTS t_p84706301_security_architectur.product_analysis_versions_id_seq START 1;

CREATE TABLE IF NOT EXISTS t_p84706301_security_architectur.product_analysis_versions (
    id                         integer     NOT NULL PRIMARY KEY DEFAULT nextval('t_p84706301_security_architectur.product_analysis_versions_id_seq'),
    product_id                 text        NOT NULL REFERENCES t_p84706301_security_architectur.products(id),
    version                    text        NOT NULL,
    change_note                text        NOT NULL DEFAULT '',
    analyzed_at                timestamptz NOT NULL DEFAULT now(),
    compliance                 jsonb       NOT NULL DEFAULT '{}'::jsonb,
    requirements_snapshot      jsonb       NOT NULL DEFAULT '[]'::jsonb,
    template_matches_snapshot  jsonb       NOT NULL DEFAULT '[]'::jsonb,
    technologies_snapshot      jsonb       NOT NULL DEFAULT '[]'::jsonb,
    decisions_snapshot         jsonb       NOT NULL DEFAULT '[]'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_product_analysis_versions_product
    ON t_p84706301_security_architectur.product_analysis_versions (product_id, analyzed_at DESC);