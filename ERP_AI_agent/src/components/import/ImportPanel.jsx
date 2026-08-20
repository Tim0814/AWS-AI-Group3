import { useState, useRef } from "react";
import { parseCsv, validateOrderRows } from "../../utils/csv";
import { Alert } from "../ui";

const DATA_TYPES = [
  { key: "orders", label: "物流訂單", validate: true },
  { key: "products", label: "商品主檔", validate: false },
  { key: "inventory", label: "庫存快照", validate: false },
  { key: "production", label: "生產批次", validate: false },
  { key: "supply", label: "供應彙總", validate: false },
  { key: "demand", label: "下游需求", validate: false },
];

export default function ImportPanel({ onImport }) {
  const [dataType, setDataType] = useState("orders");
  const [status, setStatus] = useState(null); // { type, msg }
  const fileRef = useRef();

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatus(null);
    const { data, errors } = await parseCsv(file);
    if (errors.length) {
      setStatus({
        type: "error",
        msg: `CSV 解析錯誤：${errors.slice(0, 3).join("；")}`,
      });
      return;
    }
    if (!data.length) {
      setStatus({ type: "error", msg: "CSV 無有效資料列" });
      return;
    }
    const def = DATA_TYPES.find((d) => d.key === dataType);
    if (def?.validate) {
      const valErrs = validateOrderRows(data);
      if (valErrs.length) {
        setStatus({ type: "error", msg: valErrs.slice(0, 5).join("；") });
        return;
      }
    }
    onImport(dataType, data);
    setStatus({
      type: "ok",
      msg: `已匯入 ${data.length} 筆${def?.label || ""}資料`,
    });
    fileRef.current.value = "";
  }

  return (
    <div className="panel" style={{ padding: 16 }}>
      <h3>CSV 匯入</h3>
      <p className="sub">ERP 匯出 CSV → 上傳此處 → 系統分析</p>
      <div
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          alignItems: "flex-end",
        }}
      >
        <div className="field">
          <label>資料類型</label>
          <select
            value={dataType}
            onChange={(e) => setDataType(e.target.value)}
          >
            {DATA_TYPES.map((d) => (
              <option key={d.key} value={d.key}>
                {d.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>選擇 CSV 檔案</label>
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            onChange={handleFile}
          />
        </div>
      </div>
      {status && (
        <Alert
          type={status.type === "ok" ? "info" : "error"}
          onClose={() => setStatus(null)}
        >
          {status.msg}
        </Alert>
      )}
      <p className="footer-note">
        訂單欄位：order_id, sku_id, item, customer_name, channel, region,
        quantity, required_delivery_date, priority, risk
        <br />⚠ 若 CSV 無 region 欄位，系統將以「北區」作為 MVP 假設值，需由 ERP
        正式欄位取代。
      </p>
    </div>
  );
}
