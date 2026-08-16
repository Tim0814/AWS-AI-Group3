import { useState } from 'react';
import { StatusBadge, SuggestionBadge, Badge } from '../ui';

const SORT_KEYS = [
  { key: 'required_delivery_date', label: '交期（最早）' },
  { key: '_dist',                  label: '配送距離（最近）' },
  { key: '_cost',                  label: '估計貨值（最高）' },
  { key: 'priority',               label: '客戶優先級' },
  { key: 'order_id',               label: '訂單編號' },
];

const PRIORITY_RANK = { '高': 0, '中': 1, '低': 2 };

function sortRows(rows, key, dir) {
  return [...rows].sort((a, b) => {
    let va, vb;
    if (key === '_dist')  { va = a._engine?.dist ?? 999; vb = b._engine?.dist ?? 999; }
    else if (key === '_cost') { va = a._engine?.estCost ?? 0; vb = b._engine?.estCost ?? 0; }
    else if (key === 'priority') { va = PRIORITY_RANK[a.priority] ?? 9; vb = PRIORITY_RANK[b.priority] ?? 9; }
    else { va = a[key] ?? ''; vb = b[key] ?? ''; }
    if (va < vb) return dir === 'asc' ? -1 : 1;
    if (va > vb) return dir === 'asc' ? 1 : -1;
    return 0;
  });
}

export default function OrderTable({ enriched, onSelect, onEdit, onDelete }) {
  const [sortKey, setSortKey] = useState('required_delivery_date');
  const [sortDir, setSortDir] = useState('asc');
  const [filterRegion, setFilterRegion] = useState('');
  const [filterShortage, setFilterShortage] = useState(false);
  const [filterPriority, setFilterPriority] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  function toggleSort(key) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  }

  let rows = enriched;
  if (filterRegion)   rows = rows.filter(o => (o.region || '北區') === filterRegion);
  if (filterShortage) rows = rows.filter(o => o._engine && !o._engine.checks.supplyOk);
  if (filterPriority) rows = rows.filter(o => o.priority === filterPriority);
  if (filterStatus)   rows = rows.filter(o => o.review_status === filterStatus);
  rows = sortRows(rows, sortKey, sortDir);

  return (
    <div>
      <div className="filters">
        <div className="field">
          <label>區域</label>
          <select value={filterRegion} onChange={e => setFilterRegion(e.target.value)}>
            <option value="">全部</option>
            {['北區','中區','南區'].map(r => <option key={r}>{r}</option>)}
          </select>
        </div>
        <div className="field">
          <label>優先級</label>
          <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
            <option value="">全部</option>
            {['高','中','低'].map(p => <option key={p}>{p}</option>)}
          </select>
        </div>
        <div className="field">
          <label>處理狀態</label>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">全部</option>
            <option value="pending">待覆核</option>
            <option value="approved">已核准</option>
            <option value="rejected">已拒絕</option>
            <option value="manual">需人工調整</option>
          </select>
        </div>
        <div className="field" style={{ display: 'flex', alignItems: 'flex-end', gap: 6 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
            <input type="checkbox" checked={filterShortage} onChange={e => setFilterShortage(e.target.checked)} />
            僅顯示供應不足
          </label>
        </div>
        <div className="field">
          <label>排序</label>
          <select value={sortKey} onChange={e => { setSortKey(e.target.value); setSortDir('asc'); }}>
            {SORT_KEYS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="empty">無符合條件的訂單</div>
      ) : (
        <div className="table-wrap">
          <table className="orders">
            <thead>
              <tr>
                {['order_id','SKU','品項','客戶','通路','目的區','數量','交期','優先級','供應狀態','估計貨值','AI建議','覆核狀態','操作'].map(h => (
                  <th key={h}>
                    <button onClick={() => toggleSort(h === '交期' ? 'required_delivery_date' : h === '估計貨值' ? '_cost' : h === '優先級' ? 'priority' : 'order_id')}>
                      {h}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(o => {
                const eng = o._engine || {};
                const supplyOk = eng.checks?.supplyOk;
                return (
                  <tr key={o.order_id} onClick={() => onSelect(o)} style={{ cursor: 'pointer' }}>
                    <td>{o.order_id}</td>
                    <td>{o.sku_id || o.item}</td>
                    <td>{eng.productName || o.item}</td>
                    <td>{o.customer_name || '—'}</td>
                    <td>{o.channel || '—'}</td>
                    <td>
                      {o.region || <span className="muted-note">北區*</span>}
                    </td>
                    <td>{o.quantity}</td>
                    <td>{o.required_delivery_date || '—'}</td>
                    <td><Badge type={o.priority === '高' ? 'danger' : o.priority === '中' ? 'warning' : 'default'}>{o.priority || '—'}</Badge></td>
                    <td><Badge type={supplyOk ? 'success' : 'danger'}>{supplyOk ? '充足' : '不足'}</Badge></td>
                    <td>{eng.estCost != null ? `$${eng.estCost}` : '—'}<small className="muted-note">*估</small></td>
                    <td><SuggestionBadge s={eng.suggestion} /></td>
                    <td><StatusBadge status={o.review_status} /></td>
                    <td onClick={e => e.stopPropagation()}>
                      <button className="btn sm" onClick={() => onEdit(o)}>編輯</button>
                      <button className="btn sm danger" onClick={() => onDelete(o.order_id)}>刪除</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
