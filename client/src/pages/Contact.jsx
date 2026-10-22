import { useState } from 'react';
import { api } from '../api';
import { Field } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { PATTERNS, sanitize, validate } from '../utils/validation';

const RULES = {
  name: [(v) => v.trim().length >= 2, 'Enter your name.'],
  email: [(v) => PATTERNS.email.test(v.trim()), 'Enter a valid email address.'],
  subject: [(v) => v.trim().length >= 3, 'Enter a subject.'],
  message: [(v) => v.trim().length >= 10, 'Message needs at least 10 characters.'],
};

export default function Contact() {
  useDocumentTitle('Contact');
  const { user } = useAuth();
  const [values, setValues] = useState({ name: user?.name || '', email: user?.email || '', subject: '', message: '' });
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState({ type: '', text: '' });
  const [busy, setBusy] = useState(false);

  const onChange = (e) => setValues((v) => ({ ...v, [e.target.name]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    const found = validate(values, RULES);
    setErrors(found);
    if (Object.keys(found).length) return;
    setBusy(true);
    try {
      // Sanitize before sending: tags such as <script> are removed
      const clean = Object.fromEntries(Object.entries(values).map(([k, v]) => [k, sanitize(v, k === 'message' ? 2000 : 120)]));
      const res = await api('/contact', { method: 'POST', body: clean });
      setStatus({ type: 'ok', text: res.message });
      setValues((v) => ({ ...v, subject: '', message: '' }));
    } catch (err) {
      setErrors(err.details || {});
      setStatus({ type: 'error', text: err.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container page">
      <div className="contact-layout">
        <section>
          <p className="kicker">We are here to help</p>
          <h1>Contact us</h1>
          <p className="lead-dark">Questions about plant care, an order, or bulk gifting? Send us a message and our team will reply by email.</p>
          <ul className="contact-list">
            <li><span aria-hidden="true">📍</span> Riyadh, Saudi Arabia</li>
            <li><span aria-hidden="true">🕘</span> Sat-Thu, 9:00-21:00</li>
            <li><span aria-hidden="true">✉️</span> Replies within one working day</li>
          </ul>
        </section>

        <form className="card form" onSubmit={onSubmit}>
          {status.text && <p className={status.type === 'ok' ? 'alert alert-ok' : 'alert'} role="status">{status.text}</p>}
          <div className="form-grid">
            <Field id="name" label="Name" error={errors.name}>
              <input id="name" name="name" required minLength={2} maxLength={80} value={values.name} onChange={onChange} autoComplete="name" />
            </Field>
            <Field id="email" label="Email" error={errors.email}>
              <input id="email" name="email" type="email" required maxLength={120} value={values.email} onChange={onChange} autoComplete="email" />
            </Field>
          </div>
          <Field id="subject" label="Subject" error={errors.subject}>
            <input id="subject" name="subject" required minLength={3} maxLength={120} value={values.subject} onChange={onChange} />
          </Field>
          <Field id="message" label="Message" error={errors.message} hint={`${values.message.length}/2000`}>
            <textarea id="message" name="message" rows={6} required minLength={10} maxLength={2000} value={values.message} onChange={onChange} />
          </Field>
          <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Sending…' : 'Send message'}</button>
        </form>
      </div>
    </div>
  );
}
