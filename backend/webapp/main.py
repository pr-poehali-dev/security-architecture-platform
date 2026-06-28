"""
Локальный запуск всех backend-функций как единого FastAPI-приложения.
Каждый роут соответствует одной cloud-функции на poehali.dev.
"""
import os
import json
import uuid
import base64
import psycopg2
import boto3
from datetime import datetime, timezone
from contextlib import contextmanager
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

app = FastAPI(title="Security Architecture Platform — Local Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

SCHEMA = "t_p84706301_security_architectur"

# ── DB ────────────────────────────────────────────────────────────────────────

def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])

@contextmanager
def db():
    conn = get_conn()
    try:
        conn.autocommit = False
        cur = conn.cursor()
        cur.execute(f"SET search_path TO {SCHEMA}, public")
        yield conn, cur
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

def row_to_dict(cur, row):
    return {col.name: val for col, val in zip(cur.description, row)}

def rows_to_list(cur, rows):
    return [row_to_dict(cur, r) for r in rows]

def fmt_dt(dt):
    if dt is None:
        return None
    if hasattr(dt, "isoformat"):
        return dt.isoformat()
    return str(dt)

# ── S3 ────────────────────────────────────────────────────────────────────────

def get_s3():
    return boto3.client(
        "s3",
        endpoint_url=os.environ.get("S3_ENDPOINT_URL", "http://minio:9000"),
        aws_access_key_id=os.environ.get("AWS_ACCESS_KEY_ID", "minioadmin"),
        aws_secret_access_key=os.environ.get("AWS_SECRET_ACCESS_KEY", "minioadmin"),
    )

def s3_url(key: str) -> str:
    endpoint = os.environ.get("S3_ENDPOINT_URL", "http://minio:9000")
    return f"{endpoint}/files/{key}"

# ── STATUS LABELS ─────────────────────────────────────────────────────────────

STATUS_LABELS = {
    "active": "Активен",
    "in_development": "В разработке",
    "inactive": "Не активен",
    "archived": "В архиве",
}

REQ_TYPE_LABELS = {
    "technical": "Технические",
    "functional": "Функциональные",
    "non_functional": "Нефункциональные",
    "organizational": "Организационные",
}

DECISION_TYPE_LABELS = {
    "technical": "Техническое",
    "organizational": "Организационное",
}

# ═══════════════════════════════════════════════════════════════════════════════
# ORG-DOMAINS
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/org-domains")
async def org_domains_get(request: Request):
    params = dict(request.query_params)
    domain_id = params.get("id")

    with db() as (conn, cur):
        if domain_id:
            cur.execute("SELECT * FROM org_domains WHERE id=%s", (domain_id,))
            row = cur.fetchone()
            if not row:
                return JSONResponse({"error": "Not found"}, status_code=404)
            item = row_to_dict(cur, row)
            cur.execute(
                "SELECT * FROM org_domain_versions WHERE domain_id=%s ORDER BY changed_at DESC",
                (domain_id,),
            )
            versions = rows_to_list(cur, cur.fetchall())
            return {
                **_fmt_org(item),
                "versions": [_fmt_org_ver(v) for v in versions],
            }
        else:
            cur.execute("SELECT * FROM org_domains ORDER BY updated_at DESC")
            items = rows_to_list(cur, cur.fetchall())
            return [_fmt_org(i) for i in items]


@app.post("/org-domains")
async def org_domains_post(request: Request):
    data = await request.json()
    with db() as (conn, cur):
        cur.execute(
            "INSERT INTO org_domains (name, owner, status, description) VALUES (%s,%s,%s,%s) RETURNING *",
            (data["name"], data.get("owner",""), data.get("status","in_development"), data.get("description","")),
        )
        item = row_to_dict(cur, cur.fetchone())
        _save_org_version(cur, item["id"], "1.0", data.get("change_note",""))
        return _fmt_org(item)


@app.put("/org-domains")
async def org_domains_put(request: Request):
    data = await request.json()
    domain_id = data.pop("id")
    with db() as (conn, cur):
        cur.execute(
            "UPDATE org_domains SET name=%s, owner=%s, status=%s, description=%s, updated_at=now() WHERE id=%s RETURNING *",
            (data["name"], data.get("owner",""), data.get("status","in_development"), data.get("description",""), domain_id),
        )
        item = row_to_dict(cur, cur.fetchone())
        cur.execute("SELECT MAX(version) FROM org_domain_versions WHERE domain_id=%s", (domain_id,))
        last = cur.fetchone()[0] or "0.0"
        major, minor = last.split(".")
        new_ver = f"{major}.{int(minor)+1}"
        _save_org_version(cur, domain_id, new_ver, data.get("change_note",""))
        return _fmt_org(item)


def _save_org_version(cur, domain_id, version, note):
    cur.execute("SELECT * FROM org_domains WHERE id=%s", (domain_id,))
    item = row_to_dict(cur, cur.fetchone())
    cur.execute(
        "INSERT INTO org_domain_versions (domain_id, version, name, owner, status, description, change_note) VALUES (%s,%s,%s,%s,%s,%s,%s)",
        (domain_id, version, item["name"], item["owner"], item["status"], item["description"], note),
    )


def _fmt_org(r):
    return {
        "id": r["id"], "name": r["name"], "owner": r["owner"],
        "status": r["status"], "statusLabel": STATUS_LABELS.get(r["status"], r["status"]),
        "description": r["description"],
        "version": "—", "createdAt": fmt_dt(r["created_at"]), "updatedAt": fmt_dt(r["updated_at"]),
    }


def _fmt_org_ver(r):
    return {
        "id": r["id"], "version": r["version"], "name": r["name"], "owner": r["owner"],
        "status": r["status"], "statusLabel": STATUS_LABELS.get(r["status"], r["status"]),
        "description": r["description"], "changedAt": fmt_dt(r["changed_at"]), "changeNote": r["change_note"],
    }


# ═══════════════════════════════════════════════════════════════════════════════
# TECH-DOMAINS
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/tech-domains")
async def tech_domains_get(request: Request):
    params = dict(request.query_params)
    if params.get("orgList"):
        with db() as (conn, cur):
            cur.execute("SELECT id, name FROM org_domains ORDER BY name")
            return [{"id": r[0], "name": r[1]} for r in cur.fetchall()]

    domain_id = params.get("id")
    with db() as (conn, cur):
        if domain_id:
            cur.execute("SELECT * FROM tech_domains WHERE id=%s", (domain_id,))
            row = cur.fetchone()
            if not row:
                return JSONResponse({"error": "Not found"}, status_code=404)
            item = row_to_dict(cur, row)
            cur.execute("SELECT org_domain_id FROM tech_domain_org_links WHERE tech_domain_id=%s", (domain_id,))
            org_ids = [r[0] for r in cur.fetchall()]
            cur.execute("SELECT id, name FROM org_domains WHERE id=ANY(%s)", (org_ids,))
            org_domains = [{"id": r[0], "name": r[1]} for r in cur.fetchall()]
            cur.execute("SELECT * FROM tech_domain_versions WHERE tech_domain_id=%s ORDER BY changed_at DESC", (domain_id,))
            versions = rows_to_list(cur, cur.fetchall())
            cur.execute("SELECT id, name FROM org_domains ORDER BY name")
            all_org = [{"id": r[0], "name": r[1]} for r in cur.fetchall()]
            return {
                **_fmt_tech_dom(item, org_ids, org_domains),
                "allOrgDomains": all_org,
                "versions": [_fmt_td_ver(v) for v in versions],
            }
        else:
            cur.execute("SELECT * FROM tech_domains ORDER BY updated_at DESC")
            items = rows_to_list(cur, cur.fetchall())
            result = []
            for item in items:
                cur.execute("SELECT org_domain_id FROM tech_domain_org_links WHERE tech_domain_id=%s", (item["id"],))
                org_ids = [r[0] for r in cur.fetchall()]
                cur.execute("SELECT id, name FROM org_domains WHERE id=ANY(%s)", (org_ids,)) if org_ids else None
                org_domains = [{"id": r[0], "name": r[1]} for r in cur.fetchall()] if org_ids else []
                result.append(_fmt_tech_dom(item, org_ids, org_domains))
            return result


