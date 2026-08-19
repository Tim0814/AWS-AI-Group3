export async function up(conn) {
  const [idxs] = await conn.query(`
    SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'order_items'
      AND INDEX_NAME   = 'uq_order_line'
  `);
  if (idxs.length === 0) {
    await conn.query(`ALTER TABLE order_items ADD UNIQUE KEY uq_order_line (order_id, line_no)`);
  }
}

export async function down(conn) {
  await conn.query(`ALTER TABLE order_items DROP INDEX IF EXISTS uq_order_line`);
}
