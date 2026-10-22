import { useMemo, useRef, useState } from 'react';
import { api } from '../../api';
import { ErrorState, Field, Loading, ProductImage } from '../../components/ui';
import { useToast } from '../../context/ToastContext';
import { useDebounce } from '../../hooks/useDebounce';
import { useFetch } from '../../hooks/useFetch';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { formatMoney } from '../../utils/format';
import { sanitize } from '../../utils/validation';

const EMPTY = { name: '', description: '', price: '', stock: '', category: '', imageUrl: '', isActive: true };

function ProductForm({ initial, categories, onSaved, onCancel }) {
  const toast = useToast();
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);
  const editing = Boolean(initial._id);

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setValues((v) => ({ ...v, [name]: type === 'checkbox' ? checked : value }));
  };

  const upload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be 2 MB or smaller.');
      return;
    }
    const form = new FormData();
    form.append('image', file);
    setUploading(true);
    try {
      const res = await api('/images', { method: 'POST', form });
      setValues((v) => ({ ...v, imageUrl: res.url }));
      toast.success('Image uploaded.');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const found = {};
    if (values.name.trim().length < 2) found.name = 'Name needs at least 2 characters.';
    if (!(Number(values.price) >= 0) || values.price === '') found.price = 'Enter a price.';
    if (!Number.isInteger(Number(values.stock)) || Number(values.stock) < 0 || values.stock === '') found.stock = 'Enter a whole number.';
    if (!values.category) found.category = 'Choose a category.';
    setErrors(found);
    if (Object.keys(found).length) return;

    setBusy(true);
    try {
      const body = {
        name: sanitize(values.name, 100),
        description: sanitize(values.description, 1000),
        price: Number(values.price),
        stock: Number(values.stock),
        category: values.category,
        imageUrl: values.imageUrl,
        isActive: values.isActive,
      };
      const res = await api(editing ? `/products/${initial._id}` : '/products', { method: editing ? 'PUT' : 'POST', body });
      toast.success(editing ? 'Product updated.' : 'Product created.');
      onSaved(res.product);
    } catch (err) {
      setErrors(err.details || {});
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="card form" onSubmit={onSubmit}>
      <h2>{editing ? `Edit ${initial.name}` : 'Add product'}</h2>
      <div className="form-grid">
        <Field id="p-name" label="Name" error={errors.name}>
          <input id="p-name" name="name" required minLength={2} maxLength={100} value={values.name} onChange={onChange} />
        </Field>
        <Field id="p-category" label="Category" error={errors.category}>
          <select id="p-category" name="category" required value={values.category} onChange={onChange}>
            <option value="">Choose…</option>
            {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
        </Field>
        <Field id="p-price" label="Price (SAR)" error={errors.price}>
          <input id="p-price" name="price" type="number" required min="0" max="100000" step="0.01" value={values.price} onChange={onChange} />
        </Field>
        <Field id="p-stock" label="Stock" error={errors.stock}>
          <input id="p-stock" name="stock" type="number" required min="0" step="1" value={values.stock} onChange={onChange} />
        </Field>
      </div>
      <Field id="p-desc" label="Description">
        <textarea id="p-desc" name="description" rows={3} maxLength={1000} value={values.description} onChange={onChange} />
      </Field>
      <div className="upload-row">
        <ProductImage src={values.imageUrl} alt="Preview" className="upload-preview" />
        <div>
          <Field id="p-image" label="Image" error={errors.imageUrl} hint="Upload JPG/PNG/WEBP (max 2 MB) or paste an https:// link.">
            <input id="p-image" name="imageUrl" value={values.imageUrl} onChange={onChange} maxLength={300} placeholder="https://…" />
          </Field>
          <label className="btn btn-outline btn-sm file-btn">
            {uploading ? 'Uploading…' : 'Upload image'}
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={upload} disabled={uploading} />
          </label>
        </div>
      </div>
      <label className="check">
        <input type="checkbox" name="isActive" checked={values.isActive} onChange={onChange} /> Visible in the shop
      </label>
      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={busy || uploading}>{busy ? 'Saving…' : 'Save product'}</button>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

export default function AdminProducts() {
  useDocumentTitle('Products');
  const toast = useToast();
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(null);
  const debounced = useDebounce(q);
  const path = useMemo(() => `/products/admin?limit=15&sort=name&page=${page}&q=${encodeURIComponent(debounced)}`, [debounced, page]);
  const { data, loading, error, reload } = useFetch(path);
  const cats = useFetch('/categories/all');

  const remove = async (p) => {
    if (!window.confirm(`Delete ${p.name}?`)) return;
    try {
      const res = await api(`/products/${p._id}`, { method: 'DELETE' });
      toast.success(res?.message || 'Product deleted.');
      reload();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const quickStock = async (p, stock) => {
    try {
      await api(`/products/${p._id}/stock`, { method: 'PATCH', body: { stock } });
      reload();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <>
      <header className="admin-head">
        <h1>Products</h1>
        <button type="button" className="btn btn-primary btn-sm" onClick={() => setEditing({ ...EMPTY })}>+ Add product</button>
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

      <input type="search" className="admin-search" placeholder="Search products…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} aria-label="Search products" />

      {loading && <Loading />}
      {error && <ErrorState error={error} onRetry={reload} />}
      {data && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th scope="col">Product</th><th scope="col">Category</th><th scope="col" className="num">Price</th><th scope="col">Stock</th><th scope="col">Status</th><th scope="col"><span className="sr-only">Actions</span></th></tr>
            </thead>
            <tbody>
              {data.products.map((p) => (
                <tr key={p._id}>
                  <td><span className="cell-product"><ProductImage src={p.imageUrl} alt="" className="thumb" />{p.name}</span></td>
                  <td>{p.category?.name}</td>
                  <td className="num">{formatMoney(p.price)}</td>
                  <td>
                    <span className={`stock-pill ${p.stock <= 5 ? 'low' : ''}`}>{p.stock}</span>
                    <button type="button" className="mini" onClick={() => quickStock(p, p.stock + 10)} title="Add 10 to stock">+10</button>
                  </td>
                  <td>{p.isActive ? <span className="badge badge-delivered">Active</span> : <span className="badge badge-cancelled">Hidden</span>}</td>
                  <td className="actions">
                    <button type="button" className="link-btn" onClick={() => setEditing({ ...p, category: p.category?._id || '' })}>Edit</button>
                    <button type="button" className="link-btn danger" onClick={() => remove(p)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.pages > 1 && (
            <nav className="pagination" aria-label="Pages">
              <button type="button" className="btn btn-outline btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>← Prev</button>
              <span>Page {data.page} of {data.pages}</span>
              <button type="button" className="btn btn-outline btn-sm" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>Next →</button>
            </nav>
          )}
        </div>
      )}
    </>
  );
}
