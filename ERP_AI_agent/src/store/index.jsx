import { createContext, useContext, useReducer, useEffect, useState } from 'react';
import {
  fetchOrders, addOrder, updateOrder, deleteOrder, patchReview, fetchReviews,
  fetchCustomers, addCustomer, updateCustomer, deleteCustomer,
  fetchShipments, addShipment, patchShipmentStatus, deleteShipment,
  fetchProducts, fetchInventory, fetchProduction, fetchWarehouses,
} from './storage';
import { MOCK_SUPPLY, MOCK_DEMAND, REGION_DISTANCE, COST_PER_KM_BOX } from './mockData';

// ── engine ────────────────────────────────────────────────────────────────────

function computeAllocatable(inventory, production) {
  const map = {};
  inventory.forEach(r => {
    map[r.sku_id] = (map[r.sku_id] || 0) + Number(r.available_qty) - Number(r.reserved_qty);
  });
  production.filter(p => p.batch_status !== 'completed').forEach(r => {
    map[r.sku_id] = (map[r.sku_id] || 0) + Number(r.qty);
  });
  return map;
}

export function runEngine(state) {
  const { orders, products, inventory, production } = state;
  const allocMap   = computeAllocatable(inventory, production);
  const productMap = Object.fromEntries(products.map(p => [p.sku_id, p]));
  const safetyMap  = {};
  inventory.forEach(r => {
    safetyMap[r.sku_id] = Math.max(safetyMap[r.sku_id] || 0, Number(r.safety_stock) || 0);
  });

  // 找最近效期批次
  const expiryMap = {};
  inventory.forEach(r => {
    if (!r.expiry_date) return;
    if (!expiryMap[r.sku_id] || r.expiry_date < expiryMap[r.sku_id]) {
      expiryMap[r.sku_id] = r.expiry_date;
    }
  });

  return orders.map(order => {
    const items    = order.items || [];
    const region   = order.region_snapshot || '北區';
    const dist     = REGION_DISTANCE[region] ?? 100;

    // 逐品項分析
    const itemResults = items.map(item => {
      const sku     = item.sku_id;
      const product = productMap[sku];
      const avail   = allocMap[sku] ?? 0;
      const safety  = safetyMap[sku] ?? 0;
      const qty     = Number(item.ordered_qty) || 0;
      const afterStock = avail - qty;
      const unitCost   = product?.unit_cost ?? 0;
      const estValue   = Math.round(qty * unitCost);
      const estCost    = Math.round(qty * dist * COST_PER_KM_BOX);

      const checks = {
        skuExists:  !!product,
        supplyOk:   avail >= qty,
        safetyOk:   afterStock >= safety,
        deliveryOk: true,
      };

      const prodBatch = production.find(p => p.sku_id === sku && p.batch_status !== 'completed');
      if (order.required_delivery_date && prodBatch?.planned_finish_date) {
        checks.deliveryOk = prodBatch.planned_finish_date.slice(0, 10) <= order.required_delivery_date;
      }

      let suggestion = 'approved';
      let exceptionType = '';
      if (!checks.skuExists)       { suggestion = 'exception'; exceptionType = '品號不一致'; }
      else if (!checks.deliveryOk) { suggestion = 'exception'; exceptionType = '交期衝突'; }
      else if (!checks.supplyOk)   { suggestion = 'exception'; exceptionType = '數量不足'; }
      else if (!checks.safetyOk)   { suggestion = 'warning'; }

      const reasons = [];
      if (!checks.skuExists) {
        reasons.push(`${sku} 不存在於商品主檔`);
      } else {
        reasons.push(`可分配量 ${avail} ${checks.supplyOk ? '≥' : '<'} 需求 ${qty}`);
        if (!checks.safetyOk)   reasons.push(`出貨後庫存 ${afterStock} 低於安全庫存 ${safety}`);
        if (!checks.deliveryOk) reasons.push(`生產完成日晚於客戶交期`);
        if (expiryMap[sku])     reasons.push(`最近效期批次：${expiryMap[sku]}`);
      }

      return {
        ...item,
        _engine: {
          avail, gap: avail - qty, afterStock, safety, unitCost, estValue, estCost,
          checks, suggestion, exceptionType, reasons,
          productName: product?.sku_name || item.item_name_snapshot || sku,
          storageType: product?.storage_type || '—',
          shelfLife:   product?.shelf_life_days ?? '—',
          nearestExpiry: expiryMap[sku] || '—',
          batchNo:     prodBatch?.batch_no || '—',
          batchStatus: prodBatch?.batch_status || '—',
        },
      };
    });

    // 訂單層級彙總
    const worstSuggestion = itemResults.reduce((w, i) => {
      const rank = { exception: 0, warning: 1, approved: 2 };
      return rank[i._engine.suggestion] < rank[w] ? i._engine.suggestion : w;
    }, 'approved');

    const totalEstCost  = itemResults.reduce((s, i) => s + (i._engine.estCost || 0), 0);
    const totalEstValue = itemResults.reduce((s, i) => s + (i._engine.estValue || 0), 0);
    const allSupplyOk   = itemResults.every(i => i._engine.checks.supplyOk);
    const exceptionType = itemResults.find(i => i._engine.exceptionType)?.engine?.exceptionType || '';

    return {
      ...order,
      items: itemResults,
      _engine: {
        suggestion:   worstSuggestion,
        exceptionType,
        allSupplyOk,
        totalEstCost,
        totalEstValue,
        dist,
        itemCount: items.length,
      },
    };
  });
}

