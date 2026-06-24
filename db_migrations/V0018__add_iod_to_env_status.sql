-- Добавляем колонку iod (наличие ИОД) к таблице статусов сред
-- iod = true => строка "С ИОД", false => строка "Без ИОД"
ALTER TABLE t_p84706301_security_architectur.hardening_req_env_status
  ADD COLUMN IF NOT EXISTS iod BOOLEAN NOT NULL DEFAULT false;

-- Пересоздаём уникальный constraint с учётом iod
ALTER TABLE t_p84706301_security_architectur.hardening_req_env_status
  DROP CONSTRAINT IF EXISTS hardening_req_env_status_hardening_id_requirement_id_env_key;

ALTER TABLE t_p84706301_security_architectur.hardening_req_env_status
  ADD CONSTRAINT hardening_req_env_status_unique
  UNIQUE (hardening_id, requirement_id, env, iod);
