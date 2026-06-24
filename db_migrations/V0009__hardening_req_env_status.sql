-- Статусы выполнения требований по средам (Prod, ProdLike, Stage, Test, Dev)
CREATE TABLE hardening_req_env_status (
  id              SERIAL PRIMARY KEY,
  hardening_id    TEXT NOT NULL REFERENCES hardenings(id),
  requirement_id  TEXT NOT NULL,
  env             TEXT NOT NULL,  -- prod, prodlike, stage, test, dev
  status          TEXT NOT NULL DEFAULT 'not_required', -- required, not_required, conditional
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (hardening_id, requirement_id, env)
);

CREATE INDEX idx_hreqenv_hid ON hardening_req_env_status(hardening_id);
CREATE INDEX idx_hreqenv_req ON hardening_req_env_status(hardening_id, requirement_id);