@app.post("/tech-domains")
async def tech_domains_post(request: Request):
    data = await request.json()
    with db() as (conn, cur):
        cur.execute(
            "INSERT INTO tech_domains (name, owner, status, description) VALUES (%s,%s,%s,%s) RETURNING *",
            (data["name"], data.get("owner",""), data.get("status","in_development"), data.get("description","")),
        )
        item = row_to_dict(cur, cur.fetchone())
        org_ids = data.get("orgDomainIds", [])
        for oid in org_ids:
            cur.execute("INSERT INTO tech_domain_org_links (tech_domain_id, org_domain_id) VALUES (%s,%s) ON CONFLICT DO NOTHING", (item["id"], oid))
        _save_td_version(cur, item["id"], "1.0", data.get("change_note",""), org_ids)
        return _fmt_tech_dom(item, org_ids, [])


@app.put("/tech-domains")
async def tech_domains_put(request: Request):
    data = await request.json()
    domain_id = data.pop("id")
    with db() as (conn, cur):
        cur.execute(
            "UPDATE tech_domains SET name=%s, owner=%s, status=%s, description=%s, updated_at=now() WHERE id=%s RETURNING *",
            (data["name"], data.get("owner",""), data.get("status","in_development"), data.get("description",""), domain_id),
        )
        item = row_to_dict(cur, cur.fetchone())
        org_ids = data.get("orgDomainIds", [])
        cur.execute("DELETE FROM tech_domain_org_links WHERE tech_domain_id=%s", (domain_id,))
        for oid in org_ids:
            cur.execute("INSERT INTO tech_domain_org_links (tech_domain_id, org_domain_id) VALUES (%s,%s) ON CONFLICT DO NOTHING", (domain_id, oid))
        cur.execute("SELECT MAX(version) FROM tech_domain_versions WHERE tech_domain_id=%s", (domain_id,))
        last = cur.fetchone()[0] or "0.0"
        major, minor = last.split(".")
        _save_td_version(cur, domain_id, f"{major}.{int(minor)+1}", data.get("change_note",""), org_ids)
        return _fmt_tech_dom(item, org_ids, [])


def _save_td_version(cur, domain_id, version, note, org_ids):
    cur.execute("SELECT * FROM tech_domains WHERE id=%s", (domain_id,))
    item = row_to_dict(cur, cur.fetchone())
    cur.execute(
        "INSERT INTO tech_domain_versions (tech_domain_id, version, name, owner, status, description, org_domain_ids, change_note) VALUES (%s,%s,%s,%s,%s,%s,%s,%s)",
        (domain_id, version, item["name"], item["owner"], item["status"], item["description"], org_ids, note),
    )


def _fmt_tech_dom(r, org_ids, org_domains):
    return {
        "id": r["id"], "name": r["name"], "owner": r["owner"],
        "status": r["status"], "statusLabel": STATUS_LABELS.get(r["status"], r["status"]),
        "description": r["description"], "version": "—",
        "createdAt": fmt_dt(r["created_at"]), "updatedAt": fmt_dt(r["updated_at"]),
        "orgDomainIds": org_ids, "orgDomains": org_domains,
    }


def _fmt_td_ver(r):
    return {
        "id": r["id"], "version": r["version"], "name": r["name"], "owner": r["owner"],
        "status": r["status"], "statusLabel": STATUS_LABELS.get(r["status"], r["status"]),
        "description": r["description"], "orgDomainIds": list(r.get("org_domain_ids") or []),
        "changedAt": fmt_dt(r["changed_at"]), "changeNote": r["change_note"],
    }


# ═══════════════════════════════════════════════════════════════════════════════
# TECHNOLOGIES
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/technologies")
async def technologies_get(request: Request):
    params = dict(request.query_params)
    if "tags_suggest" in params:
        q = params["tags_suggest"]
        with db() as (conn, cur):
            cur.execute("SELECT id, name FROM tags WHERE name ILIKE %s ORDER BY name LIMIT 20", (f"%{q}%",))
            return [{"id": r[0], "name": r[1]} for r in cur.fetchall()]

    tech_id = params.get("id")
    with db() as (conn, cur):
        if tech_id:
            cur.execute("SELECT * FROM technologies WHERE id=%s", (tech_id,))
            row = cur.fetchone()
            if not row:
                return JSONResponse({"error": "Not found"}, status_code=404)
            item = row_to_dict(cur, row)
            tags = _get_tech_tags(cur, tech_id)
            cur.execute("SELECT * FROM mermaid_diagrams WHERE technology_id=%s ORDER BY created_at", (tech_id,))
            diagrams = rows_to_list(cur, cur.fetchall())
            cur.execute("SELECT * FROM technology_files WHERE technology_id=%s ORDER BY uploaded_at", (tech_id,))
            files = rows_to_list(cur, cur.fetchall())
            cur.execute("SELECT * FROM technology_versions WHERE technology_id=%s ORDER BY changed_at DESC", (tech_id,))
            versions = rows_to_list(cur, cur.fetchall())
            return {
                **_fmt_tech(item, tags),
                "mermaidDiagrams": [_fmt_mermaid(d) for d in diagrams],
                "files": [_fmt_file(f) for f in files],
                "versions": [_fmt_tech_ver(v) for v in versions],
            }
        else:
            cur.execute("SELECT * FROM technologies ORDER BY updated_at DESC")
            items = rows_to_list(cur, cur.fetchall())
            result = []
            for item in items:
                tags = _get_tech_tags(cur, item["id"])
                result.append(_fmt_tech(item, tags))
            return result


@app.post("/technologies")
async def technologies_post(request: Request):
    params = dict(request.query_params)
    data = await request.json()

    if params.get("action") == "add_mermaid":
        with db() as (conn, cur):
            cur.execute(
                "INSERT INTO mermaid_diagrams (technology_id, title, code) VALUES (%s,%s,%s) RETURNING *",
                (data["technology_id"], data.get("title",""), data["code"]),
            )
            return _fmt_mermaid(row_to_dict(cur, cur.fetchone()))

    if params.get("action") == "upload_file":
        tech_id = data["technology_id"]
        filename = data["filename"]
        content_type = data.get("content_type", "application/octet-stream")
        file_bytes = base64.b64decode(data["data_base64"])
        s3_key = f"tech-files/{tech_id}/{uuid.uuid4()}_{filename}"
        s3 = get_s3()
        s3.put_object(Bucket="files", Key=s3_key, Body=file_bytes, ContentType=content_type)
        with db() as (conn, cur):
            cur.execute(
                "INSERT INTO technology_files (technology_id, filename, s3_key, content_type, size_bytes) VALUES (%s,%s,%s,%s,%s) RETURNING *",
                (tech_id, filename, s3_key, content_type, len(file_bytes)),
            )
            return _fmt_file(row_to_dict(cur, cur.fetchone()))

    with db() as (conn, cur):
        cur.execute(
            "INSERT INTO technologies (name, owner, status, description) VALUES (%s,%s,%s,%s) RETURNING *",
            (data["name"], data.get("owner",""), data.get("status","in_development"), data.get("description","")),
        )
        item = row_to_dict(cur, cur.fetchone())
        tags = _upsert_tags(cur, item["id"], data.get("tags", []))
        _save_tech_version(cur, item["id"], "1.0", data.get("change_note",""), [t["name"] for t in tags])
        return _fmt_tech(item, tags)


