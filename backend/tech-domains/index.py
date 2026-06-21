"""
CRUD API для технических доменов.
GET    /          — список всех
GET    /?id=...   — один + история версий + связанные org_domains
POST   /          — создать
PUT    /          — обновить (создаёт новую версию)
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
    "active":         "Активен",
    "in_development": "В разработке",
    "inactive":       "Не активен",
    "archived":       "В архиве",
}
STATUS_REVERSE = {v: k for k, v in STATUS_MAP.items()}


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def ok(data, status=200):
    return {"statusCode": status, "headers": CORS,
            "body": json.dumps(data, ensure_ascii=False, default=str)}


def err(msg, status=400):
    return {"statusCode": status, "headers": CORS,
            "body": json.dumps({"error": msg}, ensure_ascii=False)}


def next_version(cur, tech_id: str) -> str:
    cur.execute(
        "SELECT version FROM tech_domain_versions WHERE tech_domain_id = %s ORDER BY changed_at DESC LIMIT 1",
        (tech_id,),
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


def get_org_ids(cur, tech_id: str) -> list:
    # Use latest version snapshot as source of truth for org links
    cur.execute(
        "SELECT org_domain_ids FROM tech_domain_versions WHERE tech_domain_id = %s ORDER BY changed_at DESC LIMIT 1",
        (tech_id,),
    )
    row = cur.fetchone()
    if row and row[0]:
        return list(row[0])
    # Fallback to link table for freshly created records
    cur.execute(
        "SELECT org_domain_id FROM tech_domain_org_links WHERE tech_domain_id = %s ORDER BY org_domain_id",
        (tech_id,),
    )
    return [r[0] for r in cur.fetchall()]


def get_org_names(cur, ids: list) -> dict:
    if not ids:
        return {}
    placeholders = ",".join(["%s"] * len(ids))
    cur.execute(f"SELECT id, name FROM org_domains WHERE id IN ({placeholders})", ids)
    return {r[0]: r[1] for r in cur.fetchall()}


def set_org_links(cur, tech_id: str, org_ids: list):
    cur.execute("DELETE FROM tech_domain_org_links WHERE tech_domain_id = %s", (tech_id,))
    for oid in org_ids:
        cur.execute(
            "INSERT INTO tech_domain_org_links (tech_domain_id, org_domain_id) VALUES (%s, %s) ON CONFLICT DO NOTHING",
            (tech_id, oid),
        )


def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    method = event.get("httpMethod", "GET")
    params = event.get("queryStringParameters") or {}
    tech_id = params.get("id")
    org_list = params.get("orgList")

    conn = get_conn()
    try:
        with conn:
            with conn.cursor() as cur:

                # ── GET org_domains for picker ─────────────────────────────
                if method == "GET" and org_list:
                    cur.execute("SELECT id, name FROM org_domains ORDER BY name")
                    return ok([{"id": r[0], "name": r[1]} for r in cur.fetchall()])

                # ── GET list ──────────────────────────────────────────────
                if method == "GET" and not tech_id:
                    cur.execute(
                        """
                        SELECT d.id, d.name, d.owner, d.status, d.description,
                               d.created_at, d.updated_at,
                               v.version
                        FROM tech_domains d
                        LEFT JOIN LATERAL (
                            SELECT version FROM tech_domain_versions
                            WHERE tech_domain_id = d.id
                            ORDER BY changed_at DESC LIMIT 1
                        ) v ON true
                        ORDER BY d.created_at DESC
                        """
                    )
                    rows = cur.fetchall()
                    result = []
                    for r in rows:
                        org_ids = get_org_ids(cur, r[0])
                        org_names = get_org_names(cur, org_ids)
                        result.append({
                            "id": r[0], "name": r[1], "owner": r[2],
                            "status": r[3], "statusLabel": STATUS_MAP.get(r[3], r[3]),
                            "description": r[4],
                            "createdAt": r[5], "updatedAt": r[6],
                            "version": r[7] or "1.0",
                            "orgDomainIds": org_ids,
                            "orgDomains": [{"id": oid, "name": org_names.get(oid, oid)} for oid in org_ids],
                        })
                    return ok(result)

                # ── GET single ────────────────────────────────────────────
                if method == "GET" and tech_id:
                    cur.execute(
                        "SELECT id, name, owner, status, description, created_at, updated_at FROM tech_domains WHERE id = %s",
                        (tech_id,),
                    )
                    row = cur.fetchone()
                    if not row:
                        return err("Домен не найден", 404)

                    cur.execute(
                        """
                        SELECT id, version, name, owner, status, description,
                               org_domain_ids, changed_at, change_note
                        FROM tech_domain_versions WHERE tech_domain_id = %s ORDER BY changed_at DESC
                        """,
                        (tech_id,),
                    )
                    versions = [
                        {
                            "id": v[0], "version": v[1], "name": v[2], "owner": v[3],
                            "status": v[4], "statusLabel": STATUS_MAP.get(v[4], v[4]),
                            "description": v[5], "orgDomainIds": list(v[6] or []),
                            "changedAt": v[7], "changeNote": v[8],
                        }
                        for v in cur.fetchall()
                    ]
                    current_version = versions[0]["version"] if versions else "1.0"

                    org_ids = get_org_ids(cur, tech_id)
                    org_names = get_org_names(cur, org_ids)

                    # All org_domains for picker
                    cur.execute("SELECT id, name FROM org_domains ORDER BY name")
                    all_org = [{"id": r[0], "name": r[1]} for r in cur.fetchall()]

                    return ok({
                        "id": row[0], "name": row[1], "owner": row[2],
                        "status": row[3], "statusLabel": STATUS_MAP.get(row[3], row[3]),
                        "description": row[4],
                        "createdAt": row[5], "updatedAt": row[6],
                        "version": current_version,
                        "orgDomainIds": org_ids,
                        "orgDomains": [{"id": oid, "name": org_names.get(oid, oid)} for oid in org_ids],
                        "allOrgDomains": all_org,
                        "versions": versions,
                    })

                # ── POST create ───────────────────────────────────────────
                if method == "POST":
                    raw = event.get("body") or "{}"
                    body = json.loads(raw)
                    if isinstance(body, str):
                        body = json.loads(body)
                    name = (body.get("name") or "").strip()
                    if not name:
                        return err("Название обязательно")

                    status_val = body.get("status", "in_development")
                    if status_val not in STATUS_MAP:
                        status_val = STATUS_REVERSE.get(status_val, "in_development")

                    org_ids = [s for s in (body.get("orgDomainIds") or []) if s]

                    cur.execute(
                        """
                        INSERT INTO tech_domains (name, owner, status, description)
                        VALUES (%s, %s, %s, %s)
                        RETURNING id, name, owner, status, description, created_at, updated_at
                        """,
                        (name, body.get("owner", ""), status_val, body.get("description", "")),
                    )
                    row = cur.fetchone()
                    new_id = row[0]

                    set_org_links(cur, new_id, org_ids)

                    cur.execute(
                        """
                        INSERT INTO tech_domain_versions
                            (tech_domain_id, version, name, owner, status, description, org_domain_ids, change_note)
                        VALUES (%s, '1.0', %s, %s, %s, %s, %s, 'Создан')
                        """,
                        (new_id, row[1], row[2], row[3], row[4], org_ids),
                    )

                    org_names = get_org_names(cur, org_ids)
                    return ok({
                        "id": new_id, "name": row[1], "owner": row[2],
                        "status": row[3], "statusLabel": STATUS_MAP.get(row[3], row[3]),
                        "description": row[4],
                        "createdAt": row[5], "updatedAt": row[6],
                        "version": "1.0",
                        "orgDomainIds": org_ids,
                        "orgDomains": [{"id": oid, "name": org_names.get(oid, oid)} for oid in org_ids],
                    }, 201)

                # ── PUT update ────────────────────────────────────────────
                if method == "PUT":
                    raw = event.get("body") or "{}"
                    body = json.loads(raw)
                    if isinstance(body, str):
                        body = json.loads(body)
                    did = body.get("id") or tech_id
                    if not did:
                        return err("ID обязателен")

                    cur.execute("SELECT id FROM tech_domains WHERE id = %s", (did,))
                    if not cur.fetchone():
                        return err("Домен не найден", 404)

                    name = (body.get("name") or "").strip()
                    if not name:
                        return err("Название обязательно")

                    status_val = body.get("status", "in_development")
                    if status_val not in STATUS_MAP:
                        status_val = STATUS_REVERSE.get(status_val, "in_development")

                    org_ids = [s for s in (body.get("orgDomainIds") or []) if s]

                    cur.execute(
                        """
                        UPDATE tech_domains
                        SET name=%s, owner=%s, status=%s, description=%s, updated_at=now()
                        WHERE id=%s
                        RETURNING id, name, owner, status, description, created_at, updated_at
                        """,
                        (name, body.get("owner", ""), status_val, body.get("description", ""), did),
                    )
                    row = cur.fetchone()
                    new_ver = next_version(cur, did)

                    set_org_links(cur, did, org_ids)

                    cur.execute(
                        """
                        INSERT INTO tech_domain_versions
                            (tech_domain_id, version, name, owner, status, description, org_domain_ids, change_note)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                        """,
                        (did, new_ver, row[1], row[2], row[3], row[4], org_ids,
                         body.get("changeNote", "Обновлён")),
                    )

                    org_names = get_org_names(cur, org_ids)
                    return ok({
                        "id": row[0], "name": row[1], "owner": row[2],
                        "status": row[3], "statusLabel": STATUS_MAP.get(row[3], row[3]),
                        "description": row[4],
                        "createdAt": row[5], "updatedAt": row[6],
                        "version": new_ver,
                        "orgDomainIds": org_ids,
                        "orgDomains": [{"id": oid, "name": org_names.get(oid, oid)} for oid in org_ids],
                    })

                return err("Метод не поддерживается", 405)

    finally:
        conn.close()