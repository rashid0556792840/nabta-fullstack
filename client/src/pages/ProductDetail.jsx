import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ErrorState, Loading, ProductImage } from '../components/ui';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useFavorites } from '../context/FavoritesContext';
import { useToast } from '../context/ToastContext';
import { useFetch } from '../hooks/useFetch';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { formatMoney } from '../utils/format';

export default function ProductDetail() {
  const { id } = useParams();
  const { data, loading, error, reload } = useFetch(`/products/${id}`);
  const product = data?.product;
  useDocumentTitle(product?.name || 'Product');

  const [qty, setQty] = useState(1);
  const { add } = useCart();
  const { user } = useAuth();
  const { isFavorite, toggle } = useFavorites();
  const toast = useToast();
  const navigate = useNavigate();

  if (loading) return <Loading />;
  if (error) return <div className="container page"><ErrorState error={error} onRetry={reload} /></div>;
  if (!product) return null;

  const soldOut = product.stock <= 0;
  const max = Math.min(50, product.stock);

  return (
    <div className="container page">
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link to="/shop">Shop</Link> <span aria-hidden="true">/</span>{' '}
        <Link to={`/shop?category=${product.category?._id}`}>{product.category?.name}</Link> <span aria-hidden="true">/</span>{' '}
        <span aria-current="page">{product.name}</span>
      </nav>

      <article className="detail">
        <div className="detail-media">
          <ProductImage src={product.imageUrl} alt={product.name} />
        </div>
        <div className="detail-info">
          <p className="product-category">{product.category?.name}</p>
          <h1>{product.name}</h1>
          <p className="detail-price">{formatMoney(product.price)}</p>
          <p className="detail-desc">{product.description || 'A little green makes a big difference.'}</p>
          <p className={`stock ${soldOut ? 'out' : product.stock <= 5 ? 'low' : ''}`}>
            {soldOut ? 'Out of stock' : product.stock <= 5 ? `Only ${product.stock} left` : 'In stock'}
          </p>

          <form
            className="detail-actions"
            onSubmit={(e) => {
              e.preventDefault();
              add(product, qty);
              toast.success(`${qty} × ${product.name} added to cart.`);
            }}
          >
            <label htmlFor="qty" className="sr-only">Quantity</label>
            <div className="qty">
              <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease quantity" disabled={soldOut}>−</button>
              <input
                id="qty"
                type="number"
                min="1"
                max={max || 1}
                value={qty}
                disabled={soldOut}
                onChange={(e) => setQty(Math.max(1, Math.min(max, Number(e.target.value) || 1)))}
              />
              <button type="button" onClick={() => setQty((q) => Math.min(max, q + 1))} aria-label="Increase quantity" disabled={soldOut}>+</button>
            </div>
            <button type="submit" className="btn btn-primary" disabled={soldOut}>Add to cart</button>
            <button
              type="button"
              className="btn btn-outline"
              onClick={async () => {
                if (!user) return navigate('/login', { state: { from: `/product/${id}` } });
                try {
                  const added = await toggle(product._id);
                  toast.success(added ? 'Saved to favourites.' : 'Removed from favourites.');
                } catch (err) {
                  toast.error(err.message);
                }
              }}
            >
              {isFavorite(product._id) ? '♥ Saved' : '♡ Save'}
            </button>
          </form>

          <ul className="perks">
            <li>🚚 Free delivery over SAR 200</li>
            <li>💵 Cash on delivery</li>
            <li>🌱 Care tips with every plant</li>
          </ul>
        </div>
      </article>
    </div>
  );
}
