import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useCompany } from '../context/CompanyContext';
import { useI18n } from '../i18n/LanguageContext';
import Icon from './Icon';
import NotificationsBell from './NotificationsBell';

export function LanguageToggle({ className = '' }) {
  const { lang, setLang, t } = useI18n();
  const { user, setUser } = useAuth();
  const next = lang === 'ar' ? 'en' : 'ar';
  const change = () => {
    setLang(next);
    // Remember the choice on the account so order e-mails arrive in the same language
    if (user) {
      api('/auth/me/language', { method: 'PATCH', body: { language: next } })
        .then((d) => setUser(d.user))
        .catch(() => {});
    }
  };
  return (
    <button type="button" className={`lang-btn ${className}`} onClick={change} lang={next} aria-label={t('lang.switch')}>
      <Icon name="globe" size={18} />
      <span>{next === 'en' ? 'English' : 'العربية'}</span>
    </button>
  );
}

export default function Header() {
  const { user, isStaff, isDriver, signOut } = useAuth();
  const { count } = useCart();
  const { company, logo } = useCompany();
  const { t, pick } = useI18n();
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const shopper = !isStaff && !isDriver;

  // Close the mobile menu after navigating
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const handleSignOut = () => {
    signOut();
    navigate('/');
  };

  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link to={isDriver ? '/delivery' : '/'} className="brand" aria-label={t('nav.home')}>
          <img src={logo} alt="" className="brand-logo" width="96" height="45" />
          <span className="brand-text">
            <strong>{pick(company, 'name')}</strong>
            <small>{t('brand.since', { year: company.foundedYear || 2018 })}</small>
          </span>
        </Link>

        <nav id="main-nav" className={`main-nav ${menuOpen ? 'open' : ''}`} aria-label={t('nav.main')}>
          {isDriver ? (
            <NavLink to="/delivery">{t('nav.deliveries')}</NavLink>
          ) : (
            <>
              <NavLink to="/" end>{t('nav.home')}</NavLink>
              <NavLink to="/shop">{t('nav.shop')}</NavLink>
              <NavLink to="/about">{t('nav.about')}</NavLink>
              <NavLink to="/contact">{t('nav.contact')}</NavLink>
              {user && shopper && <NavLink to="/orders">{t('nav.orders')}</NavLink>}
              {user && shopper && <NavLink to="/favorites">{t('nav.favorites')}</NavLink>}
              {user && shopper && <NavLink to="/messages">{t('nav.messages')}</NavLink>}
              {isStaff && <NavLink to="/admin" className="nav-admin">{t('nav.admin')}</NavLink>}
            </>
          )}
          <div className="nav-account">
            <LanguageToggle className="only-mobile" />
            {user ? (
              <>
                <NavLink to="/account" className="account-chip" title={t('nav.account')}>
                  <span aria-hidden="true">{user.name.charAt(0).toUpperCase()}</span>
                  {user.name.split(' ')[0]}
                </NavLink>
                <button type="button" className="btn btn-ghost btn-sm" onClick={handleSignOut}>
                  <Icon name="logout" size={16} className="flip-rtl" /> {t('nav.signOut')}
                </button>
              </>
            ) : (
              <>
                <NavLink to="/login" className="btn btn-ghost btn-sm">{t('nav.signIn')}</NavLink>
                <NavLink to="/register" className="btn btn-primary btn-sm">{t('nav.register')}</NavLink>
              </>
            )}
          </div>
        </nav>

        <div className="header-tools">
          <LanguageToggle className="only-desktop" />
          {user && <NotificationsBell />}
          {shopper && (
            <Link to="/cart" className="icon-btn" aria-label={t('nav.cartCount', { count })}>
              <Icon name="cart" size={22} className="flip-rtl" />
              {count > 0 && <span className="dot-count">{count}</span>}
            </Link>
          )}
          <button
            type="button"
            className="icon-btn menu-toggle"
            aria-expanded={menuOpen}
            aria-controls="main-nav"
            aria-label={t('nav.menu')}
            onClick={() => setMenuOpen((o) => !o)}
          >
            <Icon name={menuOpen ? 'close' : 'menu'} size={22} />
          </button>
        </div>
      </div>
    </header>
  );
}
