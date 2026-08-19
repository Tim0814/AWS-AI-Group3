export async function up(conn) {
  await conn.query(`
    CREATE TABLE IF NOT EXISTS order_reviews (
      review_id     INT          AUTO_INCREMENT PRIMARY KEY,
      order_id      VARCHAR(50)  NOT NULL,
      decision      VARCHAR(20)  NOT NULL,
      risk_level    VARCHAR(10),
      exception_type VARCHAR(50),
      reason        TEXT,
      reviewed_by   VARCHAR(100) DEFAULT 'system',
      reviewed_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES sales_orders(order_id) ON DELETE CASCADE
    )
  `);
}

export async function down(conn) {
  await conn.query('DROP TABLE IF EXISTS order_reviews');
}
