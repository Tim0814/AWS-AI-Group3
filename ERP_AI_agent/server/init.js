import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const DB_NAME = process.env.DB_NAME || 'erp_agent';

async function init() {
  const conn = await mysql.createConnection({
    host:     process.env.DB_HOST || 'localhost',
    port:     process.env.DB_PORT || 3306,
    user:     process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    multipleStatements: true,
  });

  await conn.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await conn.query(`USE \`${DB_NAME}\``);

  // ── 倉庫主檔 ──────────────────────────────────────────────────────────────
  await conn.query(`
    CREATE TABLE IF NOT EXISTS warehouses (
      warehouse_id       VARCHAR(50)  PRIMARY KEY,
      warehouse_name     VARCHAR(100) NOT NULL,
      region             VARCHAR(20)  DEFAULT '北區',
      address            VARCHAR(200),
      cold_chain_capable TINYINT(1)   DEFAULT 0,
      created_at         TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
      updated_at         TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  // ── 客戶主檔 ──────────────────────────────────────────────────────────────
  await conn.query(`
    CREATE TABLE IF NOT EXISTS customers (
      customer_id    VARCHAR(50)   PRIMARY KEY,
      customer_name  VARCHAR(100)  NOT NULL,
      channel        VARCHAR(50),
      region         VARCHAR(20)   DEFAULT '北區',
      address        VARCHAR(200),
      credit_limit   DECIMAL(12,2) DEFAULT 0,
      payment_terms  VARCHAR(50),
      created_at     TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
      updated_at     TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  // ── 商品主檔 ──────────────────────────────────────────────────────────────
  await conn.query(`
    CREATE TABLE IF NOT EXISTS products (
      sku_id          VARCHAR(50)   PRIMARY KEY,
      sku_name        VARCHAR(100)  NOT NULL,
      category        VARCHAR(50),
      spec            VARCHAR(100),
      unit            VARCHAR(20)   DEFAULT '箱',
      shelf_life_days INT,
      storage_type    VARCHAR(20),
      unit_cost       DECIMAL(10,2) DEFAULT 0,
      status          VARCHAR(20)   DEFAULT 'active',
      updated_at      TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  // ── 庫存（含批號、效期） ──────────────────────────────────────────────────
  await conn.query(`
    CREATE TABLE IF NOT EXISTS inventory (
      id                INT           AUTO_INCREMENT PRIMARY KEY,
      warehouse_id      VARCHAR(50)   NOT NULL,
      sku_id            VARCHAR(50)   NOT NULL,
      batch_no          VARCHAR(50),
      manufactured_date DATE,
      expiry_date       DATE,
      available_qty     DECIMAL(14,3) DEFAULT 0,
      reserved_qty      DECIMAL(14,3) DEFAULT 0,
      safety_stock      DECIMAL(14,3) DEFAULT 0,
      unit              VARCHAR(20)   DEFAULT '箱',
      inventory_status  ENUM('normal','frozen','quarantine','expired') DEFAULT 'normal',
      updated_at        TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_inv (warehouse_id, sku_id, batch_no),
      FOREIGN KEY (warehouse_id) REFERENCES warehouses(warehouse_id) ON DELETE RESTRICT,
      FOREIGN KEY (sku_id)       REFERENCES products(sku_id)         ON DELETE CASCADE
    )
  `);

  // ── 生產批次 ──────────────────────────────────────────────────────────────
  await conn.query(`
    CREATE TABLE IF NOT EXISTS production_batches (
      batch_no            VARCHAR(50)   PRIMARY KEY,
      sku_id              VARCHAR(50),
      warehouse_id        VARCHAR(50),
      qty                 DECIMAL(14,3) DEFAULT 0,
      uom                 VARCHAR(20)   DEFAULT '箱',
      planned_finish_date DATETIME,
      actual_finish_date  DATETIME,
      expiry_date         DATE,
      batch_status        VARCHAR(20)   DEFAULT 'planned',
      plant               VARCHAR(50),
      FOREIGN KEY (sku_id)       REFERENCES products(sku_id)         ON DELETE SET NULL,
      FOREIGN KEY (warehouse_id) REFERENCES warehouses(warehouse_id) ON DELETE SET NULL
    )
  `);

  // ── 訂單表頭 ──────────────────────────────────────────────────────────────
  await conn.query(`
    CREATE TABLE IF NOT EXISTS sales_orders (
      order_id                VARCHAR(50)   PRIMARY KEY,
      customer_id             VARCHAR(50),
      customer_name_snapshot  VARCHAR(100),
      channel_snapshot        VARCHAR(50),
      region_snapshot         VARCHAR(20)   DEFAULT '北區',
      delivery_address        VARCHAR(200),
      required_delivery_date  DATE,
      delivery_window_start   DATETIME,
      delivery_window_end     DATETIME,
      priority                ENUM('高','中','低'),
      risk                    ENUM('高','中','低'),
      order_status            ENUM('draft','allocated','shipped','delivered','cancelled') DEFAULT 'draft',
      review_status           ENUM('pending','approved','rejected','manual')             DEFAULT 'pending',
      order_total             DECIMAL(14,2) DEFAULT 0,
      erp_ref_no              VARCHAR(50),
      created_at              TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
      updated_at              TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(customer_id) ON DELETE SET NULL
    )
  `);

  // ── 訂單明細 ──────────────────────────────────────────────────────────────
  await conn.query(`
    CREATE TABLE IF NOT EXISTS order_items (
      order_item_id      INT           AUTO_INCREMENT PRIMARY KEY,
      order_id           VARCHAR(50)   NOT NULL,
      line_no            INT           NOT NULL,
      sku_id             VARCHAR(50),
      item_name_snapshot VARCHAR(100),
      ordered_qty        DECIMAL(14,3) NOT NULL,
      uom                VARCHAR(20)   DEFAULT '箱',
      unit_price         DECIMAL(10,2) DEFAULT 0,
      line_total         DECIMAL(14,2) DEFAULT 0,
      allocated_qty      DECIMAL(14,3) DEFAULT 0,
      shipped_qty        DECIMAL(14,3) DEFAULT 0,
      item_status        ENUM('pending','partial','completed','cancelled') DEFAULT 'pending',
      UNIQUE KEY uq_order_line (order_id, line_no),
      FOREIGN KEY (order_id) REFERENCES sales_orders(order_id) ON DELETE CASCADE,
      FOREIGN KEY (sku_id)   REFERENCES products(sku_id)        ON DELETE SET NULL
    )
  `);

  // ── 出貨單 ────────────────────────────────────────────────────────────────
  await conn.query(`
    CREATE TABLE IF NOT EXISTS shipments (
      shipment_id         VARCHAR(50)   PRIMARY KEY,
      order_id            VARCHAR(50),
      warehouse_id        VARCHAR(50),
      carrier             VARCHAR(100),
      vehicle_no          VARCHAR(50),
      planned_dispatch_at DATETIME,
      actual_dispatch_at  DATETIME,
      eta                 DATETIME,
      delivered_at        DATETIME,
      receiver_name       VARCHAR(100),
      proof_of_delivery   VARCHAR(200),
      transport_cost      DECIMAL(10,2) DEFAULT 0,
      delivery_status     ENUM('pending','dispatched','in_transit','delivered','failed') DEFAULT 'pending',
      created_at          TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id)     REFERENCES sales_orders(order_id)   ON DELETE SET NULL,
      FOREIGN KEY (warehouse_id) REFERENCES warehouses(warehouse_id) ON DELETE SET NULL
    )
  `);

  // ── 出貨明細 ──────────────────────────────────────────────────────────────
  await conn.query(`
    CREATE TABLE IF NOT EXISTS shipment_items (
      shipment_item_id INT           AUTO_INCREMENT PRIMARY KEY,
      shipment_id      VARCHAR(50)   NOT NULL,
      order_item_id    INT,
      inventory_id     INT,
      sku_id           VARCHAR(50),
      batch_no         VARCHAR(50),
      expiry_date      DATE,
      shipped_qty      DECIMAL(14,3) NOT NULL,
      uom              VARCHAR(20)   DEFAULT '箱',
      INDEX idx_si_sku_batch (sku_id, batch_no),
      FOREIGN KEY (shipment_id)   REFERENCES shipments(shipment_id)          ON DELETE CASCADE,
      FOREIGN KEY (order_item_id) REFERENCES order_items(order_item_id)      ON DELETE SET NULL,
      FOREIGN KEY (inventory_id)  REFERENCES inventory(id)                   ON DELETE SET NULL,
      FOREIGN KEY (sku_id)        REFERENCES products(sku_id)                ON DELETE SET NULL
    )
  `);

  // ── 訂單覆核歷程 ──────────────────────────────────────────────────────────
  await conn.query(`
    CREATE TABLE IF NOT EXISTS order_reviews (
      review_id      INT           AUTO_INCREMENT PRIMARY KEY,
      order_id       VARCHAR(50)   NOT NULL,
      decision       VARCHAR(20)   NOT NULL,
      risk_level     VARCHAR(10),
      exception_type VARCHAR(50),
      reason         TEXT,
      reviewed_by    VARCHAR(100)  DEFAULT 'system',
      reviewed_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES sales_orders(order_id) ON DELETE CASCADE
    )
  `);

  // ── 庫存流水帳 ────────────────────────────────────────────────────────────
  await conn.query(`
    CREATE TABLE IF NOT EXISTS stock_movements (
      movement_id   INT           AUTO_INCREMENT PRIMARY KEY,
      inventory_id  INT,
      warehouse_id  VARCHAR(50)   NOT NULL,
      sku_id        VARCHAR(50)   NOT NULL,
      batch_no      VARCHAR(50),
      movement_type ENUM('in','reserve','release','ship','adjust') NOT NULL,
      qty           DECIMAL(14,3) NOT NULL,
      ref_type      VARCHAR(20),
      ref_id        VARCHAR(50),
      note          VARCHAR(200),
      created_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (inventory_id) REFERENCES inventory(id) ON DELETE SET NULL
    )
  `);

  console.log(`✅ 資料庫 [${DB_NAME}] 與所有資料表建立完成`);
  await conn.end();
}

init().catch(err => { console.error(err); process.exit(1); });
