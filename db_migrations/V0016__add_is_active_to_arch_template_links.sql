ALTER TABLE t_p84706301_security_architectur.arch_template_tags        ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
ALTER TABLE t_p84706301_security_architectur.arch_template_links       ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
ALTER TABLE t_p84706301_security_architectur.arch_template_technologies ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
ALTER TABLE t_p84706301_security_architectur.arch_template_decisions    ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
