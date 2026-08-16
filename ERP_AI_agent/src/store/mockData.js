/** 模擬初始資料（僅供 Demo，標示為估計值） */

export const MOCK_PRODUCTS = [
  { sku_id: 'FG-1001', sku_name: '原味無糖豆漿', category: '飲料', spec: '946ml×12入', unit: '箱', shelf_life_days: 30, storage_type: '常溫', status: 'active' },
  { sku_id: 'FG-1002', sku_name: '巧克力調味乳', category: '飲料', spec: '200ml×24入', unit: '箱', shelf_life_days: 21, storage_type: '冷藏', status: 'active' },
  { sku_id: 'FG-1003', sku_name: '全麥吐司',     category: '烘焙', spec: '6片裝×10入', unit: '箱', shelf_life_days: 7,  storage_type: '常溫', status: 'active' },
  { sku_id: 'FG-1004', sku_name: '原味優格',     category: '乳品', spec: '500g×12入',  unit: '箱', shelf_life_days: 21, storage_type: '冷藏', status: 'active' },
  { sku_id: 'FG-1005', sku_name: '經典雞湯麵',   category: '速食', spec: '80g×30入',   unit: '箱', shelf_life_days: 180,storage_type: '常溫', status: 'active' },
];

export const MOCK_INVENTORY = [
  { sku_id: 'FG-1001', warehouse: '主倉', available_qty: 50,  reserved_qty: 0,  unit: '箱', as_of_date: '2026-08-07', safety_stock: 100 },
  { sku_id: 'FG-1002', warehouse: '主倉', available_qty: 100, reserved_qty: 20, unit: '箱', as_of_date: '2026-08-07', safety_stock: 80  },
  { sku_id: 'FG-1003', warehouse: '主倉', available_qty: 0,   reserved_qty: 0,  unit: '箱', as_of_date: '2026-08-07', safety_stock: 50  },
  { sku_id: 'FG-1004', warehouse: '主倉', available_qty: 80,  reserved_qty: 0,  unit: '箱', as_of_date: '2026-08-07', safety_stock: 60  },
  { sku_id: 'FG-1005', warehouse: '主倉', available_qty: 30,  reserved_qty: 0,  unit: '箱', as_of_date: '2026-08-07', safety_stock: 40  },
];

export const MOCK_PRODUCTION = [
  { batch_no: 'BAT-260810-A', sku_id: 'FG-1001', qty: 1000, planned_finish_date: '2026-08-10', status: 'completed', plant: '廠區A' },
  { batch_no: 'BAT-260811-B', sku_id: 'FG-1002', qty: 500,  planned_finish_date: '2026-08-11', status: 'completed', plant: '廠區A' },
  { batch_no: 'BAT-260809-C', sku_id: 'FG-1003', qty: 600,  planned_finish_date: '2026-08-09', status: 'completed', plant: '廠區A' },
  { batch_no: 'BAT-260815-D', sku_id: 'FG-1004', qty: 400,  planned_finish_date: '2026-08-15', status: 'in_progress', plant: '廠區A' },
  { batch_no: 'BAT-260810-E', sku_id: 'FG-1005', qty: 200,  planned_finish_date: '2026-08-10', status: 'completed', plant: '廠區A' },
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
  { demand_id: 'DEM-005', customer_id: 'CUS-E05', customer_name: '模擬經銷商戊',   channel: '經銷', sku_id: 'FG-1004', qty: 100, unit: '箱', required_delivery_date: '2026-08-12', priority: '高', region: '中區' },
  { demand_id: 'DEM-006', customer_id: 'CUS-F06', customer_name: '模擬零售通路己', channel: '零售', sku_id: 'FG-9999', qty: 50,  unit: '箱', required_delivery_date: '2026-08-16', priority: '低', region: '南區' },
];

// 區域配送距離（估計值，非 ERP 真實資料）
export const REGION_DISTANCE = { '北區': 50, '中區': 150, '南區': 280 };
// 每箱每公里估計成本（估計值）
export const COST_PER_KM_BOX = 0.05;
