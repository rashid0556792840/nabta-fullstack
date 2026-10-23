import { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { Field } from '../components/ui';
import { homeFor, useAuth } from '../context/AuthContext';
import { useCompany } from '../context/CompanyContext';
import { useToast } from '../context/ToastContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useI18n } from '../i18n/LanguageContext';
import { PATTERNS, sanitize, validate } from '../utils/validation';

const RULES = {
  email: [(v) => PATTERNS.email.test(v.trim()), 'v.email'],
  password: [(v) => v.length > 0, 'v.passwordRequired'],
};

export default function Login() {
  const { t, errorText } = useI18n();
  useDocumentTitle(t('nav.signIn'));
  const { user, signIn } = useAuth();
  const { logo } = useCompany();
  const toast = useToast();
  const location = useLocation();
  const [values, setValues] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  // Once signed in, leave the login page: customers go back where they were, staff and drivers to their screens
  if (user) {
    const target = user.role === 'customer' ? location.state?.from || '/' : homeFor(user);
    return <Navigate to={target} replace />;
  }

  const onChange = (e) => setValues((v) => ({ ...v, [e.target.name]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    const found = validate(values, RULES, t);
    setErrors(found);
    setFormError('');
    if (Object.keys(found).length) return;
    setBusy(true);
    try {
      const u = await signIn(sanitize(values.email, 120), values.password);
      toast.success(t('auth.welcomeBack', { name: u.name.split(' ')[0] }));
      // the <Navigate> above redirects as soon as the user is set
    } catch (err) {
      setFormError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container page auth-page">
      <form className="card form auth-card" onSubmit={onSubmit} noValidate>
        <img src={logo} alt="" className="auth-logo" />
        <h1>{t('auth.loginTitle')}</h1>
        <p className="muted">{t('auth.loginText')}</p>
        {formError && <p className="alert" role="alert">{formError}</p>}
        <Field id="email" label={t('auth.email')} error={errors.email}>
          <input id="email" name="email" type="email" dir="ltr" required maxLength={120} autoComplete="email" value={values.email} onChange={onChange} />
        </Field>
        <Field id="password" label={t('auth.password')} error={errors.password}>
          <input id="password" name="password" type="password" dir="ltr" required autoComplete="current-password" value={values.password} onChange={onChange} />
        </Field>
        <button type="submit" className="btn btn-primary btn-block" disabled={busy}>{busy ? t('auth.signingIn') : t('nav.signIn')}</button>
        <p className="muted center">{t('auth.newHere')} <Link to="/register" state={location.state}>{t('auth.createAccount')}</Link></p>
        <details className="demo-hint">
          <summary>{t('auth.demo')}</summary>
          <p dir="ltr">
            Customer: demo@nabta.local / DemoPass123<br />
            Supervisor: supervisor@nabta.local / SuperPass123<br />
            Driver: driver@nabta.local / DriverPass123<br />
            Admin: ADMIN_EMAIL / ADMIN_PASSWORD (server/.env)
          </p>
        </details>
      </form>
    </div>
  );
}
