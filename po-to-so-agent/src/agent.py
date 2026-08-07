"""狀態機式 PO→SO Agent：load → validate → allocate → explain → await_human → done。"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Callable

from .allocate import AllocationReport, AllocationResult, allocate
from .load import Dataset, dataset_summary, load_dataset


class Stage(str, Enum):
    LOAD = "load"
    VALIDATE = "validate"
    ALLOCATE = "allocate"
    EXPLAIN = "explain"
    AWAIT_HUMAN = "await_human"
    DONE = "done"
    FAILED = "failed"


@dataclass
class AgentState:
    stage: Stage = Stage.LOAD
    data_dir: Path | None = None
    dataset: Dataset | None = None
    report: AllocationReport | None = None
    messages: list[str] = field(default_factory=list)
    summary: dict = field(default_factory=dict)


ConfirmFn = Callable[[AllocationResult], str]
"""回傳 confirmed / rejected / skip。"""


class PoToSoAgent:
    """
    Decision-support Agent：
    - 規則引擎決定分配
    - 說明文字由規則產生（可換成 LLM）
    - 人工確認後才算正式草稿
    """

    def __init__(self, data_dir: Path):
        self.state = AgentState(data_dir=data_dir)

    def run(self, confirm_fn: ConfirmFn | None = None, auto_confirm: bool = False) -> AgentState:
        self._load()
        if self.state.stage == Stage.FAILED:
            return self.state
        self._validate()
        if self.state.stage == Stage.FAILED:
            return self.state
        self._allocate()
        self._explain()
        self._await_human(confirm_fn=confirm_fn, auto_confirm=auto_confirm)
        self.state.stage = Stage.DONE
        self.state.messages.append("流程完成：草稿與例外已產出，僅確認項可視為可建立正式訂單。")
        return self.state

    def _load(self) -> None:
        self.state.stage = Stage.LOAD
        assert self.state.data_dir is not None
        try:
            self.state.dataset = load_dataset(self.state.data_dir)
            self.state.summary = dataset_summary(self.state.dataset)
            self.state.messages.append(
                "已讀取資料："
                f"主檔 {self.state.summary['products']}、"
                f"生產行 {self.state.summary['production_lines']}、"
                f"庫存 SKU {self.state.summary['inventory_skus']}、"
                f"需求 {self.state.summary['demands']}。"
            )
            self.state.stage = Stage.VALIDATE
        except Exception as exc:  # noqa: BLE001
            self.state.stage = Stage.FAILED
            self.state.messages.append(f"資料載入失敗：{exc}")

    def _validate(self) -> None:
        assert self.state.dataset is not None
        issues = self.state.dataset.validation_issues
        if issues:
            # 資料集級錯誤視為失敗；品號問題留給分配階段標例外
            fatal = [i for i in issues if "最低要求" in i or "為空" in i]
            if fatal:
                self.state.stage = Stage.FAILED
                self.state.messages.extend(f"驗證失敗：{i}" for i in fatal)
                return
            self.state.messages.extend(f"驗證警示：{i}" for i in issues)
        else:
            self.state.messages.append("資料驗證通過（筆數與主檔參照基本檢查）。")
        self.state.stage = Stage.ALLOCATE

    def _allocate(self) -> None:
        assert self.state.dataset is not None
        self.state.report = allocate(self.state.dataset)
        n_draft = len(self.state.report.drafts)
        n_exc = len(self.state.report.exceptions) + len(self.state.report.orphans)
        self.state.messages.append(
            f"匹配完成：銷售訂單草稿 {n_draft} 筆，例外 {n_exc} 筆。"
        )
        self.state.stage = Stage.EXPLAIN

    def _explain(self) -> None:
        """目前 match_reason / suggestion 已在 allocate 產生；此步預留給 LLM。"""
        assert self.state.report is not None
        self.state.messages.append(
            "已為每筆結果附上匹配依據與建議下一步（Rule decides, AI can explain）。"
        )
        self.state.stage = Stage.AWAIT_HUMAN

    def _await_human(self, confirm_fn: ConfirmFn | None, auto_confirm: bool) -> None:
        assert self.state.report is not None
        items = self.state.report.all_items
        if auto_confirm:
            for item in items:
                # 草稿預設確認；例外預設保留 pending 表示需人決裁
                if item.result_type == "sales_order_draft":
                    item.confirm_status = "confirmed"
                else:
                    item.confirm_status = "pending"
            self.state.messages.append(
                "自動模式：草稿已標記 confirmed；例外仍為 pending（需人工決裁）。"
            )
            return

        if confirm_fn is None:
            for item in items:
                item.confirm_status = "pending"
            self.state.messages.append("未提供確認函式：全部維持 pending。")
            return

        for item in items:
            decision = confirm_fn(item)
            if decision not in {"confirmed", "rejected", "skip", "pending"}:
                decision = "pending"
            if decision == "skip":
                item.confirm_status = "pending"
            else:
                item.confirm_status = decision
        self.state.messages.append("人工確認步驟完成。")
