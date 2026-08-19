import { useState } from 'react';
import { useStore } from '../../store/index';
import { StatusBadge, SuggestionBadge, Badge } from '../ui';

function ScoreBar({ score }) {
  return (
    <div className="score">
      <span></span>
      <i><b style={{ width: `${score}%` }} /></i>
      <span>{score}</span>
    </div>
  );
}

function ItemRow({ item }) {
  const eng = item._engine || {};
  const { checks = {} } = eng;
  return (
    <div style={{ border: '1px solid var(--line)', borderRadius: 8, padding: 12, marginBottom: 10 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8, alignItems: 'center' }}>
        <strong>{item.sku_id}</strong>
        <span className="muted-note">{eng.productName}</span>
        <SuggestionBadge s={eng.suggestion} />
        {eng.exceptionType && <Badge type="danger">{eng.exceptionType}</Badge>}
      </div>
      <div className="detail-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
        <div className="metric"><span>需求量</span><strong>{Number(item.ordered_qty)} {item.uom}</strong></div>
        <div className="metric"><span>可分配量</span><strong>{eng.avail ?? '—'}</strong></div>
        <div className="metric"><span>供需缺口</span><strong style={{ color: (eng.gap ?? 0) < 0 ? '#b74343' : '#176c54' }}>{eng.gap ?? '—'}</strong></div>
        <div className="metric"><span>安全庫存</span><strong>{eng.safety ?? '—'}</strong></div>
        <div className="metric"><span>出貨後庫存</span><strong>{eng.afterStock ?? '—'}</strong></div>
        <div className="metric"><span>最近效期</span><strong style={{ color: eng.nearestExpiry !== '—' ? '#b96c00' : undefined }}>{eng.nearestExpiry}</strong></div>
        <div className="metric"><span>保存條件</span><strong>{eng.storageType}</strong></div>
        <div className="metric"><span>效期天數</span><strong>{eng.shelfLife}</strong></div>
        <div className="metric"><span>生產批次</span><strong style={{ fontSize: 12 }}>{eng.batchNo} ({eng.batchStatus})</strong></div>
      </div>
      <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: 12 }}>
        {[['品號存在', checks.skuExists], ['供應充足', checks.supplyOk], ['安全庫存', checks.safetyOk], ['交期可行', checks.deliveryOk]].map(([l, ok]) => (
          <span key={l}><Badge type={ok ? 'success' : 'danger'}>{ok ? '✓' : '✗'} {l}</Badge></span>
        ))}
      </div>
      {eng.reasons?.length > 0 && (
        <div className="analysis" style={{ marginTop: 8 }}>
          {eng.reasons.map((r, i) => <p key={i} style={{ margin: '2px 0' }}>• {r}</p>)}
        </div>
      )}
    </div>
  );
}

const DECISION_LABEL = { approved: '已核准', rejected: '已拒絕', manual: '需人工調整', pending: '待覆核' };
const DECISION_COLOR = { approved: '#176c54', rejected: '#b74343', manual: '#b96c00', pending: '#627484' };

