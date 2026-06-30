"""
CRUD API для раздела «Технологии».

GET  /                     — список всех технологий
GET  /?id=...              — карточка + версии + теги + mermaid + файлы
GET  /?tags_suggest=...    — автодополнение тегов
POST /                     — создать технологию
PUT  /                     — обновить технологию

POST /?action=add_mermaid     body: {technology_id, title, code}
PUT  /?action=update_mermaid  body: {id, title, code}

POST /?action=upload_file  body: {technology_id, filename, content_type, data_base64}
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


def next_version(cur, tech_id: str) -> str:
    cur.execute(
        "SELECT version FROM technology_versions WHERE technology_id = %s ORDER BY changed_at DESC LIMIT 1",
        (tech_id,),
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


def get_tags(cur, tech_id: str) -> list:
    cur.execute(
        """
        SELECT t.id, t.name FROM tags t
        JOIN technology_tags tt ON tt.tag_id = t.id
        WHERE tt.technology_id = %s ORDER BY t.name
        """,
        (tech_id,),
    )
    return [{"id": r[0], "name": r[1]} for r in cur.fetchall()]


def set_tags(cur, tech_id: str, tag_names: list):
    """Синхронизирует теги технологии: добавляет/убирает связи."""
    tag_names = [n.strip() for n in tag_names if n.strip()]

    # Создаём отсутствующие теги
    existing_ids = []
    for name in tag_names:
        cur.execute("INSERT INTO tags (name) VALUES (%s) ON CONFLICT (name) DO NOTHING", (name,))
        cur.execute("SELECT id FROM tags WHERE name = %s", (name,))
        row = cur.fetchone()
        if row:
            existing_ids.append(row[0])

    # Удаляем все старые связи (DELETE разрешён в runtime)
    cur.execute("DELETE FROM technology_tags WHERE technology_id = %s", (tech_id,))

    # Вставляем новые
    for tid in existing_ids:
        cur.execute(
            "INSERT INTO technology_tags (technology_id, tag_id) VALUES (%s, %s) ON CONFLICT DO NOTHING",
            (tech_id, tid),
        )


def get_mermaid(cur, tech_id: str) -> list:
    cur.execute(
        "SELECT id, title, code, created_at, updated_at FROM mermaid_diagrams WHERE technology_id = %s ORDER BY created_at",
        (tech_id,),
    )
    return [{"id": r[0], "title": r[1], "code": r[2], "createdAt": r[3], "updatedAt": r[4]}
            for r in cur.fetchall()]


def get_files(cur, tech_id: str) -> list:
    cur.execute(
        "SELECT id, filename, s3_key, content_type, size_bytes, uploaded_at FROM technology_files WHERE technology_id = %s ORDER BY uploaded_at",
        (tech_id,),
    )
    return [
        {
            "id": r[0], "filename": r[1], "s3Key": r[2],
            "contentType": r[3], "sizeBytes": r[4], "uploadedAt": r[5],
            "url": f"{CDN_BASE}/technologies/{r[2].split('/')[-1]}",
        }
        for r in cur.fetchall()
    ]


def row_to_dict(row, tags, cur_version, mermaid=None, files=None, versions=None):
    d = {
        "id": row[0], "name": row[1], "owner": row[2],
        "status": row[3], "statusLabel": STATUS_MAP.get(row[3], row[3]),
        "description": row[4], "createdAt": row[5], "updatedAt": row[6],
        "version": cur_version,
        "tags": tags,
    }
    if mermaid is not None:
        d["mermaidDiagrams"] = mermaid
    if files is not None:
        d["files"] = files
    if versions is not None:
        d["versions"] = versions
    return d


def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    method = event.get("httpMethod", "GET")
    params = event.get("queryStringParameters") or {}
    tech_id = params.get("id")
    action = params.get("action")
    tags_suggest = params.get("tags_suggest")

    conn = get_conn()
    try:
        with conn:
            with conn.cursor() as cur:

                # ── Tags autocomplete ──────────────────────────────────────
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

                # ── GET list ──────────────────────────────────────────────
                if method == "GET" and not tech_id:
                    cur.execute(
                        """
                        SELECT d.id, d.name, d.owner, d.status, d.description,
                               d.created_at, d.updated_at, v.version
                        FROM technologies d
                        LEFT JOIN LATERAL (
                            SELECT version FROM technology_versions
                            WHERE technology_id = d.id
                            ORDER BY changed_at DESC LIMIT 1
                        ) v ON true
                        ORDER BY d.created_at DESC
                        """
                    )
                    rows = cur.fetchall()
                    tech_ids = [r[0] for r in rows]
                    tags_map = {}
                    if tech_ids:
                        cur.execute(
                            """
                            SELECT tt.technology_id, t.id, t.name
                            FROM technology_tags tt
                            JOIN tags t ON t.id = tt.tag_id
                            WHERE tt.technology_id = ANY(%s)
                            ORDER BY t.name
                            """,
                            (tech_ids,),
                        )
                        for tr in cur.fetchall():
                            tags_map.setdefault(tr[0], []).append({"id": tr[1], "name": tr[2]})
                    result = []
                    for r in rows:
                        result.append(row_to_dict(r, tags_map.get(r[0], []), r[7] or "1.0"))
                    return ok(result)

                # ── GET single ────────────────────────────────────────────
                if method == "GET" and tech_id:
                    cur.execute(
                        "SELECT id, name, owner, status, description, created_at, updated_at FROM technologies WHERE id = %s",
                        (tech_id,),
                    )
                    row = cur.fetchone()
                    if not row:
                        return err("Технология не найдена", 404)

                    cur.execute(
                        """
                        SELECT id, version, name, owner, status, description,
                               tags_snapshot, changed_at, change_note
                        FROM technology_versions WHERE technology_id = %s ORDER BY changed_at DESC
                        """,
                        (tech_id,),
                    )
                    versions = [
                        {
                            "id": v[0], "version": v[1], "name": v[2], "owner": v[3],
                            "status": v[4], "statusLabel": STATUS_MAP.get(v[4], v[4]),
                            "description": v[5], "tagsSnapshot": list(v[6] or []),
                            "changedAt": v[7], "changeNote": v[8],
                        }
                        for v in cur.fetchall()
                    ]
                    cur_ver = versions[0]["version"] if versions else "1.0"
                    tags = get_tags(cur, tech_id)
                    mermaid = get_mermaid(cur, tech_id)
                    files = get_files(cur, tech_id)
                    return ok(row_to_dict(row, tags, cur_ver, mermaid, files, versions))

                # ── POST create ───────────────────────────────────────────
                if method == "POST" and not action:
                    body = parse_body(event)
                    name = (body.get("name") or "").strip()
                    if not name:
                        return err("Название обязательно")

                    status_val = body.get("status", "in_development")
                    if status_val not in STATUS_MAP:
                        status_val = STATUS_REVERSE.get(status_val, "in_development")

                    tag_names = body.get("tags") or []

                    cur.execute(
                        """
                        INSERT INTO technologies (name, owner, status, description)
                        VALUES (%s, %s, %s, %s)
                        RETURNING id, name, owner, status, description, created_at, updated_at
                        """,
                        (name, body.get("owner", ""), status_val, body.get("description", "")),
                    )
                    row = cur.fetchone()
                    new_id = row[0]

                    set_tags(cur, new_id, tag_names)
                    tags = get_tags(cur, new_id)

                    cur.execute(
                        """
                        INSERT INTO technology_versions
                            (technology_id, version, name, owner, status, description, tags_snapshot, change_note)
                        VALUES (%s, '1.0', %s, %s, %s, %s, %s, 'Создана')
                        """,
                        (new_id, row[1], row[2], row[3], row[4], [t["name"] for t in tags]),
                    )

                    return ok(row_to_dict(row, tags, "1.0"), 201)

                # ── PUT update ────────────────────────────────────────────
                if method == "PUT" and not action:
                    body = parse_body(event)
                    did = body.get("id") or tech_id
                    if not did:
                        return err("ID обязателен")

                    cur.execute("SELECT id FROM technologies WHERE id = %s", (did,))
                    if not cur.fetchone():
                        return err("Технология не найдена", 404)

                    name = (body.get("name") or "").strip()
                    if not name:
                        return err("Название обязательно")

                    status_val = body.get("status", "in_development")
                    if status_val not in STATUS_MAP:
                        status_val = STATUS_REVERSE.get(status_val, "in_development")

                    tag_names = body.get("tags") or []

                    cur.execute(
                        """
                        UPDATE technologies
                        SET name=%s, owner=%s, status=%s, description=%s, updated_at=now()
                        WHERE id=%s
                        RETURNING id, name, owner, status, description, created_at, updated_at
                        """,
                        (name, body.get("owner", ""), status_val, body.get("description", ""), did),
                    )
                    row = cur.fetchone()
                    new_ver = next_version(cur, did)

                    set_tags(cur, did, tag_names)
                    tags = get_tags(cur, did)

                    cur.execute(
                        """
                        INSERT INTO technology_versions
                            (technology_id, version, name, owner, status, description, tags_snapshot, change_note)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                        """,
                        (did, new_ver, row[1], row[2], row[3], row[4],
                         [t["name"] for t in tags], body.get("changeNote", "Обновлена")),
                    )

                    return ok(row_to_dict(row, tags, new_ver))

                # ── POST add_mermaid ──────────────────────────────────────
                if method == "POST" and action == "add_mermaid":
                    body = parse_body(event)
                    tid = body.get("technology_id")
                    code = (body.get("code") or "").strip()
                    if not tid or not code:
                        return err("technology_id и code обязательны")

                    cur.execute("SELECT id FROM technologies WHERE id = %s", (tid,))
                    if not cur.fetchone():
                        return err("Технология не найдена", 404)

                    cur.execute(
                        """
                        INSERT INTO mermaid_diagrams (technology_id, title, code)
                        VALUES (%s, %s, %s)
                        RETURNING id, title, code, created_at, updated_at
                        """,
                        (tid, body.get("title", ""), code),
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
                        UPDATE mermaid_diagrams
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
                    tid = body.get("technology_id")
                    filename = (body.get("filename") or "").strip()
                    data_b64 = body.get("data_base64") or ""
                    content_type = body.get("content_type") or "application/octet-stream"

                    if not tid or not filename or not data_b64:
                        return err("technology_id, filename и data_base64 обязательны")

                    cur.execute("SELECT id FROM technologies WHERE id = %s", (tid,))
                    if not cur.fetchone():
                        return err("Технология не найдена", 404)

                    file_data = base64.b64decode(data_b64)
                    s3_key = f"technologies/{tid}/{filename}"

                    s3 = s3_client()
                    s3.put_object(
                        Bucket="files",
                        Key=s3_key,
                        Body=file_data,
                        ContentType=content_type,
                    )

                    cur.execute(
                        """
                        INSERT INTO technology_files
                            (technology_id, filename, s3_key, content_type, size_bytes)
                        VALUES (%s, %s, %s, %s, %s)
                        RETURNING id, filename, s3_key, content_type, size_bytes, uploaded_at
                        """,
                        (tid, filename, s3_key, content_type, len(file_data)),
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