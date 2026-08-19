# 資料庫架構說明（物流 ERP 系統）

> 本文件說明本專案資料庫中每一張表的用途與欄位定義，寫給**不一定熟悉資料庫術語**的協作者閱讀。若你只是要快速理解「這個系統裡有哪些資料、彼此怎麼連動」，建議先看 [資料表總覽](#資料表總覽) 跟 [名詞說明](#名詞說明) 兩節即可。

## 目錄

- [名詞說明](#名詞說明)
- [資料表總覽](#資料表總覽)
- [各資料表詳細說明](#各資料表詳細說明)
  - [warehouses（倉庫主檔）](#warehouses倉庫主檔)
  - [customers（客戶主檔）](#customers客戶主檔)
  - [products（商品主檔）](#products商品主檔)
  - [inventory（庫存批號明細）](#inventory庫存批號明細)
  - [production_batches（生產批次）](#production_batches生產批次)
  - [sales_orders（訂單表頭）](#sales_orders訂單表頭)
  - [order_items（訂單明細）](#order_items訂單明細)
  - [shipments（出貨單表頭）](#shipments出貨單表頭)
  - [shipment_items（出貨明細）](#shipment_items出貨明細)
  - [order_reviews（訂單覆核歷程）](#order_reviews訂單覆核歷程)
  - [stock_movements（庫存流水帳）](#stock_movements庫存流水帳)
- [已知待改善事項](#已知待改善事項)

---

## 名詞說明

| 名詞 | 白話意思 |
|---|---|
| PK／主鍵 | 每筆資料專屬且不重複的編號，例如訂單編號。 |
| FK／外鍵 | 用來連結另一張表的欄位，例如訂單上的客戶編號會連到客戶表。 |
| VARCHAR | 文字資料，例如名稱、編號、地址。 |
| DECIMAL | 可有小數的數字，例如重量、金額、箱數。 |
| DATETIME | 日期加上時間，例如 2026-08-19 09:30。 |
| ENUM | 限定只能從指定選項中選擇的欄位。 |
| 預設值 | 使用者沒填寫時，系統自動帶入的值。 |

---

## 資料表總覽

| 資料表 | 分類 | 代表的意思 |
|---|---|---|
| `warehouses` | 主檔資料 | 倉庫基本資料。 |
| `customers` | 主檔資料 | 客戶基本資料。 |
| `products` | 主檔資料 | 商品基本資料。 |
| `inventory` | 庫存與生產 | 每個倉庫、每個商品、每個批號的現有庫存。 |
| `production_batches` | 庫存與生產 | 工廠的生產批次與完成進度。 |
| `sales_orders` | 訂單交易 | 一張訂單共用的資料，例如客戶、地址、交期。 |
| `order_items` | 訂單交易 | 一張訂單裡實際購買的各個商品。 |
| `shipments` | 出貨物流 | 一次配送或出貨的基本資訊。 |
| `shipment_items` | 出貨物流 | 一次配送中，實際從哪個批號出貨了多少商品。 |
| `order_reviews` | 稽核紀錄 | AI 或人員覆核訂單的歷程與原因。 |
| `stock_movements` | 庫存與生產 | 庫存每一次入庫、保留、出貨、調整的紀錄。 |

**資料表之間的關聯（簡化版）：**

```
customers ──┐
            ├─▶ sales_orders ──▶ order_items ──┐
warehouses ─┘                                  │
     │                                         ▼
     ├──▶ inventory ◀── products         shipment_items ◀── shipments ◀── sales_orders
     │        │
     └──▶ stock_movements ◀────────────────────┘

sales_orders ──▶ order_reviews
```

---

## 各資料表詳細說明

### warehouses（倉庫主檔）

倉庫基本資料。

| 欄位 | 屬性 | 白話意思 |
|---|---|---|
| `warehouse_id` | PK、文字 | 倉庫唯一編號，例如 WH-001。 |
| `warehouse_name` | 必填文字 | 倉庫名稱，例如「台北主倉」。 |
| `region` | 文字、預設北區 | 倉庫所在配送區域。 |
| `address` | 文字 | 倉庫完整地址。 |
| `cold_chain_capable` | 是／否、預設否 | 是否能處理冷藏或冷凍商品。 |
| `created_at` | 建立時間 | 這筆倉庫資料何時建立。 |
| `updated_at` | 自動更新時間 | 倉庫資料最後修改時間。 |

### customers（客戶主檔）

客戶基本資料。

| 欄位 | 屬性 | 白話意思 |
|---|---|---|
| `customer_id` | PK、文字 | 客戶唯一編號。 |
| `customer_name` | 必填文字 | 客戶名稱。 |
| `channel` | 文字 | 客戶通路類型，例如零售、量販、經銷。 |
| `region` | 文字、預設北區 | 客戶主要所在區域。 |
| `address` | 文字 | 客戶常用收貨地址。 |
| `credit_limit` | 金額、預設 0 | 公司允許該客戶未付款的最高金額。 |
| `payment_terms` | 文字 | 付款條件，例如 NET30 代表 30 天內付款。 |
| `created_at` | 建立時間 | 客戶資料建立時間。 |
| `updated_at` | 自動更新時間 | 客戶資料最後修改時間。 |

### products（商品主檔）

商品基本資料。

| 欄位 | 屬性 | 白話意思 |
|---|---|---|
| `sku_id` | PK、文字 | 商品唯一品號。 |
| `sku_name` | 必填文字 | 商品名稱。 |
| `category` | 文字 | 商品分類，例如飲料、餅乾。 |
| `spec` | 文字 | 商品規格，例如「500 ml × 24 入」。 |
| `unit` | 文字、預設箱 | 商品的基本計算單位。 |
| `shelf_life_days` | 整數 | 從製造日起可保存幾天。 |
| `storage_type` | 文字 | 保存條件，例如常溫、冷藏、冷凍。 |
| `unit_cost` | 金額 | 每一基本單位的成本。 |
| `status` | 文字、預設 active | 商品是否仍啟用；停售時可標示為 inactive。 |
| `updated_at` | 自動更新時間 | 商品資料最後修改時間。 |

### inventory（庫存批號明細）

每個倉庫、每個商品、每個批號的現有庫存。

| 欄位 | 屬性 | 白話意思 |
|---|---|---|
| `id` | PK、自動編號 | 每一筆庫存的系統流水號。 |
| `warehouse_id` | FK、必填 | 這批庫存存放在哪個倉庫。 |
| `sku_id` | FK、必填 | 這筆庫存是哪個商品。 |
| `batch_no` | 文字 | 商品批號，用來追蹤來源與效期。 |
| `manufactured_date` | 日期 | 製造日期。 |
| `expiry_date` | 日期 | 到期日。 |
| `available_qty` | 小數 | 現在可分配或可出貨的數量。 |
| `reserved_qty` | 小數 | 已被訂單保留，但尚未實際出貨的數量。 |
| `safety_stock` | 小數 | 希望保留、不應隨意出貨的最低安全數量。 |
| `unit` | 文字、預設箱 | 此筆庫存的計量單位。 |
| `inventory_status` | ENUM、預設 normal | 庫存狀態：正常、凍結、隔離、過期。 |
| `updated_at` | 自動更新時間 | 庫存最後異動時間。 |

> ⚠️ **限制規則**：同一個「倉庫＋商品＋批號」只能有一筆庫存資料。

### production_batches（生產批次）

工廠的生產批次與完成進度。

| 欄位 | 屬性 | 白話意思 |
|---|---|---|
| `batch_no` | PK、文字 | 生產批次唯一編號。 |
| `sku_id` | FK | 本批生產的是哪個商品。 |
| `warehouse_id` | FK | 生產完成後預計入庫的倉庫。 |
| `qty` | 小數 | 本批預計或實際產出的數量。 |
| `uom` | 文字、預設箱 | 生產數量的單位。 |
| `planned_finish_date` | 日期時間 | 預計完成生產的時間。 |
| `actual_finish_date` | 日期時間 | 實際完成生產的時間。 |
| `expiry_date` | 日期 | 這批商品的到期日。 |
| `batch_status` | 文字、預設 planned | 生產狀態，例如已排程、生產中、已完成。 |
| `plant` | 文字 | 負責生產的工廠或廠區。 |

### sales_orders（訂單表頭）

一張訂單共用的資料，例如客戶、地址、交期。

| 欄位 | 屬性 | 白話意思 |
|---|---|---|
| `order_id` | PK、文字 | 訂單唯一編號。 |
| `customer_id` | FK | 這張訂單屬於哪位客戶。 |
| `customer_name_snapshot` | 文字 | 下單當時的客戶名稱備份。客戶日後改名，不影響舊訂單。 |
| `channel_snapshot` | 文字 | 下單當時的通路類型備份。 |
| `region_snapshot` | 文字、預設北區 | 下單當時的配送區域備份。 |
| `delivery_address` | 文字 | 這張訂單實際要送達的地址。 |
| `required_delivery_date` | 日期 | 客戶要求送達的日期。 |
| `delivery_window_start` | 日期時間 | 客戶可收貨時段的開始時間。 |
| `delivery_window_end` | 日期時間 | 客戶可收貨時段的結束時間。 |
| `priority` | ENUM | 訂單優先級：高、中、低。 |
| `risk` | ENUM | 訂單風險程度：高、中、低。 |
| `order_status` | ENUM | 訂單作業狀態：草稿、已分配、已出貨、已送達、已取消。 |
| `review_status` | ENUM | 覆核狀態：待覆核、已核准、已拒絕、人工處理。 |
| `order_total` | 金額 | 這張訂單所有商品加總後的總金額。 |
| `erp_ref_no` | 文字 | ERP 系統中的原始訂單編號，用於對照。 |
| `created_at` | 建立時間 | 訂單建立時間。 |
| `updated_at` | 自動更新時間 | 訂單最後修改時間。 |

### order_items（訂單明細）

一張訂單裡實際購買的各個商品。

| 欄位 | 屬性 | 白話意思 |
|---|---|---|
| `order_item_id` | PK、自動編號 | 訂單品項的系統流水號。 |
| `order_id` | FK、必填 | 此品項屬於哪一張訂單。 |
| `line_no` | 整數 | 此商品在訂單中的第幾列。 |
| `sku_id` | FK | 訂購的商品品號。 |
| `item_name_snapshot` | 文字 | 下單當下的商品名稱備份。 |
| `ordered_qty` | 小數、必填 | 客戶原本訂購的數量。 |
| `uom` | 文字、預設箱 | 訂購數量的單位。 |
| `unit_price` | 金額 | 商品單價。 |
| `line_total` | 金額 | 這個品項的總金額，通常是數量 × 單價。 |
| `allocated_qty` | 小數 | 系統已替此品項保留的庫存數量。 |
| `shipped_qty` | 小數 | 此品項累計已出貨數量。 |
| `item_status` | ENUM | 明細狀態：待處理、部分出貨、已完成、已取消。 |

> ⚠️ **限制規則**：同一張訂單不能有兩筆相同的 `line_no`，避免明細順序重複。

### shipments（出貨單表頭）

一次配送或出貨的基本資訊。

| 欄位 | 屬性 | 白話意思 |
|---|---|---|
| `shipment_id` | PK、文字 | 出貨單唯一編號。 |
| `order_id` | FK | 此次配送對應的訂單。 |
| `warehouse_id` | FK | 從哪一個倉庫出貨。 |
| `carrier` | 文字 | 承運物流公司。 |
| `vehicle_no` | 文字 | 配送車輛車號。 |
| `planned_dispatch_at` | 日期時間 | 預計出貨時間。 |
| `actual_dispatch_at` | 日期時間 | 實際出貨時間。 |
| `eta` | 日期時間 | 預計送達時間。 |
| `delivered_at` | 日期時間 | 實際送達時間。 |
| `receiver_name` | 文字 | 實際簽收人。 |
| `proof_of_delivery` | 文字 | 簽收照片、文件或檔案連結。 |
| `transport_cost` | 金額 | 本次配送實際物流成本。 |
| `delivery_status` | ENUM | 出貨狀態：待出貨、已出發、配送中、已送達、配送失敗。 |
| `created_at` | 建立時間 | 出貨單建立時間。 |

### shipment_items（出貨明細）

一次配送中，實際從哪個批號出貨了多少商品。

| 欄位 | 屬性 | 白話意思 |
|---|---|---|
| `shipment_item_id` | PK、自動編號 | 出貨品項的系統流水號。 |
| `shipment_id` | FK、必填 | 此品項屬於哪張出貨單。 |
| `order_item_id` | FK | 對應哪一筆訂單商品。 |
| `inventory_id` | FK | 實際從哪一筆庫存扣貨。 |
| `sku_id` | FK | 實際出貨的商品。 |
| `batch_no` | 文字 | 實際出貨使用的批號。 |
| `expiry_date` | 日期 | 出貨當時該批商品的到期日備份。 |
| `shipped_qty` | 小數、必填 | 這次實際出貨數量。 |
| `uom` | 文字、預設箱 | 出貨數量的單位。 |

### order_reviews（訂單覆核歷程）

AI 或人員覆核訂單的歷程與原因。

| 欄位 | 屬性 | 白話意思 |
|---|---|---|
| `review_id` | PK、自動編號 | 每一次覆核的流水號。 |
| `order_id` | FK、必填 | 被覆核的是哪張訂單。 |
| `decision` | 文字、必填 | 覆核結果，例如核准、拒絕、需人工處理。 |
| `risk_level` | 文字 | 覆核當時判斷的風險程度。 |
| `exception_type` | 文字 | 異常類型，例如缺貨、交期衝突、效期不足。 |
| `reason` | 長文字 | 覆核理由的完整說明。 |
| `reviewed_by` | 文字、預設 system | 是系統、AI 或哪位人員做出覆核。 |
| `reviewed_at` | 建立時間 | 此次覆核發生的時間。 |

### stock_movements（庫存流水帳）

庫存每一次入庫、保留、出貨、調整的紀錄。

| 欄位 | 屬性 | 白話意思 |
|---|---|---|
| `movement_id` | PK、自動編號 | 每一次庫存異動的流水號。 |
| `inventory_id` | FK | 對應哪一筆庫存。 |
| `warehouse_id` | 文字、必填 | 異動發生在哪一個倉庫。 |
| `sku_id` | 文字、必填 | 異動的是哪個商品。 |
| `batch_no` | 文字 | 異動的是哪個批號。 |
| `movement_type` | ENUM、必填 | 異動原因：入庫、保留、解除保留、出貨、人工調整。 |
| `qty` | 小數、必填 | 此次異動的數量。 |
| `ref_type` | 文字 | 關聯來源類型，例如訂單、出貨單、盤點。 |
| `ref_id` | 文字 | 關聯來源的編號，例如訂單號或出貨單號。 |
| `note` | 文字 | 補充說明。 |
| `created_at` | 建立時間 | 此次庫存異動發生時間。 |

---

## 已知待改善事項

以下是目前設計中，**工程團隊優先處理**的調整項目，非技術協作者可略過此節。

| 優先級 | 調整項目 | 原因 |
|---|---|---|
| 🔴 高 | 統一 `stock_movements.qty` 的正負號規則 | 目前出貨流程寫入負數，但手動新增流水可能寫正數；報表會無法正確加總。建議永遠存「正數」，再由 `movement_type` 判斷增加或減少。 |
| 🔴 高 | 出貨前檢查庫存是否足夠 | 扣庫存時應確認 `available_qty >= shipped_qty`，否則可能出現負庫存。 |
| 🔴 高 | 出貨時正確處理保留量 | 若商品已被訂單保留，出貨時應減少 `reserved_qty`，不應再次扣除 `available_qty`。 |
| 🔴 高 | 禁止任意覆寫已出貨訂單明細 | 現行修改訂單時會先刪除再重建所有明細；若已出貨，原有出貨紀錄可能失去對應明細。已出貨訂單應禁止修改，或改成建立「訂單版本」。 |
| 🟡 中 | `stock_movements.warehouse_id`、`sku_id` 加入 FK | 可避免有人記錄不存在的倉庫或商品。 |
| 🟡 中 | `inventory.batch_no` 改為必填 | 食品物流通常必須追蹤批號；目前空白批號可建立多筆重複庫存，容易混亂。 |
| 🟡 中 | 商品刪除改為停用，不要連帶刪除庫存 | 目前刪除商品會刪除相關庫存，可能破壞歷史資料；建議保留商品並將 `status` 改成 `inactive`。 |
| 🟡 中 | 補上常用查詢索引 | 建議為 `inventory(sku_id, expiry_date)`、`sales_orders(customer_id, required_delivery_date)`、`shipments(order_id)`、`stock_movements(inventory_id, created_at)` 建索引，查詢會較快。 |
| 🟢 低 | `production_batches` 增加 `created_at`、`updated_at` | 方便追蹤生產批次資料何時建立與修改。 |

---

*最後更新：2026-08-19*
