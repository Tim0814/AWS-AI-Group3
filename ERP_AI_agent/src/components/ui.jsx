export function Badge({ type = 'default', children }) {
  const cls = {
    default: 'badge',
    success: 'badge badge-ok',
    warning: 'badge badge-warn',
    danger:  'badge badge-risk',
    info:    'badge badge-info',
    pending: 'badge badge-pending',
  }[type] || 'badge';
  return <span className={cls}>{children}</span>;
}

export function KpiCard({ label, value, sub, accent }) {
  return (
    <div className={`kpi${accent ? ' kpi-accent' : ''}`}>
      <span>{label}</span>
      <strong>{value ?? '—'}</strong>
      {sub && <small>{sub}</small>}
    </div>
  );
}

export function EmptyState({ msg = '尚無資料' }) {
  return <div className="empty">{msg}</div>;
}

export function Alert({ type = 'error', children, onClose }) {
  return (
    <div className={type === 'error' ? 'alert-error' : 'alert-info'}>
      {children}
      {onClose && <button className="btn-close" onClick={onClose}>✕</button>}
    </div>
  );
}

export function StatusBadge({ status }) {
  const map = { pending: ['pending', '待覆核'], approved: ['ok', '已核准'], rejected: ['danger', '已拒絕'], manual: ['warning', '需人工調整'] };
  const [type, label] = map[status] || ['default', status];
  return <Badge type={type}>{label}</Badge>;
}

export function SuggestionBadge({ s }) {
  if (s === 'approved') return <Badge type="success">建議核准</Badge>;
  if (s === 'warning')  return <Badge type="warning">建議覆核</Badge>;
  if (s === 'exception') return <Badge type="danger">例外</Badge>;
  return <Badge>—</Badge>;
}