export default function AnalysisDrawer({ order, onClose, onReview }) {
  const { state } = useStore();
  const [reason, setReason] = useState('');

  if (!order) return null;
  const eng     = order._engine || {};
  const items   = order.items   || [];
  const reviews = state.reviews?.[order.order_id] || [];

  const candidates = [
    { label: `${order.region_snapshot || '北區'}直送`, dist: eng.dist, cost: eng.totalEstCost, score: eng.allSupplyOk ? 85 : 30 },
    { label: '跨區調貨', dist: (eng.dist || 0) + 80, cost: Math.round((eng.totalEstCost || 0) * 1.6), score: 60 },
  ];

  function handleReview(status) {
    onReview(order.order_id, status, {
      reason:         reason || null,
      risk_level:     order.risk || null,
      exception_type: eng.exceptionType || null,
    });
    setReason('');
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="drawer" onClick={e => e.stopPropagation()}>
        <button className="close" onClick={onClose}>✕</button>
        <h2>{order.order_id}</h2>
        <p className="sub">{order.customer_name_snapshot} · {order.channel_snapshot} · {order.region_snapshot}</p>
        {order.erp_ref_no && <p className="sub">ERP 單號：{order.erp_ref_no}</p>}

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          <SuggestionBadge s={eng.suggestion} />
          <StatusBadge status={order.review_status} />
          <Badge type="info">{items.length} 個品項</Badge>
        </div>

        <div className="detail-grid">
          <div className="metric"><span>訂單金額</span><strong>{order.order_total ? `$${Number(order.order_total).toLocaleString()}` : eng.totalEstValue ? `$${eng.totalEstValue.toLocaleString()} *估` : '—'}</strong></div>
          <div className="metric"><span>估計配送成本</span><strong>${eng.totalEstCost ?? '—'} <small className="muted-note">*估</small></strong></div>
          <div className="metric"><span>要求交期</span><strong>{order.required_delivery_date || '—'}</strong></div>
          <div className="metric"><span>配送地址</span><strong style={{ fontSize: 12 }}>{order.delivery_address || '—'}</strong></div>
        </div>

        <h3>品項分析</h3>
        {items.map((item, i) => <ItemRow key={i} item={item} />)}

        {!eng.allSupplyOk && (
          <div className="analysis" style={{ borderColor: '#b74343', background: '#fdf0f0' }}>
            <strong>供應不足處置建議：</strong>
            <p>• 優先供應高優先級客戶</p>
            <p>• 評估跨區調貨（見候選方案）</p>
            <p>• 確認生產批次完工時間</p>
            <p>• 或標記需人工覆核</p>
          </div>
        )}

        <h3>候選配送方案 <small className="muted-note">（估計值）</small></h3>
        <table className="candidates">
          <thead><tr><th>方案</th><th>距離(km)</th><th>估計成本</th><th>評分</th></tr></thead>
          <tbody>
            {candidates.map((c, i) => (
              <tr key={i} style={{ background: i === 0 ? '#f3fbfa' : '' }}>
                <td>{c.label}{i === 0 ? ' ✓ 推薦' : ''}</td>
                <td>{c.dist}</td>
                <td>${c.cost}<small className="muted-note">*估</small></td>
                <td><ScoreBar score={c.score} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="footer-note">⚠ 配送距離與成本為估計值，非 ERP 真實資料。</p>

        <h3>人工覆核</h3>
        <p className="footer-note">核准後請由人員回 ERP 建立正式調撥或出貨單，本系統不寫入 ERP。</p>
        <div className="field" style={{ marginBottom: 10 }}>
          <label>覆核備註（選填）</label>
          <input
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="例：庫存確認充足、客戶同意延期..."
            style={{ width: '100%', border: '1px solid var(--line)', borderRadius: 6, padding: '6px 8px' }}
          />
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn primary" onClick={() => handleReview('approved')}>核准</button>
          <button className="btn" onClick={() => handleReview('manual')}>標記需人工調整</button>
          <button className="btn danger" onClick={() => handleReview('rejected')}>拒絕</button>
        </div>

        {/* ── 審核歷程 ── */}
        {reviews.length > 0 && (
          <>
            <h3>審核歷程</h3>
            <div style={{ borderLeft: '2px solid var(--line)', paddingLeft: 12, marginTop: 8 }}>
              {reviews.map((r, i) => (
                <div key={i} style={{ marginBottom: 12, position: 'relative' }}>
                  <div style={{
                    position: 'absolute', left: -19, top: 3,
                    width: 10, height: 10, borderRadius: '50%',
                    background: DECISION_COLOR[r.decision] || '#627484',
                    border: '2px solid #fff', boxShadow: '0 0 0 1px var(--line)',
                  }} />
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <strong style={{ color: DECISION_COLOR[r.decision] }}>
                      {DECISION_LABEL[r.decision] || r.decision}
                    </strong>
                    {r.exception_type && <Badge type="danger">{r.exception_type}</Badge>}
                    {r.risk_level && <Badge type={r.risk_level === '高' ? 'danger' : r.risk_level === '中' ? 'warning' : 'default'}>{r.risk_level}風險</Badge>}
                  </div>
                  {r.reason && <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--muted)' }}>{r.reason}</p>}
                  <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--muted)' }}>
                    {r.reviewed_by} · {String(r.reviewed_at).slice(0, 16).replace('T', ' ')}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
