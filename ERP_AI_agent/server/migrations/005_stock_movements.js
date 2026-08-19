export async function up(conn) {
  await conn.query(`
    CREATE TABLE IF NOT EXISTS stock_movements (
      movement_id    INT           AUTO_INCREMENT PRIMARY KEY,
      inventory_id   INT,
      warehouse_id   VARCHAR(50)   NOT NULL,
      sku_id         VARCHAR(50)   NOT NULL,
      batch_no       VARCHAR(50),
      movement_type  ENUM('in','reserve','release','ship','adjust') NOT NULL,
      qty            DECIMAL(14,3) NOT NULL,
      ref_type       VARCHAR(20),
      ref_id         VARCHAR(50),
      note           VARCHAR(200),
      created_at     TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (inventory_id) REFERENCES inventory(id) ON DELETE SET NULL
    )
  `);
}

export async function down(conn) {
  await conn.query(`DROP TABLE IF EXISTS stock_movements`);
}
