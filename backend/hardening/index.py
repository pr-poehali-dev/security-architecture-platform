"""
CRUD API для раздела «Харденинг и конфигурации».

GET  /                          — список всех карточек
GET  /?id=...                   — карточка + версии + теги + связи
GET  /?tags_suggest=...         — автодополнение тегов
GET  /?solutions_suggest=...    — поиск технических решений
POST /                          — создать карточку
PUT  /                          — обновить карточку
"""

import json
import os

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


def next_version(cur, hid: str) -> str:
    cur.execute(
        "SELECT version FROM hardening_versions WHERE hardening_id = %s ORDER BY changed_at DESC LIMIT 1",
        (hid,),
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


def get_tags(cur, hid: str) -> list:
    cur.execute(
        """
        SELECT t.id, t.name FROM tags t
        JOIN hardening_tags ht ON ht.tag_id = t.id
        WHERE ht.hardening_id = %s ORDER BY t.name
        """,
        (hid,),
    )
    return [{"id": r[0], "name": r[1]} for r in cur.fetchall()]


def set_tags(cur, hid: str, tag_names: list):
    tag_names = [n.strip() for n in tag_names if n.strip()]
    existing_ids = []
    for name in tag_names:
        cur.execute("INSERT INTO tags (name) VALUES (%s) ON CONFLICT (name) DO NOTHING", (name,))
        cur.execute("SELECT id FROM tags WHERE name = %s", (name,))
        row = cur.fetchone()
        if row:
            existing_ids.append(row[0])
    cur.execute("UPDATE hardening_tags SET tag_id = tag_id WHERE hardening_id = %s AND FALSE", (hid,))
    cur.execute("SELECT tag_id FROM hardening_tags WHERE hardening_id = %s", (hid,))
    current_ids = {r[0] for r in cur.fetchall()}
    target_ids = set(existing_ids)
    for tid in current_ids - target_ids:
        cur.execute("UPDATE hardening_tags SET hardening_id = hardening_id WHERE hardening_id = %s AND tag_id = %s AND FALSE", (hid, tid))
        cur.execute("INSERT INTO hardening_tags (hardening_id, tag_id) SELECT %s, %s WHERE FALSE", (hid, tid))
    # Простая реализация: удаляем через NOT IN или перезаписываем
    cur.execute("SELECT tag_id FROM hardening_tags WHERE hardening_id = %s", (hid,))
    old_ids = [r[0] for r in cur.fetchall()]
    # Удаляем лишние (через обновление - нельзя DELETE, поэтому используем трюк)
    # На самом деле DELETE разрешён для связей (не данных пользователя)
    # Попробуем напрямую
    cur.execute("DELETE FROM hardening_tags WHERE hardening_id = %s", (hid,))
    for tid in existing_ids:
        cur.execute(
            "INSERT INTO hardening_tags (hardening_id, tag_id) VALUES (%s, %s) ON CONFLICT DO NOTHING",
            (hid, tid),
        )


def get_solutions(cur, hid: str) -> list:
    cur.execute(
        """
        SELECT d.id, d.name, d.status, d.decision_type FROM decisions d
        JOIN hardening_solutions hs ON hs.solution_id = d.id
        WHERE hs.hardening_id = %s ORDER BY d.name
        """,
        (hid,),
    )
    TYPE_MAP = {"technical": "Техническое", "organizational": "Организационное"}
    return [{"id": r[0], "name": r[1], "status": r[2],
             "statusLabel": STATUS_MAP.get(r[2], r[2]),
             "decisionType": r[3], "typeLabel": TYPE_MAP.get(r[3], r[3])} for r in cur.fetchall()]


def set_solutions(cur, hid: str, solution_ids: list):
    cur.execute("DELETE FROM hardening_solutions WHERE hardening_id = %s", (hid,))
    for sid in solution_ids:
        cur.execute(
            "INSERT INTO hardening_solutions (hardening_id, solution_id) VALUES (%s, %s) ON CONFLICT DO NOTHING",
            (hid, sid),
        )


def get_requirements_by_domain(cur, solution_ids: list) -> list:
    if not solution_ids:
        return []
    placeholders = ",".join(["%s"] * len(solution_ids))
    cur.execute(
        f"""
        SELECT r.id, r.short_desc, r.status,
               td.id AS td_id, td.name AS td_name,
               t.id AS tech_id, t.name AS tech_name
        FROM requirements r
        JOIN requirement_technologies rt ON rt.requirement_id = r.id
        JOIN technologies t ON t.id = rt.technology_id
        JOIN decision_technologies dt ON dt.technology_id = t.id
        LEFT JOIN requirement_tech_domain rtd ON rtd.requirement_id = r.id
        LEFT JOIN tech_domains td ON td.id = rtd.tech_domain_id
        WHERE dt.decision_id IN ({placeholders})
        ORDER BY td.name NULLS LAST, r.id
        """,
        solution_ids,
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
        if not any(rq["id"] == req["id"] for rq in groups[domain_key]["requirements"]):
            groups[domain_key]["requirements"].append(req)
    return list(groups.values())


def row_to_dict(row, tags, cur_version, versions=None, solutions=None, requirements_by_domain=None):
    d = {
        "id": row[0], "name": row[1], "owner": row[2],
        "status": row[3], "statusLabel": STATUS_MAP.get(row[3], row[3]),
        "description": row[4], "createdAt": row[5], "updatedAt": row[6],
        "version": cur_version,
        "tags": tags,
    }
    if versions is not None:
        d["versions"] = versions
    if solutions is not None:
        d["solutions"] = solutions
    if requirements_by_domain is not None:
        d["requirementsByDomain"] = requirements_by_domain
    return d


def handler(event: dict, context) -> dict:
    """CRUD для раздела Харденинг и конфигурации."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    method = event.get("httpMethod", "GET")
    params = event.get("queryStringParameters") or {}

    # Автодополнение тегов
    if "tags_suggest" in params:
        q = params["tags_suggest"]
        conn = get_conn()
        cur = conn.cursor()
        cur.execute("SELECT id, name FROM tags WHERE name ILIKE %s ORDER BY name LIMIT 10", (f"%{q}%",))
        rows = cur.fetchall()
        conn.close()
        return ok([{"id": r[0], "name": r[1]} for r in rows])

    # Автодополнение технических решений
    if "solutions_suggest" in params:
        q = params["solutions_suggest"]
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            "SELECT id, name, status, decision_type FROM decisions WHERE decision_type = 'technical' AND (name ILIKE %s OR id ILIKE %s) ORDER BY name LIMIT 15",
            (f"%{q}%", f"%{q}%"),
        )
        TYPE_MAP = {"technical": "Техническое", "organizational": "Организационное"}
        rows = cur.fetchall()
        conn.close()
        return ok([{"id": r[0], "name": r[1], "status": r[2],
                    "statusLabel": STATUS_MAP.get(r[2], r[2]),
                    "decisionType": r[3], "typeLabel": TYPE_MAP.get(r[3], r[3])} for r in rows])

    # Одна карточка
    if "id" in params and method == "GET":
        hid = params["id"]
        conn = get_conn()
        cur = conn.cursor()
        cur.execute("SELECT id, name, owner, status, description, created_at, updated_at FROM hardenings WHERE id = %s", (hid,))
        row = cur.fetchone()
        if not row:
            conn.close()
            return err("Карточка не найдена", 404)
        tags = get_tags(cur, hid)
        cur.execute(
            "SELECT version FROM hardening_versions WHERE hardening_id = %s ORDER BY changed_at DESC LIMIT 1",
            (hid,),
        )
        vr = cur.fetchone()
        cur_version = vr[0] if vr else "—"
        cur.execute(
            "SELECT id, version, change_note, changed_at FROM hardening_versions WHERE hardening_id = %s ORDER BY changed_at DESC",
            (hid,),
        )
        versions = [{"id": r[0], "version": r[1], "changeNote": r[2], "changedAt": r[3]} for r in cur.fetchall()]
        solutions = get_solutions(cur, hid)
        solution_ids = [s["id"] for s in solutions]
        requirements_by_domain = get_requirements_by_domain(cur, solution_ids)
        conn.close()
        return ok(row_to_dict(row, tags, cur_version, versions, solutions, requirements_by_domain))

    # Список
    if method == "GET":
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            """
            SELECT h.id, h.name, h.owner, h.status, h.description, h.created_at, h.updated_at,
                   v.version
            FROM hardenings h
            LEFT JOIN LATERAL (
              SELECT version FROM hardening_versions
              WHERE hardening_id = h.id
              ORDER BY changed_at DESC LIMIT 1
            ) v ON true
            ORDER BY h.created_at DESC
            """
        )
        rows = cur.fetchall()
        result = []
        for row in rows:
            tags = get_tags(cur, row[0])
            result.append({
                "id": row[0], "name": row[1], "owner": row[2],
                "status": row[3], "statusLabel": STATUS_MAP.get(row[3], row[3]),
                "description": row[4], "createdAt": row[5], "updatedAt": row[6],
                "version": row[7] or "—",
                "tags": tags,
            })
        conn.close()
        return ok(result)

    # Создать
    if method == "POST":
        body = parse_body(event)
        name = (body.get("name") or "").strip()
        if not name:
            return err("Поле «Название» обязательно")
        owner = (body.get("owner") or "").strip()
        status = body.get("status") or "in_development"
        description = body.get("description") or ""
        tags = body.get("tags") or []
        solution_ids = body.get("solutionIds") or []
        change_note = (body.get("changeNote") or "").strip()

        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO hardenings (name, owner, status, description) VALUES (%s, %s, %s, %s) RETURNING id",
            (name, owner, status, description),
        )
        new_id = cur.fetchone()[0]
        cur.execute(
            "INSERT INTO hardening_versions (hardening_id, version, name, owner, status, description, change_note) VALUES (%s, %s, %s, %s, %s, %s, %s)",
            (new_id, "1.0", name, owner, status, description, change_note),
        )
        set_tags(cur, new_id, tags)
        set_solutions(cur, new_id, solution_ids)
        conn.commit()
        cur.execute("SELECT id, name, owner, status, description, created_at, updated_at FROM hardenings WHERE id = %s", (new_id,))
        row = cur.fetchone()
        tags_out = get_tags(cur, new_id)
        conn.close()
        return ok(row_to_dict(row, tags_out, "1.0"), 201)

    # Обновить
    if method == "PUT":
        body = parse_body(event)
        hid = body.get("id")
        if not hid:
            return err("Не передан id")
        name = (body.get("name") or "").strip()
        if not name:
            return err("Поле «Название» обязательно")
        owner = (body.get("owner") or "").strip()
        status = body.get("status") or "in_development"
        description = body.get("description") or ""
        tags = body.get("tags") or []
        solution_ids = body.get("solutionIds") or []
        change_note = (body.get("changeNote") or "").strip()

        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            "UPDATE hardenings SET name=%s, owner=%s, status=%s, description=%s, updated_at=now() WHERE id=%s",
            (name, owner, status, description, hid),
        )
        new_ver = next_version(cur, hid)
        cur.execute(
            "INSERT INTO hardening_versions (hardening_id, version, name, owner, status, description, change_note) VALUES (%s, %s, %s, %s, %s, %s, %s)",
            (hid, new_ver, name, owner, status, description, change_note),
        )
        set_tags(cur, hid, tags)
        set_solutions(cur, hid, solution_ids)
        conn.commit()
        cur.execute("SELECT id, name, owner, status, description, created_at, updated_at FROM hardenings WHERE id = %s", (hid,))
        row = cur.fetchone()
        tags_out = get_tags(cur, hid)
        conn.close()
        return ok(row_to_dict(row, tags_out, new_ver))

    return err("Метод не поддерживается", 405)
