export async function up(conn) {
  // MySQL 8.0.16+ 才支援 CHECK，用 try/catch 讓舊版靜默跳過
  const checks = [
    [`ALTER TABLE sales_orders  ADD CONSTRAINT chk_order_status   CHECK (order_status  IN ('draft','allocated','shipped','delivered','cancelled'))`, 'chk_order_status'],
    [`ALTER TABLE sales_orders  ADD CONSTRAINT chk_review_status  CHECK (review_status IN ('pending','approved','rejected','manual'))`, 'chk_review_status'],
    [`ALTER TABLE sales_orders  ADD CONSTRAINT chk_priority       CHECK (priority      IN ('高','中','低'))`, 'chk_priority'],
    [`ALTER TABLE sales_orders  ADD CONSTRAINT chk_risk           CHECK (risk          IN ('高','中','低'))`, 'chk_risk'],
    [`ALTER TABLE shipments     ADD CONSTRAINT chk_delivery_status CHECK (delivery_status IN ('pending','dispatched','in_transit','delivered','failed'))`, 'chk_delivery_status'],
    [`ALTER TABLE order_items   ADD CONSTRAINT chk_item_status    CHECK (item_status   IN ('pending','partial','completed','cancelled'))`, 'chk_item_status'],
    [`ALTER TABLE inventory     ADD CONSTRAINT chk_inv_status     CHECK (inventory_status IN ('normal','frozen','quarantine','expired'))`, 'chk_inv_status'],
  ];

  for (const [sql, name] of checks) {
    // 先確認 constraint 不存在
    const [rows] = await conn.query(`
      SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
      WHERE TABLE_SCHEMA = DATABASE() AND CONSTRAINT_NAME = ?
    `, [name]);
    if (rows.length === 0) {
      try { await conn.query(sql); } catch { /* MySQL < 8.0.16 不支援，略過 */ }
    }
  }
}

export async function down(conn) {
  const names = ['chk_order_status','chk_review_status','chk_priority','chk_risk',
                 'chk_delivery_status','chk_item_status','chk_inv_status'];
  for (const name of names) {
    try { await conn.query(`ALTER TABLE sales_orders  DROP CHECK ${name}`); } catch {}
    try { await conn.query(`ALTER TABLE shipments     DROP CHECK ${name}`); } catch {}
    try { await conn.query(`ALTER TABLE order_items   DROP CHECK ${name}`); } catch {}
    try { await conn.query(`ALTER TABLE inventory     DROP CHECK ${name}`); } catch {}
  }
}
