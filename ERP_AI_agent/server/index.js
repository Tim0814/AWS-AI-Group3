import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool from './db.js';
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// ── Warehouses ────────────────────────────────────────────────────────────────

app.get('/api/warehouses', async (req, res) => {
  const [rows] = await pool.execute('SELECT * FROM warehouses ORDER BY warehouse_id');
  res.json(rows);
});

app.post('/api/warehouses', async (req, res) => {
  const w = req.body;
  try {
    await pool.execute(
      `INSERT INTO warehouses (warehouse_id,warehouse_name,region,address,cold_chain_capable)
       VALUES (?,?,?,?,?)`,
      [w.warehouse_id, w.warehouse_name, w.region||'北區', w.address||null, w.cold_chain_capable||0]
    );
    res.json({ ok: true });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: `倉庫編號 ${w.warehouse_id} 已存在` });
    throw err;
  }
});

// ── Products ──────────────────────────────────────────────────────────────────

app.get('/api/products', async (req, res) => {
  const [rows] = await pool.execute('SELECT * FROM products ORDER BY sku_id');
  res.json(rows);
});

app.post('/api/products', async (req, res) => {
  const p = req.body;
  try {
    await pool.execute(
      `INSERT INTO products (sku_id,sku_name,category,spec,unit,shelf_life_days,storage_type,unit_cost,status)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [p.sku_id, p.sku_name, p.category||null, p.spec||null, p.unit||'箱',
       p.shelf_life_days||null, p.storage_type||null, p.unit_cost||0, p.status||'active']
    );
    res.json({ ok: true });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: `品號 ${p.sku_id} 已存在` });
    throw err;
  }
});

// ── Inventory ─────────────────────────────────────────────────────────────────

app.get('/api/inventory', async (req, res) => {
  const [rows] = await pool.execute(`
    SELECT i.*, w.warehouse_name, w.region AS warehouse_region
    FROM inventory i
    LEFT JOIN warehouses w ON i.warehouse_id = w.warehouse_id
    ORDER BY i.sku_id, i.expiry_date
  `);
  res.json(rows);
});

app.post('/api/inventory', async (req, res) => {
  const v = req.body;
  try {
    await pool.execute(
      `INSERT INTO inventory
        (warehouse_id,sku_id,batch_no,manufactured_date,expiry_date,
         available_qty,reserved_qty,safety_stock,unit,inventory_status)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [v.warehouse_id, v.sku_id, v.batch_no||null, v.manufactured_date||null, v.expiry_date||null,
       v.available_qty||0, v.reserved_qty||0, v.safety_stock||0, v.unit||'箱', v.inventory_status||'normal']
    );
    res.json({ ok: true });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: '相同倉庫/SKU/批號已存在' });
    throw err;
  }
});

app.put('/api/inventory/:id', async (req, res) => {
  const v = req.body;
  await pool.execute(
    `UPDATE inventory SET available_qty=?,reserved_qty=?,safety_stock=?,
     expiry_date=?,inventory_status=?,updated_at=NOW() WHERE id=?`,
    [v.available_qty||0, v.reserved_qty||0, v.safety_stock||0,
     v.expiry_date||null, v.inventory_status||'normal', req.params.id]
  );
  res.json({ ok: true });
});

// ── Production Batches ────────────────────────────────────────────────────────

app.get('/api/production', async (req, res) => {
  const [rows] = await pool.execute('SELECT * FROM production_batches ORDER BY planned_finish_date');
  res.json(rows);
});

