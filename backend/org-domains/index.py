"""
CRUD API для организационных доменов.
GET    /          — список всех доменов
GET    /?id=...   — один домен + история версий
POST   /          — создать домен
PUT    /          — обновить домен (создаёт новую версию)
"""

import json
import os
import psycopg2

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
}

STATUS_MAP = {
    "active": "Активен",
    "in_development": "В разработке",
    "inactive": "Не активен",
    "archived": "В архиве",
}

STATUS_REVERSE = {v: k for k, v in STATUS_MAP.items()}


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def ok(data, status=200):
    return {"statusCode": status, "headers": CORS, "body": json.dumps(data, ensure_ascii=False, default=str)}


def err(msg, status=400):
    return {"statusCode": status, "headers": CORS, "body": json.dumps({"error": msg}, ensure_ascii=False)}


def next_version(cur, domain_id: str) -> str:
    cur.execute(
        "SELECT version FROM org_domain_versions WHERE domain_id = %s ORDER BY changed_at DESC LIMIT 1",
        (domain_id,),
    )
    row = cur.fetchone()
    if not row:
        return "1.0"
    parts = row[0].split(".")
    try:
        major, minor = int(parts[0]), int(parts[1]) if len(parts) > 1 else 0
    except ValueError:
        major, minor = 1, 0
    return f"{major}.{minor + 1}"


def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    method = event.get("httpMethod", "GET")
    params = event.get("queryStringParameters") or {}
    domain_id = params.get("id")

    conn = get_conn()
    try:
        with conn:
            with conn.cursor() as cur:

                # ── GET list ──────────────────────────────────────────────
                if method == "GET" and not domain_id:
                    cur.execute(
                        """
                        SELECT d.id, d.name, d.owner, d.status, d.description,
                               d.created_at, d.updated_at,
                               v.version
                        FROM org_domains d
                        LEFT JOIN LATERAL (
                            SELECT version FROM org_domain_versions
                            WHERE domain_id = d.id
                            ORDER BY changed_at DESC LIMIT 1
                        ) v ON true
                        ORDER BY d.created_at DESC
                        """
                    )
                    rows = cur.fetchall()
                    result = [
                        {
                            "id": r[0], "name": r[1], "owner": r[2],
                            "status": r[3], "statusLabel": STATUS_MAP.get(r[3], r[3]),
                            "description": r[4],
                            "createdAt": r[5], "updatedAt": r[6],
                            "version": r[7] or "1.0",
                        }
                        for r in rows
                    ]
                    return ok(result)

                # ── GET single ────────────────────────────────────────────
                if method == "GET" and domain_id:
                    cur.execute(
                        "SELECT id, name, owner, status, description, created_at, updated_at FROM org_domains WHERE id = %s",
                        (domain_id,),
                    )
                    row = cur.fetchone()
                    if not row:
                        return err("Домен не найден", 404)

                    cur.execute(
                        """
                        SELECT id, version, name, owner, status, description, changed_at, change_note
                        FROM org_domain_versions WHERE domain_id = %s ORDER BY changed_at DESC
                        """,
                        (domain_id,),
                    )
                    versions = [
                        {
                            "id": v[0], "version": v[1], "name": v[2], "owner": v[3],
                            "status": v[4], "statusLabel": STATUS_MAP.get(v[4], v[4]),
                            "description": v[5], "changedAt": v[6], "changeNote": v[7],
                        }
                        for v in cur.fetchall()
                    ]
                    current_version = versions[0]["version"] if versions else "1.0"

                    return ok({
                        "id": row[0], "name": row[1], "owner": row[2],
                        "status": row[3], "statusLabel": STATUS_MAP.get(row[3], row[3]),
                        "description": row[4],
                        "createdAt": row[5], "updatedAt": row[6],
                        "version": current_version,
                        "versions": versions,
                    })

                # ── POST create ───────────────────────────────────────────
                if method == "POST":
                    body = json.loads(event.get("body") or "{}")
                    name = (body.get("name") or "").strip()
                    if not name:
                        return err("Название обязательно")

                    status_val = body.get("status", "in_development")
                    if status_val not in STATUS_MAP:
                        status_val = STATUS_REVERSE.get(status_val, "in_development")

                    cur.execute(
                        """
                        INSERT INTO org_domains (name, owner, status, description)
                        VALUES (%s, %s, %s, %s)
                        RETURNING id, name, owner, status, description, created_at, updated_at
                        """,
                        (name, body.get("owner", ""), status_val, body.get("description", "")),
                    )
                    row = cur.fetchone()
                    new_id = row[0]

                    cur.execute(
                        """
                        INSERT INTO org_domain_versions (domain_id, version, name, owner, status, description, change_note)
                        VALUES (%s, '1.0', %s, %s, %s, %s, 'Создан')
                        """,
                        (new_id, row[1], row[2], row[3], row[4]),
                    )

                    return ok({
                        "id": new_id, "name": row[1], "owner": row[2],
                        "status": row[3], "statusLabel": STATUS_MAP.get(row[3], row[3]),
                        "description": row[4],
                        "createdAt": row[5], "updatedAt": row[6],
                        "version": "1.0",
                    }, 201)

                # ── PUT update ────────────────────────────────────────────
                if method == "PUT":
                    body = json.loads(event.get("body") or "{}")
                    did = body.get("id") or domain_id
                    if not did:
                        return err("ID обязателен")

                    cur.execute("SELECT id FROM org_domains WHERE id = %s", (did,))
                    if not cur.fetchone():
                        return err("Домен не найден", 404)

                    name = (body.get("name") or "").strip()
                    if not name:
                        return err("Название обязательно")

                    status_val = body.get("status", "in_development")
                    if status_val not in STATUS_MAP:
                        status_val = STATUS_REVERSE.get(status_val, "in_development")

                    cur.execute(
                        """
                        UPDATE org_domains
                        SET name=%s, owner=%s, status=%s, description=%s, updated_at=now()
                        WHERE id=%s
                        RETURNING id, name, owner, status, description, created_at, updated_at
                        """,
                        (name, body.get("owner", ""), status_val, body.get("description", ""), did),
                    )
                    row = cur.fetchone()
                    new_ver = next_version(cur, did)

                    cur.execute(
                        """
                        INSERT INTO org_domain_versions (domain_id, version, name, owner, status, description, change_note)
                        VALUES (%s, %s, %s, %s, %s, %s, %s)
                        """,
                        (did, new_ver, row[1], row[2], row[3], row[4], body.get("changeNote", "Обновлён")),
                    )

                    return ok({
                        "id": row[0], "name": row[1], "owner": row[2],
                        "status": row[3], "statusLabel": STATUS_MAP.get(row[3], row[3]),
                        "description": row[4],
                        "createdAt": row[5], "updatedAt": row[6],
                        "version": new_ver,
                    })

                return err("Метод не поддерживается", 405)

    finally:
        conn.close()
