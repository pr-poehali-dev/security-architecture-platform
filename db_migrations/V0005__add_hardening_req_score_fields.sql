ALTER TABLE t_p84706301_security_architectur.hardening_req_content
    ADD COLUMN IF NOT EXISTS score_point integer NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS score_weight integer NOT NULL DEFAULT 1;