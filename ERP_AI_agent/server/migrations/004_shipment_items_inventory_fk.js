export async function up(conn) {
  const [cols] = await conn.query(`
    SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'shipment_items'
      AND COLUMN_NAME  = 'inventory_id'
  `);
  if (cols.length === 0) {
    await conn.query(`
      ALTER TABLE shipment_items
        ADD COLUMN inventory_id INT NULL AFTER order_item_id,
        ADD CONSTRAINT fk_si_inventory
          FOREIGN KEY (inventory_id) REFERENCES inventory(id) ON DELETE SET NULL
    `);
  }
}

export async function down(conn) {
  await conn.query(`ALTER TABLE shipment_items DROP FOREIGN KEY fk_si_inventory`);
  await conn.query(`ALTER TABLE shipment_items DROP COLUMN IF EXISTS inventory_id`);
}
