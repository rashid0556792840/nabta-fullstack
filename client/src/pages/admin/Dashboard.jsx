import { Link } from 'react-router-dom';
import { ErrorState, Loading } from '../../components/ui';
import { useFetch } from '../../hooks/useFetch';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { STATUS_LABELS, formatDateTime, formatMoney } from '../../utils/format';

function SalesChart({ days }) {
  const max = Math.max(1, ...days.map((d) => d.total));
  return (
    <div className="bar-chart" role="img" aria-label={`Sales for the last 7 days: ${days.map((d) => `${d.date} ${d.total}`).join(', ')}`}>
      {days.map((d) => (
        <div key={d.date} className="bar-col" title={`${d.date}: ${formatMoney(d.total)} (${d.orders} orders)`}>
          <span className="bar-value">{d.total ? Math.round(d.total) : ''}</span>
          <span className="bar" style={{ height: `${Math.max(2, (d.total / max) * 100)}%` }} />
          <span className="bar-label">{new Date(d.date).toLocaleDateString('en-GB', { weekday: 'short' })}</span>
        </div>
      ))}
    </div>
  );
}

const ACTIVITY_LABELS = {
  'order:placed': 'New order',
  'order:status': 'Order updated',
  'user:registered': 'New customer',
  'user:login': 'Sign in',
  'product:created': 'Product added',
  'product:updated': 'Product edited',
  'stock:low': 'Low stock',
  'contact:received': 'New message',
  'image:uploaded': 'Image uploaded',
  'report:daily': 'Daily report',
};

export default function Dashboard() {
  useDocumentTitle('Admin dashboard');
  const { data, loading, error, reload } = useFetch('/admin/stats');
  const activity = useFetch('/admin/activity');

  if (loading) return <Loading />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const totalOrders = Object.values(data.ordersByStatus).reduce((a, b) => a + b, 0);
  const maxCat = Math.max(1, ...data.salesByCategory.map((c) => c.revenue));

  return (
    <>
      <header className="admin-head">
        <h1>Business overview</h1>
        <button type="button" className="btn btn-outline btn-sm" onClick={() => { reload(); activity.reload(); }}>↻ Refresh</button>
      </header>

      <div className="stat-grid">
        <div className="stat"><span>Revenue</span><strong>{formatMoney(data.revenue)}</strong><small>excl. cancelled</small></div>
        <div className="stat"><span>Orders</span><strong>{totalOrders}</strong><small>{data.ordersByStatus.pending || 0} pending</small></div>
        <div className="stat"><span>Average order</span><strong>{formatMoney(data.averageOrder)}</strong></div>
        <div className="stat"><span>Customers</span><strong>{data.customers}</strong></div>
        <Link to="/admin/products" className={`stat ${data.lowStock ? 'stat-warn' : ''}`}><span>Low stock</span><strong>{data.lowStock}</strong><small>of {data.activeProducts} active</small></Link>
        <Link to="/admin/messages" className="stat"><span>Unread messages</span><strong>{data.unreadMessages}</strong></Link>
      </div>

      <div className="dash-grid">
        <section className="card">
          <h2>Sales - last 7 days</h2>
          <SalesChart days={data.salesByDay} />
        </section>

        <section className="card">
          <h2>Orders by status</h2>
          <ul className="status-list">
            {Object.keys(STATUS_LABELS).map((s) => (
              <li key={s}>
                <span className={`badge badge-${s}`}>{STATUS_LABELS[s]}</span>
                <strong>{data.ordersByStatus[s] || 0}</strong>
              </li>
            ))}
          </ul>
        </section>

        <section className="card">
          <h2>Best sellers</h2>
          <ol className="rank-list">
            {data.topProducts.map((p) => (
              <li key={p._id}><span>{p.name}</span><span className="muted">{p.quantity} sold · {formatMoney(p.revenue)}</span></li>
            ))}
            {data.topProducts.length === 0 && <li className="muted">No sales yet.</li>}
          </ol>
        </section>

        <section className="card">
          <h2>Revenue by category</h2>
          <ul className="hbar-list">
            {data.salesByCategory.map((c) => (
              <li key={c._id}>
                <span>{c._id}</span>
                <span className="hbar"><span style={{ width: `${(c.revenue / maxCat) * 100}%` }} /></span>
                <span className="muted">{formatMoney(c.revenue)}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="card span-2">
          <h2>Recent activity <small className="muted">(from logs/activity.log)</small></h2>
          <ul className="activity">
            {activity.data?.activity.map((a, i) => (
              <li key={i}>
                <strong>{ACTIVITY_LABELS[a.type] || a.type}</strong>
                <span>{a.orderNumber || a.name || a.email || a.from || a.user || ''}{a.status ? ` → ${a.status}` : ''}</span>
                <time className="muted" dateTime={a.at}>{formatDateTime(a.at)}</time>
              </li>
            ))}
            {activity.data?.activity.length === 0 && <li className="muted">No activity yet.</li>}
          </ul>
        </section>
      </div>
    </>
  );
}
