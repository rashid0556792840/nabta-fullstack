import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import Icon from '../components/Icon';
import { EmptyState, Field } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useCompany } from '../context/CompanyContext';
import { useToast } from '../context/ToastContext';
import { useFetch } from '../hooks/useFetch';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useI18n } from '../i18n/LanguageContext';
import { HTML_PATTERNS, PATTERNS, sanitize, validate } from '../utils/validation';

const RULES = {
  fullName: [(v) => v.trim().length >= 2, 'v.receiver'],
  phone: [(v) => PATTERNS.phone.test(v.trim()), 'v.phone'],
  city: [(v) => v.trim().length >= 2, 'v.city'],
  street: [(v) => v.trim().length >= 5, 'v.street'],
};

const NEW = 'new';

export default function Checkout() {
  const { t, pick, money, lang, join, errorText, fieldErrors } = useI18n();
  useDocumentTitle(t('checkout.title'));
  const { user, setUser } = useAuth();
  const { items, subtotal, clear } = useCart();
  const { deliveryFor } = useCompany();
  const toast = useToast();
  const navigate = useNavigate();
  const payments = useFetch('/payments/methods');

  const saved = user.addresses || [];
  const [choice, setChoice] = useState(saved.length ? saved[0]._id : NEW);
  const [values, setValues] = useState({
    fullName: user.address?.fullName || user.name,
    phone: user.address?.phone || user.phone || '',
    city: user.address?.city || (lang === 'ar' ? 'المدينة المنورة' : 'Madinah'),
    street: user.address?.street || '',
    saveAs: '',
  });
  const [notes, setNotes] = useState('');
  const [payment, setPayment] = useState('cash_on_delivery');
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  if (items.length === 0) {
    return (
      <div className="container page">
        <EmptyState icon="cart" title={t('checkout.nothing')} action={<Link to="/shop" className="btn btn-primary">{t('cart.startShopping')}</Link>} />
      </div>
    );
  }

  const onChange = (e) => {
    const { name, value } = e.target;
    setValues((v) => ({ ...v, [name]: value }));
    if (errors[name]) setErrors((er) => ({ ...er, [name]: undefined }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const address = choice === NEW ? values : saved.find((a) => a._id === choice);
    const found = choice === NEW ? validate(values, RULES, t) : {};
    setErrors(found);
    if (Object.keys(found).length || !address) return;

    setSubmitting(true);
    try {
      const shippingAddress = {
        fullName: sanitize(address.fullName, 80),
        phone: sanitize(address.phone, 20),
        city: sanitize(address.city, 60),
        street: sanitize(address.street, 160),
        notes: sanitize(notes, 300),
      };
      const { order } = await api('/orders', {
        method: 'POST',
        body: {
          items: items.map((i) => ({ product: i._id, quantity: i.quantity })),
          shippingAddress,
          paymentMethod: payment,
          saveAs: choice === NEW ? sanitize(values.saveAs, 40) : '',
        },
      });
      // Refresh the profile so the new default / saved address shows next time
      api('/auth/me').then((d) => setUser(d.user)).catch(() => {});
      clear();
      toast.success(t('checkout.placed', { number: order.orderNumber }));
      navigate(`/orders/${order._id}`, { replace: true, state: { justPlaced: true } });
    } catch (err) {
      if (err.details) setErrors(fieldErrors(err.details));
      toast.error(errorText(err));
    } finally {
      setSubmitting(false);
    }
  };

  const delivery = deliveryFor(subtotal);

  return (
    <div className="container page">
      <header className="page-head">
        <h1>{t('checkout.title')}</h1>
      </header>
      <div className="cart-layout">
        <form className="card form" onSubmit={onSubmit} noValidate>
          <h2><Icon name="pin" size={20} /> {t('checkout.deliverTo')}</h2>

          <div className="address-options" role="radiogroup" aria-label={t('checkout.deliverTo')}>
            {saved.map((a) => (
              <label key={a._id} className={`address-option ${choice === a._id ? 'on' : ''}`}>
                <input type="radio" name="address" value={a._id} checked={choice === a._id} onChange={() => setChoice(a._id)} />
                <span>
                  <strong>{a.label}</strong>
                  <small>{a.fullName} · <span dir="ltr">{a.phone}</span></small>
                  <small>{join([a.street, a.city])}</small>
                </span>
              </label>
            ))}
            <label className={`address-option ${choice === NEW ? 'on' : ''}`}>
              <input type="radio" name="address" value={NEW} checked={choice === NEW} onChange={() => setChoice(NEW)} />
              <span><strong><Icon name="plus" size={16} /> {t('checkout.newAddress')}</strong></span>
            </label>
          </div>

          {choice === NEW && (
            <div className="form-grid">
              <Field id="fullName" label={t('address.receiver')} error={errors.fullName}>
                <input id="fullName" name="fullName" value={values.fullName} onChange={onChange} required minLength={2} maxLength={80} autoComplete="name" />
              </Field>
              <Field id="phone" label={t('address.phone')} error={errors.phone}>
                <input id="phone" name="phone" type="tel" dir="ltr" value={values.phone} onChange={onChange} required pattern={HTML_PATTERNS.phone} maxLength={20} autoComplete="tel" placeholder="05XXXXXXXX" />
              </Field>
              <Field id="city" label={t('address.city')} error={errors.city}>
                <input id="city" name="city" value={values.city} onChange={onChange} required minLength={2} maxLength={60} autoComplete="address-level2" />
              </Field>
              <Field id="street" label={t('address.street')} error={errors.street} hint={t('address.streetHint')}>
                <input id="street" name="street" value={values.street} onChange={onChange} required minLength={5} maxLength={160} autoComplete="street-address" />
              </Field>
              <Field id="saveAs" label={t('checkout.saveAs')} hint={t('checkout.saveAsHint')} className="span-2">
                <input id="saveAs" name="saveAs" value={values.saveAs} onChange={onChange} maxLength={40} placeholder={t('address.labelPlaceholder')} />
              </Field>
            </div>
          )}

          <Field id="notes" label={t('checkout.notes')}>
            <textarea id="notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={300} placeholder={t('checkout.notesPlaceholder')} />
          </Field>

          <fieldset className="payment">
            <legend><Icon name="cash" size={20} /> {t('checkout.payment')}</legend>
            <div className="pay-grid">
              {(payments.data?.methods || [{ id: 'cash_on_delivery', nameEn: 'Cash on delivery', nameAr: 'الدفع عند الاستلام', enabled: true }]).map((m) => (
                <label key={m.id} className={`pay-option ${payment === m.id ? 'on' : ''} ${m.enabled ? '' : 'disabled'}`}>
                  <input type="radio" name="payment" value={m.id} checked={payment === m.id} disabled={!m.enabled} onChange={() => setPayment(m.id)} />
                  <span>{pick(m)}</span>
                  {!m.enabled && <small className="soon">{t('checkout.soon')}</small>}
                </label>
              ))}
            </div>
            <p className="field-hint">{t('checkout.codHint')}</p>
          </fieldset>

          <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={submitting}>
            {submitting ? t('checkout.placing') : t('checkout.place', { total: money(subtotal + delivery) })}
          </button>
        </form>

        <aside className="summary" aria-label={t('cart.summary')}>
          <h2>{t('checkout.itemsCount', { count: items.length })}</h2>
          <ul className="summary-items">
            {items.map((i) => (
              <li key={i._id}><span>{pick(i)} × {i.quantity}</span><span>{money(i.price * i.quantity)}</span></li>
            ))}
          </ul>
          <dl>
            <div><dt>{t('cart.subtotal')}</dt><dd>{money(subtotal)}</dd></div>
            <div><dt>{t('cart.delivery')}</dt><dd>{delivery === 0 ? t('cart.free') : money(delivery)}</dd></div>
            <div className="summary-total"><dt>{t('cart.total')}</dt><dd>{money(subtotal + delivery)}</dd></div>
          </dl>
        </aside>
      </div>
    </div>
  );
}
