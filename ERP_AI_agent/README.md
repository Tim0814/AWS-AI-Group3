# 食品製造業智慧物流分配 Dashboard

外接 ERP 決策輔助系統 — 不直接寫入 ERP。

## 啟動

```bash
cd ERP_AI_agent
npm install        # 首次
npm run dev        # 開發模式 → http://localhost:5173
npm run build      # 生產 build → dist/
```

## 功能說明

| 頁籤 | 功能 |
|------|------|
| Dashboard | KPI 卡 × 4、SKU 供需缺口長條圖、各區配送概覽長條圖 |
| 訂單管理 | 新增／編輯／刪除訂單、排序、篩選、點選查看 AI 分析 Drawer |
| CSV 匯入 | 上傳訂單或參考資料 CSV |

## CSV 匯入測試

1. 開啟 `http://localhost:5173`
2. 切換到「CSV 匯入」頁籤
3. 資料類型選「物流訂單」
4. 上傳 `sample_orders.csv`（專案根目錄）
5. 切換到「訂單管理」確認資料已匯入
6. 點選任一訂單列 → 查看 AI 分析 Drawer → 執行核准／拒絕

## 訂單 CSV 欄位

```
order_id, sku_id, item, customer_name, channel, region,
quantity, required_delivery_date, priority, risk
```

> ⚠ 若無 `region` 欄位，系統以「北區」作為 MVP 假設值。

## 資料持久化

資料存於 `localStorage`，重新整理後保留。
清除方式：瀏覽器 DevTools → Application → Local Storage → 清除。

## 未來串接後端

替換 `src/store/storage.js` 中的 `getStore` / `setStore` 為 API 呼叫即可。

## 注意事項

- 本系統不寫入 ERP；核准後請由人員回 ERP 建立正式調撥或出貨單
- 配送距離、成本、貨值均為估計值，非 ERP 真實資料
- 區域欄位為 MVP 假設，需由 ERP 正式欄位取代
