// Delivery board: drivers and their trips, so staff can follow what is on the road.
import { useState } from 'react';
import { api } from '../../api';
import Icon from '../../components/Icon';
import { EmptyState, ErrorState, Loading, useConfirm } from '../../components/ui';
import { useToast } from '../../context/ToastContext';
import { useFetch } from '../../hooks/useFetch';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useI18n } from '../../i18n/LanguageContext';

const FILTERS = ['active', 'delivered', 'cancelled', 'all'];

export default function AdminDeliveries() {
  const { t, pick, money, dateTime, errorText } = useI18n();
  useDocumentTitle(t('admin.nav.deliveries'));
  const toast = useToast();
  const [confirm, confirmDialog] = useConfirm();
  const [status, setStatus] = useState('active');
  const [driver, setDriver] = useState('');
  const drivers = useFetch('/operations/drivers');
  const list = useFetch(`/operations/assignments?status=${status}${driver ? `&driver=${driver}` : ''}`);

  const cancelTrip = async (trip) => {
    if (!(await confirm(t('adminOrders.cancelTripConfirm')))) return;
    try {
      await api(`/operations/assignments/${trip._id}/cancel`, { method: 'POST' });
      toast.success(t('adminOrders.tripCancelled'));
      list.reload();
      drivers.reload();
    } catch (err) {
      toast.error(errorText(err));
    }
  };

  return (
    <>
      {confirmDialog}
      <header className="admin-head">
        <h1>{t('admin.nav.deliveries')}</h1>
        <button type="button" className="btn btn-outline btn-sm" onClick={() => { list.reload(); drivers.reload(); }}><Icon name="refresh" size={16} /> {t('common.refresh')}</button>
      </header>

      <section className="driver-strip" aria-label={t('deliveries.drivers')}>
        <button type="button" className={`driver-chip ${driver === '' ? 'on' : ''}`} onClick={() => setDriver('')}>
          <Icon name="users" size={18} /> <span>{t('deliveries.allDrivers')}</span>
        </button>
        {drivers.data?.drivers.map((d) => (
          <button key={d._id} type="button" className={`driver-chip ${driver === d._id ? 'on' : ''}`} onClick={() => setDriver(d._id)}>
            <span className="avatar" aria-hidden="true">{d.name.charAt(0)}</span>
            <span>
              <strong>{d.name}</strong>
              <small>{t('dispatch.activeTrips', { count: d.activeTrips })}</small>
            </span>
          </button>
        ))}
      </section>
      {drivers.data?.drivers.length === 0 && <p className="field-hint">{t('dispatch.noDrivers')}</p>}

      <div className="tabs" role="tablist">
        {FILTERS.map((f) => (
          <button key={f} type="button" role="tab" aria-selected={status === f} className={status === f ? 'on' : ''} onClick={() => setStatus(f)}>
            {t(`deliveries.filter.${f}`)}
          </button>
        ))}
      </div>

      {list.loading && !list.data && <Loading />}
      {list.error && <ErrorState error={list.error} onRetry={list.reload} />}
      {list.data && list.data.assignments.length === 0 && <EmptyState icon="truck" title={t('deliveries.none')} />}
      {list.data && list.data.assignments.length > 0 && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">{t('adminOrders.order')}</th>
                <th scope="col">{t('dispatch.driver')}</th>
                <th scope="col">{t('order.items')}</th>
                <th scope="col">{t('deliveries.destination')}</th>
                <th scope="col" className="num">{t('driver.collect')}</th>
                <th scope="col">{t('adminOrders.status')}</th>
              </tr>
            </thead>
            <tbody>
              {list.data.assignments.map((a) => (
                <tr key={a._id}>
                  <td><strong dir="ltr">{a.orderNumber}</strong><br /><small className="muted">{dateTime(a.createdAt)}</small></td>
                  <td>{a.driver?.name}<br /><small className="muted">{t('deliveries.by', { name: a.assignedBy?.name || '-' })}</small></td>
                  <td className="small">{a.items.map((i) => `${pick(i)} × ${i.quantity}`).join('، ')}</td>
                  <td className="small">{a.destination?.fullName}<br /><span className="muted">{a.destination?.city}</span></td>
                  <td className="num">{money(a.cashToCollect)}</td>
                  <td>
                    <span className={`badge badge-trip-${a.status}`}>{t(`trip.${a.status}`)}</span>
                    {a.deliveredAt && <><br /><small className="muted">{dateTime(a.deliveredAt)}</small></>}
                    {(a.status === 'assigned' || a.status === 'accepted') && (
                      <><br /><button type="button" className="link-btn danger small" onClick={() => cancelTrip(a)}>{t('adminOrders.cancelTrip')}</button></>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
