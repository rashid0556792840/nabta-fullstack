// Admin → Company: everything customers see about the business (name, logo, phone, WhatsApp,
// address, map, social links, opening hours, delivery fee). Saved in MongoDB, shown across the site.
import { useEffect, useState } from 'react';
import { api } from '../../api';
import Icon from '../../components/Icon';
import ImageUpload from '../../components/ImageUpload';
import { Field, Loading } from '../../components/ui';
import { BUNDLED_LOGO, useCompany } from '../../context/CompanyContext';
import { useToast } from '../../context/ToastContext';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useI18n } from '../../i18n/LanguageContext';

const FIELDS = [
  'nameAr', 'nameEn', 'taglineAr', 'taglineEn', 'phone', 'whatsapp', 'email', 'addressAr', 'addressEn', 'mapsUrl',
  'hoursAr', 'hoursEn', 'instagramUrl', 'xUrl', 'snapchatUrl', 'tiktokUrl', 'logoUrl', 'foundedYear', 'deliveryFee', 'freeDeliveryFrom',
];

export default function AdminCompany() {
  const { t, money, errorText, fieldErrors } = useI18n();
  useDocumentTitle(t('admin.nav.company'));
  const { company, loaded, setCompany } = useCompany();
  const toast = useToast();
  const [values, setValues] = useState(null);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  // Fill the form once the company details have loaded
  useEffect(() => {
    if (loaded && !values) setValues(Object.fromEntries(FIELDS.map((f) => [f, company[f] ?? ''])));
  }, [loaded, company, values]);

  if (!values) return <Loading />;

  const on = (e) => {
    setValues((v) => ({ ...v, [e.target.name]: e.target.value }));
    if (errors[e.target.name]) setErrors((er) => ({ ...er, [e.target.name]: undefined }));
  };

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await api('/company', { method: 'PUT', body: values });
      setCompany((c) => ({ ...c, ...res.company }));
      setErrors({});
      toast.success(t('company.saved'));
    } catch (err) {
      setErrors(fieldErrors(err.details));
      toast.error(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  const input = (name, { dir, type = 'text', placeholder, max } = {}) => (
    <input id={`co-${name}`} name={name} type={type} dir={dir} value={values[name]} onChange={on} maxLength={max} placeholder={placeholder} />
  );

  return (
    <>
      <header className="admin-head">
        <h1>{t('admin.nav.company')}</h1>
      </header>
      <p className="muted small">{t('company.hint')}</p>

      <form className="company-form" onSubmit={save} noValidate>
        <section className="card form">
          <h2><Icon name="building" size={20} /> {t('company.identity')}</h2>
          <ImageUpload
            id="co-logo"
            label={t('company.logo')}
            hint={t('company.logoHint')}
            value={values.logoUrl}
            error={errors.logoUrl}
            previewClass="logo-preview"
            onChange={(url) => setValues((v) => ({ ...v, logoUrl: url }))}
          />
          {!values.logoUrl && <p className="field-hint"><img src={BUNDLED_LOGO} alt="" className="inline-logo" /> {t('company.logoDefault')}</p>}
          <div className="form-grid">
            <Field id="co-nameAr" label={t('form.nameAr')} error={errors.nameAr}>{input('nameAr', { dir: 'rtl', max: 80 })}</Field>
            <Field id="co-nameEn" label={t('form.nameEn')} error={errors.nameEn}>{input('nameEn', { dir: 'ltr', max: 80 })}</Field>
            <Field id="co-taglineAr" label={t('company.taglineAr')}>{input('taglineAr', { dir: 'rtl', max: 160 })}</Field>
            <Field id="co-taglineEn" label={t('company.taglineEn')}>{input('taglineEn', { dir: 'ltr', max: 160 })}</Field>
            <Field id="co-foundedYear" label={t('company.founded')} error={errors.foundedYear}>{input('foundedYear', { type: 'number' })}</Field>
          </div>
        </section>

        <section className="card form">
          <h2><Icon name="phone" size={20} /> {t('company.contact')}</h2>
          <div className="form-grid">
            <Field id="co-phone" label={t('company.phone')} error={errors.phone}>{input('phone', { dir: 'ltr', type: 'tel', max: 20, placeholder: '05XXXXXXXX' })}</Field>
            <Field id="co-whatsapp" label={t('company.whatsapp')} error={errors.whatsapp} hint={t('company.whatsappHint')}>{input('whatsapp', { dir: 'ltr', type: 'tel', max: 20, placeholder: '9665XXXXXXXX' })}</Field>
            <Field id="co-email" label={t('auth.email')} error={errors.email}>{input('email', { dir: 'ltr', type: 'email', max: 120 })}</Field>
            <Field id="co-mapsUrl" label={t('company.maps')} error={errors.mapsUrl} hint={t('company.mapsHint')}>{input('mapsUrl', { dir: 'ltr', type: 'url', max: 500, placeholder: 'https://maps.app.goo.gl/…' })}</Field>
            <Field id="co-addressAr" label={t('company.addressAr')}>{input('addressAr', { dir: 'rtl', max: 200 })}</Field>
            <Field id="co-addressEn" label={t('company.addressEn')}>{input('addressEn', { dir: 'ltr', max: 200 })}</Field>
            <Field id="co-hoursAr" label={t('company.hoursAr')}>{input('hoursAr', { dir: 'rtl', max: 120 })}</Field>
            <Field id="co-hoursEn" label={t('company.hoursEn')}>{input('hoursEn', { dir: 'ltr', max: 120 })}</Field>
          </div>
        </section>

        <section className="card form">
          <h2><Icon name="instagram" size={20} /> {t('company.social')}</h2>
          <div className="form-grid">
            <Field id="co-instagramUrl" label="Instagram" error={errors.instagramUrl}>{input('instagramUrl', { dir: 'ltr', type: 'url', max: 300, placeholder: 'https://instagram.com/…' })}</Field>
            <Field id="co-xUrl" label="X (Twitter)" error={errors.xUrl}>{input('xUrl', { dir: 'ltr', type: 'url', max: 300, placeholder: 'https://x.com/…' })}</Field>
            <Field id="co-snapchatUrl" label="Snapchat" error={errors.snapchatUrl}>{input('snapchatUrl', { dir: 'ltr', type: 'url', max: 300, placeholder: 'https://snapchat.com/add/…' })}</Field>
            <Field id="co-tiktokUrl" label="TikTok" error={errors.tiktokUrl}>{input('tiktokUrl', { dir: 'ltr', type: 'url', max: 300, placeholder: 'https://tiktok.com/@…' })}</Field>
          </div>
        </section>

        <section className="card form">
          <h2><Icon name="truck" size={20} /> {t('company.deliveryTitle')}</h2>
          <div className="form-grid">
            <Field id="co-deliveryFee" label={t('company.fee')} error={errors.deliveryFee}>{input('deliveryFee', { type: 'number' })}</Field>
            <Field id="co-freeDeliveryFrom" label={t('company.freeFrom')} error={errors.freeDeliveryFrom} hint={t('company.freeFromHint')}>{input('freeDeliveryFrom', { type: 'number' })}</Field>
          </div>
          <p className="field-hint">
            {Number(values.freeDeliveryFrom) > 0
              ? t('company.deliverySummary', { fee: money(values.deliveryFee), free: money(values.freeDeliveryFrom) })
              : t('company.deliverySummaryNoFree', { fee: money(values.deliveryFee) })}
          </p>
        </section>

        <div className="sticky-save">
          <button type="submit" className="btn btn-primary btn-lg" disabled={busy}>{busy ? t('common.saving') : t('common.saveChanges')}</button>
        </div>
      </form>
    </>
  );
}
