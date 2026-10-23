import { Link } from 'react-router-dom';
import Icon from '../components/Icon';
import { EmptyState, ErrorState, Loading, StatusBadge } from '../components/ui';
import { useFetch } from '../hooks/useFetch';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useI18n } from '../i18n/LanguageContext';

export default function Orders() {
  const { t, date, money } = useI18n();
  useDocumentTitle(t('nav.orders'));
  const { data, loading, error, reload } = useFetch('/orders/mine');

  return (
    <div className="container page narrow">
      <header className="page-head">
        <h1>{t('nav.orders')}</h1>
      </header>
      {loading && <Loading />}
      {error && <ErrorState error={error} onRetry={reload} />}
      {data && data.orders.length === 0 && (
        <EmptyState icon="box" title={t('orders.noneTitle')} text={t('orders.noneText')} action={<Link to="/shop" className="btn btn-primary">{t('cart.startShopping')}</Link>} />
      )}
      {data && data.orders.length > 0 && (
        <ul className="order-list">
          {data.orders.map((o) => (
            <li key={o._id}>
              <Link to={`/orders/${o._id}`} className="order-row">
                <span>
                  <strong dir="ltr">{o.orderNumber}</strong>
                  <small className="muted">{date(o.createdAt)} · {t('orders.itemsCount', { count: o.items.length })}</small>
                </span>
                <StatusBadge status={o.status} />
                <strong>{money(o.total)}</strong>
                <Icon name="chevron" size={18} className="flip-rtl muted" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
