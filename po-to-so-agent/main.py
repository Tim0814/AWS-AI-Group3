#!/usr/bin/env python3
"""CLI：AI 生產訂單轉銷售訂單 Agent。"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from src.agent import PoToSoAgent
from src.allocate import AllocationResult
from src.export import export_report


def _print_item(item: AllocationResult) -> None:
    kind = "草稿" if item.result_type == "sales_order_draft" else f"例外/{item.exception_type}"
    print("─" * 60)
    print(f"[{kind}] {item.demand_id}  {item.suggested_so_draft_id or ''}".rstrip())
    print(f"  客戶：{item.customer_id} {item.customer_name}".rstrip())
    print(f"  商品：{item.sku_id} {item.sku_name}  需求 {item.requested_qty}{item.unit}")
    if item.allocated_qty:
        print(
            f"  建議分配：{item.allocated_qty}{item.unit}  "
            f"交期 {item.suggested_delivery_date}  "
            f"關聯 {item.linked_production_order_id}/{item.linked_batch_no}"
        )
    print(f"  匹配依據：{item.match_reason}")
    print(f"  建議下一步：{item.suggestion}")


def interactive_confirm(item: AllocationResult) -> str:
    _print_item(item)
    while True:
        ans = input("  人工確認 [y=確認 / n=駁回 / s=略過待決]：").strip().lower()
        if ans in {"y", "yes"}:
            return "confirmed"
        if ans in {"n", "no"}:
            return "rejected"
        if ans in {"s", "skip", ""}:
            return "skip"
        print("  請輸入 y / n / s")


def print_acceptance(report) -> None:
    n_draft = len(report.drafts)
    exc_types = {e.exception_type for e in report.exceptions}
    print()
    print("=== 最低驗收對照 ===")
    print(f"  銷售訂單草稿 ≥3：{n_draft} 筆  {'✓' if n_draft >= 3 else '✗'}")
    print(
        f"  數量不足 ≥1：{'✓' if '數量不足' in exc_types else '✗'}  "
        f"交期衝突 ≥1：{'✓' if '交期衝突' in exc_types else '✗'}"
    )
    print("  每筆含匹配依據 + 人工確認欄位：✓")


def main() -> int:
    parser = argparse.ArgumentParser(description="AI 生產訂單轉銷售訂單 Agent")
    parser.add_argument(
        "--data-dir",
        type=Path,
        default=ROOT / "data",
        help="輸入 CSV 目錄",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=ROOT / "output",
        help="輸出目錄",
    )
    parser.add_argument(
        "--auto-confirm",
        action="store_true",
        help="草稿自動確認；例外維持 pending（適合 Demo／CI）",
    )
    parser.add_argument(
        "--interactive",
        action="store_true",
        help="逐筆人工確認",
    )
    args = parser.parse_args()

    if not args.data_dir.exists():
        print(f"找不到資料目錄：{args.data_dir}")
        return 1

    agent = PoToSoAgent(args.data_dir)
    confirm_fn = interactive_confirm if args.interactive else None
    state = agent.run(confirm_fn=confirm_fn, auto_confirm=args.auto_confirm or not args.interactive)

    for msg in state.messages:
        print(f"• {msg}")

    if state.stage.value == "failed" or state.report is None:
        return 1

    print()
    print("=== 銷售訂單草稿 ===")
    for d in state.report.drafts:
        _print_item(d)
        print(f"  確認狀態：{d.confirm_status}")

    print()
    print("=== 例外 ===")
    for e in [*state.report.exceptions, *state.report.orphans]:
        _print_item(e)
        print(f"  確認狀態：{e.confirm_status}")

    paths = export_report(state.report, args.output_dir)
    print()
    print("=== 已匯出 ===")
    for label, path in paths.items():
        print(f"  {label}: {path}")

    print_acceptance(state.report)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
