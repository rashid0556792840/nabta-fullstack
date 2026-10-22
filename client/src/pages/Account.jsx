import { useState } from 'react';
import { api } from '../api';
import { Field } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { HTML_PATTERNS, PATTERNS, sanitize } from '../utils/validation';

export default function Account() {
  useDocumentTitle('Account');
  const { user, setUser } = useAuth();
  const toast = useToast();

  const [profile, setProfile] = useState({
    name: user.name,
    phone: user.phone || '',
    fullName: user.address?.fullName || '',
    addrPhone: user.address?.phone || '',
    city: user.address?.city || '',
    street: user.address?.street || '',
  });
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState('');

  const saveProfile = async (e) => {
    e.preventDefault();
    const found = {};
    if (!PATTERNS.name.test(profile.name.trim())) found.name = 'Enter your full name (letters only).';
    if (profile.phone && !PATTERNS.phone.test(profile.phone.trim())) found.phone = 'Enter a valid phone number.';
    setErrors(found);
    if (Object.keys(found).length) return;
    setBusy('profile');
    try {
      const { user: updated } = await api('/auth/me', {
        method: 'PUT',
        body: {
          name: sanitize(profile.name, 80),
          phone: sanitize(profile.phone, 20),
          address: { fullName: sanitize(profile.fullName, 80), phone: sanitize(profile.addrPhone, 20), city: sanitize(profile.city, 60), street: sanitize(profile.street, 160) },
        },
      });
      setUser(updated);
      toast.success('Profile saved.');
    } catch (err) {
      setErrors(err.details || {});
      toast.error(err.message);
    } finally {
      setBusy('');
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    if (!PATTERNS.password.test(pw.newPassword)) {
      setErrors({ newPassword: 'Use 10+ characters with letters and numbers.' });
      return;
    }
    setBusy('pw');
    try {
      await api('/auth/me/password', { method: 'PUT', body: pw });
      setPw({ currentPassword: '', newPassword: '' });
      setErrors({});
      toast.success('Password updated.');
    } catch (err) {
      setErrors(err.details || {});
      toast.error(err.message);
    } finally {
      setBusy('');
    }
  };

  const onProfile = (e) => setProfile((p) => ({ ...p, [e.target.name]: e.target.value }));
  const onPw = (e) => setPw((p) => ({ ...p, [e.target.name]: e.target.value }));

  return (
    <div className="container page narrow">
      <header className="page-head">
        <h1>Account settings</h1>
        <p className="muted">{user.email} · {user.role === 'admin' ? 'Administrator' : 'Customer'}</p>
      </header>

      <form className="card form" onSubmit={saveProfile}>
        <h2>Profile &amp; default address</h2>
        <div className="form-grid">
          <Field id="name" label="Full name" error={errors.name}>
            <input id="name" name="name" required minLength={2} maxLength={80} value={profile.name} onChange={onProfile} />
          </Field>
          <Field id="phone" label="Phone" error={errors.phone}>
            <input id="phone" name="phone" type="tel" pattern={HTML_PATTERNS.phone} maxLength={20} value={profile.phone} onChange={onProfile} />
          </Field>
          <Field id="fullName" label="Receiver name">
            <input id="fullName" name="fullName" maxLength={80} value={profile.fullName} onChange={onProfile} />
          </Field>
          <Field id="addrPhone" label="Delivery phone">
            <input id="addrPhone" name="addrPhone" type="tel" pattern={HTML_PATTERNS.phone} maxLength={20} value={profile.addrPhone} onChange={onProfile} />
          </Field>
          <Field id="city" label="City">
            <input id="city" name="city" maxLength={60} value={profile.city} onChange={onProfile} />
          </Field>
          <Field id="street" label="Street address">
            <input id="street" name="street" maxLength={160} value={profile.street} onChange={onProfile} />
          </Field>
        </div>
        <button type="submit" className="btn btn-primary" disabled={busy === 'profile'}>{busy === 'profile' ? 'Saving…' : 'Save changes'}</button>
      </form>

      <form className="card form" onSubmit={changePassword}>
        <h2>Change password</h2>
        <div className="form-grid">
          <Field id="currentPassword" label="Current password" error={errors.currentPassword}>
            <input id="currentPassword" name="currentPassword" type="password" required autoComplete="current-password" value={pw.currentPassword} onChange={onPw} />
          </Field>
          <Field id="newPassword" label="New password" error={errors.newPassword} hint="10+ characters with letters and numbers.">
            <input id="newPassword" name="newPassword" type="password" required minLength={10} autoComplete="new-password" value={pw.newPassword} onChange={onPw} />
          </Field>
        </div>
        <button type="submit" className="btn btn-outline" disabled={busy === 'pw'}>{busy === 'pw' ? 'Updating…' : 'Update password'}</button>
      </form>
    </div>
  );
}
