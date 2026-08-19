import { useState, useEffect } from 'react';
import { Alert } from '../ui';

const EMPTY = { customer_id: '', customer_name: '', channel: '', region: '北區', address: '', credit_limit: '', payment_terms: 'NET30' };

export default function CustomerForm({ initial, existingIds, onSave, onCancel }) {
  const [form, setForm] = useState(initial ? { ...initial } : { ...EMPTY });
  const [err, setErr] = useState('');

  useEffect(() => { setForm(initial ? { ...initial } : { ...EMPTY }); setErr(''); }, [initial]);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  function submit(e) {
    e.preventDefault();
    if (!form.customer_id.trim()) return setErr('客戶編號不得為空');
    if (!form.customer_name.trim()) return setErr('客戶名稱不得為空');
    if (!initial && existingIds.has(form.customer_id.trim()))
      return setErr(`客戶編號 "${form.customer_id}" 已存在`);
    setErr('');
    onSave({ ...form, credit_limit: Number(form.credit_limit) || 0 });
  }

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="drawer" onClick={e => e.stopPropagation()}>
        <button className="close" onClick={onCancel}>✕</button>
        <h2>{initial ? '編輯客戶' : '新增客戶'}</h2>
        {err && <Alert type="error" onClose={() => setErr('')}>{err}</Alert>}
        <form onSubmit={submit}>
          <div className="form-grid">
            <div className="field">
              <label>客戶編號 *</label>
              <input value={form.customer_id} onChange={e => set('customer_id', e.target.value)} disabled={!!initial} />
            </div>
            <div className="field">
              <label>客戶名稱 *</label>
              <input value={form.customer_name} onChange={e => set('customer_name', e.target.value)} />
            </div>
            <div className="field">
              <label>通路</label>
              <select value={form.channel} onChange={e => set('channel', e.target.value)}>
                <option value="">—</option>
                {['零售', '量販', '經銷', '企業'].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="field">
              <label>區域</label>
              <select value={form.region} onChange={e => set('region', e.target.value)}>
                {['北區', '中區', '南區'].map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div className="field full">
              <label>配送地址</label>
              <input value={form.address} onChange={e => set('address', e.target.value)} />
            </div>
            <div className="field">
              <label>信用額度</label>
              <input type="number" min="0" value={form.credit_limit} onChange={e => set('credit_limit', e.target.value)} />
            </div>
            <div className="field">
              <label>付款條件</label>
              <select value={form.payment_terms} onChange={e => set('payment_terms', e.target.value)}>
                {['NET30', 'NET45', 'NET60', '現金', '月結'].map(t => <option key={t}>{t}</option>)}
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
