import { useState } from 'react';
import { useStore, runEngine } from './store/index';
import KpiRow from './components/charts/KpiRow';
import SkuGapChart from './components/charts/SkuGapChart';
import RegionChart from './components/charts/RegionChart';
import OrderTable from './components/orders/OrderTable';
import OrderForm from './components/orders/OrderForm';
import AnalysisDrawer from './components/review/AnalysisDrawer';
import ImportPanel from './components/import/ImportPanel';
import CustomerTable from './components/customers/CustomerTable';
import CustomerForm from './components/customers/CustomerForm';
import ShipmentTable from './components/shipments/ShipmentTable';
import ShipmentForm from './components/shipments/ShipmentForm';
import { Alert } from './components/ui';

const TABS = ['Dashboard', '訂單管理', '客戶管理', '出貨紀錄', 'CSV 匯入'];

export default function App() {
  const { state, dispatch } = useStore();
  const [tab, setTab] = useState('Dashboard');
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [editingShipment, setEditingShipment] = useState(null);

  const enriched = runEngine(state);
  const existingIds = new Set(state.orders.map(o => o.order_id));

  function handleSave(form) {
    if (editing === false) dispatch({ type: 'ADD_ORDER', payload: form });
    else dispatch({ type: 'UPDATE_ORDER', payload: form });
    if (!state._error) setEditing(null);
  }

  function handleDelete(id) {
    if (confirmDelete === id) { dispatch({ type: 'DELETE_ORDER', id }); setConfirmDelete(null); }
    else setConfirmDelete(id);
  }

  function handleReview(id, status, meta = {}) {
    dispatch({ type: 'SET_REVIEW', id, status, ...meta });
    setSelected(prev => prev ? { ...prev, review_status: status } : null);
  }

  function handleImport(key, rows) {
    if (key === 'orders') dispatch({ type: 'IMPORT_ORDERS', rows });
    else dispatch({ type: 'IMPORT_DATA', key, rows });
  }

  function handleSaveCustomer(form) {
    if (editingCustomer === false) dispatch({ type: 'ADD_CUSTOMER', payload: form });
    else dispatch({ type: 'UPDATE_CUSTOMER', payload: form });
    if (!state._error) setEditingCustomer(null);
  }

  function handleSaveShipment(form) {
    if (editingShipment === false) dispatch({ type: 'ADD_SHIPMENT', payload: form });
    setEditingShipment(null);
  }

  const selectedEnriched = selected
    ? enriched.find(o => o.order_id === selected.order_id) || selected
    : null;

  return (
    <div className="app">
      <div className="topbar">
        <div className="brand">
          <div className="logo">AI</div>
          <div>
            <h1>食品製造業智慧物流分配 Dashboard</h1>
            <small>外接 ERP 決策輔助系統 · 不直接寫入 ERP</small>
          </div>
        </div>
        <nav style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {TABS.map(t => (
            <button key={t} className={`btn${tab === t ? ' primary' : ''}`} onClick={() => setTab(t)}>{t}</button>
          ))}
        </nav>
      </div>

      <div className="shell">
        <div className="notice">
          ⚠ 本系統為 ERP 外接決策輔助工具。分析結果僅供參考，核准後請由人員回 ERP 建立正式調撥或出貨單。
          配送距離、成本、貨值均為 <strong>估計值</strong>，非 ERP 真實資料。
        </div>

        {state._error && (
          <Alert type="error" onClose={() => dispatch({ type: 'CLEAR_ERROR' })}>{state._error}</Alert>
        )}
        {state._importInfo && (
          <Alert type="info" onClose={() => dispatch({ type: 'CLEAR_ERROR' })}>
            匯入完成：新增 {state._importInfo.added} 筆，略過重複 {state._importInfo.skipped} 筆
          </Alert>
        )}

        {tab === 'Dashboard' && (
          <>
            <KpiRow enriched={enriched} shipments={state.shipments} />
            <div className="grids" style={{ marginTop: 16 }}>
              <div className="panel" style={{ padding: 16 }}>
                <div className="section-head">
                  <div><h2>SKU 供需缺口排行</h2><p>橘色 = 供應不足（估計值）</p></div>
                </div>
                <SkuGapChart supply={state.supply} demand={state.demand} />
              </div>
              <div className="panel" style={{ padding: 16 }}>
                <div className="section-head">
                  <div><h2>各區配送概覽</h2><p>區域為 ERP 正式欄位</p></div>
                </div>
                <RegionChart orders={state.orders} />
              </div>
            </div>
          </>
        )}

        {tab === '訂單管理' && (
          <>
            <div className="actions" style={{ marginBottom: 12 }}>
              <button className="btn primary" onClick={() => setEditing(false)}>＋ 新增訂單</button>
            </div>
            {confirmDelete && (
              <Alert type="error">
                確定刪除訂單 <strong>{confirmDelete}</strong>？
                <button className="btn sm danger" style={{ marginLeft: 8 }} onClick={() => handleDelete(confirmDelete)}>確認刪除</button>
                <button className="btn sm" style={{ marginLeft: 4 }} onClick={() => setConfirmDelete(null)}>取消</button>
              </Alert>
            )}
            <OrderTable
              enriched={enriched}
              onSelect={o => setSelected(o)}
              onEdit={o => setEditing(o)}
              onDelete={id => handleDelete(id)}
            />
          </>
        )}

        {tab === '客戶管理' && (
          <>
            <div className="actions" style={{ marginBottom: 12 }}>
              <button className="btn primary" onClick={() => setEditingCustomer(false)}>＋ 新增客戶</button>
            </div>
            <CustomerTable
              customers={state.customers}
              onEdit={c => setEditingCustomer(c)}
              onDelete={id => dispatch({ type: 'DELETE_CUSTOMER', id })}
            />
          </>
        )}

        {tab === '出貨紀錄' && (
          <>
            <div className="actions" style={{ marginBottom: 12 }}>
              <button className="btn primary" onClick={() => setEditingShipment(false)}>＋ 新增出貨</button>
            </div>
            <ShipmentTable
              shipments={state.shipments}
              warehouses={state.warehouses}
              onStatusChange={(id, status) => dispatch({ type: 'PATCH_SHIPMENT_STATUS', id, status })}
              onDelete={id => dispatch({ type: 'DELETE_SHIPMENT', id })}
            />
          </>
        )}

        {tab === 'CSV 匯入' && (
          <ImportPanel onImport={handleImport} />
        )}
      </div>

      {editing !== null && (
        <OrderForm
          initial={editing || null}
          existingIds={existingIds}
          customers={state.customers}
          products={state.products}
          onSave={handleSave}
          onCancel={() => setEditing(null)}
        />
      )}

      {editingCustomer !== null && (
        <CustomerForm
          initial={editingCustomer || null}
          existingIds={new Set(state.customers.map(c => c.customer_id))}
          onSave={handleSaveCustomer}
          onCancel={() => setEditingCustomer(null)}
        />
      )}

      {editingShipment !== null && (
        <ShipmentForm
          initial={editingShipment || null}
          orders={state.orders}
          warehouses={state.warehouses}
          existingIds={new Set(state.shipments.map(s => s.shipment_id))}
          onSave={handleSaveShipment}
          onCancel={() => setEditingShipment(null)}
        />
      )}

      {selectedEnriched && (
        <AnalysisDrawer
          order={selectedEnriched}
          onClose={() => setSelected(null)}
          onReview={handleReview}
        />
      )}
    </div>
  );
}
