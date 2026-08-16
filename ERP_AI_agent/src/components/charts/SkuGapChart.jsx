import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell,
} from 'recharts';
import { EmptyState } from '../ui';

export default function SkuGapChart({ supply, demand }) {
  if (!supply.length && !demand.length) return <EmptyState msg="尚無供需資料" />;

  const supplyMap = Object.fromEntries(supply.map(s => [s.sku_id, s.allocatable_qty]));
  const demandMap = {};
  demand.forEach(d => {
    demandMap[d.sku_id] = (demandMap[d.sku_id] || 0) + Number(d.qty);
  });

  const skus = [...new Set([...Object.keys(supplyMap), ...Object.keys(demandMap)])];
  const data = skus.map(sku => ({
    sku,
    供應量: supplyMap[sku] ?? 0,
    需求量: demandMap[sku] ?? 0,
    shortage: (supplyMap[sku] ?? 0) < (demandMap[sku] ?? 0),
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#dce5ea" />
        <XAxis dataKey="sku" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip />
        <Legend />
        <Bar dataKey="供應量" fill="#007d79">
          {data.map((d, i) => <Cell key={i} fill={d.shortage ? '#e6a247' : '#007d79'} />)}
        </Bar>
        <Bar dataKey="需求量" fill="#3074aa" />
      </BarChart>
    </ResponsiveContainer>
  );
}
