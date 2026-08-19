export async function up(conn) {
  // 檢查 expiry_date 欄位是否已存在
  const [cols] = await conn.query(`
    SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'shipment_items'
      AND COLUMN_NAME  = 'expiry_date'
  `);
  if (cols.length === 0) {
    await conn.query(`
      ALTER TABLE shipment_items
        ADD COLUMN expiry_date DATE AFTER batch_no
    `);
  }

  // 檢查索引是否已存在
  const [idxs] = await conn.query(`
    SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'shipment_items'
      AND INDEX_NAME   = 'idx_si_sku_batch'
  `);
  if (idxs.length === 0) {
    await conn.query(`
      ALTER TABLE shipment_items
        ADD INDEX idx_si_sku_batch (sku_id, batch_no)
    `);
  }
}

export async function down(conn) {
  await conn.query(`ALTER TABLE shipment_items DROP INDEX IF EXISTS idx_si_sku_batch`);
  await conn.query(`ALTER TABLE shipment_items DROP COLUMN IF EXISTS expiry_date`);
}
