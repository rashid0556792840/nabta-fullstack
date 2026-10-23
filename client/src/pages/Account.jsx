import { useState } from 'react';
import { api } from '../api';
import Icon from '../components/Icon';
import { Field, useConfirm } from '../components/ui';
import { LanguageToggle } from '../components/Header';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useI18n } from '../i18n/LanguageContext';
import { HTML_PATTERNS, PATTERNS, sanitize, validate } from '../utils/validation';

const ADDRESS_RULES = {
  label: [(v) => v.trim().length >= 1, 'v.label'],
  fullName: [(v) => v.trim().length >= 2, 'v.receiver'],
  phone: [(v) => PATTERNS.phone.test(v.trim()), 'v.phone'],
  city: [(v) => v.trim().length >= 2, 'v.city'],
  street: [(v) => v.trim().length >= 5, 'v.street'],
};

const EMPTY_ADDRESS = { _id: null, label: '', fullName: '', phone: '', city: '', street: '' };

/** Saved delivery addresses: add, edit and delete (up to 10). */
function Addresses() {
  const { user, setUser } = useAuth();
  const { t, join, errorText, fieldErrors } = useI18n();
  const toast = useToast();
  const [confirm, confirmDialog] = useConfirm();
  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const addresses = user.addresses || [];

  const save = async (e) => {
    e.preventDefault();
    const found = validate(form, ADDRESS_RULES, t);
    setErrors(found);
    if (Object.keys(found).length) return;
    setBusy(true);
    try {
      const body = Object.fromEntries(['label', 'fullName', 'phone', 'city', 'street'].map((k) => [k, sanitize(form[k], k === 'street' ? 160 : 80)]));
      const res = await api(form._id ? `/auth/me/addresses/${form._id}` : '/auth/me/addresses', { method: form._id ? 'PUT' : 'POST', body });
      setUser((u) => ({ ...u, addresses: res.addresses }));
      toast.success(t('address.saved'));
      setForm(null);
    } catch (err) {
      setErrors(fieldErrors(err.details));
      toast.error(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (a) => {
    if (!(await confirm(t('address.deleteConfirm', { label: a.label })))) return;
    try {
      const res = await api(`/auth/me/addresses/${a._id}`, { method: 'DELETE' });
      setUser((u) => ({ ...u, addresses: res.addresses }));
      toast.success(t('address.deleted'));
    } catch (err) {
      toast.error(errorText(err));
    }
  };

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  return (
    <section className="card">
      {confirmDialog}
      <div className="card-head">
        <h2><Icon name="pin" size={20} /> {t('address.title')}</h2>
        {!form && addresses.length < 10 && (
          <button type="button" className="btn btn-outline btn-sm" onClick={() => { setErrors({}); setForm({ ...EMPTY_ADDRESS, fullName: user.name, phone: user.phone || '' }); }}>
            <Icon name="plus" size={16} /> {t('address.add')}
          </button>
        )}
      </div>

      {addresses.length === 0 && !form && <p className="muted">{t('address.none')}</p>}
      <ul className="address-list">
        {addresses.map((a) => (
          <li key={a._id}>
            <span>
              <strong>{a.label}</strong>
              <small>{a.fullName} · <span dir="ltr">{a.phone}</span></small>
              <small>{join([a.street, a.city])}</small>
            </span>
            <span className="row-actions">
              <button type="button" className="icon-btn subtle" onClick={() => { setErrors({}); setForm({ ...a }); }} aria-label={t('common.editNamed', { name: a.label })}><Icon name="edit" size={18} /></button>
              <button type="button" className="icon-btn subtle danger" onClick={() => remove(a)} aria-label={t('common.deleteNamed', { name: a.label })}><Icon name="trash" size={18} /></button>
            </span>
          </li>
        ))}
      </ul>

      {form && (
        <form className="form sub-form" onSubmit={save} noValidate>
          <div className="form-grid">
            <Field id="a-label" label={t('address.label')} error={errors.label}>
              <input id="a-label" name="label" value={form.label} onChange={onChange} maxLength={40} placeholder={t('address.labelPlaceholder')} />
            </Field>
            <Field id="a-name" label={t('address.receiver')} error={errors.fullName}>
              <input id="a-name" name="fullName" value={form.fullName} onChange={onChange} maxLength={80} />
            </Field>
            <Field id="a-phone" label={t('address.phone')} error={errors.phone}>
              <input id="a-phone" name="phone" type="tel" dir="ltr" pattern={HTML_PATTERNS.phone} value={form.phone} onChange={onChange} maxLength={20} />
            </Field>
            <Field id="a-city" label={t('address.city')} error={errors.city}>
              <input id="a-city" name="city" value={form.city} onChange={onChange} maxLength={60} />
            </Field>
            <Field id="a-street" label={t('address.street')} error={errors.street} className="span-2">
              <input id="a-street" name="street" value={form.street} onChange={onChange} maxLength={160} />
            </Field>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>{busy ? t('common.saving') : t('common.save')}</button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setForm(null)}>{t('common.cancel')}</button>
          </div>
        </form>
      )}
    </section>
  );
}

export default function Account() {
  const { t, errorText, fieldErrors } = useI18n();
  useDocumentTitle(t('account.title'));
  const { user, setUser } = useAuth();
  const toast = useToast();

  const [profile, setProfile] = useState({ name: user.name, phone: user.phone || '' });
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState('');

  const saveProfile = async (e) => {
    e.preventDefault();
    const found = {};
    if (!PATTERNS.name.test(profile.name.trim())) found.name = t('v.name');
    if (profile.phone && !PATTERNS.phone.test(profile.phone.trim())) found.phone = t('v.phone');
    setErrors(found);
    if (Object.keys(found).length) return;
    setBusy('profile');
    try {
      const { user: updated } = await api('/auth/me', {
        method: 'PUT',
        body: { name: sanitize(profile.name, 80), phone: sanitize(profile.phone, 20) },
      });
      setUser(updated);
      toast.success(t('account.saved'));
    } catch (err) {
      setErrors(fieldErrors(err.details));
      toast.error(errorText(err));
    } finally {
      setBusy('');
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    if (!PATTERNS.password.test(pw.newPassword)) {
      setErrors({ newPassword: t('v.password') });
      return;
    }
    setBusy('pw');
    try {
      await api('/auth/me/password', { method: 'PUT', body: pw });
      setPw({ currentPassword: '', newPassword: '' });
      setErrors({});
      toast.success(t('account.passwordSaved'));
    } catch (err) {
      setErrors(fieldErrors(err.details));
      toast.error(errorText(err));
    } finally {
      setBusy('');
    }
  };

  const onProfile = (e) => setProfile((p) => ({ ...p, [e.target.name]: e.target.value }));
  const onPw = (e) => setPw((p) => ({ ...p, [e.target.name]: e.target.value }));

  return (
    <div className="container page narrow">
      <header className="page-head order-head">
        <div>
          <h1>{t('account.title')}</h1>
          <p className="muted">{user.email} · {t(`role.${user.role}`)}</p>
        </div>
        <LanguageToggle className="btn btn-outline btn-sm" />
      </header>

      <form className="card form" onSubmit={saveProfile} noValidate>
        <h2><Icon name="user" size={20} /> {t('account.profile')}</h2>
        <div className="form-grid">
          <Field id="name" label={t('auth.fullName')} error={errors.name}>
            <input id="name" name="name" required minLength={2} maxLength={80} value={profile.name} onChange={onProfile} autoComplete="name" />
          </Field>
          <Field id="phone" label={t('address.phone')} error={errors.phone}>
            <input id="phone" name="phone" type="tel" dir="ltr" pattern={HTML_PATTERNS.phone} maxLength={20} value={profile.phone} onChange={onProfile} autoComplete="tel" />
          </Field>
        </div>
        <button type="submit" className="btn btn-primary" disabled={busy === 'profile'}>{busy === 'profile' ? t('common.saving') : t('common.saveChanges')}</button>
      </form>

      {user.role === 'customer' && <Addresses />}

      <form className="card form" onSubmit={changePassword} noValidate>
        <h2><Icon name="shield" size={20} /> {t('account.password')}</h2>
        <div className="form-grid">
          <Field id="currentPassword" label={t('account.currentPassword')} error={errors.currentPassword}>
            <input id="currentPassword" name="currentPassword" type="password" required autoComplete="current-password" value={pw.currentPassword} onChange={onPw} />
          </Field>
          <Field id="newPassword" label={t('account.newPassword')} error={errors.newPassword} hint={t('auth.passwordHint')}>
            <input id="newPassword" name="newPassword" type="password" required minLength={10} autoComplete="new-password" value={pw.newPassword} onChange={onPw} />
          </Field>
        </div>
        <button type="submit" className="btn btn-outline" disabled={busy === 'pw'}>{busy === 'pw' ? t('common.saving') : t('account.updatePassword')}</button>
      </form>
    </div>
  );
}