@app.put("/technologies")
async def technologies_put(request: Request):
    params = dict(request.query_params)
    data = await request.json()

    if params.get("action") == "update_mermaid":
        with db() as (conn, cur):
            cur.execute(
                "UPDATE mermaid_diagrams SET title=%s, code=%s, updated_at=now() WHERE id=%s RETURNING *",
                (data["title"], data["code"], data["id"]),
            )
            return _fmt_mermaid(row_to_dict(cur, cur.fetchone()))

    tech_id = data.pop("id")
    with db() as (conn, cur):
        cur.execute(
            "UPDATE technologies SET name=%s, owner=%s, status=%s, description=%s, updated_at=now() WHERE id=%s RETURNING *",
            (data["name"], data.get("owner",""), data.get("status","in_development"), data.get("description",""), tech_id),
        )
        item = row_to_dict(cur, cur.fetchone())
        cur.execute("DELETE FROM technology_tags WHERE technology_id=%s", (tech_id,))
        tags = _upsert_tags(cur, tech_id, data.get("tags", []))
        cur.execute("SELECT MAX(version) FROM technology_versions WHERE technology_id=%s", (tech_id,))
        last = cur.fetchone()[0] or "0.0"
        major, minor = last.split(".")
        _save_tech_version(cur, tech_id, f"{major}.{int(minor)+1}", data.get("change_note",""), [t["name"] for t in tags])
        return _fmt_tech(item, tags)


def _get_tech_tags(cur, tech_id):
    cur.execute("SELECT t.id, t.name FROM tags t JOIN technology_tags tt ON t.id=tt.tag_id WHERE tt.technology_id=%s ORDER BY t.name", (tech_id,))
    return [{"id": r[0], "name": r[1]} for r in cur.fetchall()]


def _upsert_tags(cur, tech_id, tag_names):
    tags = []
    for name in tag_names:
        cur.execute("INSERT INTO tags (name) VALUES (%s) ON CONFLICT (name) DO UPDATE SET name=EXCLUDED.name RETURNING id, name", (name,))
        tag = cur.fetchone()
        cur.execute("INSERT INTO technology_tags (technology_id, tag_id) VALUES (%s,%s) ON CONFLICT DO NOTHING", (tech_id, tag[0]))
        tags.append({"id": tag[0], "name": tag[1]})
    return tags


def _save_tech_version(cur, tech_id, version, note, tags_snapshot):
    cur.execute("SELECT * FROM technologies WHERE id=%s", (tech_id,))
    item = row_to_dict(cur, cur.fetchone())
    cur.execute(
        "INSERT INTO technology_versions (technology_id, version, name, owner, status, description, tags_snapshot, change_note) VALUES (%s,%s,%s,%s,%s,%s,%s,%s)",
        (tech_id, version, item["name"], item["owner"], item["status"], item["description"], tags_snapshot, note),
    )


def _fmt_tech(r, tags):
    return {
        "id": r["id"], "name": r["name"], "owner": r["owner"],
        "status": r["status"], "statusLabel": STATUS_LABELS.get(r["status"], r["status"]),
        "description": r["description"], "version": "—",
        "createdAt": fmt_dt(r["created_at"]), "updatedAt": fmt_dt(r["updated_at"]),
        "tags": tags,
    }


def _fmt_tech_ver(r):
    return {
        "id": r["id"], "version": r["version"], "name": r["name"], "owner": r["owner"],
        "status": r["status"], "statusLabel": STATUS_LABELS.get(r["status"], r["status"]),
        "description": r["description"], "tagsSnapshot": list(r.get("tags_snapshot") or []),
        "changedAt": fmt_dt(r["changed_at"]), "changeNote": r["change_note"],
    }


def _fmt_mermaid(r):
    return {
        "id": r["id"], "title": r["title"], "code": r["code"],
        "createdAt": fmt_dt(r["created_at"]), "updatedAt": fmt_dt(r["updated_at"]),
    }


def _fmt_file(r):
    return {
        "id": r["id"], "filename": r["filename"], "s3Key": r["s3_key"],
        "contentType": r["content_type"], "sizeBytes": r["size_bytes"],
        "uploadedAt": fmt_dt(r["uploaded_at"]),
        "url": s3_url(r["s3_key"]),
    }


# ═══════════════════════════════════════════════════════════════════════════════
# REQUIREMENTS
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/requirements")
async def requirements_get(request: Request):
    params = dict(request.query_params)
    if "tags_suggest" in params:
        q = params["tags_suggest"]
        with db() as (conn, cur):
            cur.execute("SELECT id, name FROM tags WHERE name ILIKE %s ORDER BY name LIMIT 20", (f"%{q}%",))
            return [{"id": r[0], "name": r[1]} for r in cur.fetchall()]
    if "tech_suggest" in params:
        q = params["tech_suggest"]
        with db() as (conn, cur):
            cur.execute("SELECT id, name FROM technologies WHERE name ILIKE %s AND status='active' ORDER BY name LIMIT 20", (f"%{q}%",))
            return [{"id": r[0], "name": r[1]} for r in cur.fetchall()]
    if "tech_domain_suggest" in params:
        q = params["tech_domain_suggest"]
        with db() as (conn, cur):
            cur.execute("SELECT id, name FROM tech_domains WHERE name ILIKE %s ORDER BY name LIMIT 20", (f"%{q}%",))
            return [{"id": r[0], "name": r[1]} for r in cur.fetchall()]

    req_id = params.get("id")
    with db() as (conn, cur):
        if req_id:
            cur.execute("SELECT * FROM requirements WHERE id=%s", (req_id,))
            row = cur.fetchone()
            if not row:
                return JSONResponse({"error": "Not found"}, status_code=404)
            item = row_to_dict(cur, row)
            tags = _get_req_tags(cur, req_id)
            cur.execute("SELECT t.id, t.name FROM technologies t JOIN requirement_technologies rt ON t.id=rt.technology_id WHERE rt.requirement_id=%s", (req_id,))
            techs = [{"id": r[0], "name": r[1]} for r in cur.fetchall()]
            cur.execute("SELECT td.id, td.name FROM tech_domains td JOIN requirement_tech_domain rtd ON td.id=rtd.tech_domain_id WHERE rtd.requirement_id=%s", (req_id,))
            td_row = cur.fetchone()
            tech_domain = {"id": td_row[0], "name": td_row[1]} if td_row else None
            cur.execute("SELECT * FROM requirement_versions WHERE requirement_id=%s ORDER BY changed_at DESC", (req_id,))
            versions = rows_to_list(cur, cur.fetchall())
            return {
                **_fmt_req(item, tags, techs, tech_domain),
                "versions": [_fmt_req_ver(v) for v in versions],
            }
        else:
            cur.execute("SELECT * FROM requirements ORDER BY updated_at DESC")
            items = rows_to_list(cur, cur.fetchall())
            result = []
            for item in items:
                tags = _get_req_tags(cur, item["id"])
                cur.execute("SELECT t.id, t.name FROM technologies t JOIN requirement_technologies rt ON t.id=rt.technology_id WHERE rt.requirement_id=%s", (item["id"],))
                techs = [{"id": r[0], "name": r[1]} for r in cur.fetchall()]
                cur.execute("SELECT td.id, td.name FROM tech_domains td JOIN requirement_tech_domain rtd ON td.id=rtd.tech_domain_id WHERE rtd.requirement_id=%s", (item["id"],))
                td_row = cur.fetchone()
                tech_domain = {"id": td_row[0], "name": td_row[1]} if td_row else None
                result.append(_fmt_req(item, tags, techs, tech_domain))
            return result


@app.post("/requirements")
async def requirements_post(request: Request):
    data = await request.json()
    with db() as (conn, cur):
        req_id = f"req-{next_seq(cur, 'requirement_seq')}"
        cur.execute(
            """INSERT INTO requirements (id, short_desc, description, req_type, owner, status,
               normative_doc, control_metrics, fulfillment_method, is_procurement, score_point, score_weight)
               VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING *""",
            (req_id, data.get("short_desc",""), data.get("description",""),
             data.get("req_type","functional"), data.get("owner",""), data.get("status","active"),
             data.get("normative_doc",""), data.get("control_metrics",""),
             data.get("fulfillment_method",""), data.get("is_procurement", False),
             data.get("score_point",1), data.get("score_weight",1)),
        )
        item = row_to_dict(cur, cur.fetchone())
        tags = _upsert_req_tags(cur, req_id, data.get("tags", []))
        techs = _link_req_techs(cur, req_id, data.get("technologyIds", []))
        tech_domain = _link_req_tech_domain(cur, req_id, data.get("techDomainId"))
        cur.execute("INSERT INTO requirement_versions (requirement_id, version, change_note) VALUES (%s,%s,%s)", (req_id, "1.0", data.get("change_note","")))
        return _fmt_req(item, tags, techs, tech_domain)


