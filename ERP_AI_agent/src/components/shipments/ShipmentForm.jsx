import { useState } from 'react';
import { Alert } from '../ui';

const EMPTY = {
  shipment_id: '', order_id: '', warehouse_id: '', carrier: '', vehicle_no: '',
  planned_dispatch_at: '', eta: '', receiver_name: '', transport_cost: '',
  delivery_status: 'pending',
};

export default function ShipmentForm({ initial, orders = [], warehouses = [], existingIds, onSave, onCancel }) {
  const [form, setForm] = useState(initial ? { ...initial } : { ...EMPTY });
  const [err, setErr] = useState('');

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  function submit(e) {
    e.preventDefault();
    if (!form.shipment_id.trim()) return setErr('出貨單號不得為空');
    if (!initial && existingIds.has(form.shipment_id.trim()))
      return setErr(`出貨單號 "${form.shipment_id}" 已存在`);
    setErr('');
    onSave({ ...form, transport_cost: Number(form.transport_cost) || 0 });
  }

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="drawer" onClick={e => e.stopPropagation()}>
        <button className="close" onClick={onCancel}>✕</button>
        <h2>新增出貨紀錄</h2>
        {err && <Alert type="error" onClose={() => setErr('')}>{err}</Alert>}
        <form onSubmit={submit}>
          <div className="form-grid">
            <div className="field">
              <label>出貨單號 *</label>
              <input value={form.shipment_id} onChange={e => set('shipment_id', e.target.value)} placeholder="SHP-001" />
            </div>
            <div className="field">
              <label>對應訂單</label>
              <select value={form.order_id} onChange={e => set('order_id', e.target.value)}>
                <option value="">— 選擇訂單 —</option>
                {orders.map(o => <option key={o.order_id} value={o.order_id}>{o.order_id} · {o.customer_name_snapshot || ''}</option>)}
              </select>
            </div>
            <div className="field">
              <label>出貨倉庫</label>
              <select value={form.warehouse_id} onChange={e => set('warehouse_id', e.target.value)}>
                <option value="">— 選擇倉庫 —</option>
                {warehouses.map(w => <option key={w.warehouse_id} value={w.warehouse_id}>{w.warehouse_name}</option>)}
              </select>
            </div>
            <div className="field">
              <label>承運商</label>
              <input value={form.carrier} onChange={e => set('carrier', e.target.value)} />
            </div>
            <div className="field">
              <label>車號</label>
              <input value={form.vehicle_no} onChange={e => set('vehicle_no', e.target.value)} />
            </div>
            <div className="field">
              <label>收貨人</label>
              <input value={form.receiver_name} onChange={e => set('receiver_name', e.target.value)} />
            </div>
            <div className="field">
              <label>預計出車時間</label>
              <input type="datetime-local" value={form.planned_dispatch_at} onChange={e => set('planned_dispatch_at', e.target.value)} />
            </div>
            <div className="field">
              <label>預計到達（ETA）</label>
              <input type="datetime-local" value={form.eta} onChange={e => set('eta', e.target.value)} />
            </div>
            <div className="field">
              <label>運費</label>
              <input type="number" min="0" value={form.transport_cost} onChange={e => set('transport_cost', e.target.value)} />
            </div>
            <div className="field">
              <label>配送狀態</label>
              <select value={form.delivery_status} onChange={e => set('delivery_status', e.target.value)}>
                {['pending', 'dispatched', 'in_transit', 'delivered', 'failed'].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
            <button type="submit" className="btn primary">儲存</button>
            <button type="button" className="btn" onClick={onCancel}>取消</button>
          </div>
        </form>
      </div>
    </div>
  );
}
