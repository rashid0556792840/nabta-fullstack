import { Link } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import Icon from '../components/Icon';
import { ErrorState, Loading, ProductImage } from '../components/ui';
import { useCompany } from '../context/CompanyContext';
import { useFetch } from '../hooks/useFetch';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useI18n } from '../i18n/LanguageContext';

export default function Home() {
  useDocumentTitle('');
  const { t, pick, money, number } = useI18n();
  const { company, logo, whatsappLink, freeDeliveryFrom } = useCompany();
  const featured = useFetch('/products?featured=true&limit=8&sort=newest');
  const categories = useFetch('/categories');
  const since = company.foundedYear || 2018;
  const years = Math.max(1, new Date().getFullYear() - since);
  const productCount = categories.data?.categories.reduce((n, c) => n + c.productCount, 0);

  return (
    <>
      <section className="hero">
        <div className="hero-pattern" aria-hidden="true" />
        <div className="container hero-inner">
          <div className="hero-copy">
            <p className="kicker kicker-light"><Icon name="sparkle" size={16} /> {t('home.kicker', { year: since })}</p>
            <h1>{t('home.title')}</h1>
            <p className="lead">{t('home.lead')}</p>
            <div className="hero-actions">
              <Link to="/shop" className="btn btn-saffron btn-lg">{t('home.shopNow')} <Icon name="arrow" size={18} className="flip-rtl" /></Link>
              <Link to="/about" className="btn btn-outline-light btn-lg">{t('home.ourStory')}</Link>
            </div>
          </div>
          <div className="hero-card" aria-hidden="true">
            <img src={logo} alt="" />
            <p>{pick(company, 'tagline') || t('brand.tagline')}</p>
          </div>
        </div>
        <ul className="container trust-strip" aria-label={t('home.whyTitle')}>
          <li><strong>{number(years)}+</strong><span>{t('home.statYears')}</span></li>
          <li><strong>{productCount ? number(productCount) : '—'}</strong><span>{t('home.statProducts')}</span></li>
          <li><strong>{freeDeliveryFrom > 0 ? money(freeDeliveryFrom) : t('home.free')}</strong><span>{t('home.statDelivery')}</span></li>
          <li><strong>{t('home.cod')}</strong><span>{t('home.statCod')}</span></li>
        </ul>
      </section>

      <section className="container section" aria-labelledby="cat-title">
        <div className="section-head">
          <div>
            <p className="kicker">{t('home.catKicker')}</p>
            <h2 id="cat-title">{t('home.catTitle')}</h2>
          </div>
          <Link to="/shop" className="link-arrow">{t('home.viewAll')} <Icon name="arrow" size={16} className="flip-rtl" /></Link>
        </div>
        {categories.loading && <Loading />}
        {categories.error && <ErrorState error={categories.error} onRetry={categories.reload} />}
        <div className="category-grid">
          {categories.data?.categories.map((c) => (
            <Link key={c._id} to={`/shop?category=${c._id}`} className="category-card">
              <ProductImage src={c.imageUrl} alt="" className="category-img" />
              <span className="category-text">
                <strong>{pick(c)}</strong>
                <small>{t('home.productsCount', { count: c.productCount })}</small>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="container section" aria-labelledby="best-title">
        <div className="section-head">
          <div>
            <p className="kicker">{t('home.bestKicker')}</p>
            <h2 id="best-title">{t('home.bestTitle')}</h2>
          </div>
          <Link to="/shop" className="link-arrow">{t('home.browse')} <Icon name="arrow" size={16} className="flip-rtl" /></Link>
        </div>
        {featured.loading && <Loading />}
        {featured.error && <ErrorState error={featured.error} onRetry={featured.reload} />}
        <div className="product-grid">
          {featured.data?.products.map((p) => <ProductCard key={p._id} product={p} />)}
        </div>
      </section>

      <section className="section why" aria-labelledby="why-title">
        <div className="container">
          <div className="section-head center">
            <div>
              <p className="kicker">{t('home.whyKicker', { year: since })}</p>
              <h2 id="why-title">{t('home.whyTitle')}</h2>
              <p className="muted why-lead">{t('home.whyLead')}</p>
            </div>
          </div>
          <ul className="why-grid">
            <li><span className="why-icon"><Icon name="shield" size={26} /></span><h3>{t('home.why1')}</h3><p>{t('home.why1Text')}</p></li>
            <li><span className="why-icon"><Icon name="leaf" size={26} /></span><h3>{t('home.why2')}</h3><p>{t('home.why2Text')}</p></li>
            <li><span className="why-icon"><Icon name="tag" size={26} /></span><h3>{t('home.why3')}</h3><p>{t('home.why3Text')}</p></li>
            <li><span className="why-icon"><Icon name="truck" size={26} /></span><h3>{t('home.why4')}</h3><p>{t('home.why4Text')}</p></li>
          </ul>
        </div>
      </section>

      <section className="container section">
        <div className="promo">
          <div>
            <h2>{t('home.promoTitle')}</h2>
            <p>{t('home.promoText')}</p>
          </div>
          <div className="promo-actions">
            {whatsappLink() && (
              <a href={whatsappLink(t('contact.whatsappHello'))} className="btn btn-whatsapp" target="_blank" rel="noopener noreferrer">
                <Icon name="whatsapp" size={18} /> {t('contact.whatsapp')}
              </a>
            )}
            <Link to="/contact" className="btn btn-outline">{t('home.askUs')}</Link>
          </div>
        </div>
      </section>
    </>
  );
}
