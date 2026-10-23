import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import Icon from '../components/Icon';
import { Field } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useCompany } from '../context/CompanyContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useI18n } from '../i18n/LanguageContext';
import { PATTERNS, sanitize, validate } from '../utils/validation';

const RULES = {
  name: [(v) => v.trim().length >= 2, 'v.yourName'],
  email: [(v) => PATTERNS.email.test(v.trim()), 'v.email'],
  subject: [(v) => v.trim().length >= 3, 'v.subject'],
  message: [(v) => v.trim().length >= 10, 'v.message'],
};

export default function Contact() {
  const { t, pick, errorText, fieldErrors } = useI18n();
  useDocumentTitle(t('nav.contact'));
  const { user } = useAuth();
  const { company, whatsappLink } = useCompany();
  const [values, setValues] = useState({ name: user?.name || '', email: user?.email || '', subject: '', message: '' });
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState({ type: '', text: '' });
  const [busy, setBusy] = useState(false);

  const onChange = (e) => setValues((v) => ({ ...v, [e.target.name]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    const found = validate(values, RULES, t);
    setErrors(found);
    if (Object.keys(found).length) return;
    setBusy(true);
    try {
      // Sanitize before sending: tags such as <script> are removed
      const clean = Object.fromEntries(Object.entries(values).map(([k, v]) => [k, sanitize(v, k === 'message' ? 2000 : 120)]));
      await api('/contact', { method: 'POST', body: clean });
      setStatus({ type: 'ok', text: user ? t('contact.sentAccount') : t('contact.sentGuest') });
      setValues((v) => ({ ...v, subject: '', message: '' }));
    } catch (err) {
      setErrors(fieldErrors(err.details));
      setStatus({ type: 'error', text: errorText(err) });
    } finally {
      setBusy(false);
    }
  };

  const address = pick(company, 'address');
  const hours = pick(company, 'hours');

  return (
    <div className="container page">
      <div className="contact-layout">
        <section>
          <p className="kicker">{t('contact.kicker')}</p>
          <h1>{t('contact.title')}</h1>
          <p className="lead-dark">{t('contact.lead')}</p>
          <ul className="contact-cards">
            {company.phone && (
              <li>
                <a href={`tel:${company.phone}`} className="contact-card">
                  <Icon name="phone" size={22} />
                  <span><small>{t('contact.call')}</small><strong dir="ltr">{company.phone}</strong></span>
                </a>
              </li>
            )}
            {whatsappLink() && (
              <li>
                <a href={whatsappLink(t('contact.whatsappHello'))} className="contact-card wa" target="_blank" rel="noopener noreferrer">
                  <Icon name="whatsapp" size={22} />
                  <span><small>{t('contact.whatsapp')}</small><strong>{t('contact.whatsappFast')}</strong></span>
                </a>
              </li>
            )}
            {address && (
              <li>
                <a href={company.mapsUrl || undefined} className="contact-card" target="_blank" rel="noopener noreferrer">
                  <Icon name="pin" size={22} />
                  <span><small>{t('contact.visit')}</small><strong>{address}</strong></span>
                </a>
              </li>
            )}
            {hours && (
              <li>
                <div className="contact-card">
                  <Icon name="clock" size={22} />
                  <span><small>{t('contact.hours')}</small><strong>{hours}</strong></span>
                </div>
              </li>
            )}
          </ul>
          {company.mapsUrl && (
            <a href={company.mapsUrl} className="btn btn-outline" target="_blank" rel="noopener noreferrer">
              <Icon name="map" size={18} /> {t('contact.openMap')}
            </a>
          )}
        </section>

        <form className="card form" onSubmit={onSubmit} noValidate>
          <h2>{t('contact.formTitle')}</h2>
          {status.text && (
            <p className={status.type === 'ok' ? 'alert alert-ok' : 'alert'} role="status">
              {status.text}{' '}
              {status.type === 'ok' && user && <Link to="/messages">{t('contact.viewMessages')}</Link>}
            </p>
          )}
          <div className="form-grid">
            <Field id="name" label={t('contact.name')} error={errors.name}>
              <input id="name" name="name" required minLength={2} maxLength={80} value={values.name} onChange={onChange} autoComplete="name" />
            </Field>
            <Field id="email" label={t('auth.email')} error={errors.email}>
              <input id="email" name="email" type="email" dir="ltr" required maxLength={120} value={values.email} onChange={onChange} autoComplete="email" />
            </Field>
          </div>
          <Field id="subject" label={t('contact.subject')} error={errors.subject}>
            <input id="subject" name="subject" required minLength={3} maxLength={120} value={values.subject} onChange={onChange} />
          </Field>
          <Field id="message" label={t('contact.message')} error={errors.message} hint={`${values.message.length}/2000`}>
            <textarea id="message" name="message" rows={6} required minLength={10} maxLength={2000} value={values.message} onChange={onChange} />
          </Field>
          <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? t('contact.sending') : t('contact.send')}</button>
        </form>
      </div>
    </div>
  );
}
