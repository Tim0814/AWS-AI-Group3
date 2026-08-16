import { StatusBadge, SuggestionBadge, Badge } from '../ui';

function ScoreBar({ label, score }) {
  return (
    <div className="score">
      <span>{label}</span>
      <i><b style={{ width: `${score}%` }} /></i>
      <span>{score}</span>
    </div>
  );
}

export default function AnalysisDrawer({ order, onClose, onReview }) {
  if (!order) return null;
  const eng = order._engine || {};
  const { checks = {}, candidates = [], reasons = [] } = eng;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="drawer" onClick={e => e.stopPropagation()}>
        <button className="close" onClick={onClose}>✕</button>
        <h2>{order.order_id} · {eng.productName || order.item}</h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          <SuggestionBadge s={eng.suggestion} />
          <StatusBadge status={order.review_status} />
          {eng.exceptionType && <Badge type="danger">{eng.exceptionType}</Badge>}
        </div>

        <div className="detail-grid">
          <div className="metric"><span>可分配供應量</span><strong>{eng.avail ?? '—'} 箱</strong></div>
          <div className="metric"><span>需求量</span><strong>{order.quantity} 箱</strong></div>
          <div className="metric"><span>供需缺口</span><strong style={{ color: eng.gap < 0 ? '#b74343' : '#176c54' }}>{eng.gap ?? '—'} 箱</strong></div>
          <div className="metric"><span>安全庫存門檻</span><strong>{eng.safety ?? '—'} 箱</strong></div>
          <div className="metric"><span>出貨後庫存</span><strong>{eng.afterStock ?? '—'} 箱</strong></div>
          <div className="metric"><span>保存條件</span><strong>{eng.storageType}</strong></div>
          <div className="metric"><span>效期（天）</span><strong>{eng.shelfLife}</strong></div>
          <div className="metric"><span>生產批次</span><strong>{eng.batchNo} ({eng.batchStatus})</strong></div>
        </div>

        <h3>硬性條件檢查</h3>
        <table className="candidates">
          <tbody>
            {[
              ['品號存在主檔', checks.skuExists],
              ['供應量充足',   checks.supplyOk],
              ['安全庫存達標', checks.safetyOk],
              ['交期可行',     checks.deliveryOk],
            ].map(([label, ok]) => (
              <tr key={label}>
                <td>{label}</td>
                <td><Badge type={ok ? 'success' : 'danger'}>{ok ? '✓ 通過' : '✗ 未通過'}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>

        <h3>分析依據</h3>
        <div className="analysis">
          {reasons.length ? reasons.map((r, i) => <p key={i} style={{ margin: '4px 0' }}>• {r}</p>) : <p>—</p>}
        </div>

        {!eng.checks?.supplyOk && (
          <div className="analysis" style={{ borderColor: '#b74343', background: '#fdf0f0' }}>
            <strong>供應不足處置建議：</strong>
            <p>• 優先供應高優先級客戶</p>
            <p>• 評估跨區調貨（見候選方案）</p>
            <p>• 等待生產批次 {eng.batchNo}（{eng.batchStatus}）</p>
            <p>• 或標記需人工覆核</p>
          </div>
        )}

        {candidates.length > 0 && (
          <>
            <h3>候選配送方案 <small className="muted-note">（估計值）</small></h3>
            <table className="candidates">
              <thead><tr><th>方案</th><th>距離(km)</th><th>估計成本</th><th>出貨後庫存</th><th>評分</th></tr></thead>
              <tbody>
                {candidates.map((c, i) => (
                  <tr key={i} style={{ background: i === 0 ? '#f3fbfa' : '' }}>
                    <td>{c.label}{i === 0 ? ' ✓ 推薦' : ''}</td>
                    <td>{c.dist}</td>
                    <td>${c.cost}<small className="muted-note">*估</small></td>
                    <td>{c.afterStock}</td>
                    <td><ScoreBar label="" score={c.score} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="footer-note">⚠ 配送距離與成本為 MVP 估計值，區域欄位需由 ERP 正式欄位取代後重新計算。</p>
          </>
        )}

        <h3>人工覆核</h3>
        <p className="footer-note">核准後請由人員回 ERP 建立正式調撥或出貨單，本系統不寫入 ERP。</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn primary" onClick={() => onReview(order.order_id, 'approved')}>核准</button>
          <button className="btn" onClick={() => onReview(order.order_id, 'manual')}>標記需人工調整</button>
          <button className="btn danger" onClick={() => onReview(order.order_id, 'rejected')}>拒絕</button>
        </div>
      </div>
    </div>
  );
}
