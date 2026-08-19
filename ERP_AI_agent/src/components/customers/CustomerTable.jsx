import { Badge } from '../ui';

const CHANNEL_TYPE = { '零售': 'info', '量販': 'info', '經銷': 'warning', '企業': 'success' };

export default function CustomerTable({ customers, onEdit, onDelete }) {
  if (!customers.length) return <div className="empty">尚無客戶資料</div>;

  return (
    <div className="table-wrap">
      <table className="orders">
        <thead>
          <tr>
            {['客戶編號', '客戶名稱', '通路', '區域', '配送地址', '信用額度', '付款條件', '操作'].map(h => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {customers.map(c => (
            <tr key={c.customer_id}>
              <td>{c.customer_id}</td>
              <td>{c.customer_name}</td>
              <td><Badge type={CHANNEL_TYPE[c.channel] || 'default'}>{c.channel || '—'}</Badge></td>
              <td>{c.region || '—'}</td>
              <td>{c.address || '—'}</td>
              <td>{c.credit_limit ? `$${Number(c.credit_limit).toLocaleString()}` : '—'}</td>
              <td>{c.payment_terms || '—'}</td>
              <td>
                <button className="btn sm" onClick={() => onEdit(c)}>編輯</button>
                <button className="btn sm danger" onClick={() => onDelete(c.customer_id)}>刪除</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
