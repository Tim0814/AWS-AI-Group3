/** 模擬初始資料（僅供 Demo，標示為估計值） */

export const MOCK_WAREHOUSES = [
  { warehouse_id: 'WH-01', warehouse_name: '北區主倉', region: '北區', address: '台北市南港區XX路1號', cold_chain_capable: 1 },
  { warehouse_id: 'WH-02', warehouse_name: '中區倉',   region: '中區', address: '台中市工業區XX路2號', cold_chain_capable: 0 },
  { warehouse_id: 'WH-03', warehouse_name: '南區倉',   region: '南區', address: '高雄市前鎮區XX路3號', cold_chain_capable: 1 },
];

export const MOCK_CUSTOMERS = [
  { customer_id: 'CUS-A01', customer_name: '模擬零售通路甲', channel: '零售', region: '北區', address: '台北市中山區XX路1號', credit_limit: 500000, payment_terms: 'NET30' },
  { customer_id: 'CUS-B02', customer_name: '模擬量販通路乙', channel: '量販', region: '中區', address: '台中市西屯區XX路2號', credit_limit: 800000, payment_terms: 'NET45' },
  { customer_id: 'CUS-C03', customer_name: '模擬經銷商丙',   channel: '經銷', region: '南區', address: '高雄市前鎮區XX路3號', credit_limit: 300000, payment_terms: 'NET30' },
  { customer_id: 'CUS-D04', customer_name: '模擬企業客戶丁', channel: '企業', region: '北區', address: '新北市板橋區XX路4號', credit_limit: 1000000, payment_terms: 'NET60' },
];

export const MOCK_PRODUCTS = [
  { sku_id: 'FG-1001', sku_name: '原味無糖豆漿', category: '飲料', spec: '946ml×12入', unit: '箱', shelf_life_days: 30,  storage_type: '常溫', unit_cost: 280, status: 'active' },
  { sku_id: 'FG-1002', sku_name: '巧克力調味乳', category: '飲料', spec: '200ml×24入', unit: '箱', shelf_life_days: 21,  storage_type: '冷藏', unit_cost: 320, status: 'active' },
  { sku_id: 'FG-1003', sku_name: '全麥吐司',     category: '烘焙', spec: '6片裝×10入', unit: '箱', shelf_life_days: 7,   storage_type: '常溫', unit_cost: 180, status: 'active' },
  { sku_id: 'FG-1004', sku_name: '原味優格',     category: '乳品', spec: '500g×12入',  unit: '箱', shelf_life_days: 21,  storage_type: '冷藏', unit_cost: 420, status: 'active' },
  { sku_id: 'FG-1005', sku_name: '經典雞湯麵',   category: '速食', spec: '80g×30入',   unit: '箱', shelf_life_days: 180, storage_type: '常溫', unit_cost: 150, status: 'active' },
];

export const MOCK_INVENTORY = [
  { warehouse_id: 'WH-01', sku_id: 'FG-1001', batch_no: 'BAT-260810-A', manufactured_date: '2026-08-01', expiry_date: '2026-09-01', available_qty: 50,  reserved_qty: 0,  safety_stock: 100, unit: '箱', inventory_status: 'normal' },
  { warehouse_id: 'WH-01', sku_id: 'FG-1002', batch_no: 'BAT-260811-B', manufactured_date: '2026-08-02', expiry_date: '2026-08-23', available_qty: 80,  reserved_qty: 20, safety_stock: 80,  unit: '箱', inventory_status: 'normal' },
  { warehouse_id: 'WH-01', sku_id: 'FG-1003', batch_no: 'BAT-260809-C', manufactured_date: '2026-08-03', expiry_date: '2026-08-10', available_qty: 0,   reserved_qty: 0,  safety_stock: 50,  unit: '箱', inventory_status: 'normal' },
  { warehouse_id: 'WH-01', sku_id: 'FG-1004', batch_no: 'BAT-260815-D', manufactured_date: '2026-08-04', expiry_date: '2026-08-25', available_qty: 80,  reserved_qty: 0,  safety_stock: 60,  unit: '箱', inventory_status: 'normal' },
  { warehouse_id: 'WH-01', sku_id: 'FG-1005', batch_no: 'BAT-260810-E', manufactured_date: '2026-08-01', expiry_date: '2027-02-01', available_qty: 30,  reserved_qty: 0,  safety_stock: 40,  unit: '箱', inventory_status: 'normal' },
];

