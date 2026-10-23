import { Link } from 'react-router-dom';
import Icon from '../../components/Icon';
import { ErrorState, Loading } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useFetch } from '../../hooks/useFetch';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useI18n } from '../../i18n/LanguageContext';

const STATUSES = ['pending', 'confirmed', 'processing', 'out_for_delivery', 'partially_delivered', 'completed', 'cancelled'];

function SalesChart({ days }) {
  const { money, weekday, date, t } = useI18n();
  const max = Math.max(1, ...days.map((d) => d.total));
  return (
    <div className="bar-chart" role="img" aria-label={t('dash.salesAria', { list: days.map((d) => `${date(d.date)} ${money(d.total)}`).join('، ') })}>
      {days.map((d) => (
        <div key={d.date} className="bar-col" title={`${date(d.date)}: ${money(d.total)} (${t('orders.ordersCount', { count: d.orders })})`}>
          <span className="bar-value">{d.total ? Math.round(d.total) : ''}</span>
          <span className="bar" style={{ height: `${Math.max(2, (d.total / max) * 100)}%` }} />
          <span className="bar-label">{weekday(d.date)}</span>
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const { t, pick, money, number, dateTime, status } = useI18n();
  const { isAdmin } = useAuth();
  useDocumentTitle(t('admin.nav.dashboard'));
  const { data, loading, error, reload } = useFetch('/admin/stats');
  const activity = useFetch('/admin/activity');

  if (loading) return <Loading />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const totalOrders = Object.values(data.ordersByStatus).reduce((a, b) => a + b, 0);
  const maxCat = Math.max(1, ...data.salesByCategory.map((c) => c.revenue));
  const toHandle = (data.ordersByStatus.pending || 0) + (data.ordersByStatus.confirmed || 0) + (data.ordersByStatus.processing || 0) + (data.ordersByStatus.partially_delivered || 0);

  return (
    <>
      <header className="admin-head">
        <h1>{t('dash.title')}</h1>
        <button type="button" className="btn btn-outline btn-sm" onClick={() => { reload(); activity.reload(); }}><Icon name="refresh" size={16} /> {t('common.refresh')}</button>
      </header>

      <div className="stat-grid">
        <div className="stat"><span>{t('dash.revenue')}</span><strong>{money(data.revenue)}</strong><small>{t('dash.exclCancelled')}</small></div>
        <Link to="/admin/orders?status=open" className={`stat ${toHandle ? 'stat-accent' : ''}`}><span>{t('dash.toHandle')}</span><strong>{number(toHandle)}</strong><small>{t('dash.ofOrders', { count: totalOrders })}</small></Link>
        <Link to="/admin/deliveries" className="stat"><span>{t('dash.onTheRoad')}</span><strong>{number(data.activeDeliveries || 0)}</strong><small>{t('dash.drivers', { count: data.drivers || 0 })}</small></Link>
        <div className="stat"><span>{t('dash.average')}</span><strong>{money(data.averageOrder)}</strong></div>
        <div className="stat"><span>{t('dash.customers')}</span><strong>{number(data.customers)}</strong></div>
        {isAdmin ? (
          <Link to="/admin/products" className={`stat ${data.lowStock ? 'stat-warn' : ''}`}><span>{t('dash.lowStock')}</span><strong>{number(data.lowStock)}</strong><small>{t('dash.ofActive', { count: data.activeProducts })}</small></Link>
        ) : (
          <div className={`stat ${data.lowStock ? 'stat-warn' : ''}`}><span>{t('dash.lowStock')}</span><strong>{number(data.lowStock)}</strong></div>
        )}
        <Link to="/admin/messages" className="stat"><span>{t('dash.unread')}</span><strong>{number(data.unreadMessages)}</strong></Link>
      </div>

      <div className="dash-grid">
        <section className="card">
          <h2>{t('dash.sales7')}</h2>
          <SalesChart days={data.salesByDay} />
        </section>

        <section className="card">
          <h2>{t('dash.byStatus')}</h2>
          <ul className="status-list">
            {STATUSES.map((s) => (
              <li key={s}>
                <Link to={`/admin/orders?status=${s}`} className={`badge badge-${s}`}>{status(s)}</Link>
                <strong>{number(data.ordersByStatus[s] || 0)}</strong>
              </li>
            ))}
          </ul>
        </section>

        <section className="card">
          <h2>{t('dash.best')}</h2>
          <ol className="rank-list">
            {data.topProducts.map((p) => (
              <li key={p._id}><span>{pick(p)}</span><span className="muted">{t('dash.sold', { count: p.quantity })} · {money(p.revenue)}</span></li>
            ))}
            {data.topProducts.length === 0 && <li className="muted">{t('dash.noSales')}</li>}
          </ol>
        </section>

        <section className="card">
          <h2>{t('dash.byCategory')}</h2>
          <ul className="hbar-list">
            {data.salesByCategory.map((c) => (
              <li key={c._id}>
                <span>{pick({ name: c._id, nameAr: c.nameAr })}</span>
                <span className="hbar"><span style={{ width: `${(c.revenue / maxCat) * 100}%` }} /></span>
                <span className="muted">{money(c.revenue)}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="card span-2">
          <h2>{t('dash.activity')}</h2>
          <ul className="activity">
            {activity.data?.activity.map((a, i) => (
              <li key={i}>
                <strong>{t(`activity.${a.type}`)}</strong>
                <span dir="auto">{a.orderNumber || a.name || a.email || a.from || a.to || a.user || a.by || ''}{a.status ? ` → ${status(a.status)}` : ''}</span>
                <time className="muted" dateTime={a.at}>{dateTime(a.at)}</time>
              </li>
            ))}
            {activity.data?.activity.length === 0 && <li className="muted">{t('dash.noActivity')}</li>}
          </ul>
        </section>
      </div>
    </>
  );
}
