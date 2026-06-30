-- Создание схемы (используется частью миграций)
CREATE SCHEMA IF NOT EXISTS t_p84706301_security_architectur;

-- Выставляем search_path на уровне БД: таблицы без явной схемы
-- будут создаваться в t_p84706301_security_architectur (первая в списке).
-- Это нужно чтобы FK-ссылки вида REFERENCES t_p84706301_security_architectur.tags
-- находили таблицы, созданные без префикса схемы (V0001-V0004, V0007-V0009).
ALTER DATABASE "security_arch" SET search_path TO t_p84706301_security_architectur, public;