@app.put("/requirements")
async def requirements_put(request: Request):
    data = await request.json()
    req_id = data.pop("id")
    with db() as (conn, cur):
        cur.execute(
            """UPDATE requirements SET short_desc=%s, description=%s, req_type=%s, owner=%s, status=%s,
               normative_doc=%s, control_metrics=%s, fulfillment_method=%s, is_procurement=%s,
               score_point=%s, score_weight=%s, updated_at=now() WHERE id=%s RETURNING *""",
            (data.get("short_desc",""), data.get("description",""), data.get("req_type","functional"),
             data.get("owner",""), data.get("status","active"), data.get("normative_doc",""),
             data.get("control_metrics",""), data.get("fulfillment_method",""),
             data.get("is_procurement",False), data.get("score_point",1), data.get("score_weight",1), req_id),
        )
        item = row_to_dict(cur, cur.fetchone())
        cur.execute("DELETE FROM requirement_tags WHERE requirement_id=%s", (req_id,))
        tags = _upsert_req_tags(cur, req_id, data.get("tags", []))
        cur.execute("DELETE FROM requirement_technologies WHERE requirement_id=%s", (req_id,))
        techs = _link_req_techs(cur, req_id, data.get("technologyIds", []))
        cur.execute("DELETE FROM requirement_tech_domain WHERE requirement_id=%s", (req_id,))
        tech_domain = _link_req_tech_domain(cur, req_id, data.get("techDomainId"))
        cur.execute("SELECT MAX(version) FROM requirement_versions WHERE requirement_id=%s", (req_id,))
        last = cur.fetchone()[0] or "0.0"
        major, minor = last.split(".")
        cur.execute("INSERT INTO requirement_versions (requirement_id, version, change_note) VALUES (%s,%s,%s)", (req_id, f"{major}.{int(minor)+1}", data.get("change_note","")))
        return _fmt_req(item, tags, techs, tech_domain)


def _get_req_tags(cur, req_id):
    cur.execute("SELECT t.id, t.name FROM tags t JOIN requirement_tags rt ON t.id=rt.tag_id WHERE rt.requirement_id=%s ORDER BY t.name", (req_id,))
    return [{"id": r[0], "name": r[1]} for r in cur.fetchall()]


def _upsert_req_tags(cur, req_id, tag_names):
    tags = []
    for name in tag_names:
        cur.execute("INSERT INTO tags (name) VALUES (%s) ON CONFLICT (name) DO UPDATE SET name=EXCLUDED.name RETURNING id, name", (name,))
        tag = cur.fetchone()
        cur.execute("INSERT INTO requirement_tags (requirement_id, tag_id) VALUES (%s,%s) ON CONFLICT DO NOTHING", (req_id, tag[0]))
        tags.append({"id": tag[0], "name": tag[1]})
    return tags


def _link_req_techs(cur, req_id, tech_ids):
    techs = []
    for tid in (tech_ids or []):
        cur.execute("INSERT INTO requirement_technologies (requirement_id, technology_id) VALUES (%s,%s) ON CONFLICT DO NOTHING", (req_id, tid))
        cur.execute("SELECT id, name FROM technologies WHERE id=%s", (tid,))
        row = cur.fetchone()
        if row:
            techs.append({"id": row[0], "name": row[1]})
    return techs


def _link_req_tech_domain(cur, req_id, td_id):
    if not td_id:
        return None
    cur.execute("INSERT INTO requirement_tech_domain (requirement_id, tech_domain_id) VALUES (%s,%s) ON CONFLICT DO NOTHING", (req_id, td_id))
    cur.execute("SELECT id, name FROM tech_domains WHERE id=%s", (td_id,))
    row = cur.fetchone()
    return {"id": row[0], "name": row[1]} if row else None


def _fmt_req(r, tags, techs, tech_domain):
    return {
        "id": r["id"], "shortDesc": r["short_desc"], "description": r["description"],
        "reqType": r["req_type"], "reqTypeLabel": REQ_TYPE_LABELS.get(r["req_type"], r["req_type"]),
        "owner": r["owner"], "status": r["status"], "statusLabel": STATUS_LABELS.get(r["status"], r["status"]),
        "normativeDoc": r["normative_doc"], "controlMetrics": r["control_metrics"],
        "fulfillmentMethod": r["fulfillment_method"], "isProcurement": r["is_procurement"],
        "scorePoint": r["score_point"], "scoreWeight": r["score_weight"],
        "createdAt": fmt_dt(r["created_at"]), "updatedAt": fmt_dt(r["updated_at"]),
        "tags": tags, "technologies": techs, "techDomain": tech_domain,
    }


def _fmt_req_ver(r):
    return {
        "id": r["id"], "version": r["version"], "changeNote": r["change_note"],
        "changedAt": fmt_dt(r["changed_at"]),
    }


def next_seq(cur, seq_name):
    cur.execute(f"SELECT nextval('{seq_name}')")
    return cur.fetchone()[0]


# ═══════════════════════════════════════════════════════════════════════════════
# DECISIONS
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/decisions")
async def decisions_get(request: Request):
    params = dict(request.query_params)
    if "tags_suggest" in params:
        q = params["tags_suggest"]
        with db() as (conn, cur):
            cur.execute("SELECT id, name FROM tags WHERE name ILIKE %s ORDER BY name LIMIT 20", (f"%{q}%",))
            return [{"id": r[0], "name": r[1]} for r in cur.fetchall()]
    if "decisions_suggest" in params:
        q = params["decisions_suggest"]
        with db() as (conn, cur):
            cur.execute("SELECT id, name FROM decisions WHERE name ILIKE %s ORDER BY name LIMIT 20", (f"%{q}%",))
            return [{"id": r[0], "name": r[1]} for r in cur.fetchall()]
    if "tech_suggest" in params:
        q = params["tech_suggest"]
        with db() as (conn, cur):
            cur.execute("SELECT id, name FROM technologies WHERE name ILIKE %s ORDER BY name LIMIT 20", (f"%{q}%",))
            return [{"id": r[0], "name": r[1]} for r in cur.fetchall()]

    dec_id = params.get("id")
    with db() as (conn, cur):
        if dec_id:
            cur.execute("SELECT * FROM decisions WHERE id=%s", (dec_id,))
            row = cur.fetchone()
            if not row:
                return JSONResponse({"error": "Not found"}, status_code=404)
            item = row_to_dict(cur, row)
            tags = _get_dec_tags(cur, dec_id)
            cur.execute("SELECT t.id, t.name FROM technologies t JOIN decision_technologies dt ON t.id=dt.technology_id WHERE dt.decision_id=%s", (dec_id,))
            techs = [{"id": r[0], "name": r[1]} for r in cur.fetchall()]
            cur.execute("SELECT d.id, d.name FROM decisions d JOIN decision_links dl ON d.id=dl.related_id WHERE dl.decision_id=%s", (dec_id,))
            related = [{"id": r[0], "name": r[1]} for r in cur.fetchall()]
            cur.execute("SELECT * FROM decision_mermaid WHERE decision_id=%s ORDER BY created_at", (dec_id,))
            diagrams = rows_to_list(cur, cur.fetchall())
            cur.execute("SELECT * FROM decision_files WHERE decision_id=%s ORDER BY created_at", (dec_id,))
            files = rows_to_list(cur, cur.fetchall())
            cur.execute("SELECT * FROM decision_versions WHERE decision_id=%s ORDER BY changed_at DESC", (dec_id,))
            versions = rows_to_list(cur, cur.fetchall())
            cur.execute("SELECT r.id, r.short_desc FROM requirements r JOIN decision_requirements dr ON r.id=dr.requirement_id WHERE dr.decision_id=%s", (dec_id,))
            reqs = [{"id": r[0], "shortDesc": r[1]} for r in cur.fetchall()]
            return {
                **_fmt_dec(item, tags, techs, related, reqs),
                "mermaidDiagrams": [_fmt_dec_mermaid(d) for d in diagrams],
                "files": [_fmt_dec_file(f) for f in files],
                "versions": [_fmt_dec_ver(v) for v in versions],
            }
        else:
            cur.execute("SELECT * FROM decisions ORDER BY updated_at DESC")
            items = rows_to_list(cur, cur.fetchall())
            result = []
            for item in items:
                tags = _get_dec_tags(cur, item["id"])
                result.append(_fmt_dec(item, tags, [], [], []))
            return result


