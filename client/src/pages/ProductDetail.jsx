import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Icon from '../components/Icon';
import ProductCard from '../components/ProductCard';
import { ErrorState, Loading, ProductImage } from '../components/ui';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useCompany } from '../context/CompanyContext';
import { useFavorites } from '../context/FavoritesContext';
import { useToast } from '../context/ToastContext';
import { useFetch } from '../hooks/useFetch';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useI18n } from '../i18n/LanguageContext';

export default function ProductDetail() {
  const { id } = useParams();
  const { t, pick, money, grams, errorText } = useI18n();
  const { data, loading, error, reload } = useFetch(`/products/${id}`);
  const product = data?.product;
  useDocumentTitle(product ? pick(product) : t('product.title'));
  const related = useFetch(product?.category?._id ? `/products?category=${product.category._id}&limit=5` : null);

  const [qty, setQty] = useState(1);
  const { add } = useCart();
  const { user, isStaff, isDriver } = useAuth();
  const { company, freeDeliveryFrom, whatsappLink } = useCompany();
  const { isFavorite, toggle } = useFavorites();
  const toast = useToast();
  const navigate = useNavigate();

  if (loading) return <Loading />;
  if (error) return <div className="container page"><ErrorState error={error} onRetry={reload} /></div>;
  if (!product) return null;

  const name = pick(product);
  const soldOut = product.stock <= 0;
  const max = Math.min(50, product.stock);
  const canShop = !isStaff && !isDriver;
  const others = related.data?.products.filter((p) => p._id !== product._id).slice(0, 4) || [];

  return (
    <div className="container page">
      <nav className="breadcrumb" aria-label={t('common.breadcrumb')}>
        <Link to="/shop">{t('nav.shop')}</Link> <span aria-hidden="true">/</span>{' '}
        <Link to={`/shop?category=${product.category?._id}`}>{pick(product.category)}</Link> <span aria-hidden="true">/</span>{' '}
        <span aria-current="page">{name}</span>
      </nav>

      <article className="detail">
        <div className="detail-media">
          <ProductImage src={product.imageUrl} alt={name} />
        </div>
        <div className="detail-info">
          <p className="product-category">{pick(product.category)}</p>
          <h1>{name}</h1>
          <p className="detail-price">
            {money(product.price)}
            {product.weightGrams ? <span className="detail-weight"> / {grams(product.weightGrams)}</span> : null}
          </p>
          <p className="detail-desc">{pick(product, 'description') || t('product.defaultDesc')}</p>
          <p className={`stock ${soldOut ? 'out' : product.stock <= 5 ? 'low' : ''}`}>
            <Icon name={soldOut ? 'close' : 'check'} size={16} />{' '}
            {soldOut ? t('product.outOfStock') : product.stock <= 5 ? t('product.onlyLeft', { count: product.stock }) : t('product.inStock')}
          </p>

          {canShop && (
            <form
              className="detail-actions"
              onSubmit={(e) => {
                e.preventDefault();
                add(product, qty);
                toast.success(t('cart.addedQty', { qty, name }));
              }}
            >
              <label htmlFor="qty" className="sr-only">{t('cart.quantity')}</label>
              <div className="qty">
                <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label={t('cart.decrease')} disabled={soldOut}><Icon name="minus" size={16} /></button>
                <input
                  id="qty"
                  type="number"
                  inputMode="numeric"
                  min="1"
                  max={max || 1}
                  value={qty}
                  disabled={soldOut}
                  onChange={(e) => setQty(Math.max(1, Math.min(max, Number(e.target.value) || 1)))}
                />
                <button type="button" onClick={() => setQty((q) => Math.min(max, q + 1))} aria-label={t('cart.increase')} disabled={soldOut}><Icon name="plus" size={16} /></button>
              </div>
              <button type="submit" className="btn btn-primary" disabled={soldOut}><Icon name="cart" size={18} className="flip-rtl" /> {t('product.addToCart')}</button>
              <button
                type="button"
                className={`btn btn-outline ${isFavorite(product._id) ? 'is-fav' : ''}`}
                aria-pressed={isFavorite(product._id)}
                onClick={async () => {
                  if (!user) return navigate('/login', { state: { from: `/product/${id}` } });
                  try {
                    const added = await toggle(product._id);
                    toast.success(added ? t('fav.added') : t('fav.removed'));
                  } catch (err) {
                    toast.error(errorText(err));
                  }
                  return undefined;
                }}
              >
                <Icon name="heart" size={18} /> {isFavorite(product._id) ? t('fav.saved') : t('fav.save')}
              </button>
            </form>
          )}

          <ul className="perks">
            {freeDeliveryFrom > 0 && <li><Icon name="truck" size={18} /> {t('product.perkDelivery', { amount: money(freeDeliveryFrom) })}</li>}
            <li><Icon name="cash" size={18} /> {t('product.perkCod')}</li>
            <li><Icon name="shield" size={18} /> {t('product.perkQuality', { year: company.foundedYear || 2018 })}</li>
            {whatsappLink() && (
              <li>
                <Icon name="whatsapp" size={18} />{' '}
                <a href={whatsappLink(t('product.askWhatsapp', { name }))} target="_blank" rel="noopener noreferrer">{t('product.askAbout')}</a>
              </li>
            )}
          </ul>
        </div>
      </article>

      {others.length > 0 && (
        <section className="section" aria-labelledby="related-title">
          <div className="section-head"><h2 id="related-title">{t('product.related')}</h2></div>
          <div className="product-grid">
            {others.map((p) => <ProductCard key={p._id} product={p} />)}
          </div>
        </section>
      )}
    </div>
  );
}
