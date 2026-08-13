"""
CRUD API для раздела «Архитектурный анализ продуктов».

GET  /                              — список всех продуктов (с кратким % соответствия требованиям)
GET  /?id=...                       — карточка продукта: теги, технологии, решения,
                                       требования (сгруппированные по домену, с оценкой соответствия),
                                       соответствие шаблонам архитектур
GET  /?tags_suggest=...             — автодополнение тегов
GET  /?tech_suggest=...             — поиск технологий для связи
GET  /?decisions_suggest=...        — поиск решений для связи
POST /                              — создать продукт
PUT  /                              — обновить продукт

PUT  /?action=set_requirement_assessment
     body: {product_id, requirement_id, status, comment}
     status: not_assessed | compliant | partial | non_compliant

GET  /?action=versions&product_id=...        — список версий проведённого анализа продукта
GET  /?action=version&version_id=...         — снимок конкретной версии анализа
GET  /?action=compare_versions&from_id=...&to_id=...  — сравнение двух версий анализа
POST /?action=save_analysis_version
     body: {product_id, change_note}         — зафиксировать текущее состояние анализа как новую версию
"""

import json
import os

import psycopg2
from psycopg2.extras import Json

SCHEMA = "t_p84706301_security_architectur"

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

ASSESSMENT_MAP = {
    "not_assessed":  "Не оценено",
    "compliant":     "Соответствует",
    "partial":       "Частично соответствует",
    "non_compliant": "Не соответствует",
}
ASSESSMENT_VALUES = set(ASSESSMENT_MAP.keys())

ENVS_LIST = ["prod", "prodlike", "stage", "test", "dev"]


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


def get_tags(cur, product_id: str) -> list:
    cur.execute(
        f"""
        SELECT t.id, t.name FROM {SCHEMA}.tags t
        JOIN {SCHEMA}.product_tags pt ON pt.tag_id = t.id
        WHERE pt.product_id = %s ORDER BY t.name
        """,
        (product_id,),
    )
    return [{"id": r[0], "name": r[1]} for r in cur.fetchall()]


def set_tags(cur, product_id: str, tag_names: list):
    tag_names = [n.strip() for n in tag_names if n.strip()]
    existing_ids = []
    for name in tag_names:
        cur.execute(f"INSERT INTO {SCHEMA}.tags (name) VALUES (%s) ON CONFLICT (name) DO NOTHING", (name,))
        cur.execute(f"SELECT id FROM {SCHEMA}.tags WHERE name = %s", (name,))
        row = cur.fetchone()
        if row:
            existing_ids.append(row[0])
    cur.execute(f"DELETE FROM {SCHEMA}.product_tags WHERE product_id = %s", (product_id,))
    for tid in existing_ids:
        cur.execute(
            f"INSERT INTO {SCHEMA}.product_tags (product_id, tag_id) VALUES (%s, %s) ON CONFLICT DO NOTHING",
            (product_id, tid),
        )


def get_technologies(cur, product_id: str) -> list:
    cur.execute(
        f"""
        SELECT t.id, t.name, t.status FROM {SCHEMA}.technologies t
        JOIN {SCHEMA}.product_technologies pt ON pt.technology_id = t.id
        WHERE pt.product_id = %s ORDER BY t.name
        """,
        (product_id,),
    )
    return [{"id": r[0], "name": r[1], "status": r[2],
             "statusLabel": STATUS_MAP.get(r[2], r[2])} for r in cur.fetchall()]


def set_technologies(cur, product_id: str, tech_ids: list):
    cur.execute(f"DELETE FROM {SCHEMA}.product_technologies WHERE product_id = %s", (product_id,))
    for tid in tech_ids:
        cur.execute(
            f"INSERT INTO {SCHEMA}.product_technologies (product_id, technology_id) VALUES (%s, %s) ON CONFLICT DO NOTHING",
            (product_id, tid),
        )


def get_decisions(cur, product_id: str) -> list:
    cur.execute(
        f"""
        SELECT d.id, d.name, d.decision_type, d.status FROM {SCHEMA}.decisions d
        JOIN {SCHEMA}.product_decisions pd ON pd.decision_id = d.id
        WHERE pd.product_id = %s ORDER BY d.name
        """,
        (product_id,),
    )
    return [{"id": r[0], "name": r[1], "decisionType": r[2],
             "typeLabel": TYPE_MAP.get(r[2], r[2]), "status": r[3],
             "statusLabel": STATUS_MAP.get(r[3], r[3])} for r in cur.fetchall()]


