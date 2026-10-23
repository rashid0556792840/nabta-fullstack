import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { homeFor, useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n/LanguageContext';
import { Loading } from './ui';

/**
 * Blocks a route unless the user is signed in. With `roles`, only those roles may enter;
 * anyone else is sent to their own home page (drivers to /delivery, staff to /admin).
 */
export default function ProtectedRoute({ roles }) {
  const { user, loading } = useAuth();
  const { t } = useI18n();
  const location = useLocation();

  if (loading) return <Loading label={t('auth.checking')} />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (roles && !roles.includes(user.role)) return <Navigate to={homeFor(user)} replace />;
  return <Outlet />;
}
