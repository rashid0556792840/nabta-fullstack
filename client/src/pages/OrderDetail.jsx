import { useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import Icon from '../components/Icon';
import { ErrorState, Loading, StatusBadge, useConfirm } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { useFetch } from '../hooks/useFetch';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useI18n } from '../i18n/LanguageContext';

// The journey shown to the customer. "Partially delivered" sits on the delivery step.
const STEPS = ['pending', 'confirmed', 'processing', 'out_for_delivery', 'completed'];
const STEP_OF = { partially_delivered: 3 };

export default function OrderDetail() {
  const { id } = useParams();
  const { t, pick, money, dateTime, status: statusLabel, errorText } = useI18n();
  const { data, loading, error, reload } = useFetch(`/orders/${id}`);
  const { isStaff } = useAuth();
  const { addMany } = useCart();
  const [busy, setBusy] = useState('');
  const [confirm, confirmDialog] = useConfirm();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const order = data?.order;
  useDocumentTitle(order ? t('order.title', { number: order.orderNumber }) : t('order.titlePlain'));

  if (loading) return <Loading />;
  if (error) return <div className="container page"><ErrorState error={error} onRetry={reload} /></div>;
  if (!order) return null;

  const stepIndex = STEP_OF[order.status] ?? STEPS.indexOf(order.status);
  const deliveries = data.deliveries || [];

  const cancel = async () => {
    if (!(await confirm(t('order.cancelConfirm')))) return;
    setBusy('cancel');
    try {
      await api(`/orders/${order._id}/cancel`, { method: 'PATCH' });
      toast.success(t('order.cancelled'));
      reload();
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setBusy('');
    }
  };

  // Reorder: load each product again so prices and stock are current, then fill the cart
  const reorder = async () => {
    setBusy('reorder');
    try {
      const results = await Promise.allSettled(order.items.map((i) => api(`/products/${i.product}`)));
      const lines = [];
      let missing = 0;
      results.forEach((r, k) => {
        const p = r.status === 'fulfilled' ? r.value.product : null;
        if (p && p.stock > 0) lines.push({ product: p, quantity: Math.min(order.items[k].quantity, p.stock) });
        else missing += 1;
      });
      if (lines.length) addMany(lines);
      if (missing) toast.error(t('order.reorderMissing', { count: missing }));
      if (lines.length) {
        toast.success(t('order.reorderDone'));
        navigate('/cart');
      }
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="container page narrow">
      {confirmDialog}
      <Link to={isStaff ? '/admin/orders' : '/orders'} className="link-arrow"><Icon name="back" size={16} className="flip-rtl" /> {t('order.all')}</Link>

      {location.state?.justPlaced && (
        <div className="alert alert-ok success-banner" role="status">
          <Icon name="check" size={22} />
          <div>
            <strong>{t('order.thanksTitle')}</strong>
            <p>{t('order.thanksText')}</p>
          </div>
        </div>
      )}

      <header className="page-head order-head">
        <div>
          <h1>{t('order.heading')} <span dir="ltr" className="order-no">{order.orderNumber}</span></h1>
          <p className="muted">{t('order.placedAt', { date: dateTime(order.createdAt) })}</p>
        </div>
        <StatusBadge status={order.status} />
      </header>

      {order.status !== 'cancelled' && (
        <ol className="tracker" aria-label={t('order.progress')}>
          {STEPS.map((s, i) => (
            <li key={s} className={i <= stepIndex ? 'done' : ''} aria-current={i === stepIndex ? 'step' : undefined}>
              <span className="tracker-dot" aria-hidden="true">{i < stepIndex || order.status === 'completed' ? <Icon name="check" size={12} strokeWidth={3} /> : null}</span>
              {i === 3 && order.status === 'partially_delivered' ? statusLabel('partially_delivered') : statusLabel(s)}
            </li>
          ))}
        </ol>
      )}

      <section className="card">
        <h2>{t('order.items')}</h2>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">{t('order.product')}</th>
                <th scope="col">{t('order.qty')}</th>
                <th scope="col">{t('order.delivered')}</th>
                <th scope="col" className="num">{t('order.price')}</th>
                <th scope="col" className="num">{t('order.lineTotal')}</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((i, k) => (
                <tr key={k}>
                  <td>{pick(i)}</td>
                  <td>{i.quantity}</td>
                  <td>
                    <span dir="ltr" className={`qty-pill ${i.deliveredQty >= i.quantity ? 'full' : i.deliveredQty > 0 ? 'part' : ''}`}>
                      {i.deliveredQty || 0} / {i.quantity}
                    </span>
                  </td>
                  <td className="num">{money(i.price)}</td>
                  <td className="num">{money(i.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr><td colSpan={4}>{t('cart.subtotal')}</td><td className="num">{money(order.subtotal)}</td></tr>
              <tr><td colSpan={4}>{t('cart.delivery')}</td><td className="num">{order.deliveryFee ? money(order.deliveryFee) : t('cart.free')}</td></tr>
              <tr className="total-row"><td colSpan={4}>{t('order.totalCod')}</td><td className="num">{money(order.total)}</td></tr>
            </tfoot>
          </table>
        </div>
      </section>

      {deliveries.length > 0 && (
        <section className="card">
          <h2><Icon name="truck" size={20} /> {t('order.deliveries')}</h2>
          <ul className="trip-list">
            {deliveries.map((d, n) => (
              <li key={d._id} className="trip">
                <div className="trip-head">
                  <strong>{t('order.trip', { n: n + 1 })}</strong>
                  <span className={`badge badge-trip-${d.status}`}>{t(`trip.${d.status}`)}</span>
                </div>
                <p className="muted small">
                  {d.driver?.name}
                  {d.driver?.phone && d.status !== 'delivered' && d.status !== 'cancelled' && (
                    <> · <a href={`tel:${d.driver.phone}`} dir="ltr">{d.driver.phone}</a></>
                  )}
                  {' · '}{dateTime(d.deliveredAt || d.createdAt)}
                </p>
                <p className="small">{d.items.map((i) => `${pick(i)} × ${i.quantity}`).join(' · ')}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="two-col">
        <section className="card">
          <h2>{t('order.address')}</h2>
          <address>
            {order.shippingAddress.fullName}<br />
            {order.shippingAddress.street}<br />
            {order.shippingAddress.city}<br />
            <span dir="ltr">{order.shippingAddress.phone}</span>
          </address>
          {order.shippingAddress.notes && <p className="muted">{t('order.note')}: {order.shippingAddress.notes}</p>}
        </section>
        <section className="card">
          <h2>{t('order.history')}</h2>
          <ul className="history">
            {order.statusHistory.map((h, i) => (
              <li key={i}><StatusBadge status={h.status} /> <span className="muted">{dateTime(h.at)}</span></li>
            ))}
          </ul>
        </section>
      </div>

      {!isStaff && (
        <div className="form-actions">
          <button type="button" className="btn btn-primary" onClick={reorder} disabled={busy === 'reorder'}>
            <Icon name="repeat" size={18} /> {busy === 'reorder' ? t('common.wait') : t('order.reorder')}
          </button>
          {order.status === 'pending' && (
            <button type="button" className="btn btn-danger" onClick={cancel} disabled={busy === 'cancel'}>
              {busy === 'cancel' ? t('common.wait') : t('order.cancel')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