app.post('/api/production', async (req, res) => {
  const b = req.body;
  try {
    await pool.execute(
      `INSERT INTO production_batches
        (batch_no,sku_id,warehouse_id,qty,uom,planned_finish_date,actual_finish_date,expiry_date,batch_status,plant)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [b.batch_no, b.sku_id||null, b.warehouse_id||null, b.qty||0, b.uom||'箱',
       b.planned_finish_date||null, b.actual_finish_date||null, b.expiry_date||null,
       b.batch_status||'planned', b.plant||null]
    );
    res.json({ ok: true });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: `批次 ${b.batch_no} 已存在` });
    throw err;
  }
});

app.patch('/api/production/:id/status', async (req, res) => {
  await pool.execute(
    'UPDATE production_batches SET batch_status=?,actual_finish_date=? WHERE batch_no=?',
    [req.body.status, req.body.actual_finish_date||null, req.params.id]
  );
  res.json({ ok: true });
});

// ── Customers ─────────────────────────────────────────────────────────────────

app.get('/api/customers', async (req, res) => {
  const [rows] = await pool.execute('SELECT * FROM customers ORDER BY customer_name');
  res.json(rows);
});

app.post('/api/customers', async (req, res) => {
  const c = req.body;
  try {
    await pool.execute(
      `INSERT INTO customers (customer_id,customer_name,channel,region,address,credit_limit,payment_terms)
       VALUES (?,?,?,?,?,?,?)`,
      [c.customer_id, c.customer_name, c.channel||null, c.region||'北區',
       c.address||null, c.credit_limit||0, c.payment_terms||null]
    );
    res.json({ ok: true });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: `客戶編號 ${c.customer_id} 已存在` });
    throw err;
  }
});

app.put('/api/customers/:id', async (req, res) => {
  const c = req.body;
  await pool.execute(
    `UPDATE customers SET customer_name=?,channel=?,region=?,address=?,credit_limit=?,payment_terms=?
     WHERE customer_id=?`,
    [c.customer_name, c.channel||null, c.region||'北區', c.address||null,
     c.credit_limit||0, c.payment_terms||null, req.params.id]
  );
  res.json({ ok: true });
});

app.delete('/api/customers/:id', async (req, res) => {
  await pool.execute('DELETE FROM customers WHERE customer_id=?', [req.params.id]);
  res.json({ ok: true });
});

// ── Sales Orders（表頭） ──────────────────────────────────────────────────────

app.get('/api/orders', async (req, res) => {
  const [orders] = await pool.execute('SELECT * FROM sales_orders ORDER BY created_at DESC');
  const [items]  = await pool.execute('SELECT * FROM order_items ORDER BY order_id, line_no');
  const itemMap  = {};
  items.forEach(i => { (itemMap[i.order_id] ||= []).push(i); });
  res.json(orders.map(o => ({ ...o, items: itemMap[o.order_id] || [] })));
});

app.post('/api/orders', async (req, res) => {
  const o = req.body;
  const items = o.items || [];
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const orderTotal = items.reduce((s, i) => s + (Number(i.line_total) || 0), 0);
    await conn.execute(
      `INSERT INTO sales_orders
        (order_id,customer_id,customer_name_snapshot,channel_snapshot,region_snapshot,
         delivery_address,required_delivery_date,delivery_window_start,delivery_window_end,
         priority,risk,order_status,review_status,order_total,erp_ref_no)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [o.order_id, o.customer_id||null, o.customer_name_snapshot||null, o.channel_snapshot||null,
       o.region_snapshot||'北區', o.delivery_address||null, o.required_delivery_date||null,
       o.delivery_window_start||null, o.delivery_window_end||null,
       o.priority||null, o.risk||null, o.order_status||'draft', o.review_status||'pending',
       orderTotal, o.erp_ref_no||null]
    );
    for (const [idx, item] of items.entries()) {
      const lineTotal = (Number(item.ordered_qty)||0) * (Number(item.unit_price)||0);
      await conn.execute(
        `INSERT INTO order_items
          (order_id,line_no,sku_id,item_name_snapshot,ordered_qty,uom,unit_price,line_total,item_status)
         VALUES (?,?,?,?,?,?,?,?,?)`,
        [o.order_id, idx+1, item.sku_id||null, item.item_name_snapshot||null,
         item.ordered_qty, item.uom||'箱', item.unit_price||0, lineTotal, item.item_status||'pending']
      );
    }
    await conn.commit();
    res.json({ ok: true });
  } catch (err) {
    await conn.rollback();
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: `訂單編號 ${o.order_id} 已存在` });
    throw err;
  } finally {
    conn.release();
  }
});

