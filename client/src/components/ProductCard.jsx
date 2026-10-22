import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useFavorites } from '../context/FavoritesContext';
import { useToast } from '../context/ToastContext';
import { formatMoney } from '../utils/format';
import { ProductImage } from './ui';

export default function ProductCard({ product }) {
  const { add } = useCart();
  const { user } = useAuth();
  const { isFavorite, toggle } = useFavorites();
  const toast = useToast();
  const navigate = useNavigate();
  const fav = isFavorite(product._id);
  const soldOut = product.stock <= 0;

  const onFavorite = async () => {
    if (!user) {
      navigate('/login', { state: { from: '/shop' } });
      return;
    }
    try {
      const added = await toggle(product._id);
      toast.success(added ? 'Saved to favourites.' : 'Removed from favourites.');
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <article className="product-card">
      <Link to={`/product/${product._id}`} className="product-media">
        <ProductImage src={product.imageUrl} alt={product.name} />
        {soldOut && <span className="ribbon">Sold out</span>}
        {!soldOut && product.stock <= 5 && <span className="ribbon ribbon-warn">Only {product.stock} left</span>}
      </Link>
      <button
        type="button"
        className={`fav-btn ${fav ? 'active' : ''}`}
        onClick={onFavorite}
        aria-pressed={fav}
        aria-label={fav ? `Remove ${product.name} from favourites` : `Save ${product.name} to favourites`}
      >
        {fav ? '♥' : '♡'}
      </button>
      <div className="product-body">
        <p className="product-category">{product.category?.name}</p>
        <h3><Link to={`/product/${product._id}`}>{product.name}</Link></h3>
        <div className="product-foot">
          <strong className="price">{formatMoney(product.price)}</strong>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={soldOut}
            onClick={() => {
              add(product, 1);
              toast.success(`${product.name} added to cart.`);
            }}
          >
            {soldOut ? 'Sold out' : 'Add'}
          </button>
        </div>
      </div>
    </article>
  );
}