// ── initial state ─────────────────────────────────────────────────────────────

function loadInitial() {
  return {
    orders:     [],
    customers:  [],
    shipments:  [],
    warehouses: [],
    products:   [],
    inventory:  [],
    production: [],
    reviews:    {},   // { [order_id]: [...] }
    supply:     MOCK_SUPPLY,
    demand:     MOCK_DEMAND,
  };
}

// ── reducer ───────────────────────────────────────────────────────────────────

function reducer(state, action) {
  switch (action.type) {
    case 'SET_ORDERS':      return { ...state, orders:     action.rows };
    case 'SET_CUSTOMERS':   return { ...state, customers:  action.rows };
    case 'SET_SHIPMENTS':   return { ...state, shipments:  action.rows };
    case 'SET_WAREHOUSES':  return { ...state, warehouses: action.rows };
    case 'SET_PRODUCTS':    return { ...state, products:   action.rows };
    case 'SET_INVENTORY':   return { ...state, inventory:  action.rows };
    case 'SET_PRODUCTION':  return { ...state, production: action.rows };

    case 'ADD_ORDER':
      return { ...state, _error: null, orders: [...state.orders, { ...action.payload, review_status: 'pending', items: action.payload.items || [] }] };
    case 'UPDATE_ORDER':
      return { ...state, _error: null, orders: state.orders.map(o => o.order_id === action.payload.order_id ? { ...o, ...action.payload } : o) };
    case 'DELETE_ORDER':
      return { ...state, orders: state.orders.filter(o => o.order_id !== action.id) };
    case 'SET_REVIEW':
      return { ...state, orders: state.orders.map(o => o.order_id === action.id ? { ...o, review_status: action.status } : o) };
    case 'SET_ORDER_REVIEWS':
      return { ...state, reviews: { ...state.reviews, [action.order_id]: action.rows } };
    case 'IMPORT_ORDERS': {
      const existing = new Set(state.orders.map(o => o.order_id));
      const newOrders = action.rows
        .filter(r => !existing.has(r.order_id))
        .map(r => ({ ...r, review_status: r.review_status || 'pending', items: r.items || [] }));
      const skipped = action.rows.length - newOrders.length;
      return { ...state, orders: [...state.orders, ...newOrders], _importInfo: { added: newOrders.length, skipped } };
    }

    case 'ADD_CUSTOMER':
      return { ...state, _error: null, customers: [...state.customers, action.payload] };
    case 'UPDATE_CUSTOMER':
      return { ...state, _error: null, customers: state.customers.map(c => c.customer_id === action.payload.customer_id ? { ...c, ...action.payload } : c) };
    case 'DELETE_CUSTOMER':
      return { ...state, customers: state.customers.filter(c => c.customer_id !== action.id) };

    case 'ADD_SHIPMENT':
      return { ...state, _error: null, shipments: [...state.shipments, action.payload] };
    case 'PATCH_SHIPMENT_STATUS':
      return { ...state, shipments: state.shipments.map(s => s.shipment_id === action.id ? { ...s, delivery_status: action.status } : s) };
    case 'DELETE_SHIPMENT':
      return { ...state, shipments: state.shipments.filter(s => s.shipment_id !== action.id) };

    case 'IMPORT_DATA':
      return { ...state, [action.key]: action.rows, _error: null };
    case 'SET_ERROR':
      return { ...state, _error: action.msg };
    case 'CLEAR_ERROR':
      return { ...state, _error: null, _importInfo: null };
    default:
      return state;
  }
}