@app.post("/decisions")
async def decisions_post(request: Request):
    params = dict(request.query_params)
    data = await request.json()

    if params.get("action") == "add_mermaid":
        with db() as (conn, cur):
            cur.execute(
                "INSERT INTO decision_mermaid (decision_id, title, code) VALUES (%s,%s,%s) RETURNING *",
                (data["decision_id"], data.get("title",""), data["code"]),
            )
            return _fmt_dec_mermaid(row_to_dict(cur, cur.fetchone()))

    if params.get("action") == "upload_file":
        dec_id = data["decision_id"]
        filename = data["filename"]
        content_type = data.get("content_type", "application/octet-stream")
        file_bytes = base64.b64decode(data["data_base64"])
        s3_key = f"dec-files/{dec_id}/{uuid.uuid4()}_{filename}"
        s3 = get_s3()
        s3.put_object(Bucket="files", Key=s3_key, Body=file_bytes, ContentType=content_type)
        with db() as (conn, cur):
            cur.execute(
                "INSERT INTO decision_files (decision_id, filename, s3_key, content_type, size_bytes) VALUES (%s,%s,%s,%s,%s) RETURNING *",
                (dec_id, filename, s3_key, content_type, len(file_bytes)),
            )
            return _fmt_dec_file(row_to_dict(cur, cur.fetchone()))

    with db() as (conn, cur):
        cur.execute(
            "INSERT INTO decisions (name, owner, status, decision_type, description) VALUES (%s,%s,%s,%s,%s) RETURNING *",
            (data["name"], data.get("owner",""), data.get("status","in_development"), data.get("decision_type","technical"), data.get("description","")),
        )
        item = row_to_dict(cur, cur.fetchone())
        tags = _upsert_dec_tags(cur, item["id"], data.get("tags", []))
        techs = _link_dec_techs(cur, item["id"], data.get("technologyIds", []))
        related = _link_dec_related(cur, item["id"], data.get("relatedDecisionIds", []))
        _link_dec_reqs(cur, item["id"], data.get("requirementIds", []))
        cur.execute("INSERT INTO decision_versions (decision_id, version, change_note) VALUES (%s,%s,%s)", (item["id"], "1.0", data.get("change_note","")))
        return _fmt_dec(item, tags, techs, related, [])


@app.put("/decisions")
async def decisions_put(request: Request):
    params = dict(request.query_params)
    data = await request.json()

    if params.get("action") == "update_mermaid":
        with db() as (conn, cur):
            cur.execute(
                "UPDATE decision_mermaid SET title=%s, code=%s, updated_at=now() WHERE id=%s RETURNING *",
                (data["title"], data["code"], data["id"]),
            )
            return _fmt_dec_mermaid(row_to_dict(cur, cur.fetchone()))

    dec_id = data.pop("id")
    with db() as (conn, cur):
        cur.execute(
            "UPDATE decisions SET name=%s, owner=%s, status=%s, decision_type=%s, description=%s, updated_at=now() WHERE id=%s RETURNING *",
            (data["name"], data.get("owner",""), data.get("status","in_development"), data.get("decision_type","technical"), data.get("description",""), dec_id),
        )
        item = row_to_dict(cur, cur.fetchone())
        cur.execute("DELETE FROM decision_tags WHERE decision_id=%s", (dec_id,))
        tags = _upsert_dec_tags(cur, dec_id, data.get("tags", []))
        cur.execute("DELETE FROM decision_technologies WHERE decision_id=%s", (dec_id,))
        techs = _link_dec_techs(cur, dec_id, data.get("technologyIds", []))
        cur.execute("DELETE FROM decision_links WHERE decision_id=%s", (dec_id,))
        related = _link_dec_related(cur, dec_id, data.get("relatedDecisionIds", []))
        cur.execute("DELETE FROM decision_requirements WHERE decision_id=%s", (dec_id,))
        _link_dec_reqs(cur, dec_id, data.get("requirementIds", []))
        cur.execute("SELECT MAX(version) FROM decision_versions WHERE decision_id=%s", (dec_id,))
        last = cur.fetchone()[0] or "0.0"
        major, minor = last.split(".")
        cur.execute("INSERT INTO decision_versions (decision_id, version, change_note) VALUES (%s,%s,%s)", (dec_id, f"{major}.{int(minor)+1}", data.get("change_note","")))
        return _fmt_dec(item, tags, techs, related, [])


def _get_dec_tags(cur, dec_id):
    cur.execute("SELECT t.id, t.name FROM tags t JOIN decision_tags dt ON t.id=dt.tag_id WHERE dt.decision_id=%s ORDER BY t.name", (dec_id,))
    return [{"id": r[0], "name": r[1]} for r in cur.fetchall()]


def _upsert_dec_tags(cur, dec_id, tag_names):
    tags = []
    for name in tag_names:
        cur.execute("INSERT INTO tags (name) VALUES (%s) ON CONFLICT (name) DO UPDATE SET name=EXCLUDED.name RETURNING id, name", (name,))
        tag = cur.fetchone()
        cur.execute("INSERT INTO decision_tags (decision_id, tag_id) VALUES (%s,%s) ON CONFLICT DO NOTHING", (dec_id, tag[0]))
        tags.append({"id": tag[0], "name": tag[1]})
    return tags


def _link_dec_techs(cur, dec_id, tech_ids):
    techs = []
    for tid in (tech_ids or []):
        cur.execute("INSERT INTO decision_technologies (decision_id, technology_id) VALUES (%s,%s) ON CONFLICT DO NOTHING", (dec_id, tid))
        cur.execute("SELECT id, name FROM technologies WHERE id=%s", (tid,))
        row = cur.fetchone()
        if row:
            techs.append({"id": row[0], "name": row[1]})
    return techs


def _link_dec_related(cur, dec_id, related_ids):
    related = []
    for rid in (related_ids or []):
        cur.execute("INSERT INTO decision_links (decision_id, related_id) VALUES (%s,%s) ON CONFLICT DO NOTHING", (dec_id, rid))
        cur.execute("SELECT id, name FROM decisions WHERE id=%s", (rid,))
        row = cur.fetchone()
        if row:
            related.append({"id": row[0], "name": row[1]})
    return related


def _link_dec_reqs(cur, dec_id, req_ids):
    for rid in (req_ids or []):
        cur.execute("INSERT INTO decision_requirements (decision_id, requirement_id) VALUES (%s,%s) ON CONFLICT DO NOTHING", (dec_id, rid))


def _fmt_dec(r, tags, techs, related, reqs):
    return {
        "id": r["id"], "name": r["name"], "owner": r["owner"],
        "status": r["status"], "statusLabel": STATUS_LABELS.get(r["status"], r["status"]),
        "decisionType": r["decision_type"], "decisionTypeLabel": DECISION_TYPE_LABELS.get(r["decision_type"], r["decision_type"]),
        "description": r["description"],
        "createdAt": fmt_dt(r["created_at"]), "updatedAt": fmt_dt(r["updated_at"]),
        "tags": tags, "technologies": techs, "relatedDecisions": related, "requirements": reqs,
    }


def _fmt_dec_ver(r):
    return {"id": r["id"], "version": r["version"], "changeNote": r["change_note"], "changedAt": fmt_dt(r["changed_at"])}


def _fmt_dec_mermaid(r):
    return {"id": r["id"], "title": r["title"], "code": r["code"], "createdAt": fmt_dt(r["created_at"]), "updatedAt": fmt_dt(r["updated_at"])}


def _fmt_dec_file(r):
    return {"id": r["id"], "filename": r["filename"], "s3Key": r["s3_key"], "contentType": r["content_type"], "sizeBytes": r["size_bytes"], "uploadedAt": fmt_dt(r["created_at"]), "url": s3_url(r["s3_key"])}


