// Orders for admin and supervisor: move orders through the workflow and dispatch them to drivers,
// all at once or in several partial deliveries.
import { Fragment, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../../api';
import Icon from '../../components/Icon';
import { ErrorState, Field, Loading, Pagination, StatusBadge, useConfirm } from '../../components/ui';
import { useToast } from '../../context/ToastContext';
import { useDebounce } from '../../hooks/useDebounce';
import { useFetch } from '../../hooks/useFetch';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useI18n } from '../../i18n/LanguageContext';
import { sanitize } from '../../utils/validation';

const FILTERS = ['open', '', 'pending', 'confirmed', 'processing', 'out_for_delivery', 'partially_delivered', 'completed', 'cancelled'];

/** Form to hand some or all remaining items to a driver */
function DispatchForm({ order, remaining, onDone }) {
  const { t, pick, money, errorText } = useI18n();
  const toast = useToast();
  const drivers = useFetch('/operations/drivers');
  const [driverId, setDriverId] = useState('');
  const [qty, setQty] = useState(() => remaining.map((r) => r));
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const goods = order.items.reduce((s, it, i) => s + it.price * (qty[i] || 0), 0);

  const submit = async (e) => {
    e.preventDefault();
    const lines = qty.map((quantity, index) => ({ index, quantity })).filter((l) => l.quantity > 0);
    if (!driverId) return setError(t('dispatch.chooseDriver'));
    if (!lines.length) return setError(t('dispatch.chooseItems'));
    setBusy(true);
    setError('');
    try {
      await api(`/operations/orders/${order._id}/dispatch`, { method: 'POST', body: { driverId, lines, note: sanitize(note, 500) } });
      toast.success(t('dispatch.sent'));
      onDone();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
    return undefined;
  };

  const active = drivers.data?.drivers.filter((d) => d.isActive !== false) || [];

  return (
    <form className="dispatch" onSubmit={submit}>
      <h3><Icon name="truck" size={18} /> {t('dispatch.title')}</h3>
      <Field id={`drv-${order._id}`} label={t('dispatch.driver')}>
        <select id={`drv-${order._id}`} value={driverId} onChange={(e) => setDriverId(e.target.value)}>
          <option value="">{t('dispatch.choose')}</option>
          {active.map((d) => (
            <option key={d._id} value={d._id}>{d.name} · {t('dispatch.activeTrips', { count: d.activeTrips })}</option>
          ))}
        </select>
      </Field>
      {active.length === 0 && drivers.data && <p className="field-hint">{t('dispatch.noDrivers')}</p>}
      <table className="table compact">
        <thead><tr><th scope="col">{t('order.product')}</th><th scope="col">{t('dispatch.left')}</th><th scope="col">{t('dispatch.send')}</th></tr></thead>
        <tbody>
          {order.items.map((it, i) => (
            <tr key={i} className={remaining[i] === 0 ? 'muted' : ''}>
              <td>{pick(it)}</td>
              <td>{remaining[i]}</td>
              <td>
                <input
                  type="number"
                  className="qty-input"
                  min="0"
                  max={remaining[i]}
                  value={qty[i]}
                  disabled={remaining[i] === 0}
                  aria-label={t('dispatch.qtyFor', { name: pick(it) })}
                  onChange={(e) => setQty((q) => q.map((v, k) => (k === i ? Math.max(0, Math.min(remaining[i], Number(e.target.value) || 0)) : v)))}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <Field id={`note-${order._id}`} label={t('dispatch.note')}>
        <input id={`note-${order._id}`} value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} placeholder={t('dispatch.notePlaceholder')} />
      </Field>
      <p className="small muted">{t('dispatch.goods', { amount: money(goods) })}</p>
      {error && <p className="field-error" role="alert">{error}</p>}
      <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>{busy ? t('common.wait') : t('dispatch.submit')}</button>
    </form>
  );
}

/** Expanded order: items with delivered / remaining quantities, trips, actions */
function OrderPanel({ id, onChanged }) {
  const { t, pick, money, dateTime, status, join, errorText } = useI18n();
  const toast = useToast();
  const [confirm, confirmDialog] = useConfirm();
  const { data, loading, error, reload } = useFetch(`/orders/${id}`);

  if (loading && !data) return <Loading />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  const { order, deliveries, nextStatuses, remaining } = data;
  const canDispatch = ['processing', 'out_for_delivery', 'partially_delivered'].includes(order.status) && remaining.some((r) => r > 0);

  const refresh = () => {
    reload();
    onChanged();
  };

  const move = async (next) => {
    if (next === 'cancelled' && !(await confirm(t('adminOrders.cancelConfirm', { number: order.orderNumber })))) return;
    try {
      await api(`/orders/${order._id}/status`, { method: 'PATCH', body: { status: next } });
      toast.success(t('adminOrders.moved', { number: order.orderNumber, status: status(next) }));
      refresh();
    } catch (err) {
      toast.error(errorText(err));
    }
  };

  const cancelTrip = async (trip) => {
    if (!(await confirm(t('adminOrders.cancelTripConfirm')))) return;
    try {
      await api(`/operations/assignments/${trip._id}/cancel`, { method: 'POST' });
      toast.success(t('adminOrders.tripCancelled'));
      refresh();
    } catch (err) {
      toast.error(errorText(err));
    }
  };

  return (
    <div className="order-panel">
      {confirmDialog}
      <div className="two-col">
        <div>
          <h3>{t('order.items')}</h3>
          <ul className="summary-items">
            {order.items.map((it, i) => (
              <li key={i}>
                <span>{pick(it)} × {it.quantity}</span>
                <span dir="ltr" className={`qty-pill ${it.deliveredQty >= it.quantity ? 'full' : it.deliveredQty ? 'part' : ''}`} title={t('order.delivered')}>
                  {it.deliveredQty || 0}/{it.quantity}
                </span>
                <span>{money(it.lineTotal)}</span>
              </li>
            ))}
          </ul>
          <p className="small"><strong>{t('cart.total')}:</strong> {money(order.total)} · {t('order.cod')}</p>
        </div>
        <div>
          <h3>{t('order.address')}</h3>
          <address>
            {order.shippingAddress.fullName} · <a href={`tel:${order.shippingAddress.phone}`} dir="ltr">{order.shippingAddress.phone}</a><br />
            {join([order.shippingAddress.street, order.shippingAddress.city])}
            {order.shippingAddress.notes && <><br /><em>{order.shippingAddress.notes}</em></>}
          </address>
          {nextStatuses.length > 0 && (
            <div className="form-actions">
              {nextStatuses.map((n) => (
                <button key={n} type="button" className={`btn btn-sm ${n === 'cancelled' ? 'btn-ghost danger' : 'btn-primary'}`} onClick={() => move(n)}>
                  {n === 'cancelled' ? t('adminOrders.cancel') : t('adminOrders.markAs', { status: status(n) })}
                </button>
              ))}
            </div>
          )}
          {order.status === 'confirmed' && <p className="field-hint">{t('adminOrders.processingHint')}</p>}
        </div>
      </div>

      {deliveries.length > 0 && (
        <div>
          <h3>{t('order.deliveries')}</h3>
          <ul className="trip-list">
            {deliveries.map((d, n) => (
              <li key={d._id} className="trip">
                <div className="trip-head">
                  <strong>{t('order.trip', { n: n + 1 })} · {d.driver?.name}</strong>
                  <span className={`badge badge-trip-${d.status}`}>{t(`trip.${d.status}`)}</span>
                </div>
                <p className="small">{d.items.map((i) => `${pick(i)} × ${i.quantity}`).join(' · ')} · {money(d.cashToCollect)}</p>
                <p className="muted small">{dateTime(d.createdAt)}</p>
                {(d.status === 'assigned' || d.status === 'accepted') && (
                  <button type="button" className="link-btn danger" onClick={() => cancelTrip(d)}>{t('adminOrders.cancelTrip')}</button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {canDispatch && <DispatchForm key={JSON.stringify(remaining)} order={order} remaining={remaining} onDone={refresh} />}
    </div>
  );
}

export default function AdminOrders() {
  const { t, dateTime, money, status: statusLabel } = useI18n();
  useDocumentTitle(t('admin.nav.orders'));
  const [params, setParams] = useSearchParams();
  const status = params.get('status') ?? 'open';
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const debounced = useDebounce(q);
  const [open, setOpen] = useState(null);
  const { data, loading, error, reload } = useFetch(`/orders?page=${page}&status=${status}&q=${encodeURIComponent(debounced)}`);

  useEffect(() => {
    setPage(1);
  }, [status, debounced]);

  return (
    <>
      <header className="admin-head">
        <h1>{t('admin.nav.orders')}</h1>
        <button type="button" className="btn btn-outline btn-sm" onClick={reload}><Icon name="refresh" size={16} /> {t('common.refresh')}</button>
      </header>

      <div className="toolbar">
        <span className="input-icon grow">
          <Icon name="search" size={18} />
          <input type="search" placeholder={t('adminOrders.search')} value={q} onChange={(e) => setQ(e.target.value)} aria-label={t('adminOrders.search')} />
        </span>
        <label className="sort">
          {t('adminOrders.status')}
          <select value={status === 'all' ? '' : status} onChange={(e) => setParams(e.target.value === 'open' ? {} : { status: e.target.value || 'all' }, { replace: true })}>
            {FILTERS.map((f) => (
              <option key={f || 'all'} value={f}>{f === 'open' ? t('adminOrders.open') : f === '' ? t('adminOrders.all') : statusLabel(f)}</option>
            ))}
          </select>
        </label>
      </div>

      {loading && !data && <Loading />}
      {error && <ErrorState error={error} onRetry={reload} />}
      {data && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">{t('adminOrders.order')}</th>
                <th scope="col">{t('adminOrders.customer')}</th>
                <th scope="col">{t('adminOrders.date')}</th>
                <th scope="col" className="num">{t('cart.total')}</th>
                <th scope="col">{t('adminOrders.status')}</th>
              </tr>
            </thead>
            <tbody>
              {data.orders.map((o) => (
                <Fragment key={o._id}>
                  <tr className={open === o._id ? 'row-open' : ''}>
                    <td>
                      <button type="button" className="link-btn strong" onClick={() => setOpen(open === o._id ? null : o._id)} aria-expanded={open === o._id}>
                        <Icon name="chevron" size={14} className={open === o._id ? 'rot-90' : 'flip-rtl'} /> <span dir="ltr">{o.orderNumber}</span>
                      </button>
                    </td>
                    <td>{o.shippingAddress?.fullName || o.user?.name}<br /><small className="muted">{o.user?.email}</small></td>
                    <td>{dateTime(o.createdAt)}</td>
                    <td className="num">{money(o.total)}</td>
                    <td><StatusBadge status={o.status} /></td>
                  </tr>
                  {open === o._id && (
                    <tr className="detail-row">
                      <td colSpan={5}>
                        <OrderPanel id={o._id} onChanged={reload} />
                        <Link to={`/orders/${o._id}`} className="link-arrow small">{t('adminOrders.customerView')} <Icon name="arrow" size={14} className="flip-rtl" /></Link>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
          {data.orders.length === 0 && <p className="muted center pad">{t('adminOrders.none')}</p>}
          <Pagination page={data.page} pages={data.pages} onPage={setPage} />
        </div>
      )}
    </>
  );
}
