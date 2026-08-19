import { KpiCard } from '../ui';

export default function KpiRow({ enriched, shipments = [] }) {
  const pending  = enriched.filter(o => o.review_status === 'pending').length;
  const shortage = new Set(enriched.filter(o => o._engine && !o._engine.checks.supplyOk).map(o => o.sku_id || o.item)).size;
  const gap      = enriched.reduce((s, o) => s + Math.max(0, -(o._engine?.gap ?? 0)), 0);
  const highRisk = enriched.filter(o => o.risk === '高' || o._engine?.exceptionType === '交期衝突').length;
  const delivered   = shipments.filter(s => s.delivery_status === 'delivered').length;
  const totalShip   = shipments.length;
  const deliveryRate = totalShip > 0 ? Math.round((delivered / totalShip) * 100) : null;

  return (
    <div className="kpis kpis-5">
      <KpiCard label="待覆核訂單"   value={pending}      sub="筆" />
      <KpiCard label="供應不足 SKU" value={shortage}     sub="項" accent={shortage > 0} />
      <KpiCard label="總供需缺口"   value={gap}          sub="箱（估計）" accent={gap > 0} />
      <KpiCard label="高風險／急交" value={highRisk}     sub="筆" accent={highRisk > 0} />
      <KpiCard label="配送完成率"   value={deliveryRate != null ? `${deliveryRate}%` : '—'} sub={`${delivered}/${totalShip} 筆`} />
    </div>
  );
}