# ═══════════════════════════════════════════════════════════════════════════════
# HARDENING
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/hardening")
async def hardening_get(request: Request):
    params = dict(request.query_params)
    if "tags_suggest" in params:
        q = params["tags_suggest"]
        with db() as (conn, cur):
            cur.execute("SELECT id, name FROM tags WHERE name ILIKE %s ORDER BY name LIMIT 20", (f"%{q}%",))
            return [{"id": r[0], "name": r[1]} for r in cur.fetchall()]
    if "solutions_suggest" in params:
        q = params["solutions_suggest"]
        with db() as (conn, cur):
            cur.execute("SELECT id, name FROM decisions WHERE name ILIKE %s ORDER BY name LIMIT 20", (f"%{q}%",))
            return [{"id": r[0], "name": r[1]} for r in cur.fetchall()]

    if "req_content" in params:
        hid = params["req_content"]
        rid = params.get("requirement_id")
        with db() as (conn, cur):
            cur.execute("SELECT * FROM hardening_req_content WHERE hardening_id=%s AND requirement_id=%s", (hid, rid))
            row = cur.fetchone()
            if row:
                content = row_to_dict(cur, row)
                cur.execute("SELECT * FROM hardening_req_images WHERE hardening_id=%s AND requirement_id=%s ORDER BY uploaded_at", (hid, rid))
                images = rows_to_list(cur, cur.fetchall())
                cur.execute("SELECT * FROM hardening_env_status WHERE hardening_id=%s AND requirement_id=%s", (hid, rid))
                env_rows = rows_to_list(cur, cur.fetchall())
                return {
                    "markdown": content["markdown"],
                    "images": [{"id": i["id"], "filename": i["filename"], "url": s3_url(i["s3_key"])} for i in images],
                    "envStatuses": [_fmt_env_status(e) for e in env_rows],
                }
            return {"markdown": "", "images": [], "envStatuses": []}

    hard_id = params.get("id")
    with db() as (conn, cur):
        if hard_id:
            cur.execute("SELECT * FROM hardenings WHERE id=%s", (hard_id,))
            row = cur.fetchone()
            if not row:
                return JSONResponse({"error": "Not found"}, status_code=404)
            item = row_to_dict(cur, row)
            tags = _get_hard_tags(cur, hard_id)
            cur.execute("SELECT d.id, d.name FROM decisions d JOIN hardening_solutions hs ON d.id=hs.solution_id WHERE hs.hardening_id=%s", (hard_id,))
            solutions = [{"id": r[0], "name": r[1]} for r in cur.fetchall()]
            cur.execute("SELECT * FROM hardening_versions WHERE hardening_id=%s ORDER BY changed_at DESC", (hard_id,))
            versions = rows_to_list(cur, cur.fetchall())
            req_domains = _get_hard_req_domains(cur, hard_id)
            return {
                **_fmt_hard(item, tags, solutions),
                "versions": [_fmt_hard_ver(v) for v in versions],
                "requirementsByDomain": req_domains,
            }
        else:
            cur.execute("SELECT * FROM hardenings ORDER BY updated_at DESC")
            items = rows_to_list(cur, cur.fetchall())
            result = []
            for item in items:
                tags = _get_hard_tags(cur, item["id"])
                cur.execute("SELECT d.id, d.name FROM decisions d JOIN hardening_solutions hs ON d.id=hs.solution_id WHERE hs.hardening_id=%s", (item["id"],))
                solutions = [{"id": r[0], "name": r[1]} for r in cur.fetchall()]
                result.append(_fmt_hard(item, tags, solutions))
            return result


@app.post("/hardening")
async def hardening_post(request: Request):
    params = dict(request.query_params)
    data = await request.json()

    if params.get("action") == "save_env_status":
        hid = data["hardening_id"]
        rid = data["requirement_id"]
        statuses = data.get("statuses", [])
        with db() as (conn, cur):
            cur.execute("DELETE FROM hardening_env_status WHERE hardening_id=%s AND requirement_id=%s", (hid, rid))
            for s in statuses:
                cur.execute(
                    """INSERT INTO hardening_env_status (hardening_id, requirement_id, env, status, iod_mode)
                       VALUES (%s,%s,%s,%s,%s)""",
                    (hid, rid, s["env"], s["status"], s.get("iod_mode","both")),
                )
            return {"ok": True}

    if params.get("action") == "save_req_markdown":
        hid = data["hardening_id"]
        rid = data["requirement_id"]
        md = data.get("markdown", "")
        with db() as (conn, cur):
            cur.execute(
                """INSERT INTO hardening_req_content (hardening_id, requirement_id, markdown)
                   VALUES (%s,%s,%s) ON CONFLICT (hardening_id, requirement_id) DO UPDATE SET markdown=%s""",
                (hid, rid, md, md),
            )
            return {"ok": True}

    if params.get("action") == "upload_req_image":
        hid = data["hardening_id"]
        rid = data["requirement_id"]
        filename = data["filename"]
        content_type = data.get("content_type", "image/png")
        file_bytes = base64.b64decode(data["data_base64"])
        s3_key = f"hardening/{hid}/{rid}/{uuid.uuid4()}_{filename}"
        s3 = get_s3()
        s3.put_object(Bucket="files", Key=s3_key, Body=file_bytes, ContentType=content_type)
        with db() as (conn, cur):
            cur.execute(
                "INSERT INTO hardening_req_images (hardening_id, requirement_id, filename, s3_key) VALUES (%s,%s,%s,%s) RETURNING id",
                (hid, rid, filename, s3_key),
            )
            img_id = cur.fetchone()[0]
            return {"id": img_id, "filename": filename, "url": s3_url(s3_key)}

    with db() as (conn, cur):
        cur.execute(
            "INSERT INTO hardenings (name, owner, status, description) VALUES (%s,%s,%s,%s) RETURNING *",
            (data["name"], data.get("owner",""), data.get("status","in_development"), data.get("description","")),
        )
        item = row_to_dict(cur, cur.fetchone())
        tags = _upsert_hard_tags(cur, item["id"], data.get("tags", []))
        solutions = _link_hard_solutions(cur, item["id"], data.get("solutionIds", []))
        cur.execute("INSERT INTO hardening_versions (hardening_id, version, change_note) VALUES (%s,%s,%s)", (item["id"], "1.0", data.get("change_note","")))
        return _fmt_hard(item, tags, solutions)


@app.put("/hardening")
async def hardening_put(request: Request):
    data = await request.json()
    hard_id = data.pop("id")
    with db() as (conn, cur):
        cur.execute(
            "UPDATE hardenings SET name=%s, owner=%s, status=%s, description=%s, updated_at=now() WHERE id=%s RETURNING *",
            (data["name"], data.get("owner",""), data.get("status","in_development"), data.get("description",""), hard_id),
        )
        item = row_to_dict(cur, cur.fetchone())
        cur.execute("DELETE FROM hardening_tags WHERE hardening_id=%s", (hard_id,))
        tags = _upsert_hard_tags(cur, hard_id, data.get("tags", []))
        cur.execute("DELETE FROM hardening_solutions WHERE hardening_id=%s", (hard_id,))
        solutions = _link_hard_solutions(cur, hard_id, data.get("solutionIds", []))
        cur.execute("SELECT MAX(version) FROM hardening_versions WHERE hardening_id=%s", (hard_id,))
        last = cur.fetchone()[0] or "0.0"
        major, minor = last.split(".")
        cur.execute("INSERT INTO hardening_versions (hardening_id, version, change_note) VALUES (%s,%s,%s)", (hard_id, f"{major}.{int(minor)+1}", data.get("change_note","")))
        return _fmt_hard(item, tags, solutions)


def _get_hard_tags(cur, hard_id):
    cur.execute("SELECT t.id, t.name FROM tags t JOIN hardening_tags ht ON t.id=ht.tag_id WHERE ht.hardening_id=%s ORDER BY t.name", (hard_id,))
    return [{"id": r[0], "name": r[1]} for r in cur.fetchall()]


