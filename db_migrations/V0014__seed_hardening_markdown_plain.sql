INSERT INTO t_p84706301_security_architectur.hardening_req_content
  (hardening_id, requirement_id, markdown)
VALUES
('hts-2','req-3',
'## SSL/TLS для PostgreSQL

**postgresql.conf:**
ssl = on
ssl_cert_file = /etc/ssl/certs/server.crt
ssl_key_file  = /etc/ssl/private/server.key

**pg_hba.conf — только зашифрованные подключения:**
hostssl all all 10.0.0.0/8   scram-sha-256
host    all all 0.0.0.0/0    reject

**Проверка:**
SELECT pid, ssl, client_addr FROM pg_stat_ssl JOIN pg_stat_activity USING(pid) WHERE ssl = true;'),

('hts-2','req-4',
'## SCRAM-SHA-256

**postgresql.conf:**
password_encryption = scram-sha-256

**Сменить пароли пользователей:**
ALTER ROLE appuser PASSWORD ''strong_password'';
ALTER ROLE readonly PASSWORD ''strong_password'';

**Проверка (результат должен быть пустым):**
SELECT rolname FROM pg_authid
WHERE rolpassword NOT LIKE ''SCRAM-SHA-256%''
  AND rolcanlogin = true;'),

('hts-2','req-5',
'## pg_hba.conf — фильтрация по IP

**/etc/postgresql/15/main/pg_hba.conf:**
hostssl all all 10.10.0.0/24  scram-sha-256
hostssl all all 10.20.0.0/24  scram-sha-256
local   all postgres           peer
host    all all 0.0.0.0/0     reject

**Применить без перезапуска:**
SELECT pg_reload_conf();

**Проверка:**
С разрешённого IP — psql -h 10.10.0.5 -U appuser -d mydb  => успех
С другого IP — FATAL: pg_hba.conf rejects connection'),

('hts-2','req-6',
'## pgAudit — аудит DDL

**Установка:**
apt install postgresql-15-pgaudit

**postgresql.conf:**
shared_preload_libraries = ''pgaudit''
pgaudit.log = ''ddl, role, misc_set''
pgaudit.log_catalog = on
pgaudit.log_relation = on

**После перезапуска:**
CREATE EXTENSION pgaudit;

**Проверка логов:**
grep AUDIT /var/log/postgresql/postgresql-15-main.log | tail -20'),

('hts-2','req-7',
'## Принцип наименьших привилегий

**Создать пользователя:**
CREATE ROLE appuser LOGIN PASSWORD ''strong_password'';

**Убрать права по умолчанию:**
REVOKE ALL ON SCHEMA public FROM appuser;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM appuser;

**Выдать только необходимые:**
GRANT CONNECT ON DATABASE mydb TO appuser;
GRANT USAGE ON SCHEMA app TO appuser;
GRANT SELECT, INSERT, UPDATE ON TABLE app.orders TO appuser;

**Проверка (не должно быть Superuser):**
\du appuser'),

('hts-3','req-8',
'## TLS 1.2+ в Nginx

**nginx.conf (блок server):**
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers   HIGH:!aNULL:!MD5:!RC4;
ssl_prefer_server_ciphers on;
ssl_session_cache shared:SSL:10m;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

**Редирект HTTP -> HTTPS:**
server { listen 80; return 301 https://$host$request_uri; }

**Проверка:**
nmap --script ssl-enum-ciphers -p 443 api.example.com
openssl s_client -connect api.example.com:443 -tls1_1
# Ожидаем: handshake failure'),

('hts-3','req-9',
'## Rate Limiting в Nginx

**Зоны (блок http):**
limit_req_zone $binary_remote_addr zone=api:10m   rate=30r/m;
limit_req_zone $binary_remote_addr zone=auth:10m  rate=5r/m;

**Применить к location:**
location /auth/token {
    limit_req zone=auth burst=3 nodelay;
    limit_req_status 429;
    proxy_pass http://auth_backend;
}

**Проверка:**
for i in $(seq 1 10); do
  curl -s -o /dev/null -w "%{http_code}\n" https://example.com/auth/token
done
# Запросы 4-10 => 429'),

('hts-4','req-10',
'## HashiCorp Vault — получение секретов

**Vault Agent config:**
auto_auth {
  method "kubernetes" {
    mount_path = "auth/kubernetes"
    config = { role = "myapp-prod" }
  }
}
template {
  source      = "/vault/templates/db.ctmpl"
  destination = "/vault/secrets/db.env"
  perms       = "0600"
}

**Шаблон /vault/templates/db.ctmpl:**
{{ with secret "secret/data/myapp/db" }}
DB_HOST={{ .Data.data.host }}
DB_PASS={{ .Data.data.password }}
{{ end }}

**Проверка:**
vault kv get secret/myapp/db
vault audit list'),

('hts-4','req-11',
'## Vault Database Engine — динамические credentials для PostgreSQL

**1. Включить движок:**
vault secrets enable database

**2. Настроить подключение:**
vault write database/config/pg \
  plugin_name=postgresql-database-plugin \
  connection_url="postgresql://{{username}}:{{password}}@pg-host:5432/mydb?sslmode=require" \
  allowed_roles="myapp-role" \
  username="vault_admin" password="..."

**3. Создать роль с TTL 1h:**
vault write database/roles/myapp-role \
  db_name=pg \
  default_ttl="1h" max_ttl="24h" \
  creation_statements="CREATE ROLE {{name}} LOGIN PASSWORD ''{{password}}'' VALID UNTIL ''{{expiration}}''; GRANT SELECT ON ALL TABLES IN SCHEMA app TO {{name}};"

**4. Получить credentials:**
vault read database/creds/myapp-role
# username: v-myapp-xKj2-abc
# password: A1b2-...
# lease_duration: 1h

Credentials живут 1 час и автоматически отзываются.')

ON CONFLICT (hardening_id, requirement_id) DO UPDATE SET markdown = EXCLUDED.markdown;