// ── context ───────────────────────────────────────────────────────────────────

const Ctx = createContext(null);

export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, null, loadInitial);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchOrders(), fetchCustomers(), fetchShipments(),
      fetchWarehouses(), fetchProducts(), fetchInventory(), fetchProduction(),
    ])
      .then(([orders, customers, shipments, warehouses, products, inventory, production]) => {
        dispatch({ type: 'SET_ORDERS',     rows: orders });
        dispatch({ type: 'SET_CUSTOMERS',  rows: customers });
        dispatch({ type: 'SET_SHIPMENTS',  rows: shipments });
        dispatch({ type: 'SET_WAREHOUSES', rows: warehouses });
        dispatch({ type: 'SET_PRODUCTS',   rows: products });
        dispatch({ type: 'SET_INVENTORY',  rows: inventory });
        dispatch({ type: 'SET_PRODUCTION', rows: production });
      })
      .catch(() => dispatch({ type: 'SET_ERROR', msg: '無法連線至後端 API，請確認 npm run server 已啟動' }))
      .finally(() => setLoading(false));
  }, []);

  async function apiDispatch(action) {
    try {
      switch (action.type) {
        case 'ADD_ORDER':
          await addOrder({ ...action.payload, review_status: 'pending' });
          dispatch(action); break;
        case 'UPDATE_ORDER':
          await updateOrder(action.payload.order_id, action.payload);
          dispatch(action); break;
        case 'DELETE_ORDER':
          await deleteOrder(action.id);
          dispatch(action); break;
        case 'SET_REVIEW':
          await patchReview(action.id, action.status, {
            risk_level:     action.risk_level     || null,
            exception_type: action.exception_type || null,
            reason:         action.reason         || null,
            reviewed_by:    action.reviewed_by    || 'system',
          });
          dispatch(action);
          // 重新載入該訂單審核歷程
          fetchReviews(action.id).then(rows =>
            dispatch({ type: 'SET_ORDER_REVIEWS', order_id: action.id, rows })
          ).catch(() => {});
          break;
        case 'IMPORT_ORDERS': {
          const existing = new Set(state.orders.map(o => o.order_id));
          const newRows = action.rows.filter(r => !existing.has(r.order_id));
          await Promise.all(newRows.map(r => addOrder({ ...r, review_status: 'pending' })));
          dispatch(action); break;
        }
        case 'ADD_CUSTOMER':
          await addCustomer(action.payload);
          dispatch(action); break;
        case 'UPDATE_CUSTOMER':
          await updateCustomer(action.payload.customer_id, action.payload);
          dispatch(action); break;
        case 'DELETE_CUSTOMER':
          await deleteCustomer(action.id);
          dispatch(action); break;
        case 'ADD_SHIPMENT':
          await addShipment(action.payload);
          dispatch(action); break;
        case 'PATCH_SHIPMENT_STATUS':
          await patchShipmentStatus(action.id, { status: action.status });
          dispatch(action); break;
        case 'DELETE_SHIPMENT':
          await deleteShipment(action.id);
          dispatch(action); break;
        default:
          dispatch(action);
      }
    } catch (err) {
      dispatch({ type: 'SET_ERROR', msg: err.message });
    }
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>載入中...</div>;

  return <Ctx.Provider value={{ state, dispatch: apiDispatch }}>{children}</Ctx.Provider>;
}

export function useStore() { return useContext(Ctx); }
