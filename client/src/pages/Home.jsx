import { Link } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import { ErrorState, Loading } from '../components/ui';
import { useFetch } from '../hooks/useFetch';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

const CATEGORY_ICONS = ['🌿', '🌳', '🏺', '🧴', '🌸', '🪴'];

export default function Home() {
  useDocumentTitle('');
  const featured = useFetch('/products?limit=8&sort=newest');
  const categories = useFetch('/categories');

  return (
    <>
      <section className="hero">
        <div className="container hero-inner">
          <div className="hero-copy">
            <p className="kicker">Small rituals · Greener spaces</p>
            <h1>Bring nature home.</h1>
            <p className="lead">Thoughtfully chosen plants, pots and care essentials - delivered to your door with cash on delivery.</p>
            <div className="hero-actions">
              <Link to="/shop" className="btn btn-lime">Explore plants</Link>
              <Link to="/about" className="btn btn-outline-light">Our story</Link>
            </div>
          </div>
          <ul className="hero-stats" aria-label="Why Nabta">
            <li><strong>14+</strong><span>Hand-picked products</span></li>
            <li><strong>Free</strong><span>Delivery over SAR 200</span></li>
            <li><strong>COD</strong><span>Pay when it arrives</span></li>
          </ul>
        </div>
      </section>

      <section className="container section" aria-labelledby="cat-title">
        <div className="section-head">
          <h2 id="cat-title">Shop by category</h2>
          <Link to="/shop" className="link-arrow">View all →</Link>
        </div>
        {categories.loading && <Loading />}
        {categories.error && <ErrorState error={categories.error} onRetry={categories.reload} />}
        <div className="category-grid">
          {categories.data?.categories.map((c, i) => (
            <Link key={c._id} to={`/shop?category=${c._id}`} className="category-card">
              <span className="category-icon" aria-hidden="true">{CATEGORY_ICONS[i % CATEGORY_ICONS.length]}</span>
              <span>
                <strong>{c.name}</strong>
                <small>{c.productCount} products</small>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="container section" aria-labelledby="new-title">
        <div className="section-head">
          <h2 id="new-title">Fresh picks for you</h2>
          <Link to="/shop" className="link-arrow">Browse the shop →</Link>
        </div>
        {featured.loading && <Loading />}
        {featured.error && <ErrorState error={featured.error} onRetry={featured.reload} />}
        <div className="product-grid">
          {featured.data?.products.map((p) => <ProductCard key={p._id} product={p} />)}
        </div>
      </section>

      <section className="container section">
        <div className="promo">
          <div>
            <h2>New to plants?</h2>
            <p>Start with a snake plant or pothos - they forgive missed waterings and low light.</p>
          </div>
          <Link to="/contact" className="btn btn-primary">Ask our team</Link>
        </div>
      </section>
    </>
  );
}
