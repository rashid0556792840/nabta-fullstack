import { useState } from 'react';
import { api } from '../../api';
import { ErrorState, Field, Loading } from '../../components/ui';
import { useToast } from '../../context/ToastContext';
import { useFetch } from '../../hooks/useFetch';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { sanitize } from '../../utils/validation';

export default function AdminCategories() {
  useDocumentTitle('Categories');
  const toast = useToast();
  const { data, loading, error, reload } = useFetch('/categories/all');
  const [form, setForm] = useState({ _id: null, name: '', description: '' });
  const [errors, setErrors] = useState({});

  const save = async (e) => {
    e.preventDefault();
    if (form.name.trim().length < 2) {
      setErrors({ name: 'Name needs at least 2 characters.' });
      return;
    }
    try {
      const body = { name: sanitize(form.name, 60), description: sanitize(form.description, 300) };
      await api(form._id ? `/categories/${form._id}` : '/categories', { method: form._id ? 'PUT' : 'POST', body });
      toast.success(form._id ? 'Category updated.' : 'Category added.');
      setForm({ _id: null, name: '', description: '' });
      setErrors({});
      reload();
    } catch (err) {
      setErrors(err.details || { name: err.message });
    }
  };

  const toggle = async (c) => {
    try {
      await api(`/categories/${c._id}`, { method: 'PUT', body: { name: c.name, description: c.description, isActive: !c.isActive } });
      reload();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const remove = async (c) => {
    if (!window.confirm(`Delete ${c.name}?`)) return;
    try {
      await api(`/categories/${c._id}`, { method: 'DELETE' });
      toast.success('Category deleted.');
      reload();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <>
      <header className="admin-head"><h1>Categories</h1></header>
      <form className="card form inline-form" onSubmit={save}>
        <Field id="c-name" label={form._id ? 'Edit name' : 'New category'} error={errors.name}>
          <input id="c-name" required minLength={2} maxLength={60} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Field>
        <Field id="c-desc" label="Description">
          <input id="c-desc" maxLength={300} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </Field>
        <div className="form-actions">
          <button type="submit" className="btn btn-primary btn-sm">{form._id ? 'Save' : 'Add'}</button>
          {form._id && <button type="button" className="btn btn-ghost btn-sm" onClick={() => setForm({ _id: null, name: '', description: '' })}>Cancel</button>}
        </div>
      </form>

      {loading && <Loading />}
      {error && <ErrorState error={error} onRetry={reload} />}
      {data && (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th scope="col">Name</th><th scope="col">Description</th><th scope="col">Status</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>
              {data.categories.map((c) => (
                <tr key={c._id}>
                  <td><strong>{c.name}</strong></td>
                  <td className="muted">{c.description}</td>
                  <td>
                    <button type="button" className={`badge badge-${c.isActive ? 'delivered' : 'cancelled'} as-btn`} onClick={() => toggle(c)} title="Toggle visibility">
                      {c.isActive ? 'Active' : 'Hidden'}
                    </button>
                  </td>
                  <td className="actions">
                    <button type="button" className="link-btn" onClick={() => setForm({ _id: c._id, name: c.name, description: c.description })}>Edit</button>
                    <button type="button" className="link-btn danger" onClick={() => remove(c)}>Delete</button>
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
