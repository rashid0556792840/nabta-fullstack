import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api';
import { ErrorState, Loading, StatusBadge } from '../components/ui';
import { useToast } from '../context/ToastContext';
import { useFetch } from '../hooks/useFetch';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { STATUS_LABELS, formatDateTime, formatMoney } from '../utils/format';

const STEPS = ['pending', 'confirmed', 'shipped', 'delivered'];

export default function OrderDetail() {
  const { id } = useParams();
  const { data, loading, error, reload, setData } = useFetch(`/orders/${id}`);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const order = data?.order;
  useDocumentTitle(order ? `Order ${order.orderNumber}` : 'Order');

  if (loading) return <Loading />;
  if (error) return <div className="container page"><ErrorState error={error} onRetry={reload} /></div>;
  if (!order) return null;

  const stepIndex = STEPS.indexOf(order.status);

  const cancel = async () => {
    if (!window.confirm('Cancel this order?')) return;
    setBusy(true);
    try {
      const res = await api(`/orders/${order._id}/cancel`, { method: 'PATCH' });
      setData({ order: res.order });
      toast.success('Order cancelled.');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container page narrow">
      <Link to="/orders" className="link-arrow">← All orders</Link>
      <header className="page-head order-head">
        <div>
          <h1>Order {order.orderNumber}</h1>
          <p className="muted">Placed {formatDateTime(order.createdAt)}</p>
        </div>
        <StatusBadge status={order.status} />
      </header>

      {order.status !== 'cancelled' && (
        <ol className="tracker" aria-label="Order progress">
          {STEPS.map((s, i) => (
            <li key={s} className={i <= stepIndex ? 'done' : ''} aria-current={i === stepIndex ? 'step' : undefined}>
              <span className="tracker-dot" aria-hidden="true" />
              {STATUS_LABELS[s]}
            </li>
          ))}
        </ol>
      )}

      <section className="card">
        <h2>Items</h2>
        <div className="table-wrap">
        <table className="table">
          <thead>
            <tr><th scope="col">Product</th><th scope="col">Qty</th><th scope="col" className="num">Price</th><th scope="col" className="num">Total</th></tr>
          </thead>
          <tbody>
            {order.items.map((i) => (
              <tr key={i.product}>
                <td>{i.name}</td>
                <td>{i.quantity}</td>
                <td className="num">{formatMoney(i.price)}</td>
                <td className="num">{formatMoney(i.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr><td colSpan={3}>Subtotal</td><td className="num">{formatMoney(order.subtotal)}</td></tr>
            <tr><td colSpan={3}>Delivery</td><td className="num">{order.deliveryFee ? formatMoney(order.deliveryFee) : 'Free'}</td></tr>
            <tr className="total-row"><td colSpan={3}>Total (cash on delivery)</td><td className="num">{formatMoney(order.total)}</td></tr>
          </tfoot>
        </table>
        </div>
      </section>

      <div className="two-col">
        <section className="card">
          <h2>Delivery address</h2>
          <address>
            {order.shippingAddress.fullName}<br />
            {order.shippingAddress.street}<br />
            {order.shippingAddress.city}<br />
            {order.shippingAddress.phone}
          </address>
          {order.shippingAddress.notes && <p className="muted">Note: {order.shippingAddress.notes}</p>}
        </section>
        <section className="card">
          <h2>History</h2>
          <ul className="history">
            {order.statusHistory.map((h, i) => (
              <li key={i}><StatusBadge status={h.status} /> <span className="muted">{formatDateTime(h.at)}</span>{h.note && <small> {h.note}</small>}</li>
            ))}
          </ul>
        </section>
      </div>

      {order.status === 'pending' && (
        <button type="button" className="btn btn-danger" onClick={cancel} disabled={busy}>
          {busy ? 'Cancelling…' : 'Cancel order'}
        </button>
      )}
    </div>
  );
}