app.put('/api/orders/:id', async (req, res) => {
  const o = req.body;
  const items = o.items || [];
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const orderTotal = items.reduce((s, i) => s + (Number(i.line_total) || 0), 0);
    await conn.execute(
      `UPDATE sales_orders SET customer_id=?,customer_name_snapshot=?,channel_snapshot=?,
       region_snapshot=?,delivery_address=?,required_delivery_date=?,delivery_window_start=?,
       delivery_window_end=?,priority=?,risk=?,order_status=?,review_status=?,
       order_total=?,erp_ref_no=?,updated_at=NOW() WHERE order_id=?`,
      [o.customer_id||null, o.customer_name_snapshot||null, o.channel_snapshot||null,
       o.region_snapshot||'北區', o.delivery_address||null, o.required_delivery_date||null,
       o.delivery_window_start||null, o.delivery_window_end||null,
       o.priority||null, o.risk||null, o.order_status||'draft', o.review_status||'pending',
       orderTotal, o.erp_ref_no||null, req.params.id]
    );
    await conn.execute('DELETE FROM order_items WHERE order_id=?', [req.params.id]);
    for (const [idx, item] of items.entries()) {
      const lineTotal = (Number(item.ordered_qty)||0) * (Number(item.unit_price)||0);
      await conn.execute(
        `INSERT INTO order_items
          (order_id,line_no,sku_id,item_name_snapshot,ordered_qty,uom,unit_price,line_total,item_status)
         VALUES (?,?,?,?,?,?,?,?,?)`,
        [req.params.id, idx+1, item.sku_id||null, item.item_name_snapshot||null,
         item.ordered_qty, item.uom||'箱', item.unit_price||0, lineTotal, item.item_status||'pending']
      );
    }
    await conn.commit();
    res.json({ ok: true });
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
});

app.patch('/api/orders/:id/review', async (req, res) => {
  const { status, risk_level, exception_type, reason, reviewed_by } = req.body;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute(
      'UPDATE sales_orders SET review_status=?,updated_at=NOW() WHERE order_id=?',
      [status, req.params.id]
    );
    await conn.execute(
      `INSERT INTO order_reviews (order_id,decision,risk_level,exception_type,reason,reviewed_by)
       VALUES (?,?,?,?,?,?)`,
      [req.params.id, status, risk_level||null, exception_type||null,
       reason||null, reviewed_by||'system']
    );
    await conn.commit();
    res.json({ ok: true });
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
});

app.get('/api/orders/:id/reviews', async (req, res) => {
  const [rows] = await pool.execute(
    'SELECT * FROM order_reviews WHERE order_id=? ORDER BY reviewed_at DESC',
    [req.params.id]
  );
  res.json(rows);
});

app.delete('/api/orders/:id', async (req, res) => {
  await pool.execute('DELETE FROM sales_orders WHERE order_id=?', [req.params.id]);
  res.json({ ok: true });
});

// ── Shipments ─────────────────────────────────────────────────────────────────

app.get('/api/shipments', async (req, res) => {
  const [shipments] = await pool.execute('SELECT * FROM shipments ORDER BY created_at DESC');
  const [items]     = await pool.execute('SELECT * FROM shipment_items ORDER BY shipment_id');
  const itemMap = {};
  items.forEach(i => { (itemMap[i.shipment_id] ||= []).push(i); });
  res.json(shipments.map(s => ({ ...s, items: itemMap[s.shipment_id] || [] })));
});