export const MOCK_PRODUCTION = [
  { batch_no: 'BAT-260810-A', sku_id: 'FG-1001', warehouse_id: 'WH-01', qty: 1000, uom: '箱', planned_finish_date: '2026-08-10T08:00:00', actual_finish_date: '2026-08-10T10:00:00', expiry_date: '2026-09-10', batch_status: 'completed', plant: '廠區A' },
  { batch_no: 'BAT-260811-B', sku_id: 'FG-1002', warehouse_id: 'WH-01', qty: 500,  uom: '箱', planned_finish_date: '2026-08-11T08:00:00', actual_finish_date: '2026-08-11T09:00:00', expiry_date: '2026-09-01', batch_status: 'completed', plant: '廠區A' },
  { batch_no: 'BAT-260809-C', sku_id: 'FG-1003', warehouse_id: 'WH-01', qty: 600,  uom: '箱', planned_finish_date: '2026-08-09T08:00:00', actual_finish_date: '2026-08-09T08:30:00', expiry_date: '2026-08-16', batch_status: 'completed', plant: '廠區A' },
  { batch_no: 'BAT-260815-D', sku_id: 'FG-1004', warehouse_id: 'WH-01', qty: 400,  uom: '箱', planned_finish_date: '2026-08-15T08:00:00', actual_finish_date: null,                  expiry_date: '2026-09-05', batch_status: 'in_progress', plant: '廠區A' },
  { batch_no: 'BAT-260810-E', sku_id: 'FG-1005', warehouse_id: 'WH-01', qty: 200,  uom: '箱', planned_finish_date: '2026-08-10T08:00:00', actual_finish_date: '2026-08-10T11:00:00', expiry_date: '2027-02-10', batch_status: 'completed', plant: '廠區A' },
];

export const MOCK_SUPPLY = [
  { sku_id: 'FG-1001', allocatable_qty: 1050, source: '庫存+生產', note: '估計值' },
  { sku_id: 'FG-1002', allocatable_qty: 580,  source: '庫存+生產', note: '估計值' },
  { sku_id: 'FG-1003', allocatable_qty: 600,  source: '庫存+生產', note: '估計值' },
  { sku_id: 'FG-1004', allocatable_qty: 480,  source: '庫存+生產', note: '估計值' },
  { sku_id: 'FG-1005', allocatable_qty: 230,  source: '庫存+生產', note: '估計值' },
];

export const MOCK_DEMAND = [
  { demand_id: 'DEM-001', customer_id: 'CUS-A01', customer_name: '模擬零售通路甲', channel: '零售', sku_id: 'FG-1001', qty: 400, unit: '箱', required_delivery_date: '2026-08-12', priority: '高', region: '北區' },
  { demand_id: 'DEM-002', customer_id: 'CUS-B02', customer_name: '模擬量販通路乙', channel: '量販', sku_id: 'FG-1002', qty: 200, unit: '箱', required_delivery_date: '2026-08-13', priority: '中', region: '中區' },
  { demand_id: 'DEM-003', customer_id: 'CUS-C03', customer_name: '模擬經銷商丙',   channel: '經銷', sku_id: 'FG-1003', qty: 350, unit: '箱', required_delivery_date: '2026-08-11', priority: '高', region: '南區' },
  { demand_id: 'DEM-004', customer_id: 'CUS-D04', customer_name: '模擬企業客戶丁', channel: '企業', sku_id: 'FG-1001', qty: 700, unit: '箱', required_delivery_date: '2026-08-14', priority: '中', region: '北區' },
];

export const MOCK_SHIPMENTS = [
  { shipment_id: 'SHP-001', order_id: null, warehouse_id: 'WH-01', carrier: '黑貓宅急便', vehicle_no: 'ABC-1234', planned_dispatch_at: '2026-08-08T08:00:00', eta: '2026-08-10T12:00:00', delivery_status: 'in_transit', transport_cost: 1200 },
  { shipment_id: 'SHP-002', order_id: null, warehouse_id: 'WH-01', carrier: '新竹物流',   vehicle_no: 'XYZ-5678', planned_dispatch_at: '2026-08-09T08:00:00', eta: '2026-08-11T12:00:00', delivery_status: 'delivered',  transport_cost: 800, delivered_at: '2026-08-11T14:30:00' },
];

// 區域配送距離（估計值）
export const REGION_DISTANCE = { '北區': 50, '中區': 150, '南區': 280 };
// 每箱每公里估計成本（估計值）
export const COST_PER_KM_BOX = 0.05;
