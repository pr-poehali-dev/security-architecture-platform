#!/bin/bash
# Применяет все SQL-миграции из /migrations в порядке имён файлов.
# Запускается автоматически при первом старте PostgreSQL-контейнера
# (PostgreSQL выполняет все *.sh и *.sql из /docker-entrypoint-initdb.d/).

set -e

MIGRATIONS_DIR="/migrations"
DB="$POSTGRES_DB"
USER="$POSTGRES_USER"
SCHEMA="t_p84706301_security_architectur"

echo "=== Применение миграций БД ==="
echo "БД: $DB, пользователь: $USER"

# Создаём схему если нет
psql -v ON_ERROR_STOP=1 -U "$USER" -d "$DB" <<-SQL
    CREATE SCHEMA IF NOT EXISTS $SCHEMA;
    SET search_path TO public, $SCHEMA;
SQL

# Применяем каждый SQL-файл в алфавитном (версионном) порядке
for f in $(ls "$MIGRATIONS_DIR"/*.sql | sort); do
    echo "--- Применяю: $(basename $f)"
    psql -v ON_ERROR_STOP=0 \
         -U "$USER" \
         -d "$DB" \
         -c "SET search_path TO public, $SCHEMA;" \
         -f "$f" \
    && echo "    OK: $(basename $f)" \
    || echo "    ПРОПУЩЕНО (уже применено или ошибка): $(basename $f)"
done

echo "=== Миграции завершены ==="
