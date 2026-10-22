import { Link, useNavigate } from 'react-router-dom';
import { EmptyState, ProductImage } from '../components/ui';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { FREE_DELIVERY_FROM, deliveryFor, formatMoney } from '../utils/format';

export default function Cart() {
  useDocumentTitle('Cart');
  const { items, subtotal, setQuantity, remove, clear } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const delivery = deliveryFor(subtotal);

  if (items.length === 0) {
    return (
      <div className="container page">
        <EmptyState
          title="Your cart is taking a little rest"
          text="Explore the catalogue and add something green."
          action={<Link to="/shop" className="btn btn-primary">Start shopping</Link>}
        />
      </div>
    );
  }

  return (
    <div className="container page">
      <header className="page-head">
        <h1>Your cart</h1>
      </header>
      <div className="cart-layout">
        <section aria-label="Cart items">
          <ul className="cart-list">
            {items.map((item) => (
              <li key={item._id} className="cart-item">
                <ProductImage src={item.imageUrl} alt={item.name} className="cart-thumb" />
                <div className="cart-item-info">
                  <Link to={`/product/${item._id}`}><strong>{item.name}</strong></Link>
                  <span className="muted">{formatMoney(item.price)} each</span>
                </div>
                <div className="qty qty-sm">
                  <button type="button" onClick={() => setQuantity(item._id, item.quantity - 1)} aria-label={`Decrease ${item.name}`}>−</button>
                  <span aria-live="polite">{item.quantity}</span>
                  <button
                    type="button"
                    onClick={() => setQuantity(item._id, item.quantity + 1)}
                    disabled={item.quantity >= item.stock}
                    aria-label={`Increase ${item.name}`}
                  >
                    +
                  </button>
                </div>
                <strong className="cart-line">{formatMoney(item.price * item.quantity)}</strong>
                <button type="button" className="link-btn" onClick={() => remove(item._id)}>Remove</button>
              </li>
            ))}
          </ul>
          <button type="button" className="link-btn" onClick={clear}>Empty cart</button>
        </section>

        <aside className="summary" aria-label="Order summary">
          <h2>Order summary</h2>
          <dl>
            <div><dt>Subtotal</dt><dd>{formatMoney(subtotal)}</dd></div>
            <div><dt>Delivery</dt><dd>{delivery === 0 ? 'Free' : formatMoney(delivery)}</dd></div>
            <div className="summary-total"><dt>Total</dt><dd>{formatMoney(subtotal + delivery)}</dd></div>
          </dl>
          {subtotal < FREE_DELIVERY_FROM && (
            <p className="note">Add {formatMoney(FREE_DELIVERY_FROM - subtotal)} more for free delivery.</p>
          )}
          <button
            type="button"
            className="btn btn-primary btn-block"
            onClick={() => navigate(user ? '/checkout' : '/login', { state: { from: '/checkout' } })}
          >
            {user ? 'Continue to checkout' : 'Sign in to checkout'}
          </button>
          <p className="muted small">Prices and stock are confirmed by the server when you place the order.</p>
        </aside>
      </div>
    </div>
  );
}
