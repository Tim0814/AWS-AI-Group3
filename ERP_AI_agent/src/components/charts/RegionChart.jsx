import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { EmptyState } from '../ui';
import { REGION_DISTANCE, COST_PER_KM_BOX } from '../../store/mockData';

export default function RegionChart({ orders }) {
  const regions = ['北區', '中區', '南區'];
  const data = regions.map(r => {
    const rows = orders.filter(o => (o.region || '北區') === r);
    const qty = rows.reduce((s, o) => s + Number(o.quantity || 0), 0);
    const dist = REGION_DISTANCE[r] ?? 100;
    const cost = Math.round(qty * dist * COST_PER_KM_BOX);
    return { region: r, 訂單量: rows.length, 估計配送成本: cost };
  });

  if (data.every(d => d['訂單量'] === 0)) return <EmptyState msg="尚無訂單資料" />;

  return (
    <>
      <p className="chart-note">⚠ 配送距離與成本為估計值，非 ERP 真實資料</p>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#dce5ea" />
          <XAxis dataKey="region" tick={{ fontSize: 13 }} />
          <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
          <Tooltip />
          <Legend />
          <Bar yAxisId="left"  dataKey="訂單量"     fill="#3074aa" />
          <Bar yAxisId="right" dataKey="估計配送成本" fill="#b96c00" />
        </BarChart>
      </ResponsiveContainer>
    </>
  );
}
