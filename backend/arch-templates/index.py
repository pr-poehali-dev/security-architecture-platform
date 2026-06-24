"""
CRUD API для раздела «Шаблоны архитектур».

GET  /                              — список всех шаблонов
GET  /?id=...                       — карточка + версии + теги + файлы + mermaid + связи
GET  /?tags_suggest=...             — автодополнение тегов
GET  /?templates_suggest=...        — поиск шаблонов для связи
GET  /?tech_suggest=...             — поиск технологий
GET  /?decisions_suggest=...        — поиск решений
POST /                              — создать шаблон
PUT  /                              — обновить шаблон

POST /?action=add_mermaid           body: {template_id, title, code}
PUT  /?action=update_mermaid        body: {id, title, code}
POST /?action=upload_file           body: {template_id, filename, content_type, data_base64}
"""

import base64
import json
import os

import boto3
import psycopg2

SCHEMA = "t_p84706301_security_architectur"

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
}

STATUS_MAP = {
    "active":         "Активен",
    "on_review":      "На ревью",
    "in_development": "В разработке",
    "inactive":       "Не активен",
    "archived":       "В архиве",
}

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


def next_version(cur, tmpl_id: str) -> str:
    cur.execute(
        f"SELECT version FROM {SCHEMA}.arch_template_versions WHERE template_id = %s ORDER BY changed_at DESC LIMIT 1",
        (tmpl_id,),
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


def get_version(cur, tmpl_id: str) -> str:
    cur.execute(
        f"SELECT version FROM {SCHEMA}.arch_template_versions WHERE template_id = %s ORDER BY changed_at DESC LIMIT 1",
        (tmpl_id,),
    )
    row = cur.fetchone()
    return row[0] if row else "1.0"


def get_tags(cur, tmpl_id: str) -> list:
    cur.execute(
        f"""
        SELECT t.id, t.name FROM {SCHEMA}.tags t
        JOIN {SCHEMA}.arch_template_tags att ON att.tag_id = t.id
        WHERE att.template_id = %s AND att.is_active = true ORDER BY t.name
        """,
        (tmpl_id,),
    )
    return [{"id": r[0], "name": r[1]} for r in cur.fetchall()]


def set_tags(cur, tmpl_id: str, tag_names: list):
    tag_names = [n.strip() for n in tag_names if n.strip()]
    desired_ids = []
    for name in tag_names:
        cur.execute(f"INSERT INTO {SCHEMA}.tags (name) VALUES (%s) ON CONFLICT (name) DO NOTHING", (name,))
        cur.execute(f"SELECT id FROM {SCHEMA}.tags WHERE name = %s", (name,))
        row = cur.fetchone()
        if row:
            desired_ids.append(row[0])
    # Деактивируем все текущие теги
    cur.execute(f"UPDATE {SCHEMA}.arch_template_tags SET is_active = false WHERE template_id = %s", (tmpl_id,))
    # Активируем / вставляем нужные
    for tid in desired_ids:
        cur.execute(
            f"""INSERT INTO {SCHEMA}.arch_template_tags (template_id, tag_id, is_active)
                VALUES (%s, %s, true)
                ON CONFLICT (template_id, tag_id) DO UPDATE SET is_active = true""",
            (tmpl_id, tid),
        )


def get_mermaid(cur, tmpl_id: str) -> list:
    cur.execute(
        f"SELECT id, title, code, created_at, updated_at FROM {SCHEMA}.arch_template_mermaid WHERE template_id = %s ORDER BY created_at",
        (tmpl_id,),
    )
    return [{"id": r[0], "title": r[1], "code": r[2], "createdAt": r[3], "updatedAt": r[4]}
            for r in cur.fetchall()]


def get_files(cur, tmpl_id: str) -> list:
    cur.execute(
        f"SELECT id, filename, s3_key, content_type, size_bytes, created_at FROM {SCHEMA}.arch_template_files WHERE template_id = %s ORDER BY created_at",
        (tmpl_id,),
    )
    return [
        {
            "id": r[0], "filename": r[1], "s3Key": r[2],
            "contentType": r[3], "sizeBytes": r[4], "uploadedAt": r[5],
            "url": f"{CDN_BASE}/arch-templates/{r[2].split('/')[-1]}",
        }
        for r in cur.fetchall()
    ]


def get_related_templates(cur, tmpl_id: str) -> list:
    cur.execute(
        f"""
        SELECT t.id, t.name, t.template_type, t.status FROM {SCHEMA}.arch_templates t
        JOIN {SCHEMA}.arch_template_links atl ON atl.related_id = t.id
        WHERE atl.template_id = %s AND atl.is_active = true
        UNION
        SELECT t.id, t.name, t.template_type, t.status FROM {SCHEMA}.arch_templates t
        JOIN {SCHEMA}.arch_template_links atl ON atl.template_id = t.id
        WHERE atl.related_id = %s AND atl.is_active = true
        ORDER BY name
        """,
        (tmpl_id, tmpl_id),
    )
    return [{"id": r[0], "name": r[1], "templateType": r[2],
             "typeLabel": TYPE_MAP.get(r[2], r[2]), "status": r[3],
             "statusLabel": STATUS_MAP.get(r[3], r[3])} for r in cur.fetchall()]


def set_related_templates(cur, tmpl_id: str, related_ids: list):
    cur.execute(f"UPDATE {SCHEMA}.arch_template_links SET is_active = false WHERE template_id = %s", (tmpl_id,))
    for rid in related_ids:
        if rid == tmpl_id:
            continue
        cur.execute(
            f"""INSERT INTO {SCHEMA}.arch_template_links (template_id, related_id, is_active)
                VALUES (%s, %s, true)
                ON CONFLICT (template_id, related_id) DO UPDATE SET is_active = true""",
            (tmpl_id, rid),
        )


def get_technologies(cur, tmpl_id: str) -> list:
    cur.execute(
        f"""
        SELECT t.id, t.name, t.status FROM {SCHEMA}.technologies t
        JOIN {SCHEMA}.arch_template_technologies att ON att.technology_id = t.id
        WHERE att.template_id = %s AND att.is_active = true ORDER BY t.name
        """,
        (tmpl_id,),
    )
    return [{"id": r[0], "name": r[1], "status": r[2],
             "statusLabel": STATUS_MAP.get(r[2], r[2])} for r in cur.fetchall()]


def set_technologies(cur, tmpl_id: str, tech_ids: list):
    cur.execute(f"UPDATE {SCHEMA}.arch_template_technologies SET is_active = false WHERE template_id = %s", (tmpl_id,))
    for tid in tech_ids:
        cur.execute(
            f"""INSERT INTO {SCHEMA}.arch_template_technologies (template_id, technology_id, is_active)
                VALUES (%s, %s, true)
                ON CONFLICT (template_id, technology_id) DO UPDATE SET is_active = true""",
            (tmpl_id, tid),
        )


def get_decisions(cur, tmpl_id: str) -> list:
    cur.execute(
        f"""
        SELECT d.id, d.name, d.decision_type, d.status FROM {SCHEMA}.decisions d
        JOIN {SCHEMA}.arch_template_decisions atd ON atd.decision_id = d.id
        WHERE atd.template_id = %s AND atd.is_active = true ORDER BY d.name
        """,
        (tmpl_id,),
    )
    return [{"id": r[0], "name": r[1], "decisionType": r[2],
             "typeLabel": TYPE_MAP.get(r[2], r[2]), "status": r[3],
             "statusLabel": STATUS_MAP.get(r[3], r[3])} for r in cur.fetchall()]


def set_decisions(cur, tmpl_id: str, decision_ids: list):
    cur.execute(f"UPDATE {SCHEMA}.arch_template_decisions SET is_active = false WHERE template_id = %s", (tmpl_id,))
    for did in decision_ids:
        cur.execute(
            f"""INSERT INTO {SCHEMA}.arch_template_decisions (template_id, decision_id, is_active)
                VALUES (%s, %s, true)
                ON CONFLICT (template_id, decision_id) DO UPDATE SET is_active = true""",
            (tmpl_id, did),
        )


def get_requirements_by_domain(cur, tech_ids: list, decision_ids: list) -> list:
    """Требования из технологий + из харденингов связанных решений, сгруппированные по домену."""
    all_req_rows = {}

    # Требования из технологий
    if tech_ids:
        placeholders = ",".join(["%s"] * len(tech_ids))
        cur.execute(
            f"""
            SELECT r.id, r.short_desc, r.status,
                   td.id AS td_id, td.name AS td_name,
                   t.id AS tech_id, t.name AS tech_name,
                   'tech' AS source
            FROM {SCHEMA}.requirements r
            JOIN {SCHEMA}.requirement_technologies rt ON rt.requirement_id = r.id
            JOIN {SCHEMA}.technologies t ON t.id = rt.technology_id
            LEFT JOIN {SCHEMA}.requirement_tech_domain rtd ON rtd.requirement_id = r.id
            LEFT JOIN {SCHEMA}.tech_domains td ON td.id = rtd.tech_domain_id
            WHERE rt.technology_id IN ({placeholders})
            ORDER BY td.name NULLS LAST, r.id
            """,
            tech_ids,
        )
        for row in cur.fetchall():
            all_req_rows[row[0]] = row

    # Требования из решений (через технологии решений)
    if decision_ids:
        placeholders = ",".join(["%s"] * len(decision_ids))
        cur.execute(
            f"""
            SELECT DISTINCT r.id, r.short_desc, r.status,
                   td.id AS td_id, td.name AS td_name,
                   t.id AS tech_id, t.name AS tech_name,
                   'decision' AS source
            FROM {SCHEMA}.decisions d
            JOIN {SCHEMA}.decision_technologies dt ON dt.decision_id = d.id
            JOIN {SCHEMA}.requirement_technologies rt ON rt.technology_id = dt.technology_id
            JOIN {SCHEMA}.requirements r ON r.id = rt.requirement_id
            JOIN {SCHEMA}.technologies t ON t.id = dt.technology_id
            LEFT JOIN {SCHEMA}.requirement_tech_domain rtd ON rtd.requirement_id = r.id
            LEFT JOIN {SCHEMA}.tech_domains td ON td.id = rtd.tech_domain_id
            WHERE d.id IN ({placeholders})
            ORDER BY td.name NULLS LAST, r.id
            """,
            decision_ids,
        )
        for row in cur.fetchall():
            if row[0] not in all_req_rows:
                all_req_rows[row[0]] = row

    # Требования из харденингов связанных с решениями
    if decision_ids:
        placeholders = ",".join(["%s"] * len(decision_ids))
        cur.execute(
            f"""
            SELECT r.id, r.short_desc, r.status,
                   td.id AS td_id, td.name AS td_name,
                   t.id AS tech_id, t.name AS tech_name,
                   'hardening' AS source,
                   h.id AS hardening_id
            FROM {SCHEMA}.hardening_solutions hs
            JOIN {SCHEMA}.hardenings h ON h.id = hs.hardening_id
            JOIN {SCHEMA}.hardening_req_content hrc ON hrc.hardening_id = h.id
            JOIN {SCHEMA}.requirements r ON r.id = hrc.requirement_id
            LEFT JOIN {SCHEMA}.requirement_technologies rt ON rt.requirement_id = r.id
            LEFT JOIN {SCHEMA}.technologies t ON t.id = rt.technology_id
            LEFT JOIN {SCHEMA}.requirement_tech_domain rtd ON rtd.requirement_id = r.id
            LEFT JOIN {SCHEMA}.tech_domains td ON td.id = rtd.tech_domain_id
            WHERE hs.solution_id IN ({placeholders})
            ORDER BY td.name NULLS LAST, r.id
            """,
            decision_ids,
        )
        for row in cur.fetchall():
            if row[0] not in all_req_rows:
                all_req_rows[row[0]] = row

    # Подтягиваем hardeningId для всех требований (не только source=hardening)
    req_ids = list(all_req_rows.keys())
    hardening_id_map: dict = {}  # req_id -> hardening_id
    if req_ids:
        placeholders = ",".join(["%s"] * len(req_ids))
        cur.execute(
            f"""
            SELECT DISTINCT ON (requirement_id) requirement_id, hardening_id
            FROM {SCHEMA}.hardening_req_content
            WHERE requirement_id IN ({placeholders})
            ORDER BY requirement_id, hardening_id
            """,
            req_ids,
        )
        for row in cur.fetchall():
            hardening_id_map[row[0]] = row[1]

    # Подгружаем env_status из харденинга для каждого требования
    env_status_map: dict = {}  # req_id -> {"noIod": {...}, "iod": {...}}
    if req_ids:
        placeholders = ",".join(["%s"] * len(req_ids))
        cur.execute(
            f"""
            SELECT requirement_id, env, status, iod
            FROM {SCHEMA}.hardening_req_env_status
            WHERE requirement_id IN ({placeholders})
            """,
            req_ids,
        )
        ENVS_LIST = ["prod", "prodlike", "stage", "test", "dev"]
        for row in cur.fetchall():
            rid, env, status, iod = row[0], row[1], row[2], row[3]
            if rid not in env_status_map:
                env_status_map[rid] = {
                    "noIod": {e: "not_required" for e in ENVS_LIST},
                    "iod":   {e: "not_required" for e in ENVS_LIST},
                }
            key = "iod" if iod else "noIod"
            if env in ENVS_LIST:
                env_status_map[rid][key][env] = status

    # Группировка по домену
    groups: dict = {}
    for row in all_req_rows.values():
        domain_key = row[3] or "__none__"
        domain_name = row[4] or "Без домена"
        if domain_key not in groups:
            groups[domain_key] = {"domainId": row[3], "domainName": domain_name, "requirements": []}
        ENVS_LIST = ["prod", "prodlike", "stage", "test", "dev"]
        default_dual = {
            "noIod": {e: "not_required" for e in ENVS_LIST},
            "iod":   {e: "not_required" for e in ENVS_LIST},
        }
        req = {"id": row[0], "shortDesc": row[1], "status": row[2],
               "techId": row[5] or "", "techName": row[6] or "", "source": row[7],
               "hardeningId": hardening_id_map.get(row[0]) or (row[8] if len(row) > 8 else None),
               "envStatus": env_status_map.get(row[0], default_dual)}
        groups[domain_key]["requirements"].append(req)

    return list(groups.values())


def row_to_dict(row, tags, version, mermaid=None, files=None, versions=None,
                related_templates=None, technologies=None, decisions=None,
                requirements_by_domain=None):
    d = {
        "id": row[0], "name": row[1], "owner": row[2],
        "status": row[3], "statusLabel": STATUS_MAP.get(row[3], row[3]),
        "templateType": row[4], "typeLabel": TYPE_MAP.get(row[4], row[4]),
        "description": row[5], "createdAt": row[6], "updatedAt": row[7],
        "version": version,
        "tags": tags,
    }
    if mermaid is not None:
        d["mermaidDiagrams"] = mermaid
    if files is not None:
        d["files"] = files
    if versions is not None:
        d["versions"] = versions
    if related_templates is not None:
        d["relatedTemplates"] = related_templates
    if technologies is not None:
        d["technologies"] = technologies
    if decisions is not None:
        d["decisions"] = decisions
    if requirements_by_domain is not None:
        d["requirementsByDomain"] = requirements_by_domain
    return d


def handler(event: dict, context) -> dict:
    """CRUD для шаблонов архитектур безопасности."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    method = event.get("httpMethod", "GET")
    params = event.get("queryStringParameters") or {}
    tmpl_id = params.get("id")
    action = params.get("action")

    conn = get_conn()
    try:
        with conn:
            with conn.cursor() as cur:

                # ── Tags autocomplete ─────────────────────────────────────
                if method == "GET" and params.get("tags_suggest") is not None:
                    q = params["tags_suggest"].strip()
                    if q:
                        cur.execute(
                            f"SELECT id, name FROM {SCHEMA}.tags WHERE name ILIKE %s ORDER BY name LIMIT 20",
                            (f"%{q}%",),
                        )
                    else:
                        cur.execute(f"SELECT id, name FROM {SCHEMA}.tags ORDER BY name LIMIT 50")
                    return ok([{"id": r[0], "name": r[1]} for r in cur.fetchall()])

                # ── Templates suggest ─────────────────────────────────────
                if method == "GET" and params.get("templates_suggest") is not None:
                    q = params["templates_suggest"].strip()
                    if q:
                        cur.execute(
                            f"SELECT id, name, template_type, status FROM {SCHEMA}.arch_templates WHERE name ILIKE %s ORDER BY name LIMIT 20",
                            (f"%{q}%",),
                        )
                    else:
                        cur.execute(
                            f"SELECT id, name, template_type, status FROM {SCHEMA}.arch_templates ORDER BY name LIMIT 50"
                        )
                    return ok([
                        {"id": r[0], "name": r[1], "templateType": r[2],
                         "typeLabel": TYPE_MAP.get(r[2], r[2]),
                         "status": r[3], "statusLabel": STATUS_MAP.get(r[3], r[3])}
                        for r in cur.fetchall()
                    ])

                # ── Tech suggest ──────────────────────────────────────────
                if method == "GET" and params.get("tech_suggest") is not None:
                    q = params["tech_suggest"].strip()
                    if q:
                        cur.execute(
                            f"SELECT id, name, status FROM {SCHEMA}.technologies WHERE name ILIKE %s ORDER BY name LIMIT 20",
                            (f"%{q}%",),
                        )
                    else:
                        cur.execute(
                            f"SELECT id, name, status FROM {SCHEMA}.technologies ORDER BY name LIMIT 50"
                        )
                    return ok([
                        {"id": r[0], "name": r[1], "status": r[2],
                         "statusLabel": STATUS_MAP.get(r[2], r[2])}
                        for r in cur.fetchall()
                    ])

                # ── Decisions suggest ─────────────────────────────────────
                if method == "GET" and params.get("decisions_suggest") is not None:
                    q = params["decisions_suggest"].strip()
                    if q:
                        cur.execute(
                            f"SELECT id, name, decision_type, status FROM {SCHEMA}.decisions WHERE name ILIKE %s ORDER BY name LIMIT 20",
                            (f"%{q}%",),
                        )
                    else:
                        cur.execute(
                            f"SELECT id, name, decision_type, status FROM {SCHEMA}.decisions ORDER BY name LIMIT 50"
                        )
                    return ok([
                        {"id": r[0], "name": r[1], "decisionType": r[2],
                         "typeLabel": TYPE_MAP.get(r[2], r[2]),
                         "status": r[3], "statusLabel": STATUS_MAP.get(r[3], r[3])}
                        for r in cur.fetchall()
                    ])

                # ── GET list ──────────────────────────────────────────────
                if method == "GET" and not tmpl_id:
                    # Один запрос: шаблоны + последняя версия через подзапрос
                    cur.execute(f"""
                        SELECT t.id, t.name, t.owner, t.status, t.template_type,
                               t.description, t.created_at, t.updated_at,
                               (SELECT v.version FROM {SCHEMA}.arch_template_versions v
                                WHERE v.template_id = t.id ORDER BY v.changed_at DESC LIMIT 1) AS version
                        FROM {SCHEMA}.arch_templates t
                        ORDER BY t.created_at DESC
                    """)
                    rows = cur.fetchall()
                    if not rows:
                        return ok([])
                    ids = [r[0] for r in rows]
                    # Теги одним запросом
                    ph = ",".join(["%s"] * len(ids))
                    cur.execute(
                        f"""SELECT att.template_id, tg.id, tg.name
                            FROM {SCHEMA}.arch_template_tags att
                            JOIN {SCHEMA}.tags tg ON tg.id = att.tag_id
                            WHERE att.template_id IN ({ph}) AND att.is_active = true
                            ORDER BY tg.name""",
                        ids,
                    )
                    tags_map: dict = {i: [] for i in ids}
                    for tr in cur.fetchall():
                        tags_map[tr[0]].append({"id": tr[1], "name": tr[2]})
                    result = []
                    for row in rows:
                        base = {
                            "id": row[0], "name": row[1], "owner": row[2],
                            "status": row[3], "statusLabel": STATUS_MAP.get(row[3], row[3]),
                            "templateType": row[4], "typeLabel": TYPE_MAP.get(row[4], row[4]),
                            "description": row[5], "createdAt": row[6], "updatedAt": row[7],
                            "version": row[8] or "1.0",
                            "tags": tags_map.get(row[0], []),
                        }
                        result.append(base)
                    return ok(result)

                # ── GET one ───────────────────────────────────────────────
                if method == "GET" and tmpl_id:
                    cur.execute(
                        f"SELECT id, name, owner, status, template_type, description, created_at, updated_at FROM {SCHEMA}.arch_templates WHERE id = %s",
                        (tmpl_id,),
                    )
                    row = cur.fetchone()
                    if not row:
                        return err("Шаблон не найден", 404)
                    tags = get_tags(cur, tmpl_id)
                    version = get_version(cur, tmpl_id)
                    mermaid = get_mermaid(cur, tmpl_id)
                    files = get_files(cur, tmpl_id)
                    cur.execute(
                        f"SELECT id, version, change_note, changed_at FROM {SCHEMA}.arch_template_versions WHERE template_id = %s ORDER BY changed_at DESC",
                        (tmpl_id,),
                    )
                    versions = [{"id": r[0], "version": r[1], "changeNote": r[2], "changedAt": r[3]}
                                for r in cur.fetchall()]
                    related = get_related_templates(cur, tmpl_id)
                    technologies = get_technologies(cur, tmpl_id)
                    decisions = get_decisions(cur, tmpl_id)
                    # Требования — только если есть технологии или решения
                    tech_ids = [t["id"] for t in technologies]
                    dec_ids = [d["id"] for d in decisions]
                    req_by_domain = get_requirements_by_domain(cur, tech_ids, dec_ids) if (tech_ids or dec_ids) else []
                    return ok(row_to_dict(row, tags, version, mermaid, files, versions,
                                         related, technologies, decisions, req_by_domain))

                # ── GET export (полные данные для экспорта) ───────────────
                if method == "GET" and action == "export" and tmpl_id:
                    cur.execute(
                        f"SELECT id, name, owner, status, template_type, description, created_at, updated_at FROM {SCHEMA}.arch_templates WHERE id = %s",
                        (tmpl_id,),
                    )
                    row = cur.fetchone()
                    if not row:
                        return err("Шаблон не найден", 404)
                    version = get_version(cur, tmpl_id)
                    tags = get_tags(cur, tmpl_id)
                    technologies = get_technologies(cur, tmpl_id)
                    decisions = get_decisions(cur, tmpl_id)
                    mermaid = get_mermaid(cur, tmpl_id)
                    files = get_files(cur, tmpl_id)
                    related = get_related_templates(cur, tmpl_id)
                    # Внешние ссылки
                    cur.execute(
                        f"SELECT id, url, label FROM {SCHEMA}.arch_template_links WHERE template_id = %s AND is_active = true ORDER BY created_at",
                        (tmpl_id,),
                    )
                    ext_links = [{"id": r[0], "url": r[1], "label": r[2]} for r in cur.fetchall()]
                    # История версий
                    cur.execute(
                        f"SELECT version, change_note, changed_at FROM {SCHEMA}.arch_template_versions WHERE template_id = %s ORDER BY changed_at DESC",
                        (tmpl_id,),
                    )
                    versions = [{"version": r[0], "changeNote": r[1], "changedAt": str(r[2])} for r in cur.fetchall()]
                    # Требования с полными данными
                    tech_ids = [t["id"] for t in technologies]
                    dec_ids = [d["id"] for d in decisions]
                    req_by_domain = get_requirements_by_domain(cur, tech_ids, dec_ids) if (tech_ids or dec_ids) else []
                    # Для каждого требования подтягиваем полные поля
                    all_req_ids = [r["id"] for g in req_by_domain for r in g["requirements"]]
                    req_details: dict = {}
                    if all_req_ids:
                        ph2 = ",".join(["%s"] * len(all_req_ids))
                        cur.execute(
                            f"""SELECT id, short_desc, description, req_type, owner, status,
                                       normative_doc, control_metrics, fulfillment_method,
                                       is_procurement, score_point, score_weight
                                FROM {SCHEMA}.requirements WHERE id IN ({ph2})""",
                            all_req_ids,
                        )
                        REQ_TYPE_MAP = {"technical": "Технические", "functional": "Функциональные",
                                        "non_functional": "Нефункциональные", "organizational": "Организационные"}
                        for rr in cur.fetchall():
                            req_details[rr[0]] = {
                                "id": rr[0], "shortDesc": rr[1], "description": rr[2],
                                "reqType": rr[3], "reqTypeLabel": REQ_TYPE_MAP.get(rr[3], rr[3]),
                                "owner": rr[4], "status": rr[5],
                                "normativeDoc": rr[6], "controlMetrics": rr[7],
                                "fulfillmentMethod": rr[8], "isProcurement": rr[9],
                                "scorePoint": rr[10], "scoreWeight": rr[11],
                            }
                    # Собираем группы с полными данными требований
                    full_req_groups = []
                    for g in req_by_domain:
                        full_reqs = []
                        for req in g["requirements"]:
                            detail = req_details.get(req["id"], {})
                            full_reqs.append({**req, **detail})
                        full_req_groups.append({"domainId": g["domainId"], "domainName": g["domainName"], "requirements": full_reqs})

                    return ok({
                        "id": row[0], "name": row[1], "owner": row[2],
                        "status": row[3], "statusLabel": STATUS_MAP.get(row[3], row[3]),
                        "templateType": row[4], "typeLabel": TYPE_MAP.get(row[4], row[4]),
                        "description": row[5], "createdAt": str(row[6]), "updatedAt": str(row[7]),
                        "version": version,
                        "tags": tags,
                        "technologies": technologies,
                        "decisions": decisions,
                        "mermaidDiagrams": mermaid,
                        "files": files,
                        "externalLinks": ext_links,
                        "relatedTemplates": related,
                        "versions": versions,
                        "requirementsByDomain": full_req_groups,
                    })

                # ── POST create ───────────────────────────────────────────
                if method == "POST" and not action:
                    body = parse_body(event)
                    name = body.get("name", "").strip()
                    if not name:
                        return err("name обязателен")
                    owner = body.get("owner", "")
                    status = body.get("status", "in_development")
                    template_type = body.get("templateType", "technical")
                    description = body.get("description", "")
                    tags = body.get("tags", [])
                    related_ids = body.get("relatedTemplateIds", [])
                    tech_ids = body.get("technologyIds", [])
                    dec_ids = body.get("decisionIds", [])

                    cur.execute(
                        f"""INSERT INTO {SCHEMA}.arch_templates (name, owner, status, template_type, description)
                            VALUES (%s, %s, %s, %s, %s) RETURNING id""",
                        (name, owner, status, template_type, description),
                    )
                    new_id = cur.fetchone()[0]
                    cur.execute(
                        f"INSERT INTO {SCHEMA}.arch_template_versions (template_id, version, change_note) VALUES (%s, %s, %s)",
                        (new_id, "1.0", "Создан"),
                    )
                    set_tags(cur, new_id, tags)
                    set_related_templates(cur, new_id, related_ids)
                    set_technologies(cur, new_id, tech_ids)
                    set_decisions(cur, new_id, dec_ids)

                    cur.execute(
                        f"SELECT id, name, owner, status, template_type, description, created_at, updated_at FROM {SCHEMA}.arch_templates WHERE id = %s",
                        (new_id,),
                    )
                    row = cur.fetchone()
                    return ok(row_to_dict(row, get_tags(cur, new_id), "1.0"), 201)

                # ── PUT update ────────────────────────────────────────────
                if method == "PUT" and not action:
                    body = parse_body(event)
                    tmpl_id = body.get("id") or tmpl_id
                    if not tmpl_id:
                        return err("id обязателен")
                    cur.execute(f"SELECT id FROM {SCHEMA}.arch_templates WHERE id = %s", (tmpl_id,))
                    if not cur.fetchone():
                        return err("Шаблон не найден", 404)

                    name = body.get("name", "").strip()
                    if not name:
                        return err("name обязателен")
                    owner = body.get("owner", "")
                    status = body.get("status", "in_development")
                    template_type = body.get("templateType", "technical")
                    description = body.get("description", "")
                    tags = body.get("tags", [])
                    related_ids = body.get("relatedTemplateIds", [])
                    tech_ids = body.get("technologyIds", [])
                    dec_ids = body.get("decisionIds", [])
                    change_note = body.get("changeNote", "")

                    cur.execute(
                        f"""UPDATE {SCHEMA}.arch_templates
                            SET name=%s, owner=%s, status=%s, template_type=%s,
                                description=%s, updated_at=now()
                            WHERE id=%s""",
                        (name, owner, status, template_type, description, tmpl_id),
                    )
                    new_ver = next_version(cur, tmpl_id)
                    cur.execute(
                        f"INSERT INTO {SCHEMA}.arch_template_versions (template_id, version, change_note) VALUES (%s, %s, %s)",
                        (tmpl_id, new_ver, change_note or "Обновлён"),
                    )
                    set_tags(cur, tmpl_id, tags)
                    set_related_templates(cur, tmpl_id, related_ids)
                    set_technologies(cur, tmpl_id, tech_ids)
                    set_decisions(cur, tmpl_id, dec_ids)

                    cur.execute(
                        f"SELECT id, name, owner, status, template_type, description, created_at, updated_at FROM {SCHEMA}.arch_templates WHERE id = %s",
                        (tmpl_id,),
                    )
                    row = cur.fetchone()
                    return ok(row_to_dict(row, get_tags(cur, tmpl_id), new_ver))

                # ── POST add_mermaid ──────────────────────────────────────
                if method == "POST" and action == "add_mermaid":
                    body = parse_body(event)
                    tid = body.get("template_id", "")
                    title = body.get("title", "")
                    code = body.get("code", "")
                    cur.execute(
                        f"INSERT INTO {SCHEMA}.arch_template_mermaid (template_id, title, code) VALUES (%s, %s, %s) RETURNING id, title, code, created_at, updated_at",
                        (tid, title, code),
                    )
                    r = cur.fetchone()
                    return ok({"id": r[0], "title": r[1], "code": r[2], "createdAt": r[3], "updatedAt": r[4]}, 201)

                # ── PUT update_mermaid ────────────────────────────────────
                if method == "PUT" and action == "update_mermaid":
                    body = parse_body(event)
                    mid = body.get("id")
                    title = body.get("title", "")
                    code = body.get("code", "")
                    cur.execute(
                        f"UPDATE {SCHEMA}.arch_template_mermaid SET title=%s, code=%s, updated_at=now() WHERE id=%s RETURNING id, title, code, created_at, updated_at",
                        (title, code, mid),
                    )
                    r = cur.fetchone()
                    if not r:
                        return err("Диаграмма не найдена", 404)
                    return ok({"id": r[0], "title": r[1], "code": r[2], "createdAt": r[3], "updatedAt": r[4]})

                # ── POST upload_file ──────────────────────────────────────
                if method == "POST" and action == "upload_file":
                    body = parse_body(event)
                    tid = body.get("template_id", "")
                    filename = body.get("filename", "unnamed")
                    content_type = body.get("content_type", "application/octet-stream")
                    data_b64 = body.get("data_base64", "")
                    data = base64.b64decode(data_b64)
                    size = len(data)
                    import uuid
                    key = f"arch-templates/{tid}/{uuid.uuid4()}-{filename}"
                    s3 = s3_client()
                    s3.put_object(Bucket="files", Key=key, Body=data, ContentType=content_type)
                    cur.execute(
                        f"INSERT INTO {SCHEMA}.arch_template_files (template_id, filename, s3_key, content_type, size_bytes) VALUES (%s, %s, %s, %s, %s) RETURNING id, filename, s3_key, content_type, size_bytes, created_at",
                        (tid, filename, key, content_type, size),
                    )
                    r = cur.fetchone()
                    return ok({
                        "id": r[0], "filename": r[1], "s3Key": r[2],
                        "contentType": r[3], "sizeBytes": r[4], "uploadedAt": r[5],
                        "url": f"{CDN_BASE}/arch-templates/{r[2].split('/')[-1]}",
                    }, 201)

                return err("Метод не поддерживается", 405)

    finally:
        conn.close()