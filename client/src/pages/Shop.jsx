import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import { EmptyState, ErrorState, Loading } from '../components/ui';
import { useFetch } from '../hooks/useFetch';
import { useDebounce } from '../hooks/useDebounce';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { sanitize } from '../utils/validation';

export default function Shop() {
  useDocumentTitle('Shop');
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get('q') || '');
  const debounced = useDebounce(search);

  const category = params.get('category') || '';
  const sort = params.get('sort') || 'newest';
  const inStock = params.get('inStock') === 'true';
  const page = Number(params.get('page')) || 1;

  const update = (changes) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    if (!('page' in changes)) next.delete('page');
    setParams(next, { replace: true });
  };

  // Push the debounced search text into the URL
  useEffect(() => {
    if ((params.get('q') || '') !== debounced) update({ q: sanitize(debounced, 60) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  const query = useMemo(() => {
    const q = new URLSearchParams({ sort, page: String(page), limit: '12' });
    if (params.get('q')) q.set('q', params.get('q'));
    if (category) q.set('category', category);
    if (inStock) q.set('inStock', 'true');
    return `/products?${q}`;
  }, [params, sort, page, category, inStock]);

  const { data, loading, error, reload } = useFetch(query);
  const cats = useFetch('/categories');

  return (
    <div className="container page">
      <header className="page-head">
        <p className="kicker">Catalogue</p>
        <h1>Shop all products</h1>
      </header>

      <div className="shop-layout">
        <aside className="filters" aria-label="Filters">
          <form role="search" onSubmit={(e) => e.preventDefault()}>
            <label htmlFor="search" className="filter-label">Search</label>
            <input
              id="search"
              type="search"
              placeholder="Plants, pots, care…"
              value={search}
              maxLength={60}
              onChange={(e) => setSearch(e.target.value)}
            />
          </form>

          <fieldset>
            <legend className="filter-label">Category</legend>
            <label className="radio">
              <input type="radio" name="category" checked={!category} onChange={() => update({ category: '' })} />
              All categories
            </label>
            {cats.data?.categories.map((c) => (
              <label key={c._id} className="radio">
                <input type="radio" name="category" checked={category === c._id} onChange={() => update({ category: c._id })} />
                {c.name} <span className="muted">({c.productCount})</span>
              </label>
            ))}
          </fieldset>

          <label className="check">
            <input type="checkbox" checked={inStock} onChange={(e) => update({ inStock: e.target.checked ? 'true' : '' })} />
            In stock only
          </label>
        </aside>

        <section aria-live="polite">
          <div className="shop-toolbar">
            <p className="muted">{data ? `${data.total} product${data.total === 1 ? '' : 's'}` : ' '}</p>
            <label className="sort">
              Sort by
              <select value={sort} onChange={(e) => update({ sort: e.target.value })}>
                <option value="newest">Newest</option>
                <option value="price-asc">Price: low to high</option>
                <option value="price-desc">Price: high to low</option>
                <option value="name">Name A-Z</option>
              </select>
            </label>
          </div>

          {loading && <Loading />}
          {error && <ErrorState error={error} onRetry={reload} />}
          {data && !loading && data.products.length === 0 && (
            <EmptyState title="No products found" text="Try a different search or category." />
          )}
          <div className="product-grid">
            {!loading && data?.products.map((p) => <ProductCard key={p._id} product={p} />)}
          </div>

          {data && data.pages > 1 && (
            <nav className="pagination" aria-label="Pages">
              <button type="button" className="btn btn-outline btn-sm" disabled={page <= 1} onClick={() => update({ page: String(page - 1) })}>
                ← Previous
              </button>
              <span>Page {data.page} of {data.pages}</span>
              <button type="button" className="btn btn-outline btn-sm" disabled={page >= data.pages} onClick={() => update({ page: String(page + 1) })}>
                Next →
              </button>
            </nav>
          )}
        </section>
      </div>
    </div>
  );
}
