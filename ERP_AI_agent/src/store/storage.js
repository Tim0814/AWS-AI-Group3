const BASE = 'http://localhost:3001/api';

async function api(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, opts);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `API 錯誤 ${res.status}`);
  }
  return res.json();
}

function post(path, body) {
  return api(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
}
function put(path, body) {
  return api(path, { method: 'PUT',  headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
}
function patch(path, body) {
  return api(path, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
}
function del(path) {
  return api(path, { method: 'DELETE' });
}

// ── Warehouses ────────────────────────────────────────────────────────────────
export const fetchWarehouses  = ()      => api('/warehouses');
export const addWarehouse     = (w)     => post('/warehouses', w);

// ── Products ──────────────────────────────────────────────────────────────────
export const fetchProducts    = ()      => api('/products');
export const addProduct       = (p)     => post('/products', p);

// ── Inventory ─────────────────────────────────────────────────────────────────
export const fetchInventory   = ()      => api('/inventory');
export const addInventory     = (v)     => post('/inventory', v);
export const updateInventory  = (id, v) => put(`/inventory/${id}`, v);

// ── Production ────────────────────────────────────────────────────────────────
export const fetchProduction  = ()      => api('/production');
export const addProduction    = (b)     => post('/production', b);
export const patchBatchStatus = (id, s) => patch(`/production/${id}/status`, s);

// ── Customers ─────────────────────────────────────────────────────────────────
export const fetchCustomers   = ()      => api('/customers');
export const addCustomer      = (c)     => post('/customers', c);
export const updateCustomer   = (id, c) => put(`/customers/${id}`, c);
export const deleteCustomer   = (id)    => del(`/customers/${id}`);

// ── Orders ────────────────────────────────────────────────────────────────────
export const fetchOrders      = ()      => api('/orders');
export const addOrder         = (o)     => post('/orders', o);
export const updateOrder      = (id, o) => put(`/orders/${id}`, o);
export const deleteOrder      = (id)    => del(`/orders/${id}`);
export const patchReview      = (id, s, meta) => patch(`/orders/${id}/review`, { status: s, ...meta });
export const fetchReviews     = (id)    => api(`/orders/${id}/reviews`);

// ── Shipments ─────────────────────────────────────────────────────────────────
export const fetchShipments      = ()         => api('/shipments');
export const addShipment         = (s)        => post('/shipments', s);
export const patchShipmentStatus = (id, body) => patch(`/shipments/${id}/status`, body);
export const deleteShipment      = (id)       => del(`/shipments/${id}`);
