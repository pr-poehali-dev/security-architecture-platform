"""
CRUD API для раздела «Технические и организационные решения».

GET  /                          — список всех решений
GET  /?id=...                   — карточка + версии + теги + mermaid + файлы + связи
GET  /?tags_suggest=...         — автодополнение тегов
GET  /?decisions_suggest=...    — поиск решений для связи
GET  /?tech_suggest=...         — поиск технологий для связи
POST /                          — создать решение
PUT  /                          — обновить решение

POST /?action=add_mermaid       body: {decision_id, title, code}
PUT  /?action=update_mermaid    body: {id, title, code}
POST /?action=upload_file       body: {decision_id, filename, content_type, data_base64}
"""

import base64
import json
import os

import boto3
import psycopg2

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
}

STATUS_MAP = {
    "active":         "Активен",
    "in_development": "В разработке",
    "inactive":       "Не активен",
    "archived":       "В архиве",
}
STATUS_REVERSE = {v: k for k, v in STATUS_MAP.items()}

TYPE_MAP = {
    "technical":      "Техническое",
    "organizational": "Организационное",
}

CDN_BASE = f"https://cdn.poehali.dev/projects/{os.environ.get('AWS_ACCESS_KEY_ID', '')}/bucket"


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def s3_client():
    return boto3.client(
        "s3",
        endpoint_url="https://bucket.poehali.dev",
        aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"],
    )


def ok(data, status=200):
    return {"statusCode": status, "headers": CORS,
            "body": json.dumps(data, ensure_ascii=False, default=str)}


def err(msg, status=400):
    return {"statusCode": status, "headers": CORS,
            "body": json.dumps({"error": msg}, ensure_ascii=False)}


def parse_body(event):
    raw = event.get("body") or "{}"
    data = json.loads(raw)
    if isinstance(data, str):
        data = json.loads(data)
    return data


def next_version(cur, dec_id: str) -> str:
    cur.execute(
        "SELECT version FROM decision_versions WHERE decision_id = %s ORDER BY changed_at DESC LIMIT 1",
        (dec_id,),
    )
    row = cur.fetchone()
    if not row:
        return "1.0"
    parts = row[0].split(".")
    try:
        major = int(parts[0])
        minor = int(parts[1]) if len(parts) > 1 else 0
    except ValueError:
        major, minor = 1, 0
    return f"{major}.{minor + 1}"


def get_tags(cur, dec_id: str) -> list:
    cur.execute(
        """
        SELECT t.id, t.name FROM tags t
        JOIN decision_tags dt ON dt.tag_id = t.id
        WHERE dt.decision_id = %s ORDER BY t.name
        """,
        (dec_id,),
    )
    return [{"id": r[0], "name": r[1]} for r in cur.fetchall()]


def set_tags(cur, dec_id: str, tag_names: list):
    tag_names = [n.strip() for n in tag_names if n.strip()]
    existing_ids = []
    for name in tag_names:
        cur.execute("INSERT INTO tags (name) VALUES (%s) ON CONFLICT (name) DO NOTHING", (name,))
        cur.execute("SELECT id FROM tags WHERE name = %s", (name,))
        row = cur.fetchone()
        if row:
            existing_ids.append(row[0])
    cur.execute("DELETE FROM decision_tags WHERE decision_id = %s", (dec_id,))
    for tid in existing_ids:
        cur.execute(
            "INSERT INTO decision_tags (decision_id, tag_id) VALUES (%s, %s) ON CONFLICT DO NOTHING",
            (dec_id, tid),
        )


def get_mermaid(cur, dec_id: str) -> list:
    cur.execute(
        "SELECT id, title, code, created_at, updated_at FROM decision_mermaid WHERE decision_id = %s ORDER BY created_at",
        (dec_id,),
    )
    return [{"id": r[0], "title": r[1], "code": r[2], "createdAt": r[3], "updatedAt": r[4]}
            for r in cur.fetchall()]


