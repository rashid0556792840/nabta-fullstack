import { useState } from 'react';
import { api } from '../../api';
import Icon from '../../components/Icon';
import { ErrorState, Field, Loading, ProductImage, useConfirm } from '../../components/ui';
import { useToast } from '../../context/ToastContext';
import { useFetch } from '../../hooks/useFetch';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useI18n } from '../../i18n/LanguageContext';
import { sanitize } from '../../utils/validation';

const EMPTY = { _id: null, name: '', nameAr: '', description: '', descriptionAr: '', imageUrl: '', sortOrder: 0 };

export default function AdminCategories() {
  const { t, pick, errorText, fieldErrors } = useI18n();
  useDocumentTitle(t('admin.nav.categories'));
  const toast = useToast();
  const [confirm, confirmDialog] = useConfirm();
  const { data, loading, error, reload } = useFetch('/categories/all');
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});

  const body = (c) => ({
    name: sanitize(c.name, 60),
    nameAr: sanitize(c.nameAr, 60),
    description: sanitize(c.description, 300),
    descriptionAr: sanitize(c.descriptionAr, 300),
    imageUrl: c.imageUrl || '',
    sortOrder: Number(c.sortOrder) || 0,
  });

  const save = async (e) => {
    e.preventDefault();
    const found = {};
    if (form.name.trim().length < 2) found.name = t('v.name2');
    if (form.nameAr.trim().length < 2) found.nameAr = t('v.name2');
    setErrors(found);
    if (Object.keys(found).length) return;
    try {
      await api(form._id ? `/categories/${form._id}` : '/categories', { method: form._id ? 'PUT' : 'POST', body: body(form) });
      toast.success(form._id ? t('categories.updated') : t('categories.added'));
      setForm(EMPTY);
      setErrors({});
      reload();
    } catch (err) {
      setErrors(err.details ? fieldErrors(err.details) : { name: errorText(err) });
    }
  };

  const toggle = async (c) => {
    try {
      await api(`/categories/${c._id}`, { method: 'PUT', body: { ...body(c), isActive: !c.isActive } });
      reload();
    } catch (err) {
      toast.error(errorText(err));
    }
  };

  const remove = async (c) => {
    if (!(await confirm(t('common.deleteConfirm', { name: pick(c) })))) return;
    try {
      await api(`/categories/${c._id}`, { method: 'DELETE' });
      toast.success(t('categories.deleted'));
      reload();
    } catch (err) {
      toast.error(errorText(err));
    }
  };

  const on = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  return (
    <>
      {confirmDialog}
      <header className="admin-head"><h1>{t('admin.nav.categories')}</h1></header>
      <form className="card form" onSubmit={save} noValidate>
        <h2>{form._id ? t('categories.edit') : t('categories.new')}</h2>
        <div className="form-grid">
          <Field id="c-nameAr" label={t('form.nameAr')} error={errors.nameAr}>
            <input id="c-nameAr" name="nameAr" dir="rtl" lang="ar" maxLength={60} value={form.nameAr} onChange={on} />
          </Field>
          <Field id="c-name" label={t('form.nameEn')} error={errors.name}>
            <input id="c-name" name="name" dir="ltr" lang="en" maxLength={60} value={form.name} onChange={on} />
          </Field>
          <Field id="c-descAr" label={t('form.descAr')}>
            <input id="c-descAr" name="descriptionAr" dir="rtl" lang="ar" maxLength={300} value={form.descriptionAr} onChange={on} />
          </Field>
          <Field id="c-desc" label={t('form.descEn')}>
            <input id="c-desc" name="description" dir="ltr" lang="en" maxLength={300} value={form.description} onChange={on} />
          </Field>
          <Field id="c-order" label={t('categories.order')} hint={t('categories.orderHint')}>
            <input id="c-order" name="sortOrder" type="number" min="0" max="999" value={form.sortOrder} onChange={on} />
          </Field>
        </div>
        <div className="form-actions">
          <button type="submit" className="btn btn-primary btn-sm">{form._id ? t('common.save') : t('categories.add')}</button>
          {form._id && <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setForm(EMPTY); setErrors({}); }}>{t('common.cancel')}</button>}
        </div>
      </form>

      {loading && !data && <Loading />}
      {error && <ErrorState error={error} onRetry={reload} />}
      {data && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">{t('categories.name')}</th>
                <th scope="col">{t('categories.description')}</th>
                <th scope="col">{t('adminOrders.status')}</th>
                <th scope="col"><span className="sr-only">{t('common.actions')}</span></th>
              </tr>
            </thead>
            <tbody>
              {data.categories.map((c) => (
                <tr key={c._id}>
                  <td>
                    <span className="cell-product">
                      <ProductImage src={c.imageUrl} alt="" className="thumb" />
                      <span><strong>{c.nameAr}</strong><br /><small className="muted" dir="ltr">{c.name}</small></span>
                    </span>
                  </td>
                  <td className="muted small">{pick(c, 'description')}</td>
                  <td>
                    <button type="button" className={`badge badge-${c.isActive ? 'completed' : 'cancelled'} as-btn`} onClick={() => toggle(c)} title={t('common.toggleVisibility')}>
                      {c.isActive ? t('common.active') : t('common.hidden')}
                    </button>
                  </td>
                  <td className="actions">
                    <button type="button" className="icon-btn subtle" onClick={() => { setErrors({}); setForm({ ...EMPTY, ...c }); window.scrollTo({ top: 0, behavior: 'smooth' }); }} aria-label={t('common.editNamed', { name: pick(c) })}><Icon name="edit" size={18} /></button>
                    <button type="button" className="icon-btn subtle danger" onClick={() => remove(c)} aria-label={t('common.deleteNamed', { name: pick(c) })}><Icon name="trash" size={18} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
