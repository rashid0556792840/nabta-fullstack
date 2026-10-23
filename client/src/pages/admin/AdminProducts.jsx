import { useMemo, useState } from 'react';
import { api } from '../../api';
import Icon from '../../components/Icon';
import ImageUpload from '../../components/ImageUpload';
import { ErrorState, Field, Loading, Pagination, ProductImage, useConfirm } from '../../components/ui';
import { useToast } from '../../context/ToastContext';
import { useDebounce } from '../../hooks/useDebounce';
import { useFetch } from '../../hooks/useFetch';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useI18n } from '../../i18n/LanguageContext';
import { sanitize } from '../../utils/validation';

const EMPTY = {
  name: '', nameAr: '', description: '', descriptionAr: '', price: '', stock: '', weightGrams: '',
  category: '', imageUrl: '', isActive: true, isFeatured: false,
};

function ProductForm({ initial, categories, onSaved, onCancel }) {
  const { t, pick, errorText, fieldErrors } = useI18n();
  const toast = useToast();
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const editing = Boolean(initial._id);

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setValues((v) => ({ ...v, [name]: type === 'checkbox' ? checked : value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const found = {};
    if (values.nameAr.trim().length < 2) found.nameAr = t('v.name2');
    if (values.name.trim().length < 2) found.name = t('v.name2');
    if (values.price === '' || !(Number(values.price) >= 0)) found.price = t('v.price');
    if (values.stock === '' || !Number.isInteger(Number(values.stock)) || Number(values.stock) < 0) found.stock = t('v.stock');
    if (values.weightGrams !== '' && values.weightGrams !== null && !(Number(values.weightGrams) > 0)) found.weightGrams = t('v.weight');
    if (!values.category) found.category = t('v.category');
    setErrors(found);
    if (Object.keys(found).length) return;

    setBusy(true);
    try {
      const body = {
        name: sanitize(values.name, 100),
        nameAr: sanitize(values.nameAr, 100),
        description: sanitize(values.description, 1000),
        descriptionAr: sanitize(values.descriptionAr, 1000),
        price: Number(values.price),
        stock: Number(values.stock),
        weightGrams: values.weightGrams === '' || values.weightGrams === null ? null : Number(values.weightGrams),
        category: values.category,
        imageUrl: values.imageUrl,
        isActive: values.isActive,
        isFeatured: values.isFeatured,
      };
      const res = await api(editing ? `/products/${initial._id}` : '/products', { method: editing ? 'PUT' : 'POST', body });
      toast.success(editing ? t('products.updated') : t('products.created'));
      onSaved(res.product);
    } catch (err) {
      setErrors(fieldErrors(err.details));
      toast.error(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="card form" onSubmit={onSubmit} noValidate>
      <h2>{editing ? t('products.editNamed', { name: pick(initial) }) : t('products.add')}</h2>
      <div className="form-grid">
        <Field id="p-nameAr" label={t('form.nameAr')} error={errors.nameAr}>
          <input id="p-nameAr" name="nameAr" dir="rtl" lang="ar" maxLength={100} value={values.nameAr} onChange={onChange} />
        </Field>
        <Field id="p-name" label={t('form.nameEn')} error={errors.name}>
          <input id="p-name" name="name" dir="ltr" lang="en" maxLength={100} value={values.name} onChange={onChange} />
        </Field>
        <Field id="p-category" label={t('shop.category')} error={errors.category}>
          <select id="p-category" name="category" value={values.category} onChange={onChange}>
            <option value="">{t('dispatch.choose')}</option>
            {categories.map((c) => <option key={c._id} value={c._id}>{pick(c)}</option>)}
          </select>
        </Field>
        <Field id="p-price" label={t('products.price')} error={errors.price}>
          <input id="p-price" name="price" type="number" inputMode="decimal" min="0" max="100000" step="0.01" value={values.price} onChange={onChange} />
        </Field>
        <Field id="p-weight" label={t('products.weight')} error={errors.weightGrams} hint={t('products.weightHint')}>
          <input id="p-weight" name="weightGrams" type="number" inputMode="numeric" min="1" step="1" value={values.weightGrams ?? ''} onChange={onChange} />
        </Field>
        <Field id="p-stock" label={t('products.stock')} error={errors.stock}>
          <input id="p-stock" name="stock" type="number" inputMode="numeric" min="0" step="1" value={values.stock} onChange={onChange} />
        </Field>
        <Field id="p-descAr" label={t('form.descAr')} className="span-2">
          <textarea id="p-descAr" name="descriptionAr" dir="rtl" lang="ar" rows={3} maxLength={1000} value={values.descriptionAr} onChange={onChange} />
        </Field>
        <Field id="p-desc" label={t('form.descEn')} className="span-2">
          <textarea id="p-desc" name="description" dir="ltr" lang="en" rows={3} maxLength={1000} value={values.description} onChange={onChange} />
        </Field>
      </div>
      <ImageUpload id="p-image" label={t('products.image')} value={values.imageUrl} error={errors.imageUrl} onChange={(url) => setValues((v) => ({ ...v, imageUrl: url }))} />
      <div className="check-row">
        <label className="check">
          <input type="checkbox" name="isActive" checked={values.isActive} onChange={onChange} /> {t('products.visible')}
        </label>
        <label className="check">
          <input type="checkbox" name="isFeatured" checked={values.isFeatured} onChange={onChange} /> {t('products.featured')}
        </label>
      </div>
      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? t('common.saving') : t('products.save')}</button>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>{t('common.cancel')}</button>
      </div>
    </form>
  );
}

export default function AdminProducts() {
  const { t, pick, money, grams, errorText } = useI18n();
  useDocumentTitle(t('admin.nav.products'));
  const toast = useToast();
  const [confirm, confirmDialog] = useConfirm();
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(null);
  const debounced = useDebounce(q);
  const path = useMemo(() => `/products/admin?limit=15&sort=newest&page=${page}&q=${encodeURIComponent(debounced)}`, [debounced, page]);
  const { data, loading, error, reload } = useFetch(path);
  const cats = useFetch('/categories/all');

  const remove = async (p) => {
    if (!(await confirm(t('common.deleteConfirm', { name: pick(p) })))) return;
    try {
      const res = await api(`/products/${p._id}`, { method: 'DELETE' });
      toast.success(res?.product ? t('products.deactivated') : t('products.deleted'));
      reload();
    } catch (err) {
      toast.error(errorText(err));
    }
  };

  const quickStock = async (p, stock) => {
    try {
      await api(`/products/${p._id}/stock`, { method: 'PATCH', body: { stock } });
      reload();
    } catch (err) {
      toast.error(errorText(err));
    }
  };

  return (
    <>
      {confirmDialog}
      <header className="admin-head">
        <h1>{t('admin.nav.products')}</h1>
        <button type="button" className="btn btn-primary btn-sm" onClick={() => { setEditing({ ...EMPTY }); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
          <Icon name="plus" size={16} /> {t('products.add')}
        </button>
      </header>

      {editing && (
        <ProductForm
          key={editing._id || 'new'}
          initial={editing}
          categories={cats.data?.categories || []}
          onCancel={() => setEditing(null)}
          onSaved={() => { setEditing(null); reload(); }}
        />
      )}

      <div className="toolbar">
        <span className="input-icon grow">
          <Icon name="search" size={18} />
          <input type="search" placeholder={t('products.search')} value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} aria-label={t('products.search')} />
        </span>
      </div>

      {loading && !data && <Loading />}
      {error && <ErrorState error={error} onRetry={reload} />}
      {data && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">{t('order.product')}</th>
                <th scope="col">{t('shop.category')}</th>
                <th scope="col" className="num">{t('order.price')}</th>
                <th scope="col">{t('products.stock')}</th>
                <th scope="col">{t('adminOrders.status')}</th>
                <th scope="col"><span className="sr-only">{t('common.actions')}</span></th>
              </tr>
            </thead>
            <tbody>
              {data.products.map((p) => (
                <tr key={p._id}>
                  <td>
                    <span className="cell-product">
                      <ProductImage src={p.imageUrl} alt="" className="thumb" />
                      <span>
                        <strong>{pick(p)}</strong>
                        {p.isFeatured && <Icon name="star" size={14} className="star" label={t('products.featured')} />}
                        <br /><small className="muted">{grams(p.weightGrams)}</small>
                      </span>
                    </span>
                  </td>
                  <td>{pick(p.category)}</td>
                  <td className="num">{money(p.price)}</td>
                  <td>
                    <span className={`stock-pill ${p.stock <= 5 ? 'low' : ''}`}>{p.stock}</span>
                    <button type="button" className="mini" onClick={() => quickStock(p, p.stock + 10)} title={t('products.add10')}>+10</button>
                  </td>
                  <td>{p.isActive ? <span className="badge badge-completed">{t('common.active')}</span> : <span className="badge badge-cancelled">{t('common.hidden')}</span>}</td>
                  <td className="actions">
                    <button type="button" className="icon-btn subtle" onClick={() => { setEditing({ ...EMPTY, ...p, weightGrams: p.weightGrams ?? '', category: p.category?._id || '' }); window.scrollTo({ top: 0, behavior: 'smooth' }); }} aria-label={t('common.editNamed', { name: pick(p) })}><Icon name="edit" size={18} /></button>
                    <button type="button" className="icon-btn subtle danger" onClick={() => remove(p)} aria-label={t('common.deleteNamed', { name: pick(p) })}><Icon name="trash" size={18} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={data.page} pages={data.pages} onPage={setPage} />
        </div>
      )}
    </>
  );
}
