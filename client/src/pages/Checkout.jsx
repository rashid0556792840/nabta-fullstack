import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { EmptyState, Field } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { deliveryFor, formatMoney } from '../utils/format';
import { HTML_PATTERNS, PATTERNS, sanitize, validate } from '../utils/validation';

const RULES = {
  fullName: [(v) => v.trim().length >= 2, 'Enter the receiver name.'],
  phone: [(v) => PATTERNS.phone.test(v.trim()), 'Enter a valid phone number, e.g. +966 50 123 4567.'],
  city: [(v) => v.trim().length >= 2, 'Enter the city.'],
  street: [(v) => v.trim().length >= 5, 'Enter the full street address.'],
};

export default function Checkout() {
  useDocumentTitle('Checkout');
  const { user, setUser } = useAuth();
  const { items, subtotal, clear } = useCart();
  const toast = useToast();
  const navigate = useNavigate();

  const [values, setValues] = useState({
    fullName: user.address?.fullName || user.name,
    phone: user.address?.phone || user.phone || '',
    city: user.address?.city || '',
    street: user.address?.street || '',
    notes: '',
    saveAddress: true,
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  if (items.length === 0) {
    return (
      <div className="container page">
        <EmptyState title="Nothing to check out" action={<Link to="/shop" className="btn btn-primary">Browse products</Link>} />
      </div>
    );
  }

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setValues((v) => ({ ...v, [name]: type === 'checkbox' ? checked : value }));
    if (errors[name]) setErrors((er) => ({ ...er, [name]: undefined }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const found = validate(values, RULES);
    setErrors(found);
    if (Object.keys(found).length) return;

    setSubmitting(true);
    try {
      const shippingAddress = {
        fullName: sanitize(values.fullName, 80),
        phone: sanitize(values.phone, 20),
        city: sanitize(values.city, 60),
        street: sanitize(values.street, 160),
        notes: sanitize(values.notes, 300),
      };
      const { order } = await api('/orders', {
        method: 'POST',
        body: { items: items.map((i) => ({ product: i._id, quantity: i.quantity })), shippingAddress, saveAddress: values.saveAddress },
      });
      if (values.saveAddress) {
        const { fullName, phone, city, street } = shippingAddress;
        setUser((u) => ({ ...u, address: { fullName, phone, city, street } }));
      }
      clear();
      toast.success(`Order ${order.orderNumber} placed!`);
      navigate(`/orders/${order._id}`, { replace: true });
    } catch (err) {
      if (err.details) setErrors(err.details);
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const delivery = deliveryFor(subtotal);

  return (
    <div className="container page">
      <header className="page-head">
        <h1>Checkout</h1>
      </header>
      <div className="cart-layout">
        <form className="card form" onSubmit={onSubmit} noValidate={false}>
          <h2>Delivery details</h2>
          <div className="form-grid">
            <Field id="fullName" label="Receiver name" error={errors.fullName}>
              <input id="fullName" name="fullName" value={values.fullName} onChange={onChange} required minLength={2} maxLength={80} autoComplete="name" />
            </Field>
            <Field id="phone" label="Phone" error={errors.phone}>
              <input id="phone" name="phone" type="tel" value={values.phone} onChange={onChange} required pattern={HTML_PATTERNS.phone} maxLength={20} autoComplete="tel" placeholder="+966 50 123 4567" />
            </Field>
            <Field id="city" label="City" error={errors.city}>
              <input id="city" name="city" value={values.city} onChange={onChange} required minLength={2} maxLength={60} autoComplete="address-level2" />
            </Field>
            <Field id="street" label="Street address" error={errors.street}>
              <input id="street" name="street" value={values.street} onChange={onChange} required minLength={5} maxLength={160} autoComplete="street-address" />
            </Field>
          </div>
          <Field id="notes" label="Order notes (optional)">
            <textarea id="notes" name="notes" rows={3} value={values.notes} onChange={onChange} maxLength={300} />
          </Field>
          <label className="check">
            <input type="checkbox" name="saveAddress" checked={values.saveAddress} onChange={onChange} />
            Save this address for next time
          </label>

          <fieldset className="payment">
            <legend>Payment method</legend>
            <label className="radio"><input type="radio" checked readOnly /> Cash on delivery</label>
          </fieldset>

          <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
            {submitting ? 'Placing order…' : `Place order · ${formatMoney(subtotal + delivery)}`}
          </button>
        </form>

        <aside className="summary" aria-label="Order summary">
          <h2>{items.length} item{items.length === 1 ? '' : 's'}</h2>
          <ul className="summary-items">
            {items.map((i) => (
              <li key={i._id}><span>{i.name} × {i.quantity}</span><span>{formatMoney(i.price * i.quantity)}</span></li>
            ))}
          </ul>
          <dl>
            <div><dt>Subtotal</dt><dd>{formatMoney(subtotal)}</dd></div>
            <div><dt>Delivery</dt><dd>{delivery === 0 ? 'Free' : formatMoney(delivery)}</dd></div>
            <div className="summary-total"><dt>Total</dt><dd>{formatMoney(subtotal + delivery)}</dd></div>
          </dl>
        </aside>
      </div>
    </div>
  );
}
