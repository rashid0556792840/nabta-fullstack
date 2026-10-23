import { NavLink, Outlet } from 'react-router-dom';
import Icon from '../../components/Icon';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../i18n/LanguageContext';

// [path, label key, icon, admin only, exact match]
const LINKS = [
  ['/admin', 'admin.nav.dashboard', 'chart', false, true],
  ['/admin/orders', 'admin.nav.orders', 'box', false],
  ['/admin/deliveries', 'admin.nav.deliveries', 'truck', false],
  ['/admin/messages', 'admin.nav.messages', 'mail', false],
  ['/admin/products', 'admin.nav.products', 'tag', true],
  ['/admin/categories', 'admin.nav.categories', 'grid', true],
  ['/admin/users', 'admin.nav.users', 'users', true],
  ['/admin/company', 'admin.nav.company', 'building', true],
];

export default function AdminLayout() {
  const { isAdmin, user } = useAuth();
  const { t } = useI18n();
  return (
    <div className="container page admin">
      <aside className="admin-nav" aria-label={t('admin.sections')}>
        <p className="kicker">{t(`role.${user.role}`)}</p>
        <nav>
          {LINKS.filter(([, , , adminOnly]) => isAdmin || !adminOnly).map(([to, label, icon, , end]) => (
            <NavLink key={to} to={to} end={end}>
              <Icon name={icon} size={18} /> <span>{t(label)}</span>
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
