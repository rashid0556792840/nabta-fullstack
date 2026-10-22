import { Link } from 'react-router-dom';
import { EmptyState, ErrorState, Loading, StatusBadge } from '../components/ui';
import { useFetch } from '../hooks/useFetch';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { formatDate, formatMoney } from '../utils/format';

export default function Orders() {
  useDocumentTitle('My orders');
  const { data, loading, error, reload } = useFetch('/orders/mine');

  return (
    <div className="container page">
      <header className="page-head">
        <h1>My orders</h1>
      </header>
      {loading && <Loading />}
      {error && <ErrorState error={error} onRetry={reload} />}
      {data && data.orders.length === 0 && (
        <EmptyState title="No orders yet" text="Your placed orders will appear here." action={<Link to="/shop" className="btn btn-primary">Start shopping</Link>} />
      )}
      {data && data.orders.length > 0 && (
        <ul className="order-list">
          {data.orders.map((o) => (
            <li key={o._id}>
              <Link to={`/orders/${o._id}`} className="order-row">
                <span>
                  <strong>{o.orderNumber}</strong>
                  <small className="muted">{formatDate(o.createdAt)} · {o.items.length} item{o.items.length === 1 ? '' : 's'}</small>
                </span>
                <StatusBadge status={o.status} />
                <strong>{formatMoney(o.total)}</strong>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
