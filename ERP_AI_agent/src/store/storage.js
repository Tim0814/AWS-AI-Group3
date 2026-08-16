/**
 * localStorage persistence layer.
 * Replace get/set functions with real API calls to integrate with backend.
 */

const KEYS = {
  orders: 'erp_orders',
  products: 'erp_products',
  inventory: 'erp_inventory',
  production: 'erp_production',
  supply: 'erp_supply',
  demand: 'erp_demand',
};

export function getStore(key) {
  try {
    const raw = localStorage.getItem(KEYS[key]);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStore(key, data) {
  localStorage.setItem(KEYS[key], JSON.stringify(data));
}

export function clearStore(key) {
  localStorage.removeItem(KEYS[key]);
}

export { KEYS };
