import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useFavorites } from '../context/FavoritesContext';
import { useToast } from '../context/ToastContext';
import { useI18n } from '../i18n/LanguageContext';
import Icon from './Icon';
import { ProductImage } from './ui';

export default function ProductCard({ product }) {
  const { add } = useCart();
  const { user, isStaff, isDriver } = useAuth();
  const { isFavorite, toggle } = useFavorites();
  const toast = useToast();
  const navigate = useNavigate();
  const { t, pick, money, grams, errorText } = useI18n();
  const name = pick(product);
  const fav = isFavorite(product._id);
  const soldOut = product.stock <= 0;
  const canShop = !isStaff && !isDriver;

  const onFavorite = async () => {
    if (!user) {
      navigate('/login', { state: { from: `/product/${product._id}` } });
      return;
    }
    try {
      const added = await toggle(product._id);
      toast.success(added ? t('fav.added') : t('fav.removed'));
    } catch (err) {
      toast.error(errorText(err));
    }
  };

  return (
    <article className="product-card">
      <Link to={`/product/${product._id}`} className="product-media" tabIndex={-1} aria-hidden="true">
        <ProductImage src={product.imageUrl} alt="" />
        {soldOut && <span className="ribbon">{t('product.soldOut')}</span>}
        {!soldOut && product.stock <= 5 && <span className="ribbon ribbon-warn">{t('product.onlyLeft', { count: product.stock })}</span>}
        {!soldOut && product.stock > 5 && product.isFeatured && <span className="ribbon ribbon-star"><Icon name="star" size={13} /> {t('product.bestSeller')}</span>}
      </Link>
      {canShop && (
        <button
          type="button"
          className={`fav-btn ${fav ? 'active' : ''}`}
          onClick={onFavorite}
          aria-pressed={fav}
          aria-label={fav ? t('fav.removeNamed', { name }) : t('fav.saveNamed', { name })}
        >
          <Icon name="heart" size={18} />
        </button>
      )}
      <div className="product-body">
        <p className="product-category">{pick(product.category)}</p>
        <h3><Link to={`/product/${product._id}`}>{name}</Link></h3>
        {product.weightGrams ? <p className="product-weight">{grams(product.weightGrams)}</p> : null}
        <div className="product-foot">
          <strong className="price">{money(product.price)}</strong>
          {canShop && (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={soldOut}
              aria-label={t('product.addNamed', { name })}
              onClick={() => {
                add(product, 1);
                toast.success(t('cart.addedNamed', { name }));
              }}
            >
              {soldOut ? t('product.soldOut') : <><Icon name="plus" size={16} /> {t('product.add')}</>}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
