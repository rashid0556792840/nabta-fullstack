import { Link } from 'react-router-dom';
import { EmptyState } from '../components/ui';

export default function NotFound() {
  return (
    <div className="container page">
      <EmptyState title="Page not found" text="This page has wandered off into the garden." action={<Link to="/" className="btn btn-primary">Go home</Link>} />
    </div>
  );
}