def set_decisions(cur, product_id: str, decision_ids: list):
    cur.execute(f"DELETE FROM {SCHEMA}.product_decisions WHERE product_id = %s", (product_id,))
    for did in decision_ids:
        cur.execute(
            f"INSERT INTO {SCHEMA}.product_decisions (product_id, decision_id) VALUES (%s, %s) ON CONFLICT DO NOTHING",
            (product_id, did),
        )


def get_requirements_by_domain(cur, product_id: str, tech_ids: list, decision_ids: list) -> list:
    """Требования из технологий и решений продукта, сгруппированные по домену, с оценкой соответствия."""
    all_req_rows = {}

    if tech_ids:
        placeholders = ",".join(["%s"] * len(tech_ids))
        cur.execute(
            f"""
            SELECT r.id, r.short_desc, r.req_type,
                   td.id AS td_id, td.name AS td_name,
                   t.id AS tech_id, t.name AS tech_name
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

    if decision_ids:
        placeholders = ",".join(["%s"] * len(decision_ids))
        cur.execute(
            f"""
            SELECT DISTINCT r.id, r.short_desc, r.req_type,
                   td.id AS td_id, td.name AS td_name,
                   t.id AS tech_id, t.name AS tech_name
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

        # Требования, привязанные напрямую к решению
        cur.execute(
            f"""
            SELECT DISTINCT r.id, r.short_desc, r.req_type,
                   td.id AS td_id, td.name AS td_name,
                   NULL::text AS tech_id, NULL::text AS tech_name
            FROM {SCHEMA}.decisions d
            JOIN {SCHEMA}.decision_requirements dr ON dr.decision_id = d.id
            JOIN {SCHEMA}.requirements r ON r.id = dr.requirement_id
            LEFT JOIN {SCHEMA}.requirement_tech_domain rtd ON rtd.requirement_id = r.id
            LEFT JOIN {SCHEMA}.tech_domains td ON td.id = rtd.tech_domain_id
            WHERE d.id IN ({placeholders})
            """,
            decision_ids,
        )
        for row in cur.fetchall():
            if row[0] not in all_req_rows:
                all_req_rows[row[0]] = row

    req_ids = list(all_req_rows.keys())
    assessment_map: dict = {}
    if req_ids:
        placeholders = ",".join(["%s"] * len(req_ids))
        cur.execute(
            f"""
            SELECT requirement_id, status, comment, updated_at
            FROM {SCHEMA}.product_requirement_assessment
            WHERE product_id = %s AND requirement_id IN ({placeholders})
            """,
            [product_id] + req_ids,
        )
        for row in cur.fetchall():
            assessment_map[row[0]] = {"status": row[1], "comment": row[2], "updatedAt": row[3]}

    groups: dict = {}
    for row in all_req_rows.values():
        domain_key = row[3] or "__none__"
        domain_name = row[4] or "Без домена"
        if domain_key not in groups:
            groups[domain_key] = {"domainId": row[3], "domainName": domain_name, "requirements": []}
        assessment = assessment_map.get(row[0], {"status": "not_assessed", "comment": "", "updatedAt": None})
        req = {
            "id": row[0], "shortDesc": row[1],
            "reqType": row[2], "reqTypeLabel": row[2],
            "techId": row[5] or "", "techName": row[6] or "",
            "assessmentStatus": assessment["status"],
            "assessmentStatusLabel": ASSESSMENT_MAP.get(assessment["status"], assessment["status"]),
            "assessmentComment": assessment["comment"],
            "assessmentUpdatedAt": assessment["updatedAt"],
        }
        groups[domain_key]["requirements"].append(req)

    return list(groups.values())


def compute_compliance_summary(groups: list) -> dict:
    total = 0
    compliant = 0
    partial = 0
    non_compliant = 0
    not_assessed = 0
    for g in groups:
        for r in g["requirements"]:
            total += 1
            st = r["assessmentStatus"]
            if st == "compliant":
                compliant += 1
            elif st == "partial":
                partial += 1
            elif st == "non_compliant":
                non_compliant += 1
            else:
                not_assessed += 1
    score = round(((compliant + partial * 0.5) / total) * 100) if total else 0
    return {
        "total": total, "compliant": compliant, "partial": partial,
        "nonCompliant": non_compliant, "notAssessed": not_assessed,
        "scorePercent": score,
    }


def compute_template_matches(cur, tech_ids: list, decision_ids: list) -> list:
    """Сравнивает набор технологий/решений продукта с шаблонами архитектур и считает % пересечения."""
    cur.execute(
        f"""
        SELECT id, name, template_type, status FROM {SCHEMA}.arch_templates ORDER BY name
        """
    )
    templates = cur.fetchall()
    if not templates:
        return []

    tech_set = set(tech_ids)
    dec_set = set(decision_ids)

    result = []
    for t in templates:
        tmpl_id = t[0]
        cur.execute(
            f"""
            SELECT technology_id FROM {SCHEMA}.arch_template_technologies
            WHERE template_id = %s AND is_active = true
            """,
            (tmpl_id,),
        )
        tmpl_tech = {r[0] for r in cur.fetchall()}
        cur.execute(
            f"""
            SELECT decision_id FROM {SCHEMA}.arch_template_decisions
            WHERE template_id = %s AND is_active = true
            """,
            (tmpl_id,),
        )
        tmpl_dec = {r[0] for r in cur.fetchall()}

        total_items = len(tmpl_tech) + len(tmpl_dec)
        if total_items == 0:
            continue

        matched_tech = tmpl_tech & tech_set
        matched_dec = tmpl_dec & dec_set
        matched = len(matched_tech) + len(matched_dec)
        score = round((matched / total_items) * 100)

        result.append({
            "id": tmpl_id, "name": t[1],
            "templateType": t[2], "typeLabel": TYPE_MAP.get(t[2], t[2]),
            "status": t[3], "statusLabel": STATUS_MAP.get(t[3], t[3]),
            "matchPercent": score,
            "matchedTechnologies": len(matched_tech),
            "totalTechnologies": len(tmpl_tech),
            "matchedDecisions": len(matched_dec),
            "totalDecisions": len(tmpl_dec),
        })

    result.sort(key=lambda x: x["matchPercent"], reverse=True)
    return result


def next_analysis_version(cur, product_id: str) -> str:
    cur.execute(
        f"""
        SELECT version FROM {SCHEMA}.product_analysis_versions
        WHERE product_id = %s ORDER BY analyzed_at DESC LIMIT 1
        """,
        (product_id,),
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


def get_analysis_versions(cur, product_id: str) -> list:
    cur.execute(
        f"""
        SELECT id, version, change_note, analyzed_at, compliance
        FROM {SCHEMA}.product_analysis_versions
        WHERE product_id = %s ORDER BY analyzed_at DESC
        """,
        (product_id,),
    )
    return [
        {"id": r[0], "version": r[1], "changeNote": r[2],
         "analyzedAt": r[3], "compliance": r[4]}
        for r in cur.fetchall()
    ]


def get_analysis_version_detail(cur, version_id: int) -> dict | None:
    cur.execute(
        f"""
        SELECT id, product_id, version, change_note, analyzed_at, compliance,
               requirements_snapshot, template_matches_snapshot,
               technologies_snapshot, decisions_snapshot
        FROM {SCHEMA}.product_analysis_versions WHERE id = %s
        """,
        (version_id,),
    )
    r = cur.fetchone()
    if not r:
        return None
    return {
        "id": r[0], "productId": r[1], "version": r[2], "changeNote": r[3],
        "analyzedAt": r[4], "compliance": r[5],
        "requirementsByDomain": r[6], "templateMatches": r[7],
        "technologies": r[8], "decisions": r[9],
    }


def diff_requirements(from_groups: list, to_groups: list) -> list:
    """Сравнивает срезы требований двух версий и возвращает список изменений по каждому требованию."""
    from_map = {}
    for g in from_groups or []:
        for r in g.get("requirements", []):
            from_map[r["id"]] = r
    to_map = {}
    for g in to_groups or []:
        for r in g.get("requirements", []):
            to_map[r["id"]] = r

    all_ids = set(from_map.keys()) | set(to_map.keys())
    changes = []
    for rid in all_ids:
        f = from_map.get(rid)
        t = to_map.get(rid)
        if f and t:
            if f.get("assessmentStatus") != t.get("assessmentStatus"):
                changes.append({
                    "requirementId": rid, "shortDesc": t.get("shortDesc", f.get("shortDesc")),
                    "change": "status_changed",
                    "fromStatus": f.get("assessmentStatus"), "fromStatusLabel": f.get("assessmentStatusLabel"),
                    "toStatus": t.get("assessmentStatus"), "toStatusLabel": t.get("assessmentStatusLabel"),
                })
        elif t and not f:
            changes.append({
                "requirementId": rid, "shortDesc": t.get("shortDesc"),
                "change": "added",
                "toStatus": t.get("assessmentStatus"), "toStatusLabel": t.get("assessmentStatusLabel"),
            })
        elif f and not t:
            changes.append({
                "requirementId": rid, "shortDesc": f.get("shortDesc"),
                "change": "removed",
                "fromStatus": f.get("assessmentStatus"), "fromStatusLabel": f.get("assessmentStatusLabel"),
            })
    return changes


def row_to_dict(row, tags, technologies=None, decisions=None,
                requirements_by_domain=None, compliance=None, template_matches=None):
    d = {
        "id": row[0], "name": row[1], "owner": row[2],
        "status": row[3], "statusLabel": STATUS_MAP.get(row[3], row[3]),
        "description": row[4], "version": row[5],
        "createdAt": row[6], "updatedAt": row[7],
        "tags": tags,
    }
    if technologies is not None:
        d["technologies"] = technologies
    if decisions is not None:
        d["decisions"] = decisions
    if requirements_by_domain is not None:
        d["requirementsByDomain"] = requirements_by_domain
    if compliance is not None:
        d["compliance"] = compliance
    if template_matches is not None:
        d["templateMatches"] = template_matches
    return d


def handler(event: dict, context) -> dict:
    """CRUD и оценка соответствия для раздела «Архитектурный анализ продуктов»."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    method = event.get("httpMethod", "GET")
    params = event.get("queryStringParameters") or {}
    product_id = params.get("id")
    action = params.get("action")
    tags_suggest = params.get("tags_suggest")
    tech_suggest = params.get("tech_suggest")
    decisions_suggest = params.get("decisions_suggest")

    conn = get_conn()
    try:
        with conn:
            with conn.cursor() as cur:

                # ── Tags autocomplete ─────────────────────────────────────
                if method == "GET" and tags_suggest is not None:
                    q = tags_suggest.strip()
                    if q:
                        cur.execute(
                            f"SELECT id, name FROM {SCHEMA}.tags WHERE name ILIKE %s ORDER BY name LIMIT 20",
                            (f"%{q}%",),
                        )
                    else:
                        cur.execute(f"SELECT id, name FROM {SCHEMA}.tags ORDER BY name LIMIT 50")
                    return ok([{"id": r[0], "name": r[1]} for r in cur.fetchall()])

                # ── Technologies search ───────────────────────────────────
                if method == "GET" and tech_suggest is not None:
                    q = tech_suggest.strip()
                    if q:
                        cur.execute(
                            f"SELECT id, name, status FROM {SCHEMA}.technologies WHERE name ILIKE %s ORDER BY name LIMIT 20",
                            (f"%{q}%",),
                        )
                    else:
                        cur.execute(f"SELECT id, name, status FROM {SCHEMA}.technologies ORDER BY name LIMIT 50")
                    return ok([{"id": r[0], "name": r[1], "status": r[2],
                                "statusLabel": STATUS_MAP.get(r[2], r[2])} for r in cur.fetchall()])

                # ── Decisions search ──────────────────────────────────────
                if method == "GET" and decisions_suggest is not None:
                    q = decisions_suggest.strip()
                    if q:
                        cur.execute(
                            f"SELECT id, name, decision_type, status FROM {SCHEMA}.decisions WHERE name ILIKE %s ORDER BY name LIMIT 20",
                            (f"%{q}%",),
                        )
                    else:
                        cur.execute(f"SELECT id, name, decision_type, status FROM {SCHEMA}.decisions ORDER BY name LIMIT 50")
                    return ok([{"id": r[0], "name": r[1], "decisionType": r[2],
                                "typeLabel": TYPE_MAP.get(r[2], r[2]),
                                "status": r[3], "statusLabel": STATUS_MAP.get(r[3], r[3])}
                               for r in cur.fetchall()])

                # ── PUT set_requirement_assessment ─────────────────────────
                if method == "PUT" and action == "set_requirement_assessment":
                    body = parse_body(event)
                    pid = body.get("product_id")
                    rid = body.get("requirement_id")
                    st = body.get("status", "not_assessed")
                    comment = body.get("comment", "")
                    if not pid or not rid:
                        return err("product_id и requirement_id обязательны")
                    if st not in ASSESSMENT_VALUES:
                        return err("Некорректный статус оценки")

                    cur.execute(
                        f"""
                        INSERT INTO {SCHEMA}.product_requirement_assessment
                            (product_id, requirement_id, status, comment, updated_at)
                        VALUES (%s, %s, %s, %s, now())
                        ON CONFLICT (product_id, requirement_id)
                        DO UPDATE SET status = EXCLUDED.status, comment = EXCLUDED.comment, updated_at = now()
                        """,
                        (pid, rid, st, comment),
                    )
                    return ok({"productId": pid, "requirementId": rid, "status": st,
                               "statusLabel": ASSESSMENT_MAP.get(st, st), "comment": comment})

                # ── POST save_analysis_version ─────────────────────────────
                if method == "POST" and action == "save_analysis_version":
                    body = parse_body(event)
                    pid = body.get("product_id")
                    if not pid:
                        return err("product_id обязателен")
                    cur.execute(f"SELECT id FROM {SCHEMA}.products WHERE id = %s", (pid,))
                    if not cur.fetchone():
                        return err("Продукт не найден", 404)

                    technologies = get_technologies(cur, pid)
                    decisions = get_decisions(cur, pid)
                    tech_ids = [t["id"] for t in technologies]
                    decision_ids = [d["id"] for d in decisions]
                    groups = get_requirements_by_domain(cur, pid, tech_ids, decision_ids)
                    compliance = compute_compliance_summary(groups)
                    template_matches = compute_template_matches(cur, tech_ids, decision_ids)

                    new_version = next_analysis_version(cur, pid)
                    change_note = body.get("change_note", "")

                    cur.execute(
                        f"""
                        INSERT INTO {SCHEMA}.product_analysis_versions
                            (product_id, version, change_note, compliance, requirements_snapshot,
                             template_matches_snapshot, technologies_snapshot, decisions_snapshot)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                        RETURNING id, version, change_note, analyzed_at, compliance
                        """,
                        (pid, new_version, change_note, Json(compliance),
                         Json(groups, dumps=lambda o: json.dumps(o, default=str)),
                         Json(template_matches), Json(technologies), Json(decisions)),
                    )
                    r = cur.fetchone()
                    return ok({"id": r[0], "version": r[1], "changeNote": r[2],
                               "analyzedAt": r[3], "compliance": r[4]}, 201)

                # ── GET versions ─────────────────────────────────────────
                if method == "GET" and action == "versions":
                    pid = params.get("product_id")
                    if not pid:
                        return err("product_id обязателен")
                    return ok(get_analysis_versions(cur, pid))

                # ── GET version detail ───────────────────────────────────
                if method == "GET" and action == "version":
                    vid = params.get("version_id")
                    if not vid:
                        return err("version_id обязателен")
                    detail = get_analysis_version_detail(cur, int(vid))
                    if not detail:
                        return err("Версия не найдена", 404)
                    return ok(detail)

                # ── GET compare_versions ─────────────────────────────────
                if method == "GET" and action == "compare_versions":
                    from_id = params.get("from_id")
                    to_id = params.get("to_id")
                    if not from_id or not to_id:
                        return err("from_id и to_id обязательны")
                    from_v = get_analysis_version_detail(cur, int(from_id))
                    to_v = get_analysis_version_detail(cur, int(to_id))
                    if not from_v or not to_v:
                        return err("Версия не найдена", 404)

                    changes = diff_requirements(
                        from_v["requirementsByDomain"], to_v["requirementsByDomain"]
                    )
                    return ok({
                        "from": {"id": from_v["id"], "version": from_v["version"],
                                 "analyzedAt": from_v["analyzedAt"], "compliance": from_v["compliance"]},
                        "to": {"id": to_v["id"], "version": to_v["version"],
                               "analyzedAt": to_v["analyzedAt"], "compliance": to_v["compliance"]},
                        "requirementChanges": changes,
                    })

                # ── GET list ──────────────────────────────────────────────
                if method == "GET" and not product_id:
                    cur.execute(
                        f"""
                        SELECT id, name, owner, status, description, version, created_at, updated_at
                        FROM {SCHEMA}.products ORDER BY created_at DESC
                        """
                    )
                    rows = cur.fetchall()
                    product_ids = [r[0] for r in rows]
                    tags_map = {}
                    if product_ids:
                        cur.execute(
                            f"""
                            SELECT pt.product_id, t.id, t.name
                            FROM {SCHEMA}.product_tags pt
                            JOIN {SCHEMA}.tags t ON t.id = pt.tag_id
                            WHERE pt.product_id = ANY(%s)
                            ORDER BY t.name
                            """,
                            (product_ids,),
                        )
                        for tr in cur.fetchall():
                            tags_map.setdefault(tr[0], []).append({"id": tr[1], "name": tr[2]})

                    result = []
                    for r in rows:
                        pid = r[0]
                        cur.execute(
                            f"SELECT technology_id FROM {SCHEMA}.product_technologies WHERE product_id = %s",
                            (pid,),
                        )
                        tech_ids = [x[0] for x in cur.fetchall()]
                        cur.execute(
                            f"SELECT decision_id FROM {SCHEMA}.product_decisions WHERE product_id = %s",
                            (pid,),
                        )
                        decision_ids = [x[0] for x in cur.fetchall()]
                        groups = get_requirements_by_domain(cur, pid, tech_ids, decision_ids)
                        compliance = compute_compliance_summary(groups)
                        item = row_to_dict(r, tags_map.get(pid, []))
                        item["compliance"] = compliance
                        item["technologiesCount"] = len(tech_ids)
                        item["decisionsCount"] = len(decision_ids)
                        result.append(item)
                    return ok(result)

                # ── GET single ────────────────────────────────────────────
                if method == "GET" and product_id:
                    cur.execute(
                        f"""
                        SELECT id, name, owner, status, description, version, created_at, updated_at
                        FROM {SCHEMA}.products WHERE id = %s
                        """,
                        (product_id,),
                    )
                    row = cur.fetchone()
                    if not row:
                        return err("Продукт не найден", 404)

                    tags = get_tags(cur, product_id)
                    technologies = get_technologies(cur, product_id)
                    decisions = get_decisions(cur, product_id)
                    tech_ids = [t["id"] for t in technologies]
                    decision_ids = [d["id"] for d in decisions]
                    groups = get_requirements_by_domain(cur, product_id, tech_ids, decision_ids)
                    compliance = compute_compliance_summary(groups)
                    template_matches = compute_template_matches(cur, tech_ids, decision_ids)

                    return ok(row_to_dict(row, tags, technologies, decisions,
                                         groups, compliance, template_matches))

                # ── POST create ───────────────────────────────────────────
                if method == "POST" and not action:
                    body = parse_body(event)
                    name = (body.get("name") or "").strip()
                    if not name:
                        return err("Название обязательно")

                    status_val = body.get("status", "in_development")
                    if status_val not in STATUS_MAP:
                        status_val = STATUS_REVERSE.get(status_val, "in_development")

                    cur.execute(
                        f"""
                        INSERT INTO {SCHEMA}.products (name, owner, status, description, version)
                        VALUES (%s, %s, %s, %s, '1.0')
                        RETURNING id, name, owner, status, description, version, created_at, updated_at
                        """,
                        (name, body.get("owner", ""), status_val, body.get("description", "")),
                    )
                    row = cur.fetchone()
                    new_id = row[0]

                    set_tags(cur, new_id, body.get("tags") or [])
                    set_technologies(cur, new_id, body.get("technologyIds") or [])
                    set_decisions(cur, new_id, body.get("decisionIds") or [])

                    tags = get_tags(cur, new_id)
                    return ok(row_to_dict(row, tags), 201)

                # ── PUT update ────────────────────────────────────────────
                if method == "PUT" and not action:
                    body = parse_body(event)
                    pid = body.get("id") or product_id
                    if not pid:
                        return err("ID обязателен")

                    cur.execute(f"SELECT id FROM {SCHEMA}.products WHERE id = %s", (pid,))
                    if not cur.fetchone():
                        return err("Продукт не найден", 404)

                    name = (body.get("name") or "").strip()
                    if not name:
                        return err("Название обязательно")

                    status_val = body.get("status", "in_development")
                    if status_val not in STATUS_MAP:
                        status_val = STATUS_REVERSE.get(status_val, "in_development")

                    cur.execute(
                        f"""
                        UPDATE {SCHEMA}.products
                        SET name=%s, owner=%s, status=%s, description=%s, updated_at=now()
                        WHERE id=%s
                        RETURNING id, name, owner, status, description, version, created_at, updated_at
                        """,
                        (name, body.get("owner", ""), status_val, body.get("description", ""), pid),
                    )
                    row = cur.fetchone()

                    set_tags(cur, pid, body.get("tags") or [])
                    set_technologies(cur, pid, body.get("technologyIds") or [])
                    set_decisions(cur, pid, body.get("decisionIds") or [])

                    tags = get_tags(cur, pid)
                    return ok(row_to_dict(row, tags))

                return err("Метод не поддерживается", 405)
    finally:
        conn.close()