export async function up(conn) {
  // sales_orders: delivery_window_start/end DATE → DATETIME
  const [startCol] = await conn.query(`
    SELECT DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'sales_orders'
      AND COLUMN_NAME  = 'delivery_window_start'
  `);
  if (startCol.length > 0 && startCol[0].DATA_TYPE === 'date') {
    await conn.query(`
      ALTER TABLE sales_orders
        MODIFY COLUMN delivery_window_start DATETIME NULL,
        MODIFY COLUMN delivery_window_end   DATETIME NULL
    `);
  }

  // warehouses: 加 updated_at
  const [whCol] = await conn.query(`
    SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'warehouses'
      AND COLUMN_NAME  = 'updated_at'
  `);
  if (whCol.length === 0) {
    await conn.query(`
      ALTER TABLE warehouses
        ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    `);
  }

  // customers: 加 updated_at
  const [cuCol] = await conn.query(`
    SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'customers'
      AND COLUMN_NAME  = 'updated_at'
  `);
  if (cuCol.length === 0) {
    await conn.query(`
      ALTER TABLE customers
        ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    `);
  }

  // products: 加 updated_at
  const [prCol] = await conn.query(`
    SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'products'
      AND COLUMN_NAME  = 'updated_at'
  `);
  if (prCol.length === 0) {
    await conn.query(`
      ALTER TABLE products
        ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    `);
  }
}

export async function down(conn) {
  await conn.query(`ALTER TABLE sales_orders MODIFY COLUMN delivery_window_start DATE NULL`);
  await conn.query(`ALTER TABLE sales_orders MODIFY COLUMN delivery_window_end   DATE NULL`);
  await conn.query(`ALTER TABLE warehouses DROP COLUMN IF EXISTS updated_at`);
  await conn.query(`ALTER TABLE customers  DROP COLUMN IF EXISTS updated_at`);
  await conn.query(`ALTER TABLE products   DROP COLUMN IF EXISTS updated_at`);
}