def _upsert_hard_tags(cur, hard_id, tag_names):
    tags = []
    for name in tag_names:
        cur.execute("INSERT INTO tags (name) VALUES (%s) ON CONFLICT (name) DO UPDATE SET name=EXCLUDED.name RETURNING id, name", (name,))
        tag = cur.fetchone()
        cur.execute("INSERT INTO hardening_tags (hardening_id, tag_id) VALUES (%s,%s) ON CONFLICT DO NOTHING", (hard_id, tag[0]))
        tags.append({"id": tag[0], "name": tag[1]})
    return tags


def _link_hard_solutions(cur, hard_id, sol_ids):
    solutions = []
    for sid in (sol_ids or []):
        cur.execute("INSERT INTO hardening_solutions (hardening_id, solution_id) VALUES (%s,%s) ON CONFLICT DO NOTHING", (hard_id, sid))
        cur.execute("SELECT id, name FROM decisions WHERE id=%s", (sid,))
        row = cur.fetchone()
        if row:
            solutions.append({"id": row[0], "name": row[1]})
    return solutions


def _get_hard_req_domains(cur, hard_id):
    cur.execute("""
        SELECT td.id, td.name,
               r.id as req_id, r.short_desc, r.req_type, r.score_point, r.score_weight, r.is_procurement
        FROM tech_domains td
        JOIN requirement_tech_domain rtd ON td.id = rtd.tech_domain_id
        JOIN requirements r ON r.id = rtd.requirement_id
        ORDER BY td.name, r.short_desc
    """)
    rows = cur.fetchall()
    domains = {}
    for row in rows:
        td_id, td_name, req_id, short_desc, req_type, score_point, score_weight, is_procurement = row
        if td_id not in domains:
            domains[td_id] = {"id": td_id, "name": td_name, "requirements": []}
        domains[td_id]["requirements"].append({
            "id": req_id, "shortDesc": short_desc, "reqType": req_type,
            "scorePoint": score_point, "scoreWeight": score_weight, "isProcurement": is_procurement,
        })
    return list(domains.values())


def _fmt_env_status(r):
    return {"env": r["env"], "status": r["status"], "iodMode": r.get("iod_mode", "both")}


def _fmt_hard(r, tags, solutions):
    return {
        "id": r["id"], "name": r["name"], "owner": r["owner"],
        "status": r["status"], "statusLabel": STATUS_LABELS.get(r["status"], r["status"]),
        "description": r["description"],
        "createdAt": fmt_dt(r["created_at"]), "updatedAt": fmt_dt(r["updated_at"]),
        "tags": tags, "solutions": solutions,
    }


def _fmt_hard_ver(r):
    return {"id": r["id"], "version": r["version"], "changeNote": r["change_note"], "changedAt": fmt_dt(r["changed_at"])}


# ═══════════════════════════════════════════════════════════════════════════════
# ARCH-TEMPLATES
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/arch-templates")
async def arch_templates_get(request: Request):
    params = dict(request.query_params)
    if "tags_suggest" in params:
        q = params["tags_suggest"]
        with db() as (conn, cur):
            cur.execute("SELECT id, name FROM tags WHERE name ILIKE %s ORDER BY name LIMIT 20", (f"%{q}%",))
            return [{"id": r[0], "name": r[1]} for r in cur.fetchall()]
    if "templates_suggest" in params:
        q = params["templates_suggest"]
        with db() as (conn, cur):
            cur.execute("SELECT id, name FROM arch_templates WHERE name ILIKE %s ORDER BY name LIMIT 20", (f"%{q}%",))
            return [{"id": r[0], "name": r[1]} for r in cur.fetchall()]
    if "tech_suggest" in params:
        q = params["tech_suggest"]
        with db() as (conn, cur):
            cur.execute("SELECT id, name FROM technologies WHERE name ILIKE %s ORDER BY name LIMIT 20", (f"%{q}%",))
            return [{"id": r[0], "name": r[1]} for r in cur.fetchall()]
    if "decisions_suggest" in params:
        q = params["decisions_suggest"]
        with db() as (conn, cur):
            cur.execute("SELECT id, name FROM decisions WHERE name ILIKE %s ORDER BY name LIMIT 20", (f"%{q}%",))
            return [{"id": r[0], "name": r[1]} for r in cur.fetchall()]

    tmpl_id = params.get("id")
    export_mode = params.get("export") == "1"
    with db() as (conn, cur):
        if tmpl_id:
            cur.execute("SELECT * FROM arch_templates WHERE id=%s", (tmpl_id,))
            row = cur.fetchone()
            if not row:
                return JSONResponse({"error": "Not found"}, status_code=404)
            item = row_to_dict(cur, row)
            return _build_tmpl_detail(cur, item, export_mode)
        else:
            cur.execute("SELECT * FROM arch_templates ORDER BY updated_at DESC")
            items = rows_to_list(cur, cur.fetchall())
            result = []
            for item in items:
                tags = _get_tmpl_tags(cur, item["id"])
                result.append(_fmt_tmpl(item, tags))
            return result


@app.post("/arch-templates")
async def arch_templates_post(request: Request):
    params = dict(request.query_params)
    data = await request.json()

    if params.get("action") == "add_mermaid":
        with db() as (conn, cur):
            cur.execute(
                "INSERT INTO arch_template_mermaid (template_id, title, code) VALUES (%s,%s,%s) RETURNING *",
                (data["template_id"], data.get("title",""), data["code"]),
            )
            return _fmt_mermaid(row_to_dict(cur, cur.fetchone()))

    if params.get("action") == "upload_file":
        tmpl_id = data["template_id"]
        filename = data["filename"]
        content_type = data.get("content_type", "application/octet-stream")
        file_bytes = base64.b64decode(data["data_base64"])
        s3_key = f"arch-tmpl-files/{tmpl_id}/{uuid.uuid4()}_{filename}"
        s3 = get_s3()
        s3.put_object(Bucket="files", Key=s3_key, Body=file_bytes, ContentType=content_type)
        with db() as (conn, cur):
            cur.execute(
                "INSERT INTO arch_template_files (template_id, filename, s3_key, content_type, size_bytes) VALUES (%s,%s,%s,%s,%s) RETURNING *",
                (tmpl_id, filename, s3_key, content_type, len(file_bytes)),
            )
            return _fmt_file(row_to_dict(cur, cur.fetchone()))

    with db() as (conn, cur):
        cur.execute(
            "INSERT INTO arch_templates (name, owner, status, template_type, description) VALUES (%s,%s,%s,%s,%s) RETURNING *",
            (data["name"], data.get("owner",""), data.get("status","in_development"),
             data.get("template_type","technical"), data.get("description","")),
        )
        item = row_to_dict(cur, cur.fetchone())
        tags = _upsert_tmpl_tags(cur, item["id"], data.get("tags", []))
        _link_tmpl_techs(cur, item["id"], data.get("technologyIds", []))
        _link_tmpl_decisions(cur, item["id"], data.get("decisionIds", []))
        _link_tmpl_related(cur, item["id"], data.get("relatedTemplateIds", []))
        _save_tmpl_links(cur, item["id"], data.get("externalLinks", []))
        cur.execute("INSERT INTO arch_template_versions (template_id, version, change_note) VALUES (%s,%s,%s)", (item["id"], "1.0", data.get("change_note","")))
        return _fmt_tmpl(item, tags)


