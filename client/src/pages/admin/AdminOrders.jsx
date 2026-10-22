import { Fragment, useState } from 'react';
import { api } from '../../api';
import { ErrorState, Loading, StatusBadge } from '../../components/ui';
import { useToast } from '../../context/ToastContext';
import { useFetch } from '../../hooks/useFetch';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { STATUS_LABELS, formatDateTime, formatMoney } from '../../utils/format';

const NEXT = { pending: ['confirmed', 'cancelled'], confirmed: ['shipped', 'cancelled'], shipped: ['delivered'], delivered: [], cancelled: [] };

export default function AdminOrders() {
  useDocumentTitle('Orders');
  const toast = useToast();
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(null);
  const { data, loading, error, reload } = useFetch(`/orders?page=${page}${status ? `&status=${status}` : ''}`);

  const change = async (order, next) => {
    if (next === 'cancelled' && !window.confirm(`Cancel ${order.orderNumber}? Stock will be returned.`)) return;
    try {
      await api(`/orders/${order._id}/status`, { method: 'PATCH', body: { status: next } });
      toast.success(`${order.orderNumber} marked ${STATUS_LABELS[next].toLowerCase()}. Customer emailed.`);
      reload();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <>
      <header className="admin-head">
        <h1>Orders</h1>
        <label className="sort">
          Status
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">All</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
      </header>

      {loading && <Loading />}
      {error && <ErrorState error={error} onRetry={reload} />}
      {data && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th scope="col">Order</th><th scope="col">Customer</th><th scope="col">Date</th><th scope="col" className="num">Total</th><th scope="col">Status</th><th scope="col">Move to</th></tr>
            </thead>
            <tbody>
              {data.orders.map((o) => (
                <Fragment key={o._id}>
                  <tr>
                    <td>
                      <button type="button" className="link-btn" onClick={() => setOpen(open === o._id ? null : o._id)} aria-expanded={open === o._id}>
                        {o.orderNumber}
                      </button>
                    </td>
                    <td>{o.user?.name}<br /><small className="muted">{o.user?.email}</small></td>
                    <td>{formatDateTime(o.createdAt)}</td>
                    <td className="num">{formatMoney(o.total)}</td>
                    <td><StatusBadge status={o.status} /></td>
                    <td className="actions">
                      {NEXT[o.status].map((n) => (
                        <button key={n} type="button" className={`btn btn-sm ${n === 'cancelled' ? 'btn-ghost danger' : 'btn-outline'}`} onClick={() => change(o, n)}>
                          {STATUS_LABELS[n]}
                        </button>
                      ))}
                      {NEXT[o.status].length === 0 && <span className="muted">-</span>}
                    </td>
                  </tr>
                  {open === o._id && (
                    <tr className="detail-row">
                      <td colSpan={6}>
                        <div className="two-col">
                          <ul className="summary-items">
                            {o.items.map((i) => <li key={i.product}><span>{i.name} × {i.quantity}</span><span>{formatMoney(i.lineTotal)}</span></li>)}
                          </ul>
                          <address>
                            {o.shippingAddress.fullName} · {o.shippingAddress.phone}<br />
                            {o.shippingAddress.street}, {o.shippingAddress.city}
                            {o.shippingAddress.notes && <><br /><em>{o.shippingAddress.notes}</em></>}
                          </address>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
          {data.orders.length === 0 && <p className="muted center">No orders with this status.</p>}
          {data.pages > 1 && (
            <nav className="pagination" aria-label="Pages">
              <button type="button" className="btn btn-outline btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>← Prev</button>
              <span>Page {data.page} of {data.pages}</span>
              <button type="button" className="btn btn-outline btn-sm" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>Next →</button>
            </nav>
          )}
        </div>
      )}
    </>
  );
}
