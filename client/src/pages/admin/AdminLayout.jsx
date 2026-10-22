import { NavLink, Outlet } from 'react-router-dom';

const LINKS = [
  ['/admin', 'Dashboard', '📊', true],
  ['/admin/products', 'Products', '🪴'],
  ['/admin/categories', 'Categories', '🗂️'],
  ['/admin/orders', 'Orders', '📦'],
  ['/admin/users', 'Customers', '👥'],
  ['/admin/messages', 'Messages', '✉️'],
];

export default function AdminLayout() {
  return (
    <div className="container page admin">
      <aside className="admin-nav" aria-label="Admin sections">
        <p className="kicker">Administration</p>
        <nav>
          {LINKS.map(([to, label, icon, end]) => (
            <NavLink key={to} to={to} end={end}>
              <span aria-hidden="true">{icon}</span> {label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <section className="admin-content">
        <Outlet />
      </section>
    </div>
  );
}