@app.put("/arch-templates")
async def arch_templates_put(request: Request):
    params = dict(request.query_params)
    data = await request.json()

    if params.get("action") == "update_mermaid":
        with db() as (conn, cur):
            cur.execute(
                "UPDATE arch_template_mermaid SET title=%s, code=%s, updated_at=now() WHERE id=%s RETURNING *",
                (data["title"], data["code"], data["id"]),
            )
            return _fmt_mermaid(row_to_dict(cur, cur.fetchone()))

    tmpl_id = data.pop("id")
    with db() as (conn, cur):
        cur.execute(
            "UPDATE arch_templates SET name=%s, owner=%s, status=%s, template_type=%s, description=%s, updated_at=now() WHERE id=%s RETURNING *",
            (data["name"], data.get("owner",""), data.get("status","in_development"),
             data.get("template_type","technical"), data.get("description",""), tmpl_id),
        )
        item = row_to_dict(cur, cur.fetchone())
        cur.execute("DELETE FROM arch_template_tags WHERE template_id=%s", (tmpl_id,))
        tags = _upsert_tmpl_tags(cur, tmpl_id, data.get("tags", []))
        cur.execute("DELETE FROM arch_template_technologies WHERE template_id=%s", (tmpl_id,))
        _link_tmpl_techs(cur, tmpl_id, data.get("technologyIds", []))
        cur.execute("DELETE FROM arch_template_decisions WHERE template_id=%s", (tmpl_id,))
        _link_tmpl_decisions(cur, tmpl_id, data.get("decisionIds", []))
        cur.execute("DELETE FROM arch_template_links WHERE template_id=%s OR related_id=%s", (tmpl_id, tmpl_id))
        _link_tmpl_related(cur, tmpl_id, data.get("relatedTemplateIds", []))
        cur.execute("DELETE FROM arch_template_ext_links WHERE template_id=%s", (tmpl_id,))
        _save_tmpl_links(cur, tmpl_id, data.get("externalLinks", []))
        cur.execute("SELECT MAX(version) FROM arch_template_versions WHERE template_id=%s", (tmpl_id,))
        last = cur.fetchone()[0] or "0.0"
        major, minor = last.split(".")
        cur.execute("INSERT INTO arch_template_versions (template_id, version, change_note) VALUES (%s,%s,%s)", (tmpl_id, f"{major}.{int(minor)+1}", data.get("change_note","")))
        return _fmt_tmpl(item, tags)


def _build_tmpl_detail(cur, item, export_mode=False):
    tmpl_id = item["id"]
    tags = _get_tmpl_tags(cur, tmpl_id)
    cur.execute("SELECT t.id, t.name FROM technologies t JOIN arch_template_technologies att ON t.id=att.technology_id WHERE att.template_id=%s", (tmpl_id,))
    techs = [{"id": r[0], "name": r[1]} for r in cur.fetchall()]
    cur.execute("SELECT d.id, d.name FROM decisions d JOIN arch_template_decisions atd ON d.id=atd.decision_id WHERE atd.template_id=%s", (tmpl_id,))
    decisions = [{"id": r[0], "name": r[1]} for r in cur.fetchall()]
    cur.execute("SELECT at2.id, at2.name FROM arch_templates at2 JOIN arch_template_links atl ON at2.id=atl.related_id WHERE atl.template_id=%s AND atl.is_active=TRUE", (tmpl_id,))
    related = [{"id": r[0], "name": r[1]} for r in cur.fetchall()]
    cur.execute("SELECT * FROM arch_template_mermaid WHERE template_id=%s ORDER BY created_at", (tmpl_id,))
    diagrams = rows_to_list(cur, cur.fetchall())
    cur.execute("SELECT * FROM arch_template_files WHERE template_id=%s ORDER BY uploaded_at", (tmpl_id,))
    files = rows_to_list(cur, cur.fetchall())
    cur.execute("SELECT * FROM arch_template_versions WHERE template_id=%s ORDER BY changed_at DESC", (tmpl_id,))
    versions = rows_to_list(cur, cur.fetchall())
    cur.execute("SELECT * FROM arch_template_ext_links WHERE template_id=%s ORDER BY id", (tmpl_id,))
    ext_links = rows_to_list(cur, cur.fetchall())

    reqs = []
    if export_mode:
        cur.execute("""
            SELECT r.id, r.short_desc, r.description, r.req_type, r.score_point, r.score_weight,
                   r.normative_doc, r.control_metrics, r.fulfillment_method, r.is_procurement,
                   td.id as td_id, td.name as td_name
            FROM requirements r
            JOIN requirement_tech_domain rtd ON r.id=rtd.requirement_id
            JOIN tech_domains td ON td.id=rtd.tech_domain_id
            WHERE td.id IN (
                SELECT att2.technology_id FROM arch_template_technologies att2 WHERE att2.template_id=%s
            )
            ORDER BY td.name, r.short_desc
        """, (tmpl_id,))
        for row in cur.fetchall():
            reqs.append({
                "id": row[0], "shortDesc": row[1], "description": row[2],
                "reqType": row[3], "scorePoint": row[4], "scoreWeight": row[5],
                "normativeDoc": row[6], "controlMetrics": row[7], "fulfillmentMethod": row[8],
                "isProcurement": row[9], "techDomainId": row[10], "techDomainName": row[11],
            })

    return {
        **_fmt_tmpl(item, tags),
        "technologies": techs,
        "decisions": decisions,
        "relatedTemplates": related,
        "mermaidDiagrams": [_fmt_mermaid(d) for d in diagrams],
        "files": [_fmt_tmpl_file(f) for f in files],
        "versions": [_fmt_tmpl_ver(v) for v in versions],
        "externalLinks": [{"id": l["id"], "url": l["url"], "label": l["label"]} for l in ext_links],
        "requirements": reqs,
    }


def _get_tmpl_tags(cur, tmpl_id):
    cur.execute("SELECT t.id, t.name FROM tags t JOIN arch_template_tags att ON t.id=att.tag_id WHERE att.template_id=%s ORDER BY t.name", (tmpl_id,))
    return [{"id": r[0], "name": r[1]} for r in cur.fetchall()]


def _upsert_tmpl_tags(cur, tmpl_id, tag_names):
    tags = []
    for name in tag_names:
        cur.execute("INSERT INTO tags (name) VALUES (%s) ON CONFLICT (name) DO UPDATE SET name=EXCLUDED.name RETURNING id, name", (name,))
        tag = cur.fetchone()
        cur.execute("INSERT INTO arch_template_tags (template_id, tag_id) VALUES (%s,%s) ON CONFLICT DO NOTHING", (tmpl_id, tag[0]))
        tags.append({"id": tag[0], "name": tag[1]})
    return tags


def _link_tmpl_techs(cur, tmpl_id, tech_ids):
    for tid in (tech_ids or []):
        cur.execute("INSERT INTO arch_template_technologies (template_id, technology_id) VALUES (%s,%s) ON CONFLICT DO NOTHING", (tmpl_id, tid))


def _link_tmpl_decisions(cur, tmpl_id, dec_ids):
    for did in (dec_ids or []):
        cur.execute("INSERT INTO arch_template_decisions (template_id, decision_id) VALUES (%s,%s) ON CONFLICT DO NOTHING", (tmpl_id, did))


def _link_tmpl_related(cur, tmpl_id, rel_ids):
    for rid in (rel_ids or []):
        cur.execute("INSERT INTO arch_template_links (template_id, related_id, is_active) VALUES (%s,%s,TRUE) ON CONFLICT DO NOTHING", (tmpl_id, rid))


def _save_tmpl_links(cur, tmpl_id, ext_links):
    for link in (ext_links or []):
        cur.execute("INSERT INTO arch_template_ext_links (template_id, url, label) VALUES (%s,%s,%s)", (tmpl_id, link.get("url",""), link.get("label","")))


def _fmt_tmpl(r, tags):
    return {
        "id": r["id"], "name": r["name"], "owner": r["owner"],
        "status": r["status"], "statusLabel": STATUS_LABELS.get(r["status"], r["status"]),
        "templateType": r.get("template_type","technical"),
        "description": r["description"],
        "createdAt": fmt_dt(r["created_at"]), "updatedAt": fmt_dt(r["updated_at"]),
        "tags": tags,
    }


def _fmt_tmpl_ver(r):
    return {"id": r["id"], "version": r["version"], "changeNote": r["change_note"], "changedAt": fmt_dt(r["changed_at"])}


def _fmt_tmpl_file(r):
    return {"id": r["id"], "filename": r["filename"], "s3Key": r["s3_key"], "contentType": r["content_type"], "sizeBytes": r["size_bytes"], "uploadedAt": fmt_dt(r["uploaded_at"]), "url": s3_url(r["s3_key"])}


# ── Health check ──────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok"}
