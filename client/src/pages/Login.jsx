import { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { Field } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { PATTERNS, sanitize, validate } from '../utils/validation';

const RULES = {
  email: [(v) => PATTERNS.email.test(v.trim()), 'Enter a valid email address.'],
  password: [(v) => v.length > 0, 'Enter your password.'],
};

export default function Login() {
  useDocumentTitle('Sign in');
  const { user, signIn } = useAuth();
  const toast = useToast();
  const location = useLocation();
  const [values, setValues] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  // Once signed in, leave the login page (admins go to the dashboard)
  if (user) return <Navigate to={location.state?.from || (user.role === 'admin' ? '/admin' : '/')} replace />;

  const onChange = (e) => setValues((v) => ({ ...v, [e.target.name]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    const found = validate(values, RULES);
    setErrors(found);
    setFormError('');
    if (Object.keys(found).length) return;
    setBusy(true);
    try {
      const u = await signIn(sanitize(values.email, 120), values.password);
      toast.success(`Welcome back, ${u.name.split(' ')[0]}!`);
      // the <Navigate> above redirects as soon as the user is set
    } catch (err) {
      setFormError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container page auth-page">
      <form className="card form auth-card" onSubmit={onSubmit}>
        <h1>Welcome back</h1>
        <p className="muted">Sign in to place orders and track deliveries.</p>
        {formError && <p className="alert" role="alert">{formError}</p>}
        <Field id="email" label="Email address" error={errors.email}>
          <input id="email" name="email" type="email" required maxLength={120} autoComplete="email" value={values.email} onChange={onChange} />
        </Field>
        <Field id="password" label="Password" error={errors.password}>
          <input id="password" name="password" type="password" required autoComplete="current-password" value={values.password} onChange={onChange} />
        </Field>
        <button type="submit" className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        <p className="muted center">New to Nabta? <Link to="/register" state={location.state}>Create an account</Link></p>
        <details className="demo-hint">
          <summary>Demo accounts</summary>
          <p>Customer: demo@nabta.local / DemoPass123<br />Admin: the ADMIN_EMAIL / ADMIN_PASSWORD from server/.env</p>
        </details>
      </form>
    </div>
  );
}
