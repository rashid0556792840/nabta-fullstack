import { Link, useNavigate } from 'react-router-dom';
import Icon from '../components/Icon';
import { EmptyState, ProductImage } from '../components/ui';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useCompany } from '../context/CompanyContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useI18n } from '../i18n/LanguageContext';

export default function Cart() {
  const { t, pick, money, grams } = useI18n();
  useDocumentTitle(t('cart.title'));
  const { items, subtotal, setQuantity, remove, clear } = useCart();
  const { user } = useAuth();
  const { deliveryFor, freeDeliveryFrom } = useCompany();
  const navigate = useNavigate();
  const delivery = deliveryFor(subtotal);

  if (items.length === 0) {
    return (
      <div className="container page">
        <EmptyState
          icon="cart"
          title={t('cart.emptyTitle')}
          text={t('cart.emptyText')}
          action={<Link to="/shop" className="btn btn-primary">{t('cart.startShopping')}</Link>}
        />
      </div>
    );
  }

  const progress = freeDeliveryFrom > 0 ? Math.min(100, (subtotal / freeDeliveryFrom) * 100) : 100;

  return (
    <div className="container page">
      <header className="page-head">
        <h1>{t('cart.title')}</h1>
      </header>
      <div className="cart-layout">
        <section aria-label={t('cart.items')}>
          <ul className="cart-list">
            {items.map((item) => {
              const name = pick(item);
              return (
                <li key={item._id} className="cart-item">
                  <ProductImage src={item.imageUrl} alt="" className="cart-thumb" />
                  <div className="cart-item-info">
                    <Link to={`/product/${item._id}`}><strong>{name}</strong></Link>
                    <span className="muted small">{money(item.price)}{item.weightGrams ? ` · ${grams(item.weightGrams)}` : ''}</span>
                  </div>
                  <div className="qty qty-sm">
                    <button type="button" onClick={() => setQuantity(item._id, item.quantity - 1)} aria-label={t('cart.decreaseNamed', { name })}><Icon name="minus" size={14} /></button>
                    <span aria-live="polite">{item.quantity}</span>
                    <button
                      type="button"
                      onClick={() => setQuantity(item._id, item.quantity + 1)}
                      disabled={item.quantity >= item.stock}
                      aria-label={t('cart.increaseNamed', { name })}
                    >
                      <Icon name="plus" size={14} />
                    </button>
                  </div>
                  <strong className="cart-line">{money(item.price * item.quantity)}</strong>
                  <button type="button" className="icon-btn subtle" onClick={() => remove(item._id)} aria-label={t('cart.removeNamed', { name })}>
                    <Icon name="trash" size={18} />
                  </button>
                </li>
              );
            })}
          </ul>
          <button type="button" className="link-btn" onClick={clear}>{t('cart.empty')}</button>
        </section>

        <aside className="summary" aria-label={t('cart.summary')}>
          <h2>{t('cart.summary')}</h2>
          {freeDeliveryFrom > 0 && (
            <div className="free-meter">
              <p className="small">
                {delivery === 0 ? t('cart.freeReached') : t('cart.addForFree', { amount: money(freeDeliveryFrom - subtotal) })}
              </p>
              <span className="meter-track"><span style={{ width: `${progress}%` }} /></span>
            </div>
          )}
          <dl>
            <div><dt>{t('cart.subtotal')}</dt><dd>{money(subtotal)}</dd></div>
            <div><dt>{t('cart.delivery')}</dt><dd>{delivery === 0 ? t('cart.free') : money(delivery)}</dd></div>
            <div className="summary-total"><dt>{t('cart.total')}</dt><dd>{money(subtotal + delivery)}</dd></div>
          </dl>
          <button
            type="button"
            className="btn btn-primary btn-block"
            onClick={() => navigate(user ? '/checkout' : '/login', { state: { from: '/checkout' } })}
          >
            {user ? t('cart.toCheckout') : t('cart.signInToCheckout')}
          </button>
          <p className="muted small">{t('cart.serverNote')}</p>
        </aside>
      </div>
    </div>
  );
}