def get_files(cur, dec_id: str) -> list:
    cur.execute(
        "SELECT id, filename, s3_key, content_type, size_bytes, created_at FROM decision_files WHERE decision_id = %s ORDER BY created_at",
        (dec_id,),
    )
    return [
        {
            "id": r[0], "filename": r[1], "s3Key": r[2],
            "contentType": r[3], "sizeBytes": r[4], "uploadedAt": r[5],
            "url": f"{CDN_BASE}/decisions/{r[2].split('/')[-1]}",
        }
        for r in cur.fetchall()
    ]


def get_related_decisions(cur, dec_id: str) -> list:
    cur.execute(
        """
        SELECT d.id, d.name, d.decision_type, d.status FROM decisions d
        JOIN decision_links dl ON dl.related_id = d.id
        WHERE dl.decision_id = %s
        UNION
        SELECT d.id, d.name, d.decision_type, d.status FROM decisions d
        JOIN decision_links dl ON dl.decision_id = d.id
        WHERE dl.related_id = %s
        ORDER BY name
        """,
        (dec_id, dec_id),
    )
    return [{"id": r[0], "name": r[1], "decisionType": r[2],
             "typeLabel": TYPE_MAP.get(r[2], r[2]), "status": r[3],
             "statusLabel": STATUS_MAP.get(r[3], r[3])} for r in cur.fetchall()]


def set_related_decisions(cur, dec_id: str, related_ids: list):
    cur.execute("DELETE FROM decision_links WHERE decision_id = %s OR related_id = %s", (dec_id, dec_id))
    for rid in related_ids:
        if rid == dec_id:
            continue
        cur.execute(
            "INSERT INTO decision_links (decision_id, related_id) VALUES (%s, %s) ON CONFLICT DO NOTHING",
            (dec_id, rid),
        )


def get_technologies(cur, dec_id: str) -> list:
    cur.execute(
        """
        SELECT t.id, t.name, t.status FROM technologies t
        JOIN decision_technologies dt ON dt.technology_id = t.id
        WHERE dt.decision_id = %s ORDER BY t.name
        """,
        (dec_id,),
    )
    return [{"id": r[0], "name": r[1], "status": r[2],
             "statusLabel": STATUS_MAP.get(r[2], r[2])} for r in cur.fetchall()]


def set_technologies(cur, dec_id: str, tech_ids: list):
    cur.execute("DELETE FROM decision_technologies WHERE decision_id = %s", (dec_id,))
    for tid in tech_ids:
        cur.execute(
            "INSERT INTO decision_technologies (decision_id, technology_id) VALUES (%s, %s) ON CONFLICT DO NOTHING",
            (dec_id, tid),
        )


def get_requirements_by_tech(cur, tech_ids: list) -> list:
    """Возвращает требования сгруппированные по тех. домену для списка технологий."""
    if not tech_ids:
        return []
    placeholders = ",".join(["%s"] * len(tech_ids))
    cur.execute(
        f"""
        SELECT r.id, r.short_desc, r.status,
               td.id AS td_id, td.name AS td_name,
               t.id AS tech_id, t.name AS tech_name
        FROM requirements r
        JOIN requirement_technologies rt ON rt.requirement_id = r.id
        JOIN technologies t ON t.id = rt.technology_id
        LEFT JOIN requirement_tech_domain rtd ON rtd.requirement_id = r.id
        LEFT JOIN tech_domains td ON td.id = rtd.tech_domain_id
        WHERE rt.technology_id IN ({placeholders})
        ORDER BY td.name NULLS LAST, r.id
        """,
        tech_ids,
    )
    rows = cur.fetchall()
    groups: dict = {}
    for row in rows:
        domain_key = row[3] or "__none__"
        domain_name = row[4] or "Без домена"
        if domain_key not in groups:
            groups[domain_key] = {"domainId": row[3], "domainName": domain_name, "requirements": []}
        req = {"id": row[0], "shortDesc": row[1], "status": row[2],
               "techId": row[5], "techName": row[6]}
        if not any(r["id"] == req["id"] for r in groups[domain_key]["requirements"]):
            groups[domain_key]["requirements"].append(req)
    return list(groups.values())


