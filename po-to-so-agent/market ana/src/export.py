"""匯出草稿與例外 CSV。"""

from __future__ import annotations

import csv
from pathlib import Path

from .allocate import AllocationReport, results_as_dicts

DRAFT_FIELDS = [
    "suggested_so_draft_id",
    "demand_id",
    "customer_id",
    "customer_name",
    "sku_id",
    "sku_name",
    "allocated_qty",
    "unit",
    "suggested_delivery_date",
    "required_delivery_date",
    "linked_production_order_id",
    "linked_batch_no",
    "match_reason",
    "suggestion",
    "human_confirm_required",
    "confirm_status",
]

EXCEPTION_FIELDS = [
    "demand_id",
    "exception_type",
    "customer_id",
    "customer_name",
    "sku_id",
    "sku_name",
    "requested_qty",
    "allocated_qty",
    "required_delivery_date",
    "suggested_delivery_date",
    "linked_production_order_id",
    "linked_batch_no",
    "match_reason",
    "suggestion",
    "human_confirm_required",
    "confirm_status",
]


def _write(path: Path, fieldnames: list[str], rows: list[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        for row in rows:
            writer.writerow({k: row.get(k, "") for k in fieldnames})


def export_report(report: AllocationReport, output_dir: Path) -> dict[str, Path]:
    all_rows = results_as_dicts(report)
    drafts = [r for r in all_rows if r["result_type"] == "sales_order_draft"]
    exceptions = [r for r in all_rows if r["result_type"] == "exception"]

    paths = {
        "drafts": output_dir / "sales_order_drafts.csv",
        "exceptions": output_dir / "exceptions.csv",
        "all": output_dir / "all_results.csv",
    }
    _write(paths["drafts"], DRAFT_FIELDS, drafts)
    _write(paths["exceptions"], EXCEPTION_FIELDS, exceptions)
    _write(paths["all"], list(all_rows[0].keys()) if all_rows else DRAFT_FIELDS, all_rows)
    return paths
