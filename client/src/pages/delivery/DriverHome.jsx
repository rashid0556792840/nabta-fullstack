// Driver screen: today's numbers and the trips assigned to the signed-in driver.
import { useEffect, useState } from 'react';
import { api } from '../../api';
import Icon from '../../components/Icon';
import { EmptyState, ErrorState, Loading, useConfirm } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useFetch } from '../../hooks/useFetch';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useI18n } from '../../i18n/LanguageContext';

const mapsLink = (d) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([d.street, d.city].filter(Boolean).join(', '))}`;

function TripCard({ trip, onChanged }) {
  const { t, pick, money, dateTime, errorText } = useI18n();
  const toast = useToast();
  const [confirm, confirmDialog] = useConfirm();
  const [busy, setBusy] = useState(false);
  const d = trip.destination || {};
  const active = trip.status === 'assigned' || trip.status === 'accepted';

  const act = async (action) => {
    if (action === 'complete') {
      const ok = await confirm(t('driver.completeConfirm', { amount: money(trip.cashToCollect) }), { danger: false, confirmLabel: t('driver.complete') });
      if (!ok) return;
    }
    setBusy(true);
    try {
      await api(`/delivery/assignments/${trip._id}/${action}`, { method: 'POST' });
      toast.success(action === 'accept' ? t('driver.accepted') : t('driver.completed'));
      onChanged();
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className={`card trip-card status-${trip.status}`}>
      {confirmDialog}
      <header className="trip-head">
        <div>
          <strong dir="ltr">{trip.orderNumber}</strong>
          <small className="muted">{dateTime(trip.createdAt)}</small>
        </div>
        <span className={`badge badge-trip-${trip.status}`}>{t(`trip.${trip.status}`)}</span>
      </header>

      <div className="trip-dest">
        <Icon name="pin" size={20} />
        <div>
          <strong>{d.fullName}</strong>
          <p>{[d.street, d.city].filter(Boolean).join(' - ')}</p>
          {d.notes && <p className="trip-note"><Icon name="info" size={14} /> {d.notes}</p>}
        </div>
      </div>

      <ul className="trip-items">
        {trip.items.map((i) => (
          <li key={i.index}><span>{pick(i)}</span><strong>× {i.quantity}</strong></li>
        ))}
      </ul>
      {trip.note && <p className="trip-note"><Icon name="mail" size={14} /> {trip.note}</p>}

      <div className="trip-cash">
        <span>{t('driver.collect')}</span>
        <strong>{money(trip.cashToCollect)}</strong>
      </div>

      {active && (
        <div className="trip-actions">
          {d.phone && <a className="btn btn-outline btn-sm" href={`tel:${d.phone}`}><Icon name="phone" size={16} /> {t('driver.call')}</a>}
          {d.street && <a className="btn btn-outline btn-sm" href={mapsLink(d)} target="_blank" rel="noopener noreferrer"><Icon name="map" size={16} /> {t('driver.directions')}</a>}
          {trip.status === 'assigned' && (
            <button type="button" className="btn btn-primary" onClick={() => act('accept')} disabled={busy}>
              <Icon name="check" size={18} /> {t('driver.accept')}
            </button>
          )}
          {trip.status === 'accepted' && (
            <button type="button" className="btn btn-primary" onClick={() => act('complete')} disabled={busy}>
              <Icon name="check" size={18} /> {t('driver.complete')}
            </button>
          )}
        </div>
      )}
      {trip.status === 'delivered' && <p className="muted small">{t('driver.deliveredAt', { date: dateTime(trip.deliveredAt) })}</p>}
    </li>
  );
}

export default function DriverHome() {
  const { t, money, number } = useI18n();
  useDocumentTitle(t('nav.deliveries'));
  const { user } = useAuth();
  const [tab, setTab] = useState('active');
  const trips = useFetch(`/delivery/assignments?status=${tab}`);
  const summary = useFetch('/delivery/summary');

  // Refresh every 30 seconds so new trips appear without reloading
  const { reload } = trips;
  const reloadSummary = summary.reload;
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') {
        reload();
        reloadSummary();
      }
    }, 30000);
    return () => clearInterval(timer);
  }, [reload, reloadSummary]);

  const refresh = () => {
    trips.reload();
    summary.reload();
  };

  return (
    <div className="container page narrow driver">
      <header className="page-head order-head">
        <div>
          <p className="kicker">{t('driver.kicker')}</p>
          <h1>{t('driver.hello', { name: user.name.split(' ')[0] })}</h1>
        </div>
        <button type="button" className="btn btn-outline btn-sm" onClick={refresh}><Icon name="refresh" size={16} /> {t('common.refresh')}</button>
      </header>

      <div className="stat-grid driver-stats">
        <div className="stat"><span>{t('driver.activeTrips')}</span><strong>{number(summary.data?.active ?? 0)}</strong></div>
        <div className="stat"><span>{t('driver.deliveredToday')}</span><strong>{number(summary.data?.deliveredToday ?? 0)}</strong></div>
        <div className="stat"><span>{t('driver.cashToday')}</span><strong>{money(summary.data?.cashToday ?? 0)}</strong></div>
      </div>

      <div className="tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'active'} className={tab === 'active' ? 'on' : ''} onClick={() => setTab('active')}>{t('driver.tabActive')}</button>
        <button type="button" role="tab" aria-selected={tab === 'done'} className={tab === 'done' ? 'on' : ''} onClick={() => setTab('done')}>{t('driver.tabDone')}</button>
      </div>

      {trips.loading && !trips.data && <Loading />}
      {trips.error && <ErrorState error={trips.error} onRetry={trips.reload} />}
      {trips.data && trips.data.assignments.length === 0 && (
        <EmptyState icon="truck" title={tab === 'active' ? t('driver.noneActive') : t('driver.noneDone')} text={tab === 'active' ? t('driver.noneActiveText') : ''} />
      )}
      <ul className="trip-cards">
        {trips.data?.assignments.map((a) => <TripCard key={a._id} trip={a} onChanged={refresh} />)}
      </ul>
    </div>
  );
}
