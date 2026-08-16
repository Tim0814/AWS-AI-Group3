import { createContext, useContext, useReducer, useEffect } from 'react';
import { getStore, setStore } from './storage';
import {
  MOCK_PRODUCTS, MOCK_INVENTORY, MOCK_PRODUCTION,
  MOCK_SUPPLY, MOCK_DEMAND, REGION_DISTANCE, COST_PER_KM_BOX,
} from './mockData';

// ── helpers ──────────────────────────────────────────────────────────────────

function computeAllocatable(inventory, production) {
  const map = {};
  inventory.forEach(r => {
    map[r.sku_id] = (map[r.sku_id] || 0) + r.available_qty - r.reserved_qty;
  });
  production.forEach(r => {
    map[r.sku_id] = (map[r.sku_id] || 0) + r.qty;
  });
  return map;
}

export function runEngine(state) {
  const { orders, products, inventory, production, demand } = state;
  const allocMap = computeAllocatable(inventory, production);
  const productMap = Object.fromEntries(products.map(p => [p.sku_id, p]));
  const safetyMap = Object.fromEntries(inventory.map(r => [r.sku_id, r.safety_stock || 0]));

  return orders.map(order => {
    const sku = order.sku_id || order.item;
    const product = productMap[sku];
    const avail = allocMap[sku] ?? 0;
    const safety = safetyMap[sku] ?? 0;
    const qty = Number(order.quantity) || 0;
    const region = order.region || '北區';
    const dist = REGION_DISTANCE[region] ?? 100;
    const estCost = Math.round(qty * dist * COST_PER_KM_BOX);
    const afterStock = avail - qty;

    const checks = {
      skuExists: !!product,
      supplyOk: avail >= qty,
      safetyOk: afterStock >= safety,
      deliveryOk: true, // simplified; extend with date logic
    };

    // find matching demand
    const matchedDemand = demand.find(d => d.sku_id === sku && d.demand_id === order.demand_id);
    const deliveryDate = matchedDemand?.required_delivery_date || order.required_delivery_date || '';
    const prodBatch = production.find(p => p.sku_id === sku);
    if (deliveryDate && prodBatch?.planned_finish_date) {
      checks.deliveryOk = prodBatch.planned_finish_date <= deliveryDate;
    }

    let suggestion = 'approved';
    let exceptionType = '';
    if (!checks.skuExists) { suggestion = 'exception'; exceptionType = '品號不一致'; }
    else if (!checks.deliveryOk) { suggestion = 'exception'; exceptionType = '交期衝突'; }
    else if (!checks.supplyOk) { suggestion = 'exception'; exceptionType = '數量不足'; }
    else if (!checks.safetyOk) { suggestion = 'warning'; }

    const gap = avail - qty;
    const reasons = [];
    if (!checks.skuExists) reasons.push(`${sku} 不存在於商品主檔`);
    else {
      reasons.push(`可分配量 ${avail} ${checks.supplyOk ? '≥' : '<'} 需求 ${qty}`);
      if (!checks.safetyOk) reasons.push(`出貨後庫存 ${afterStock} 低於安全庫存 ${safety}`);
      if (!checks.deliveryOk) reasons.push(`生產完成日晚於客戶交期`);
    }

    const candidates = checks.skuExists ? [
      { label: `${region}直送`, dist, cost: estCost, afterStock, score: checks.supplyOk ? 85 : 30 },
      { label: '跨區調貨', dist: dist + 80, cost: Math.round(qty * (dist + 80) * COST_PER_KM_BOX), afterStock, score: 60 },
    ] : [];

    return {
      ...order,
      _engine: {
        avail, gap, estCost, dist, afterStock, safety,
        checks, suggestion, exceptionType,
        reasons, candidates,
        productName: product?.sku_name || order.item || sku,
        storageType: product?.storage_type || '—',
        shelfLife: product?.shelf_life_days ?? '—',
        batchNo: prodBatch?.batch_no || '—',
        batchStatus: prodBatch?.status || '—',
      },
    };
  });
}

// ── initial state ─────────────────────────────────────────────────────────────

function loadInitial() {
  return {
    orders:     getStore('orders')     ?? [],
    products:   getStore('products')   ?? MOCK_PRODUCTS,
    inventory:  getStore('inventory')  ?? MOCK_INVENTORY,
    production: getStore('production') ?? MOCK_PRODUCTION,
    supply:     getStore('supply')     ?? MOCK_SUPPLY,
    demand:     getStore('demand')     ?? MOCK_DEMAND,
  };
}

// ── reducer ───────────────────────────────────────────────────────────────────

function reducer(state, action) {
  switch (action.type) {
    case 'ADD_ORDER': {
      const dup = state.orders.find(o => o.order_id === action.payload.order_id);
      if (dup) return { ...state, _error: `訂單編號 ${action.payload.order_id} 已存在` };
      return { ...state, _error: null, orders: [...state.orders, { ...action.payload, review_status: 'pending' }] };
    }
    case 'UPDATE_ORDER': {
      const others = state.orders.filter(o => o.order_id !== action.payload.order_id);
      const dup = others.find(o => o.order_id === action.payload.order_id);
      if (dup) return { ...state, _error: `訂單編號 ${action.payload.order_id} 已存在` };
      return {
        ...state, _error: null,
        orders: state.orders.map(o => o.order_id === action.payload.order_id ? { ...o, ...action.payload } : o),
      };
    }
    case 'DELETE_ORDER':
      return { ...state, orders: state.orders.filter(o => o.order_id !== action.id) };
    case 'SET_REVIEW':
      return {
        ...state,
        orders: state.orders.map(o => o.order_id === action.id ? { ...o, review_status: action.status } : o),
      };
    case 'IMPORT_ORDERS': {
      const existing = new Set(state.orders.map(o => o.order_id));
      const newOrders = action.rows.filter(r => !existing.has(r.order_id)).map(r => ({ ...r, review_status: 'pending' }));
      const skipped = action.rows.length - newOrders.length;
      return { ...state, orders: [...state.orders, ...newOrders], _importInfo: { added: newOrders.length, skipped } };
    }
    case 'IMPORT_DATA':
      return { ...state, [action.key]: action.rows, _error: null };
    case 'CLEAR_ERROR':
      return { ...state, _error: null };
    default:
      return state;
  }
}

// ── context ───────────────────────────────────────────────────────────────────

const Ctx = createContext(null);

export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, null, loadInitial);

  useEffect(() => { setStore('orders', state.orders); }, [state.orders]);
  useEffect(() => { setStore('products', state.products); }, [state.products]);
  useEffect(() => { setStore('inventory', state.inventory); }, [state.inventory]);
  useEffect(() => { setStore('production', state.production); }, [state.production]);
  useEffect(() => { setStore('supply', state.supply); }, [state.supply]);
  useEffect(() => { setStore('demand', state.demand); }, [state.demand]);

  return <Ctx.Provider value={{ state, dispatch }}>{children}</Ctx.Provider>;
}

export function useStore() {
  return useContext(Ctx);
}
