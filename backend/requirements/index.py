"""
CRUD API для раздела «Требования».

GET  /                      — список всех требований
GET  /?id=...               — карточка + версии + теги + технологии
GET  /?tags_suggest=...     — автодополнение тегов
GET  /?tech_suggest=...     — поиск технологий для связи
POST /                      — создать требование
PUT  /                      — обновить требование
"""

import json
import os

import psycopg2

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
}

TYPE_MAP = {
    "technical":       "Технические",
    "functional":      "Функциональные",
    "non_functional":  "Не функциональные",
    "organizational":  "Организационный",
}

STATUS_MAP = {
    "active":         "Активен",
    "in_development": "В разработке",
    "inactive":       "Не активен",
    "archived":       "В архиве",
}


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


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


def next_req_version(cur, req_id: str) -> str:
    cur.execute(
        "SELECT version FROM requirement_versions WHERE requirement_id = %s ORDER BY changed_at DESC LIMIT 1",
        (req_id,),
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


def get_tags(cur, req_id: str) -> list:
    cur.execute(
        """
        SELECT t.id, t.name FROM tags t
        JOIN requirement_tags rt ON rt.tag_id = t.id
        WHERE rt.requirement_id = %s ORDER BY t.name
        """,
        (req_id,),
    )
    return [{"id": r[0], "name": r[1]} for r in cur.fetchall()]


def set_tags(cur, req_id: str, tag_names: list):
    tag_names = [n.strip() for n in tag_names if n.strip()]
    existing_ids = []
    for name in tag_names:
        cur.execute("INSERT INTO tags (name) VALUES (%s) ON CONFLICT (name) DO NOTHING", (name,))
        cur.execute("SELECT id FROM tags WHERE name = %s", (name,))
        row = cur.fetchone()
        if row:
            existing_ids.append(row[0])
    cur.execute("DELETE FROM requirement_tags WHERE requirement_id = %s", (req_id,))
    for tid in existing_ids:
        cur.execute(
            "INSERT INTO requirement_tags (requirement_id, tag_id) VALUES (%s, %s) ON CONFLICT DO NOTHING",
            (req_id, tid),
        )


def get_technologies(cur, req_id: str) -> list:
    cur.execute(
        """
        SELECT t.id, t.name, t.status FROM technologies t
        JOIN requirement_technologies rt ON rt.technology_id = t.id
        WHERE rt.requirement_id = %s ORDER BY t.name
        """,
        (req_id,),
    )
    return [{"id": r[0], "name": r[1], "status": r[2]} for r in cur.fetchall()]


def set_technologies(cur, req_id: str, tech_ids: list):
    cur.execute("DELETE FROM requirement_technologies WHERE requirement_id = %s", (req_id,))
    for tid in tech_ids:
        cur.execute(
            "INSERT INTO requirement_technologies (requirement_id, technology_id) VALUES (%s, %s) ON CONFLICT DO NOTHING",
            (req_id, tid),
        )


def row_to_dict(row, tags, cur_version, technologies=None, versions=None):
    d = {
        "id": row[0],
        "shortDesc": row[1],
        "description": row[2],
        "reqType": row[3],
        "reqTypeLabel": TYPE_MAP.get(row[3], row[3]),
        "owner": row[4],
        "status": row[5],
        "statusLabel": STATUS_MAP.get(row[5], row[5]),
        "normativeDoc": row[6],
        "controlMetrics": row[7],
        "fulfillmentMethod": row[8],
        "isProcurement": row[9],
        "scorePoint": row[10],
        "scoreWeight": row[11],
        "createdAt": row[12],
        "updatedAt": row[13],
        "version": cur_version,
        "tags": tags,
    }
    if technologies is not None:
        d["technologies"] = technologies
    if versions is not None:
        d["versions"] = versions
    return d


def handler(event: dict, context) -> dict:
    """CRUD для требований: список, карточка, создание, обновление, автодополнение."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    method = event.get("httpMethod", "GET")
    params = event.get("queryStringParameters") or {}
    req_id = params.get("id")
    tags_suggest = params.get("tags_suggest")
    tech_suggest = params.get("tech_suggest")

    conn = get_conn()
    try:
        with conn:
            with conn.cursor() as cur:

                # ── Tags autocomplete ──────────────────────────────────
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

                # ── Technologies search ────────────────────────────────
                if method == "GET" and tech_suggest is not None:
                    q = tech_suggest.strip()
                    if q:
                        cur.execute(
                            "SELECT id, name, status FROM technologies WHERE name ILIKE %s ORDER BY name LIMIT 20",
                            (f"%{q}%",),
                        )
                    else:
                        cur.execute("SELECT id, name, status FROM technologies ORDER BY name LIMIT 50")
                    return ok([{"id": r[0], "name": r[1], "status": r[2]} for r in cur.fetchall()])

                # ── GET list ──────────────────────────────────────────
                if method == "GET" and not req_id:
                    cur.execute(
                        """
                        SELECT r.id, r.short_desc, r.description, r.req_type, r.owner,
                               r.status, r.normative_doc, r.control_metrics,
                               r.fulfillment_method, r.is_procurement,
                               r.score_point, r.score_weight, r.created_at, r.updated_at,
                               v.version
                        FROM requirements r
                        LEFT JOIN LATERAL (
                            SELECT version FROM requirement_versions
                            WHERE requirement_id = r.id
                            ORDER BY changed_at DESC LIMIT 1
                        ) v ON true
                        ORDER BY r.created_at DESC
                        """
                    )
                    rows = cur.fetchall()
                    result = []
                    for r in rows:
                        tags = get_tags(cur, r[0])
                        techs = get_technologies(cur, r[0])
                        result.append(row_to_dict(r, tags, r[14] or "1.0", technologies=techs))
                    return ok(result)

                # ── GET single ────────────────────────────────────────
                if method == "GET" and req_id:
                    cur.execute(
                        """
                        SELECT id, short_desc, description, req_type, owner, status,
                               normative_doc, control_metrics, fulfillment_method,
                               is_procurement, score_point, score_weight, created_at, updated_at
                        FROM requirements WHERE id = %s
                        """,
                        (req_id,),
                    )
                    row = cur.fetchone()
                    if not row:
                        return err("Требование не найдено", 404)

                    cur.execute(
                        """
                        SELECT id, version, change_note, changed_at
                        FROM requirement_versions
                        WHERE requirement_id = %s ORDER BY changed_at DESC
                        """,
                        (req_id,),
                    )
                    versions = [
                        {"id": v[0], "version": v[1], "changeNote": v[2], "changedAt": v[3]}
                        for v in cur.fetchall()
                    ]
                    cur_version = versions[0]["version"] if versions else "1.0"
                    tags = get_tags(cur, req_id)
                    techs = get_technologies(cur, req_id)
                    return ok(row_to_dict(row, tags, cur_version, technologies=techs, versions=versions))

                # ── POST create ───────────────────────────────────────
                if method == "POST":
                    body = parse_body(event)
                    cur.execute("SELECT nextval('requirement_seq')")
                    seq = cur.fetchone()[0]
                    new_id = f"req-{seq}"

                    cur.execute(
                        """
                        INSERT INTO requirements
                            (id, short_desc, description, req_type, owner, status,
                             normative_doc, control_metrics, fulfillment_method,
                             is_procurement, score_point, score_weight)
                        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                        """,
                        (
                            new_id,
                            body.get("shortDesc", ""),
                            body.get("description", ""),
                            body.get("reqType", "functional"),
                            body.get("owner", ""),
                            body.get("status", "active"),
                            body.get("normativeDoc", ""),
                            body.get("controlMetrics", ""),
                            body.get("fulfillmentMethod", ""),
                            bool(body.get("isProcurement", False)),
                            int(body.get("scorePoint", 1)),
                            int(body.get("scoreWeight", 1)),
                        ),
                    )
                    cur.execute(
                        "INSERT INTO requirement_versions (requirement_id, version, change_note) VALUES (%s, %s, %s)",
                        (new_id, "1.0", body.get("changeNote", "Создано")),
                    )
                    set_tags(cur, new_id, body.get("tags", []))
                    set_technologies(cur, new_id, body.get("technologyIds", []))

                    cur.execute(
                        "SELECT id, short_desc, description, req_type, owner, status, normative_doc, control_metrics, fulfillment_method, is_procurement, score_point, score_weight, created_at, updated_at FROM requirements WHERE id = %s",
                        (new_id,),
                    )
                    row = cur.fetchone()
                    tags = get_tags(cur, new_id)
                    techs = get_technologies(cur, new_id)
                    return ok(row_to_dict(row, tags, "1.0", technologies=techs), 201)

                # ── PUT update ────────────────────────────────────────
                if method == "PUT":
                    body = parse_body(event)
                    uid = body.get("id") or req_id
                    if not uid:
                        return err("Не передан id")

                    cur.execute("SELECT id FROM requirements WHERE id = %s", (uid,))
                    if not cur.fetchone():
                        return err("Требование не найдено", 404)

                    cur.execute(
                        """
                        UPDATE requirements SET
                            short_desc = %s, description = %s, req_type = %s, owner = %s,
                            status = %s, normative_doc = %s, control_metrics = %s,
                            fulfillment_method = %s, is_procurement = %s,
                            score_point = %s, score_weight = %s, updated_at = NOW()
                        WHERE id = %s
                        """,
                        (
                            body.get("shortDesc", ""),
                            body.get("description", ""),
                            body.get("reqType", "functional"),
                            body.get("owner", ""),
                            body.get("status", "active"),
                            body.get("normativeDoc", ""),
                            body.get("controlMetrics", ""),
                            body.get("fulfillmentMethod", ""),
                            bool(body.get("isProcurement", False)),
                            int(body.get("scorePoint", 1)),
                            int(body.get("scoreWeight", 1)),
                            uid,
                        ),
                    )
                    new_ver = next_req_version(cur, uid)
                    cur.execute(
                        "INSERT INTO requirement_versions (requirement_id, version, change_note) VALUES (%s, %s, %s)",
                        (uid, new_ver, body.get("changeNote", "")),
                    )
                    set_tags(cur, uid, body.get("tags", []))
                    set_technologies(cur, uid, body.get("technologyIds", []))

                    cur.execute(
                        "SELECT id, short_desc, description, req_type, owner, status, normative_doc, control_metrics, fulfillment_method, is_procurement, score_point, score_weight, created_at, updated_at FROM requirements WHERE id = %s",
                        (uid,),
                    )
                    row = cur.fetchone()
                    tags = get_tags(cur, uid)
                    techs = get_technologies(cur, uid)
                    return ok(row_to_dict(row, tags, new_ver, technologies=techs))

                return err("Метод не поддерживается", 405)

    finally:
        conn.close()
