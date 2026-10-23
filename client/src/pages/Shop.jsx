import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import Icon from '../components/Icon';
import { EmptyState, ErrorState, Loading, Pagination } from '../components/ui';
import { useFetch } from '../hooks/useFetch';
import { useDebounce } from '../hooks/useDebounce';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useI18n } from '../i18n/LanguageContext';
import { sanitize } from '../utils/validation';

export default function Shop() {
  const { t, pick, number, lang } = useI18n();
  useDocumentTitle(t('nav.shop'));
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get('q') || '');
  const debounced = useDebounce(search);

  const category = params.get('category') || '';
  // "Name" sorts by the Arabic or English name depending on the language shown
  const rawSort = params.get('sort') || 'newest';
  const sort = rawSort === 'name' || rawSort === 'name-ar' ? (lang === 'ar' ? 'name-ar' : 'name') : rawSort;
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
  const current = cats.data?.categories.find((c) => c._id === category);

  return (
    <div className="container page">
      <header className="page-head">
        <p className="kicker">{t('shop.kicker')}</p>
        <h1>{current ? pick(current) : t('shop.title')}</h1>
        {current && pick(current, 'description') && <p className="muted">{pick(current, 'description')}</p>}
      </header>

      <div className="shop-layout">
        <aside className="filters" aria-label={t('shop.filters')}>
          <form role="search" onSubmit={(e) => e.preventDefault()} className="search-box">
            <label htmlFor="search" className="filter-label">{t('shop.search')}</label>
            <span className="input-icon">
              <Icon name="search" size={18} />
              <input
                id="search"
                type="search"
                placeholder={t('shop.searchPlaceholder')}
                value={search}
                maxLength={60}
                onChange={(e) => setSearch(e.target.value)}
              />
            </span>
          </form>

          <fieldset>
            <legend className="filter-label">{t('shop.category')}</legend>
            <div className="chip-list">
              <label className={`chip ${!category ? 'on' : ''}`}>
                <input type="radio" name="category" checked={!category} onChange={() => update({ category: '' })} />
                {t('shop.allCategories')}
              </label>
              {cats.data?.categories.map((c) => (
                <label key={c._id} className={`chip ${category === c._id ? 'on' : ''}`}>
                  <input type="radio" name="category" checked={category === c._id} onChange={() => update({ category: c._id })} />
                  {pick(c)} <span className="chip-count">{number(c.productCount)}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <label className="check">
            <input type="checkbox" checked={inStock} onChange={(e) => update({ inStock: e.target.checked ? 'true' : '' })} />
            {t('shop.inStock')}
          </label>
        </aside>

        <section aria-live="polite">
          <div className="shop-toolbar">
            <p className="muted">{data ? t('shop.count', { count: data.total }) : ' '}</p>
            <label className="sort">
              {t('shop.sort')}
              <select value={sort} onChange={(e) => update({ sort: e.target.value })}>
                <option value="newest">{t('shop.sortNewest')}</option>
                <option value="price-asc">{t('shop.sortPriceAsc')}</option>
                <option value="price-desc">{t('shop.sortPriceDesc')}</option>
                <option value={lang === 'ar' ? 'name-ar' : 'name'}>{t('shop.sortName')}</option>
              </select>
            </label>
          </div>

          {loading && <Loading />}
          {error && <ErrorState error={error} onRetry={reload} />}
          {data && !loading && data.products.length === 0 && (
            <EmptyState icon="search" title={t('shop.noneTitle')} text={t('shop.noneText')} />
          )}
          <div className="product-grid">
            {!loading && data?.products.map((p) => <ProductCard key={p._id} product={p} />)}
          </div>

          {data && <Pagination page={data.page} pages={data.pages} onPage={(p) => update({ page: String(p) })} />}
        </section>
      </div>
    </div>
  );
}
