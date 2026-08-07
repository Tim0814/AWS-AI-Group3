# AI 生產訂單轉銷售訂單 Agent（第 3 組 Demo）

Rule decides → Explain → Human confirms。不寫入正式 ERP。

## 網頁版（建議 Demo）

```bash
cd po-to-so-agent
python3 web_server.py
```

瀏覽器開啟：http://127.0.0.1:8765

- 按「執行 Agent」產生草稿與例外
- 每筆可「確認／駁回／待決」
- 「確認全部草稿」一鍵確認通過項

## CLI

```bash
cd po-to-so-agent
python3 main.py --auto-confirm
```

互動確認：

```bash
python3 main.py --interactive
```

## 輸入（`data/`）

| 檔案 | 說明 |
|------|------|
| product_master.csv | 商品主檔 ≥5 |
| production_order.csv | 1 張生產單 |
| inventory.csv | 庫存表 |
| customer_demand.csv | ≥5 筆客戶需求 |

## 輸出（`output/`）

| 檔案 | 說明 |
|------|------|
| sales_order_drafts.csv | 銷售訂單草稿（含匹配依據、確認狀態） |
| exceptions.csv | 例外（數量不足／交期衝突／品號不一致／孤兒生產） |
| all_results.csv | 全部結果 |

## Agent 流程

```text
load → validate → allocate → explain → await_human → done
```

核心規則見 `data/README.md`。
