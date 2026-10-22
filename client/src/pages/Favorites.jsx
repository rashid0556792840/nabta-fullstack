import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import { EmptyState, ErrorState, Loading } from '../components/ui';
import { useFavorites } from '../context/FavoritesContext';
import { useFetch } from '../hooks/useFetch';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export default function Favorites() {
  useDocumentTitle('Favourites');
  const { ids } = useFavorites();
  const { data, loading, error, reload } = useFetch('/favorites');

  // Refresh when the user removes a favourite from this page
  useEffect(() => {
    if (data && data.products.length !== ids.size) reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids]);

  return (
    <div className="container page">
      <header className="page-head">
        <h1>Favourites</h1>
        <p className="muted">Products you saved for later.</p>
      </header>
      {loading && !data && <Loading />}
      {error && <ErrorState error={error} onRetry={reload} />}
      {data && data.products.length === 0 && (
        <EmptyState title="No favourites yet" text="Tap the heart on any product to save it here." action={<Link to="/shop" className="btn btn-primary">Browse products</Link>} />
      )}
      <div className="product-grid">
        {data?.products.map((p) => <ProductCard key={p._id} product={p} />)}
      </div>
    </div>
  );
}
