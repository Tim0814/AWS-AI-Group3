"""規則引擎：可用量計算、需求排序、分配與例外偵測。"""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from datetime import date
from typing import Any

from .load import PRIORITY_RANK, Dataset, Demand, ProductionLine


@dataclass
class AllocationResult:
    demand_id: str
    result_type: str  # sales_order_draft | exception
    suggested_so_draft_id: str
    customer_id: str
    customer_name: str
    sku_id: str
    sku_name: str
    requested_qty: int
    allocated_qty: int
    unit: str
    required_delivery_date: str
    suggested_delivery_date: str
    linked_production_order_id: str
    linked_batch_no: str
    exception_type: str
    match_reason: str
    suggestion: str
    human_confirm_required: str = "Y"
    confirm_status: str = "pending"  # pending | confirmed | rejected


@dataclass
class AllocationReport:
    drafts: list[AllocationResult] = field(default_factory=list)
    exceptions: list[AllocationResult] = field(default_factory=list)
    orphans: list[AllocationResult] = field(default_factory=list)
    available_after: dict[str, int] = field(default_factory=dict)

    @property
    def all_items(self) -> list[AllocationResult]:
        return [*self.drafts, *self.exceptions, *self.orphans]


def _production_by_sku(ds: Dataset) -> dict[str, ProductionLine]:
    """同一 SKU 多行時合併產量，完成日取最晚、批號取第一筆。"""
    merged: dict[str, ProductionLine] = {}
    for line in ds.production_lines:
        if line.sku_id not in merged:
            merged[line.sku_id] = line
        else:
            prev = merged[line.sku_id]
            merged[line.sku_id] = ProductionLine(
                production_order_id=prev.production_order_id,
                line_no=prev.line_no,
                sku_id=prev.sku_id,
                sku_name=prev.sku_name,
                qty=prev.qty + line.qty,
                unit=prev.unit,
                planned_finish_date=max(prev.planned_finish_date, line.planned_finish_date),
                batch_no=prev.batch_no,
                plant=prev.plant,
                status=prev.status,
            )
    return merged


def compute_allocatable(ds: Dataset) -> dict[str, int]:
    prod = _production_by_sku(ds)
    skus = set(ds.products) | set(ds.inventory) | set(prod)
    result: dict[str, int] = {}
    for sku in skus:
        inv = ds.inventory.get(sku)
        on_hand = (inv.available_qty - inv.reserved_qty) if inv else 0
        produced = prod[sku].qty if sku in prod else 0
        result[sku] = on_hand + produced
    return result


def sort_demands(demands: list[Demand]) -> list[Demand]:
    return sorted(
        demands,
        key=lambda d: (
            PRIORITY_RANK.get(d.priority, 99),
            d.required_delivery_date,
            d.demand_id,
        ),
    )


def _fmt(d: date | None) -> str:
    return d.isoformat() if d else ""


