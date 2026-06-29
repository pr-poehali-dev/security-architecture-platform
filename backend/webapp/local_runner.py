"""
Локальный HTTP-сервер для разработки.
Эмулирует поведение облачных функций (Cloud Functions).

Каждая функция из /backend/webapp/<name>/index.py вызывается через handler(event, context),
где event — словарь с httpMethod, headers, queryStringParameters, body.

Маршруты:
  GET/POST/PUT  /org-domains/*    → org-domains/index.py
  GET/POST/PUT  /tech-domains/*   → tech-domains/index.py
  GET/POST/PUT  /technologies/*   → technologies/index.py
  GET/POST/PUT  /requirements/*   → requirements/index.py
  GET/POST/PUT  /decisions/*      → decisions/index.py
  GET/POST/PUT  /hardening/*      → hardening/index.py
  GET/POST/PUT  /arch-templates/* → arch-templates/index.py
"""

import importlib.util
import os
import sys
from pathlib import Path

from flask import Flask, Response, request

app = Flask(__name__)

BASE_DIR = Path(__file__).parent

FUNCTIONS = [
    "org-domains",
    "tech-domains",
    "technologies",
    "requirements",
    "decisions",
    "hardening",
    "arch-templates",
]

_handlers: dict = {}


def load_handler(fn_name: str):
    """Динамически загружает handler из index.py нужной функции."""
    module_name = fn_name.replace("-", "_")
    path = BASE_DIR / fn_name / "index.py"

    if not path.exists():
        raise FileNotFoundError(f"Не найден файл: {path}")

    spec = importlib.util.spec_from_file_location(module_name, path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[module_name] = module
    spec.loader.exec_module(module)
    return module.handler


def get_handler(fn_name: str):
    if fn_name not in _handlers:
        _handlers[fn_name] = load_handler(fn_name)
    return _handlers[fn_name]


class LocalContext:
    request_id = "local-dev-request"
    function_name = "local"
    memory_limit_in_mb = 256
    invoked_function_arn = "arn:local:function"


def dispatch(fn_name: str):
    """Собирает event из Flask-запроса и вызывает handler."""
    handler = get_handler(fn_name)

    event = {
        "httpMethod": request.method,
        "headers": dict(request.headers),
        "queryStringParameters": dict(request.args),
        "body": request.get_data(as_text=True) or "",
        "isBase64Encoded": False,
        "requestContext": {
            "identity": {"sourceIp": request.remote_addr or "127.0.0.1"}
        },
        "path": request.path,
    }

    result = handler(event, LocalContext())

    status_code = result.get("statusCode", 200)
    resp_headers = result.get("headers", {})
    resp_body = result.get("body", "")

    response = Response(resp_body, status=status_code)
    for key, value in resp_headers.items():
        response.headers[key] = value
    response.headers.setdefault("Content-Type", "application/json")

    return response


for fn in FUNCTIONS:
    def make_view(name):
        def view(**_kwargs):
            return dispatch(name)
        view.__name__ = f"fn_{name.replace('-', '_')}"
        return view

    app.add_url_rule(
        f"/{fn}",
        endpoint=f"fn_{fn.replace('-', '_')}",
        view_func=make_view(fn),
        methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    )
    app.add_url_rule(
        f"/{fn}/<path:subpath>",
        endpoint=f"fn_{fn.replace('-', '_')}_sub",
        view_func=make_view(fn),
        methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    )


@app.route("/health")
def health():
    return {"status": "ok", "functions": FUNCTIONS}


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    print(f"Local runner запущен на http://0.0.0.0:{port}")
    for fn in FUNCTIONS:
        print(f"  http://0.0.0.0:{port}/{fn}")
    app.run(host="0.0.0.0", port=port, debug=True, use_reloader=True)