def row_to_dict(row, tags, cur_version, mermaid=None, files=None, versions=None,
                related_decisions=None, technologies=None, requirements_by_domain=None):
    d = {
        "id": row[0], "name": row[1], "owner": row[2],
        "status": row[3], "statusLabel": STATUS_MAP.get(row[3], row[3]),
        "decisionType": row[4], "typeLabel": TYPE_MAP.get(row[4], row[4]),
        "description": row[5], "createdAt": row[6], "updatedAt": row[7],
        "version": cur_version,
        "tags": tags,
    }
    if mermaid is not None:
        d["mermaidDiagrams"] = mermaid
    if files is not None:
        d["files"] = files
    if versions is not None:
        d["versions"] = versions
    if related_decisions is not None:
        d["relatedDecisions"] = related_decisions
    if technologies is not None:
        d["technologies"] = technologies
    if requirements_by_domain is not None:
        d["requirementsByDomain"] = requirements_by_domain
    return d


def handler(event: dict, context) -> dict:
    """CRUD для технических и организационных решений."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    method = event.get("httpMethod", "GET")
    params = event.get("queryStringParameters") or {}
    dec_id = params.get("id")
    action = params.get("action")
    tags_suggest = params.get("tags_suggest")
    decisions_suggest = params.get("decisions_suggest")
    tech_suggest = params.get("tech_suggest")

    conn = get_conn()
    try:
        with conn:
            with conn.cursor() as cur:

                # ── Tags autocomplete ─────────────────────────────────────
                if method == "GET" and tags_suggest is not None:
                    q = tags_suggest.strip()
                    if q:
                        cur.execute(
                            "SELECT id, name FROM tags WHERE name ILIKE %s ORDER BY name LIMIT 20",
                            (f"%{q}%",),
                        )
                    else:
                        cur.execute("SELECT id, name FROM tags ORDER BY name LIMIT 50")
                    return ok([{"id": r[0], "name": r[1]} for r in cur.fetchall()])

                # ── Decisions search ──────────────────────────────────────
                if method == "GET" and decisions_suggest is not None:
                    q = decisions_suggest.strip()
                    if q:
                        cur.execute(
                            "SELECT id, name, decision_type, status FROM decisions WHERE name ILIKE %s ORDER BY name LIMIT 20",
                            (f"%{q}%",),
                        )
                    else:
                        cur.execute("SELECT id, name, decision_type, status FROM decisions ORDER BY name LIMIT 50")
                    return ok([{"id": r[0], "name": r[1], "decisionType": r[2],
                                "typeLabel": TYPE_MAP.get(r[2], r[2]),
                                "status": r[3], "statusLabel": STATUS_MAP.get(r[3], r[3])}
                               for r in cur.fetchall()])

                # ── Technologies search ───────────────────────────────────
                if method == "GET" and tech_suggest is not None:
                    q = tech_suggest.strip()
                    if q:
                        cur.execute(
                            "SELECT id, name, status FROM technologies WHERE name ILIKE %s ORDER BY name LIMIT 20",
                            (f"%{q}%",),
                        )
                    else:
                        cur.execute("SELECT id, name, status FROM technologies ORDER BY name LIMIT 50")
                    return ok([{"id": r[0], "name": r[1], "status": r[2],
                                "statusLabel": STATUS_MAP.get(r[2], r[2])} for r in cur.fetchall()])

                # ── GET list ──────────────────────────────────────────────
                if method == "GET" and not dec_id:
                    cur.execute(
                        """
                        SELECT d.id, d.name, d.owner, d.status, d.decision_type,
                               d.description, d.created_at, d.updated_at, v.version
                        FROM decisions d
                        LEFT JOIN LATERAL (
                            SELECT version FROM decision_versions
                            WHERE decision_id = d.id
                            ORDER BY changed_at DESC LIMIT 1
                        ) v ON true
                        ORDER BY d.created_at DESC
                        """
                    )
                    rows = cur.fetchall()
                    result = []
                    for r in rows:
                        tags = get_tags(cur, r[0])
                        result.append(row_to_dict(r, tags, r[8] or "1.0"))
                    return ok(result)

                # ── GET single ────────────────────────────────────────────
                if method == "GET" and dec_id:
                    cur.execute(
                        "SELECT id, name, owner, status, decision_type, description, created_at, updated_at FROM decisions WHERE id = %s",
                        (dec_id,),
                    )
                    row = cur.fetchone()
                    if not row:
                        return err("Решение не найдено", 404)

                    cur.execute(
                        "SELECT id, version, change_note, changed_at FROM decision_versions WHERE decision_id = %s ORDER BY changed_at DESC",
                        (dec_id,),
                    )
                    versions = [
                        {"id": v[0], "version": v[1], "changeNote": v[2], "changedAt": v[3]}
                        for v in cur.fetchall()
                    ]
                    cur_ver = versions[0]["version"] if versions else "1.0"
                    tags = get_tags(cur, dec_id)
                    mermaid = get_mermaid(cur, dec_id)
                    files = get_files(cur, dec_id)
                    related = get_related_decisions(cur, dec_id)
                    techs = get_technologies(cur, dec_id)
                    tech_ids = [t["id"] for t in techs]
                    reqs_by_domain = get_requirements_by_tech(cur, tech_ids)
                    return ok(row_to_dict(row, tags, cur_ver, mermaid, files, versions,
                                         related, techs, reqs_by_domain))

                # ── POST create ───────────────────────────────────────────
                if method == "POST" and not action:
                    body = parse_body(event)
                    name = (body.get("name") or "").strip()
                    if not name:
                        return err("Название обязательно")

                    status_val = body.get("status", "in_development")
                    if status_val not in STATUS_MAP:
                        status_val = STATUS_REVERSE.get(status_val, "in_development")

                    dtype = body.get("decisionType", "technical")
                    if dtype not in TYPE_MAP:
                        dtype = "technical"

                    cur.execute(
                        """
                        INSERT INTO decisions (name, owner, status, decision_type, description)
                        VALUES (%s, %s, %s, %s, %s)
                        RETURNING id, name, owner, status, decision_type, description, created_at, updated_at
                        """,
                        (name, body.get("owner", ""), status_val, dtype, body.get("description", "")),
                    )
                    row = cur.fetchone()
                    new_id = row[0]

                    set_tags(cur, new_id, body.get("tags") or [])
                    set_related_decisions(cur, new_id, body.get("relatedDecisionIds") or [])
                    set_technologies(cur, new_id, body.get("technologyIds") or [])

                    cur.execute(
                        "INSERT INTO decision_versions (decision_id, version, change_note) VALUES (%s, '1.0', 'Создано')",
                        (new_id,),
                    )

                    tags = get_tags(cur, new_id)
                    return ok(row_to_dict(row, tags, "1.0"), 201)

                # ── PUT update ────────────────────────────────────────────
                if method == "PUT" and not action:
                    body = parse_body(event)
                    did = body.get("id") or dec_id
                    if not did:
                        return err("ID обязателен")

                    cur.execute("SELECT id FROM decisions WHERE id = %s", (did,))
                    if not cur.fetchone():
                        return err("Решение не найдено", 404)

                    name = (body.get("name") or "").strip()
                    if not name:
                        return err("Название обязательно")

                    status_val = body.get("status", "in_development")
                    if status_val not in STATUS_MAP:
                        status_val = STATUS_REVERSE.get(status_val, "in_development")

                    dtype = body.get("decisionType", "technical")
                    if dtype not in TYPE_MAP:
                        dtype = "technical"

                    cur.execute(
                        """
                        UPDATE decisions
                        SET name=%s, owner=%s, status=%s, decision_type=%s, description=%s, updated_at=now()
                        WHERE id=%s
                        RETURNING id, name, owner, status, decision_type, description, created_at, updated_at
                        """,
                        (name, body.get("owner", ""), status_val, dtype, body.get("description", ""), did),
                    )
                    row = cur.fetchone()
                    new_ver = next_version(cur, did)

                    set_tags(cur, did, body.get("tags") or [])
                    set_related_decisions(cur, did, body.get("relatedDecisionIds") or [])
                    set_technologies(cur, did, body.get("technologyIds") or [])

                    cur.execute(
                        "INSERT INTO decision_versions (decision_id, version, change_note) VALUES (%s, %s, %s)",
                        (did, new_ver, body.get("changeNote", "Обновлено")),
                    )

                    tags = get_tags(cur, did)
                    return ok(row_to_dict(row, tags, new_ver))

                # ── POST add_mermaid ──────────────────────────────────────
                if method == "POST" and action == "add_mermaid":
                    body = parse_body(event)
                    did = body.get("decision_id")
                    code = (body.get("code") or "").strip()
                    if not did or not code:
                        return err("decision_id и code обязательны")

                    cur.execute("SELECT id FROM decisions WHERE id = %s", (did,))
                    if not cur.fetchone():
                        return err("Решение не найдено", 404)

                    cur.execute(
                        """
                        INSERT INTO decision_mermaid (decision_id, title, code)
                        VALUES (%s, %s, %s)
                        RETURNING id, title, code, created_at, updated_at
                        """,
                        (did, body.get("title", ""), code),
                    )
                    r = cur.fetchone()
                    return ok({"id": r[0], "title": r[1], "code": r[2],
                               "createdAt": r[3], "updatedAt": r[4]}, 201)

                # ── PUT update_mermaid ────────────────────────────────────
                if method == "PUT" and action == "update_mermaid":
                    body = parse_body(event)
                    mid = body.get("id")
                    if not mid:
                        return err("id обязателен")

                    cur.execute(
                        """
                        UPDATE decision_mermaid
                        SET title=%s, code=%s, updated_at=now()
                        WHERE id=%s
                        RETURNING id, title, code, created_at, updated_at
                        """,
                        (body.get("title", ""), (body.get("code") or "").strip(), mid),
                    )
                    r = cur.fetchone()
                    if not r:
                        return err("Схема не найдена", 404)
                    return ok({"id": r[0], "title": r[1], "code": r[2],
                               "createdAt": r[3], "updatedAt": r[4]})

                # ── POST upload_file ──────────────────────────────────────
                if method == "POST" and action == "upload_file":
                    body = parse_body(event)
                    did = body.get("decision_id")
                    filename = (body.get("filename") or "").strip()
                    data_b64 = body.get("data_base64") or ""
                    content_type = body.get("content_type") or "application/octet-stream"

                    if not did or not filename or not data_b64:
                        return err("decision_id, filename и data_base64 обязательны")

                    cur.execute("SELECT id FROM decisions WHERE id = %s", (did,))
                    if not cur.fetchone():
                        return err("Решение не найдено", 404)

                    file_data = base64.b64decode(data_b64)
                    s3_key = f"decisions/{did}/{filename}"

                    s3 = s3_client()
                    s3.put_object(
                        Bucket="files",
                        Key=s3_key,
                        Body=file_data,
                        ContentType=content_type,
                    )

                    cur.execute(
                        """
                        INSERT INTO decision_files
                            (decision_id, filename, s3_key, content_type, size_bytes)
                        VALUES (%s, %s, %s, %s, %s)
                        RETURNING id, filename, s3_key, content_type, size_bytes, created_at
                        """,
                        (did, filename, s3_key, content_type, len(file_data)),
                    )
                    r = cur.fetchone()
                    return ok({
                        "id": r[0], "filename": r[1], "s3Key": r[2],
                        "contentType": r[3], "sizeBytes": r[4], "uploadedAt": r[5],
                        "url": f"{CDN_BASE}/{s3_key}",
                    }, 201)

                return err("Метод/действие не поддерживается", 405)

    finally:
        conn.close()