app.post('/api/shipments', async (req, res) => {
  const s = req.body;
  const items = s.items || [];
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute(
      `INSERT INTO shipments
        (shipment_id,order_id,warehouse_id,carrier,vehicle_no,
         planned_dispatch_at,actual_dispatch_at,eta,receiver_name,transport_cost,delivery_status)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [s.shipment_id, s.order_id||null, s.warehouse_id||null, s.carrier||null, s.vehicle_no||null,
       s.planned_dispatch_at||null, s.actual_dispatch_at||null, s.eta||null,
       s.receiver_name||null, s.transport_cost||0, s.delivery_status||'pending']
    );

    for (const item of items) {
      const qty = Number(item.shipped_qty) || 0;

      // 1. 寫出貨明細（含 inventory_id）
      await conn.execute(
        `INSERT INTO shipment_items
          (shipment_id,order_item_id,inventory_id,sku_id,batch_no,expiry_date,shipped_qty,uom)
         VALUES (?,?,?,?,?,?,?,?)`,
        [s.shipment_id, item.order_item_id||null, item.inventory_id||null,
         item.sku_id||null, item.batch_no||null, item.expiry_date||null, qty, item.uom||'箱']
      );

      // 2. 扣庫存 available_qty（若有指定 inventory_id）
      if (item.inventory_id && qty > 0) {
        await conn.execute(
          `UPDATE inventory SET available_qty = available_qty - ? WHERE id = ?`,
          [qty, item.inventory_id]
        );
        // 寫流水帳
        const [[inv]] = await conn.execute('SELECT warehouse_id, sku_id, batch_no FROM inventory WHERE id=?', [item.inventory_id]);
        if (inv) {
          await conn.execute(
            `INSERT INTO stock_movements
              (inventory_id,warehouse_id,sku_id,batch_no,movement_type,qty,ref_type,ref_id,note)
             VALUES (?,?,?,?,'ship',?,?,?,?)`,
            [item.inventory_id, inv.warehouse_id, inv.sku_id, inv.batch_no,
             -qty, 'shipment', s.shipment_id, `出貨單 ${s.shipment_id}`]
          );
        }
      }

      // 3. 更新 order_items.shipped_qty
      if (item.order_item_id && qty > 0) {
        await conn.execute(
          `UPDATE order_items SET shipped_qty = shipped_qty + ?,
            item_status = CASE
              WHEN shipped_qty + ? >= ordered_qty THEN 'completed'
              WHEN shipped_qty + ? > 0            THEN 'partial'
              ELSE item_status END
           WHERE order_item_id = ?`,
          [qty, qty, qty, item.order_item_id]
        );
      }
    }

    await conn.commit();
    res.json({ ok: true });
  } catch (err) {
    await conn.rollback();
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: `出貨單號 ${s.shipment_id} 已存在` });
    throw err;
  } finally {
    conn.release();
  }
});

app.patch('/api/shipments/:id/status', async (req, res) => {
  const { status, delivered_at } = req.body;
  await pool.execute(
    'UPDATE shipments SET delivery_status=?,delivered_at=? WHERE shipment_id=?',
    [status, delivered_at||null, req.params.id]
  );
  res.json({ ok: true });
});

app.delete('/api/shipments/:id', async (req, res) => {
  await pool.execute('DELETE FROM shipments WHERE shipment_id=?', [req.params.id]);
  res.json({ ok: true });
});

// ── Stock Movements ───────────────────────────────────────────────────────────

app.get('/api/stock-movements', async (req, res) => {
  const { sku_id, warehouse_id, inventory_id, limit = 200 } = req.query;
  let sql = 'SELECT * FROM stock_movements WHERE 1=1';
  const params = [];
  if (sku_id)       { sql += ' AND sku_id=?';       params.push(sku_id); }
  if (warehouse_id) { sql += ' AND warehouse_id=?'; params.push(warehouse_id); }
  if (inventory_id) { sql += ' AND inventory_id=?'; params.push(inventory_id); }
  sql += ' ORDER BY created_at DESC LIMIT ?';
  params.push(Number(limit));
  const [rows] = await pool.execute(sql, params);
  res.json(rows);
});

app.post('/api/stock-movements', async (req, res) => {
  const m = req.body;
  const qty = Number(m.qty);
  if (!m.warehouse_id || !m.sku_id || !m.movement_type || !qty)
    return res.status(400).json({ error: '缺少必填欄位' });
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute(
      `INSERT INTO stock_movements
        (inventory_id,warehouse_id,sku_id,batch_no,movement_type,qty,ref_type,ref_id,note)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [m.inventory_id||null, m.warehouse_id, m.sku_id, m.batch_no||null,
       m.movement_type, qty, m.ref_type||null, m.ref_id||null, m.note||null]
    );
    // 同步更新 inventory
    if (m.inventory_id) {
      const delta = ['in','release'].includes(m.movement_type) ? qty : -Math.abs(qty);
      if (m.movement_type === 'reserve') {
        await conn.execute(
          'UPDATE inventory SET reserved_qty = reserved_qty + ?, available_qty = available_qty - ? WHERE id=?',
          [Math.abs(qty), Math.abs(qty), m.inventory_id]
        );
      } else if (m.movement_type === 'release') {
        await conn.execute(
          'UPDATE inventory SET reserved_qty = reserved_qty - ?, available_qty = available_qty + ? WHERE id=?',
          [Math.abs(qty), Math.abs(qty), m.inventory_id]
        );
      } else {
        await conn.execute(
          'UPDATE inventory SET available_qty = available_qty + ? WHERE id=?',
          [delta, m.inventory_id]
        );
      }
    }
    await conn.commit();
    res.json({ ok: true });
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`✅ API server running on http://localhost:${PORT}`));
