import { useState, useEffect } from 'react';
import { Alert } from '../ui';

const EMPTY = { order_id: '', sku_id: '', item: '', customer_name: '', channel: '', region: '北區', quantity: '', required_delivery_date: '', priority: '中', risk: '低' };

export default function OrderForm({ initial, existingIds, onSave, onCancel }) {
  const [form, setForm] = useState(initial ? { ...initial } : { ...EMPTY });
  const [err, setErr] = useState('');

  useEffect(() => { setForm(initial ? { ...initial } : { ...EMPTY }); setErr(''); }, [initial]);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  function submit(e) {
    e.preventDefault();
    if (!form.order_id.trim()) return setErr('訂單編號不得為空');
    if (!form.sku_id.trim() && !form.item.trim()) return setErr('SKU 或品項不得為空');
    if (!form.quantity || isNaN(Number(form.quantity)) || Number(form.quantity) <= 0)
      return setErr('數量必須為正整數');
    const isNew = !initial;
    if (isNew && existingIds.has(form.order_id.trim()))
      return setErr(`訂單編號 "${form.order_id}" 已存在`);
    setErr('');
    onSave({ ...form, quantity: Number(form.quantity) });
  }

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="drawer" onClick={e => e.stopPropagation()}>
        <button className="close" onClick={onCancel}>✕</button>
        <h2>{initial ? '編輯訂單' : '新增訂單'}</h2>
        {err && <Alert type="error" onClose={() => setErr('')}>{err}</Alert>}
        <form onSubmit={submit}>
          <div className="form-grid">
            <div className="field">
              <label>訂單編號 *</label>
              <input value={form.order_id} onChange={e => set('order_id', e.target.value)} disabled={!!initial} />
            </div>
            <div className="field">
              <label>SKU</label>
              <input value={form.sku_id} onChange={e => set('sku_id', e.target.value)} placeholder="FG-1001" />
            </div>
            <div className="field">
              <label>品項</label>
              <input value={form.item} onChange={e => set('item', e.target.value)} />
            </div>
            <div className="field">
              <label>客戶名稱</label>
              <input value={form.customer_name} onChange={e => set('customer_name', e.target.value)} />
            </div>
            <div className="field">
              <label>通路</label>
              <input value={form.channel} onChange={e => set('channel', e.target.value)} />
            </div>
            <div className="field">
              <label>目的區域 <span className="muted-note">*MVP假設</span></label>
              <select value={form.region} onChange={e => set('region', e.target.value)}>
                {['北區','中區','南區'].map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div className="field">
              <label>數量 *</label>
              <input type="number" min="1" value={form.quantity} onChange={e => set('quantity', e.target.value)} />
            </div>
            <div className="field">
              <label>要求交期</label>
              <input type="date" value={form.required_delivery_date} onChange={e => set('required_delivery_date', e.target.value)} />
            </div>
            <div className="field">
              <label>優先級</label>
              <select value={form.priority} onChange={e => set('priority', e.target.value)}>
                {['高','中','低'].map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div className="field">
              <label>風險</label>
              <select value={form.risk} onChange={e => set('risk', e.target.value)}>
                {['高','中','低'].map(r => <option key={r}>{r}</option>)}
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
