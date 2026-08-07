#!/usr/bin/env python3
"""PO→SO Agent 網頁（標準庫 WSGI，無需額外套件）。"""

from __future__ import annotations

import json
import sys
import traceback
from dataclasses import asdict
from http import HTTPStatus
from pathlib import Path
from wsgiref.simple_server import make_server

ROOT = Path(__file__).resolve().parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from src.agent import PoToSoAgent
from src.export import export_report

DATA_DIR = ROOT / "data"
OUTPUT_DIR = ROOT / "output"
WEB_DIR = ROOT / "web"

# 記憶體中的最新執行結果
_SESSION: dict = {
    "messages": [],
    "summary": {},
    "items": [],  # list[dict]
    "stage": "idle",
}


def _items_from_report(report) -> list[dict]:
    return [asdict(x) for x in report.all_items]


def _find_item(demand_id: str) -> dict | None:
    for item in _SESSION["items"]:
        if item["demand_id"] == demand_id:
            return item
    return None


def run_agent() -> dict:
    agent = PoToSoAgent(DATA_DIR)
    state = agent.run(auto_confirm=False)
    if state.report is None:
        _SESSION.update(
            {
                "stage": "failed",
                "messages": state.messages,
                "summary": state.summary,
                "items": [],
            }
        )
        return {"ok": False, "session": _SESSION}

    items = _items_from_report(state.report)
    _SESSION.update(
        {
            "stage": state.stage.value,
            "messages": state.messages,
            "summary": {
                **state.summary,
                "draft_count": len(state.report.drafts),
                "exception_count": len(state.report.exceptions) + len(state.report.orphans),
            },
            "items": items,
            "report": state.report,
        }
    )
    export_report(state.report, OUTPUT_DIR)
    return {"ok": True, "session": public_session()}


def public_session() -> dict:
    return {
        "stage": _SESSION.get("stage", "idle"),
        "messages": _SESSION.get("messages", []),
        "summary": _SESSION.get("summary", {}),
        "items": _SESSION.get("items", []),
    }


def confirm_item(demand_id: str, decision: str) -> dict:
    if decision not in {"confirmed", "rejected", "pending"}:
        return {"ok": False, "error": "invalid decision"}
    item = _find_item(demand_id)
    if not item:
        return {"ok": False, "error": "not found"}
    item["confirm_status"] = decision

    # 同步回 report 物件（若存在）後再匯出
    report = _SESSION.get("report")
    if report is not None:
        for obj in report.all_items:
            if obj.demand_id == demand_id:
                obj.confirm_status = decision
                break
        export_report(report, OUTPUT_DIR)

    return {"ok": True, "item": item, "session": public_session()}


def confirm_all_drafts() -> dict:
    report = _SESSION.get("report")
    for item in _SESSION.get("items", []):
        if item.get("result_type") == "sales_order_draft":
            item["confirm_status"] = "confirmed"
            if report is not None:
                for obj in report.all_items:
                    if obj.demand_id == item["demand_id"]:
                        obj.confirm_status = "confirmed"
                        break
    if report is not None:
        export_report(report, OUTPUT_DIR)
    return {"ok": True, "session": public_session()}


def read_body(environ) -> bytes:
    try:
        length = int(environ.get("CONTENT_LENGTH") or 0)
    except ValueError:
        length = 0
    return environ["wsgi.input"].read(length) if length else b""


def json_response(start_response, payload: dict, status: int = 200):
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    status_line = f"{status} {HTTPStatus(status).phrase}"
    start_response(
        status_line,
        [
            ("Content-Type", "application/json; charset=utf-8"),
            ("Content-Length", str(len(body))),
            ("Cache-Control", "no-store"),
        ],
    )
    return [body]


def html_response(start_response, html: str, status: int = 200):
    body = html.encode("utf-8")
    status_line = f"{status} {HTTPStatus(status).phrase}"
    start_response(
        status_line,
        [
            ("Content-Type", "text/html; charset=utf-8"),
            ("Content-Length", str(len(body))),
            ("Cache-Control", "no-store"),
        ],
    )
    return [body]


def static_response(start_response, path: Path, content_type: str):
    body = path.read_bytes()
    start_response(
        "200 OK",
        [
            ("Content-Type", content_type),
            ("Content-Length", str(len(body))),
            ("Cache-Control", "no-cache"),
        ],
    )
    return [body]


def application(environ, start_response):
    method = environ["REQUEST_METHOD"]
    path = environ.get("PATH_INFO") or "/"

    try:
        if method == "GET" and path == "/":
            return static_response(
                start_response, WEB_DIR / "index.html", "text/html; charset=utf-8"
            )
        if method == "GET" and path == "/static/styles.css":
            return static_response(
                start_response, WEB_DIR / "static" / "styles.css", "text/css; charset=utf-8"
            )
        if method == "GET" and path == "/static/app.js":
            return static_response(
                start_response,
                WEB_DIR / "static" / "app.js",
                "application/javascript; charset=utf-8",
            )
        if method == "GET" and path == "/api/session":
            return json_response(start_response, {"ok": True, "session": public_session()})
        if method == "POST" and path == "/api/run":
            return json_response(start_response, run_agent())
        if method == "POST" and path == "/api/confirm":
            raw = read_body(environ)
            data = json.loads(raw.decode("utf-8") or "{}")
            return json_response(
                start_response,
                confirm_item(data.get("demand_id", ""), data.get("decision", "")),
            )
        if method == "POST" and path == "/api/confirm-drafts":
            return json_response(start_response, confirm_all_drafts())

        return json_response(start_response, {"ok": False, "error": "not found"}, 404)
    except Exception as exc:  # noqa: BLE001
        traceback.print_exc()
        return json_response(
            start_response,
            {"ok": False, "error": str(exc)},
            500,
        )


def main():
    import argparse

    parser = argparse.ArgumentParser(description="PO→SO Agent 網頁伺服器")
    parser.add_argument("--host", default="127.0.0.1", help="127.0.0.1=僅本機；0.0.0.0=區網可連")
    parser.add_argument("--port", type=int, default=8765)
    args = parser.parse_args()

    if not (WEB_DIR / "index.html").exists():
        raise SystemExit(f"找不到 {WEB_DIR / 'index.html'}")

    print(f"PO→SO Agent 網頁： http://{args.host}:{args.port}", flush=True)
    if args.host == "0.0.0.0":
        print("區網夥伴請改連你的電腦 IP，例如 http://<你的IP>:8765", flush=True)
    print("按 Ctrl+C 結束", flush=True)
    with make_server(args.host, args.port, application) as httpd:
        httpd.serve_forever()


if __name__ == "__main__":
    main()
