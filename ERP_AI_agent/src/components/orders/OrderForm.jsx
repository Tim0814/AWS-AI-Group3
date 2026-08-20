import { useState, useEffect } from "react";
import { Alert } from "../ui";

const EMPTY_HEADER = {
  order_id: "",
  customer_id: "",
  customer_name_snapshot: "",
  channel_snapshot: "",
  region_snapshot: "北區",
  delivery_address: "",
  required_delivery_date: "",
  delivery_window_start: "",
  delivery_window_end: "",
  priority: "中",
  risk: "低",
  erp_ref_no: "",
  order_status: "draft",
};

const EMPTY_ITEM = {
  sku_id: "",
  item_name_snapshot: "",
  ordered_qty: "",
  uom: "箱",
  unit_price: "",
};

export default function OrderForm({
  initial,
  existingIds,
  customers = [],
  products = [],
  onSave,
  onCancel,
}) {
  const [header, setHeader] = useState(
    initial ? { ...initial } : { ...EMPTY_HEADER },
  );
  const [items, setItems] = useState(
    initial?.items?.length
      ? initial.items.map((i) => ({ ...i }))
      : [{ ...EMPTY_ITEM }],
  );
  const [err, setErr] = useState("");

  useEffect(() => {
    setHeader(initial ? { ...initial } : { ...EMPTY_HEADER });
    setItems(
      initial?.items?.length
        ? initial.items.map((i) => ({ ...i }))
        : [{ ...EMPTY_ITEM }],
    );
    setErr("");
  }, [initial]);

  function setH(k, v) {
    setHeader((h) => ({ ...h, [k]: v }));
  }

  function handleCustomerChange(customer_id) {
    const c = customers.find((c) => c.customer_id === customer_id);
    setHeader((h) => ({
      ...h,
      customer_id,
      customer_name_snapshot: c?.customer_name || h.customer_name_snapshot,
      channel_snapshot: c?.channel || h.channel_snapshot,
      region_snapshot: c?.region || "北區",
      delivery_address: c?.address || h.delivery_address,
    }));
  }

  function setItem(idx, k, v) {
    setItems((prev) => {
      const next = prev.map((it, i) => (i === idx ? { ...it, [k]: v } : it));
      if (k === "sku_id") {
        const p = products.find((p) => p.sku_id === v);
        if (p) next[idx].item_name_snapshot = p.sku_name;
        if (p) next[idx].unit_price = String(p.unit_cost || "");
        if (p) next[idx].uom = p.unit || "箱";
      }
      return next;
    });
  }

  function addItem() {
    setItems((prev) => [...prev, { ...EMPTY_ITEM }]);
  }
  function removeItem(idx) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function lineTotal(item) {
    const q = Number(item.ordered_qty) || 0;
    const p = Number(item.unit_price) || 0;
    return q && p ? Math.round(q * p) : 0;
  }

  function orderTotal() {
    return items.reduce((s, i) => s + lineTotal(i), 0);
  }

  function submit(e) {
    e.preventDefault();
    if (!header.order_id.trim()) return setErr("訂單編號不得為空");
    if (!initial && existingIds.has(header.order_id.trim()))
      return setErr(`訂單編號 "${header.order_id}" 已存在`);
    if (items.length === 0) return setErr("至少需要一個品項");
    for (const [i, item] of items.entries()) {
      if (!item.sku_id && !item.item_name_snapshot)
        return setErr(`第 ${i + 1} 行：SKU 或品名不得為空`);
      if (!item.ordered_qty || Number(item.ordered_qty) <= 0)
        return setErr(`第 ${i + 1} 行：數量必須大於 0`);
    }
    setErr("");
    onSave({
      ...header,
      order_total: orderTotal(),
      items: items.map((it, idx) => ({
        ...it,
        line_no: idx + 1,
        ordered_qty: Number(it.ordered_qty),
        unit_price: Number(it.unit_price) || 0,
        line_total: lineTotal(it),
      })),
    });
  }

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div
        className="drawer"
        style={{ width: "min(780px,100%)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="close" onClick={onCancel}>
          ✕
        </button>
        <h2>{initial ? "編輯訂單" : "新增訂單"}</h2>
        {err && (
          <Alert type="error" onClose={() => setErr("")}>
            {err}
          </Alert>
        )}
        <form onSubmit={submit}>
          {/* ── 表頭 ── */}
          <div className="form-grid">
            <div className="field">
              <label>訂單編號 *</label>
              <input
                value={header.order_id}
                onChange={(e) => setH("order_id", e.target.value)}
                disabled={!!initial}
              />
            </div>
            <div className="field">
              <label>ERP 原始單號</label>
              <input
                value={header.erp_ref_no}
                onChange={(e) => setH("erp_ref_no", e.target.value)}
                placeholder="ERP-XXXX"
              />
            </div>
            <div className="field">
              <label>客戶</label>
              <select
                value={header.customer_id}
                onChange={(e) => handleCustomerChange(e.target.value)}
              >
                <option value="">— 手動輸入 —</option>
                {customers.map((c) => (
                  <option key={c.customer_id} value={c.customer_id}>
                    {c.customer_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>客戶名稱（快照）</label>
              <input
                value={header.customer_name_snapshot}
                onChange={(e) => setH("customer_name_snapshot", e.target.value)}
              />
            </div>
            <div className="field">
              <label>通路（快照）</label>
              <input
                value={header.channel_snapshot}
                onChange={(e) => setH("channel_snapshot", e.target.value)}
              />
            </div>
            <div className="field">
              <label>目的區域</label>
              <select
                value={header.region_snapshot}
                onChange={(e) => setH("region_snapshot", e.target.value)}
              >
                {["北區", "中區", "南區"].map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </div>
            <div className="field full">
              <label>配送地址</label>
              <input
                value={header.delivery_address}
                onChange={(e) => setH("delivery_address", e.target.value)}
              />
            </div>
            <div className="field">
              <label>要求交期</label>
              <input
                type="date"
                value={header.required_delivery_date}
                onChange={(e) => setH("required_delivery_date", e.target.value)}
              />
            </div>
            <div className="field">
              <label>配送窗口（起）</label>
              <input
                type="date"
                value={header.delivery_window_start}
                onChange={(e) => setH("delivery_window_start", e.target.value)}
              />
            </div>
            <div className="field">
              <label>配送窗口（迄）</label>
              <input
                type="date"
                value={header.delivery_window_end}
                onChange={(e) => setH("delivery_window_end", e.target.value)}
              />
            </div>
            <div className="field">
              <label>優先級</label>
              <select
                value={header.priority}
                onChange={(e) => setH("priority", e.target.value)}
              >
                {["高", "中", "低"].map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>風險</label>
              <select
                value={header.risk}
                onChange={(e) => setH("risk", e.target.value)}
              >
                {["高", "中", "低"].map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </div>
          </div>

          {/* ── 品項明細 ── */}
          <div
            style={{
              margin: "16px 0 6px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <strong>品項明細</strong>
            <button type="button" className="btn sm primary" onClick={addItem}>
              ＋ 新增品項
            </button>
          </div>
          <div className="table-wrap">
            <table className="orders" style={{ minWidth: 640 }}>
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>品名</th>
                  <th>數量</th>
                  <th>單位</th>
                  <th>單價</th>
                  <th>小計</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={idx}>
                    <td>
                      <select
                        value={item.sku_id}
                        onChange={(e) => setItem(idx, "sku_id", e.target.value)}
                        style={{ width: 110 }}
                      >
                        <option value="">— 選擇 —</option>
                        {products.map((p) => (
                          <option key={p.sku_id} value={p.sku_id}>
                            {p.sku_id}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        value={item.item_name_snapshot}
                        onChange={(e) =>
                          setItem(idx, "item_name_snapshot", e.target.value)
                        }
                        style={{ width: 120 }}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min="0.001"
                        step="0.001"
                        value={item.ordered_qty}
                        onChange={(e) =>
                          setItem(idx, "ordered_qty", e.target.value)
                        }
                        style={{ width: 80 }}
                      />
                    </td>
                    <td>
                      <select
                        value={item.uom}
                        onChange={(e) => setItem(idx, "uom", e.target.value)}
                        style={{ width: 60 }}
                      >
                        {["箱", "件", "kg", "包", "瓶", "L"].map((u) => (
                          <option key={u}>{u}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        value={item.unit_price}
                        onChange={(e) =>
                          setItem(idx, "unit_price", e.target.value)
                        }
                        style={{ width: 80 }}
                      />
                    </td>
                    <td style={{ textAlign: "right" }}>
                      ${lineTotal(item).toLocaleString()}
                    </td>
                    <td>
                      {items.length > 1 && (
                        <button
                          type="button"
                          className="btn sm danger"
                          onClick={() => removeItem(idx)}
                        >
                          ✕
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td
                    colSpan={5}
                    style={{ textAlign: "right", fontWeight: 600 }}
                  >
                    訂單合計
                  </td>
                  <td style={{ textAlign: "right", fontWeight: 600 }}>
                    ${orderTotal().toLocaleString()}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
            <button type="submit" className="btn primary">
              儲存
            </button>
            <button type="button" className="btn" onClick={onCancel}>
              取消
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
