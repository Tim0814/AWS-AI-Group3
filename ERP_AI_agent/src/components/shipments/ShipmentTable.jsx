import { Badge } from '../ui';

const STATUS_MAP = {
  pending:    ['pending', '待出貨'],
  dispatched: ['info',    '已出車'],
  in_transit: ['warning', '運送中'],
  delivered:  ['success', '已送達'],
  failed:     ['danger',  '配送失敗'],
};

const NEXT_STATUS = {
  pending:    'dispatched',
  dispatched: 'in_transit',
  in_transit: 'delivered',
};

function fmtDt(v) {
  if (!v) return '—';
  return String(v).replace('T', ' ').slice(0, 16);
}

export default function ShipmentTable({ shipments, warehouses = [], onStatusChange, onDelete }) {
  if (!shipments.length) return <div className="empty">尚無出貨紀錄</div>;

  const whMap = Object.fromEntries(warehouses.map(w => [w.warehouse_id, w.warehouse_name]));

  return (
    <div className="table-wrap">
      <table className="orders">
        <thead>
          <tr>
            {['出貨單號', '訂單編號', '倉庫', '承運商', '車號', '收貨人', '預計出車', 'ETA', '運費', '配送狀態', '操作'].map(h => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {shipments.map(s => {
            const [badgeType, label] = STATUS_MAP[s.delivery_status] || ['default', s.delivery_status];
            const next = NEXT_STATUS[s.delivery_status];
            return (
              <tr key={s.shipment_id}>
                <td>{s.shipment_id}</td>
                <td>{s.order_id || '—'}</td>
                <td>{whMap[s.warehouse_id] || s.warehouse_id || '—'}</td>
                <td>{s.carrier || '—'}</td>
                <td>{s.vehicle_no || '—'}</td>
                <td>{s.receiver_name || '—'}</td>
                <td>{fmtDt(s.planned_dispatch_at)}</td>
                <td>{fmtDt(s.eta)}</td>
                <td>{s.transport_cost ? `$${Number(s.transport_cost).toLocaleString()}` : '—'}</td>
                <td><Badge type={badgeType}>{label}</Badge></td>
                <td>
                  {next && (
                    <button className="btn sm primary" onClick={() => onStatusChange(s.shipment_id, next)}>
                      → {STATUS_MAP[next]?.[1]}
                    </button>
                  )}
                  <button className="btn sm danger" style={{ marginLeft: 4 }} onClick={() => onDelete(s.shipment_id)}>刪除</button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
