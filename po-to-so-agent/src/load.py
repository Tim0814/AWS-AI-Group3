"""資料載入與基本驗證。"""

from __future__ import annotations

import csv
from dataclasses import dataclass, field
from datetime import date, datetime
from pathlib import Path
from typing import Any


PRIORITY_RANK = {"高": 0, "中": 1, "低": 2}


def _parse_date(value: str) -> date:
    return datetime.strptime(value.strip(), "%Y-%m-%d").date()


def _read_csv(path: Path) -> list[dict[str, str]]:
    with path.open(encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


@dataclass
class Product:
    sku_id: str
    sku_name: str
    category: str
    spec: str
    unit: str
    shelf_life_days: int
    status: str


@dataclass
class ProductionLine:
    production_order_id: str
    line_no: int
    sku_id: str
    sku_name: str
    qty: int
    unit: str
    planned_finish_date: date
    batch_no: str
    plant: str
    status: str


@dataclass
class InventoryRow:
    sku_id: str
    sku_name: str
    warehouse: str
    available_qty: int
    unit: str
    reserved_qty: int
    as_of_date: date


@dataclass
class Demand:
    demand_id: str
    customer_id: str
    customer_name: str
    channel: str
    sku_id: str
    sku_name_raw: str
    qty: int
    unit: str
    required_delivery_date: date
    priority: str
    order_source: str
    notes: str


@dataclass
class Dataset:
    products: dict[str, Product]
    production_lines: list[ProductionLine]
    inventory: dict[str, InventoryRow]
    demands: list[Demand]
    validation_issues: list[str] = field(default_factory=list)


def load_dataset(data_dir: Path) -> Dataset:
    products_rows = _read_csv(data_dir / "product_master.csv")
    production_rows = _read_csv(data_dir / "production_order.csv")
    inventory_rows = _read_csv(data_dir / "inventory.csv")
    demand_rows = _read_csv(data_dir / "customer_demand.csv")

    products = {
        r["sku_id"]: Product(
            sku_id=r["sku_id"],
            sku_name=r["sku_name"],
            category=r["category"],
            spec=r["spec"],
            unit=r["unit"],
            shelf_life_days=int(r["shelf_life_days"]),
            status=r["status"],
        )
        for r in products_rows
    }

    production_lines = [
        ProductionLine(
            production_order_id=r["production_order_id"],
            line_no=int(r["line_no"]),
            sku_id=r["sku_id"],
            sku_name=r["sku_name"],
            qty=int(r["qty"]),
            unit=r["unit"],
            planned_finish_date=_parse_date(r["planned_finish_date"]),
            batch_no=r["batch_no"],
            plant=r["plant"],
            status=r["status"],
        )
        for r in production_rows
    ]

    inventory = {
        r["sku_id"]: InventoryRow(
            sku_id=r["sku_id"],
            sku_name=r["sku_name"],
            warehouse=r["warehouse"],
            available_qty=int(r["available_qty"]),
            unit=r["unit"],
            reserved_qty=int(r["reserved_qty"]),
            as_of_date=_parse_date(r["as_of_date"]),
        )
        for r in inventory_rows
    }

    demands = [
        Demand(
            demand_id=r["demand_id"],
            customer_id=r["customer_id"],
            customer_name=r["customer_name"],
            channel=r["channel"],
            sku_id=r["sku_id"],
            sku_name_raw=r["sku_name_raw"],
            qty=int(r["qty"]),
            unit=r["unit"],
            required_delivery_date=_parse_date(r["required_delivery_date"]),
            priority=r["priority"],
            order_source=r["order_source"],
            notes=r.get("notes") or "",
        )
        for r in demand_rows
    ]

    issues: list[str] = []
    if not production_lines:
        issues.append("生產訂單為空")
    if not inventory:
        issues.append("庫存表為空")
    if len(demands) < 5:
        issues.append(f"客戶需求僅 {len(demands)} 筆，最低要求 ≥5")
    if len(products) < 5:
        issues.append(f"商品主檔僅 {len(products)} 項，最低要求 ≥5")

    for line in production_lines:
        if line.sku_id not in products:
            issues.append(f"生產單行 {line.line_no} 品號 {line.sku_id} 不在主檔")
    for sku, inv in inventory.items():
        if sku not in products:
            issues.append(f"庫存品號 {sku} 不在主檔")

    return Dataset(
        products=products,
        production_lines=production_lines,
        inventory=inventory,
        demands=demands,
        validation_issues=issues,
    )


def dataset_summary(ds: Dataset) -> dict[str, Any]:
    return {
        "products": len(ds.products),
        "production_lines": len(ds.production_lines),
        "inventory_skus": len(ds.inventory),
        "demands": len(ds.demands),
        "validation_issues": ds.validation_issues,
    }
