import { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { Field } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useI18n } from '../i18n/LanguageContext';
import { HTML_PATTERNS, PATTERNS, sanitize, validate } from '../utils/validation';

const RULES = {
  name: [(v) => PATTERNS.name.test(v.trim()), 'v.name'],
  email: [(v) => PATTERNS.email.test(v.trim()), 'v.email'],
  phone: [(v) => !v.trim() || PATTERNS.phone.test(v.trim()), 'v.phone'],
  password: [(v) => PATTERNS.password.test(v), 'v.password'],
  confirm: [(v, all) => v === all.password && v.length > 0, 'v.confirm'],
  terms: [(v) => v === true, 'v.terms'],
};

/** Simple password strength meter: counts the kinds of characters used */
function strength(pw) {
  let score = 0;
  if (pw.length >= 10) score += 1;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score += 1;
  if (/\d/.test(pw)) score += 1;
  if (/[^A-Za-z0-9]/.test(pw)) score += 1;
  return score;
}

export default function Register() {
  const { t, lang, errorText, fieldErrors } = useI18n();
  useDocumentTitle(t('auth.createAccount'));
  const { user, register } = useAuth();
  const toast = useToast();
  const location = useLocation();
  const [values, setValues] = useState({ name: '', email: '', phone: '', password: '', confirm: '', terms: false });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={location.state?.from || '/'} replace />;

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setValues((v) => ({ ...v, [name]: type === 'checkbox' ? checked : value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const found = validate(values, RULES, t);
    setErrors(found);
    if (Object.keys(found).length) return;
    setBusy(true);
    try {
      await register({
        name: sanitize(values.name, 80),
        email: sanitize(values.email, 120),
        phone: sanitize(values.phone, 20),
        password: values.password,
        language: lang,
      });
      toast.success(t('auth.welcomeNew'));
      // the <Navigate> at the top redirects as soon as the user is set
    } catch (err) {
      setErrors(err.details && Object.keys(err.details).length ? fieldErrors(err.details) : { email: errorText(err) });
    } finally {
      setBusy(false);
    }
  };

  const score = strength(values.password);

  return (
    <div className="container page auth-page">
      <form className="card form auth-card" onSubmit={onSubmit} noValidate>
        <h1>{t('auth.registerTitle')}</h1>
        <p className="muted">{t('auth.registerText')}</p>
        <Field id="name" label={t('auth.fullName')} error={errors.name}>
          <input id="name" name="name" required minLength={2} maxLength={80} autoComplete="name" value={values.name} onChange={onChange} />
        </Field>
        <Field id="email" label={t('auth.email')} error={errors.email}>
          <input id="email" name="email" type="email" dir="ltr" required maxLength={120} autoComplete="email" value={values.email} onChange={onChange} />
        </Field>
        <Field id="phone" label={t('auth.phoneOptional')} error={errors.phone}>
          <input id="phone" name="phone" type="tel" dir="ltr" pattern={HTML_PATTERNS.phone} maxLength={20} autoComplete="tel" placeholder="05XXXXXXXX" value={values.phone} onChange={onChange} />
        </Field>
        <Field id="password" label={t('auth.password')} error={errors.password} hint={t('auth.passwordHint')}>
          <input
            id="password"
            name="password"
            type="password"
            dir="ltr"
            required
            minLength={10}
            maxLength={72}
            pattern={HTML_PATTERNS.password}
            autoComplete="new-password"
            value={values.password}
            onChange={onChange}
          />
        </Field>
        {values.password && (
          <div className="meter" role="img" aria-label={t('auth.strength', { score })}>
            {[1, 2, 3, 4].map((n) => <span key={n} className={n <= score ? `on s${score}` : ''} />)}
          </div>
        )}
        <Field id="confirm" label={t('auth.confirm')} error={errors.confirm}>
          <input id="confirm" name="confirm" type="password" dir="ltr" required autoComplete="new-password" value={values.confirm} onChange={onChange} />
        </Field>
        <label className={`check ${errors.terms ? 'has-error' : ''}`}>
          <input type="checkbox" name="terms" checked={values.terms} onChange={onChange} required />
          {t('auth.terms')}
        </label>
        {errors.terms && <p className="field-error">{errors.terms}</p>}
        <button type="submit" className="btn btn-primary btn-block" disabled={busy}>{busy ? t('auth.creating') : t('auth.createAccount')}</button>
        <p className="muted center">{t('auth.haveAccount')} <Link to="/login" state={location.state}>{t('nav.signIn')}</Link></p>
      </form>
    </div>
  );
}
