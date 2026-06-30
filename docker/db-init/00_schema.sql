-- Создание схемы (используется частью миграций)
CREATE SCHEMA IF NOT EXISTS t_p84706301_security_architectur;

-- Устанавливаем search_path чтобы таблицы без схемы шли в public,
-- а таблицы с явной схемой — в t_p84706301_security_architectur
SET search_path TO public, t_p84706301_security_architectur;