def allocate(ds: Dataset) -> AllocationReport:
    remaining = compute_allocatable(ds)
    prod = _production_by_sku(ds)
    report = AllocationReport()
    draft_seq = 0
    matched_skus: set[str] = set()

    for demand in sort_demands(ds.demands):
        sku = demand.sku_id
        prod_line = prod.get(sku)
        po_id = prod_line.production_order_id if prod_line else ""
        batch = prod_line.batch_no if prod_line else ""
        finish = prod_line.planned_finish_date if prod_line else None
        sku_name = (
            ds.products[sku].sku_name
            if sku in ds.products
            else demand.sku_name_raw
        )

        # 1) 品號不一致
        if sku not in ds.products:
            report.exceptions.append(
                AllocationResult(
                    demand_id=demand.demand_id,
                    result_type="exception",
                    suggested_so_draft_id="",
                    customer_id=demand.customer_id,
                    customer_name=demand.customer_name,
                    sku_id=sku,
                    sku_name=sku_name,
                    requested_qty=demand.qty,
                    allocated_qty=0,
                    unit=demand.unit,
                    required_delivery_date=_fmt(demand.required_delivery_date),
                    suggested_delivery_date="",
                    linked_production_order_id=po_id,
                    linked_batch_no=batch,
                    exception_type="品號不一致",
                    match_reason=f"{sku} 不存在於商品主檔，無法進行分配。",
                    suggestion="請訂單人員確認正確品號或更新主檔後重跑。",
                )
            )
            continue

        avail = remaining.get(sku, 0)

        # 2) 交期衝突（數量再怎麼夠也不自動建草稿）
        if finish and finish > demand.required_delivery_date:
            report.exceptions.append(
                AllocationResult(
                    demand_id=demand.demand_id,
                    result_type="exception",
                    suggested_so_draft_id="",
                    customer_id=demand.customer_id,
                    customer_name=demand.customer_name,
                    sku_id=sku,
                    sku_name=sku_name,
                    requested_qty=demand.qty,
                    allocated_qty=0,
                    unit=demand.unit,
                    required_delivery_date=_fmt(demand.required_delivery_date),
                    suggested_delivery_date=_fmt(finish),
                    linked_production_order_id=po_id,
                    linked_batch_no=batch,
                    exception_type="交期衝突",
                    match_reason=(
                        f"品號通過；可分配量 {avail} "
                        f"{'≥' if avail >= demand.qty else '<'} 需求 {demand.qty}；"
                        f"但預計完成日 {_fmt(finish)} 晚於客戶交期 "
                        f"{_fmt(demand.required_delivery_date)}。"
                    ),
                    suggestion="與客戶協商延交、評估改配既有庫存，或取消／改單。需人工決裁。",
                )
            )
            continue

        # 3) 數量不足（不自動部分出貨）
        if avail < demand.qty:
            report.exceptions.append(
                AllocationResult(
                    demand_id=demand.demand_id,
                    result_type="exception",
                    suggested_so_draft_id="",
                    customer_id=demand.customer_id,
                    customer_name=demand.customer_name,
                    sku_id=sku,
                    sku_name=sku_name,
                    requested_qty=demand.qty,
                    allocated_qty=0,
                    unit=demand.unit,
                    required_delivery_date=_fmt(demand.required_delivery_date),
                    suggested_delivery_date=_fmt(finish),
                    linked_production_order_id=po_id,
                    linked_batch_no=batch,
                    exception_type="數量不足",
                    match_reason=(
                        f"品號通過；目前可分配量剩餘 {avail} < 需求 {demand.qty}；"
                        f"依規則不自動部分出貨。"
                    ),
                    suggestion="削量、拆單、尋找其他來源，或調整優先序後重跑。需人工決裁。",
                )
            )
            continue

        # 4) 成功產生草稿
        draft_seq += 1
        draft_id = f"SO-DRAFT-{draft_seq:03d}"
        remaining[sku] = avail - demand.qty
        matched_skus.add(sku)
        ship_date = finish or demand.required_delivery_date
        report.drafts.append(
            AllocationResult(
                demand_id=demand.demand_id,
                result_type="sales_order_draft",
                suggested_so_draft_id=draft_id,
                customer_id=demand.customer_id,
                customer_name=demand.customer_name,
                sku_id=sku,
                sku_name=sku_name,
                requested_qty=demand.qty,
                allocated_qty=demand.qty,
                unit=demand.unit,
                required_delivery_date=_fmt(demand.required_delivery_date),
                suggested_delivery_date=_fmt(ship_date),
                linked_production_order_id=po_id,
                linked_batch_no=batch,
                exception_type="",
                match_reason=(
                    f"品號 {sku} 主檔驗證通過；分配前可分配量 {avail} ≥ 需求 {demand.qty}；"
                    f"生產批 {batch or '-'} 預計完成 {_fmt(finish)} ≤ 交期 "
                    f"{_fmt(demand.required_delivery_date)}；"
                    f"依優先級「{demand.priority}」分配。待人工確認後建立正式訂單。"
                ),
                suggestion="可確認建立銷售訂單草稿；確認前不會寫入正式 ERP。",
            )
        )

    # 5) 孤兒生產：有可分配量且未被任何成功草稿用到
    for sku, qty in remaining.items():
        if sku not in ds.products:
            continue
        # 若該 SKU 完全沒有被任何需求提及，且有產量/庫存
        mentioned = any(d.sku_id == sku for d in ds.demands)
        initial = compute_allocatable(ds).get(sku, 0)
        if initial > 0 and not mentioned:
            pl = prod.get(sku)
            report.orphans.append(
                AllocationResult(
                    demand_id=f"ORPHAN-{sku}",
                    result_type="exception",
                    suggested_so_draft_id="",
                    customer_id="",
                    customer_name="",
                    sku_id=sku,
                    sku_name=ds.products[sku].sku_name,
                    requested_qty=0,
                    allocated_qty=0,
                    unit=ds.products[sku].unit,
                    required_delivery_date="",
                    suggested_delivery_date=_fmt(pl.planned_finish_date) if pl else "",
                    linked_production_order_id=pl.production_order_id if pl else "",
                    linked_batch_no=pl.batch_no if pl else "",
                    exception_type="孤兒生產",
                    match_reason=(
                        f"{sku} 可分配量 {initial}，但沒有對應客戶需求可匹配。"
                    ),
                    suggestion="評估改配其他客戶、促銷、或暫存並監控效期。需人工決裁。",
                )
            )

    report.available_after = remaining
    return report


def results_as_dicts(report: AllocationReport) -> list[dict[str, Any]]:
    return [asdict(item) for item in report.all_items]
