import { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { Field } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { HTML_PATTERNS, PATTERNS, sanitize, validate } from '../utils/validation';

const RULES = {
  name: [(v) => PATTERNS.name.test(v.trim()), 'Enter your full name (letters only).'],
  email: [(v) => PATTERNS.email.test(v.trim()), 'Enter a valid email address.'],
  password: [(v) => PATTERNS.password.test(v), 'Use 10+ characters with letters and numbers.'],
  confirm: [(v, all) => v === all.password && v.length > 0, 'Passwords do not match.'],
  terms: [(v) => v === true, 'Please accept the terms.'],
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
  useDocumentTitle('Create account');
  const { user, register } = useAuth();
  const toast = useToast();
  const location = useLocation();
  const [values, setValues] = useState({ name: '', email: '', password: '', confirm: '', terms: false });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={location.state?.from || '/'} replace />;

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setValues((v) => ({ ...v, [name]: type === 'checkbox' ? checked : value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const found = validate(values, RULES);
    setErrors(found);
    if (Object.keys(found).length) return;
    setBusy(true);
    try {
      await register({ name: sanitize(values.name, 80), email: sanitize(values.email, 120), password: values.password });
      toast.success('Account created. Welcome to Nabta!');
      // the <Navigate> at the top redirects as soon as the user is set
    } catch (err) {
      setErrors(err.details && Object.keys(err.details).length ? err.details : { email: err.message });
    } finally {
      setBusy(false);
    }
  };

  const score = strength(values.password);

  return (
    <div className="container page auth-page">
      <form className="card form auth-card" onSubmit={onSubmit}>
        <h1>Create your account</h1>
        <p className="muted">It takes less than a minute.</p>
        <Field id="name" label="Full name" error={errors.name}>
          <input id="name" name="name" required minLength={2} maxLength={80} autoComplete="name" value={values.name} onChange={onChange} />
        </Field>
        <Field id="email" label="Email address" error={errors.email}>
          <input id="email" name="email" type="email" required maxLength={120} autoComplete="email" value={values.email} onChange={onChange} />
        </Field>
        <Field id="password" label="Password" error={errors.password} hint="At least 10 characters, with letters and numbers.">
          <input
            id="password"
            name="password"
            type="password"
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
          <div className="meter" aria-label={`Password strength ${score} of 4`}>
            {[1, 2, 3, 4].map((n) => <span key={n} className={n <= score ? `on s${score}` : ''} />)}
          </div>
        )}
        <Field id="confirm" label="Confirm password" error={errors.confirm}>
          <input id="confirm" name="confirm" type="password" required autoComplete="new-password" value={values.confirm} onChange={onChange} />
        </Field>
        <label className={`check ${errors.terms ? 'has-error' : ''}`}>
          <input type="checkbox" name="terms" checked={values.terms} onChange={onChange} required />
          I agree to the store terms and privacy policy
        </label>
        {errors.terms && <p className="field-error">{errors.terms}</p>}
        <button type="submit" className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Creating account…' : 'Create account'}</button>
        <p className="muted center">Already have an account? <Link to="/login" state={location.state}>Sign in</Link></p>
      </form>
    </div>
  );
}
