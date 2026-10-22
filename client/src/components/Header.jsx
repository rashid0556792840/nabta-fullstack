import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

export default function Header() {
  const { user, isAdmin, signOut } = useAuth();
  const { count } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

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
        <Link to="/" className="brand" aria-label="Nabta home">
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 64 64"><path d="M32 52C21 43 17 30 23 17c9 6 12 19 9 35Z" /><path d="M32 52c11-9 16-20 12-33-9 6-13 18-12 33Z" opacity=".7" /></svg>
          </span>
          <span>
            <strong>Nabta</strong>
            <small>Plants &amp; garden</small>
          </span>
        </Link>

        <button
          type="button"
          className="menu-toggle"
          aria-expanded={menuOpen}
          aria-controls="main-nav"
          onClick={() => setMenuOpen((o) => !o)}
        >
          <span className="sr-only">Menu</span>
          <span aria-hidden="true">{menuOpen ? '✕' : '☰'}</span>
        </button>

        <nav id="main-nav" className={`main-nav ${menuOpen ? 'open' : ''}`} aria-label="Main">
          <NavLink to="/" end>Home</NavLink>
          <NavLink to="/shop">Shop</NavLink>
          <NavLink to="/about">About</NavLink>
          <NavLink to="/contact">Contact</NavLink>
          {user && <NavLink to="/orders">My orders</NavLink>}
          {user && <NavLink to="/favorites">Favourites</NavLink>}
          {isAdmin && <NavLink to="/admin" className="nav-admin">Admin</NavLink>}
          <div className="nav-account">
            {user ? (
              <>
                <NavLink to="/account" className="account-chip" title="Account settings">
                  <span aria-hidden="true">{user.name.charAt(0).toUpperCase()}</span>
                  {user.name.split(' ')[0]}
                </NavLink>
                <button type="button" className="btn btn-ghost btn-sm" onClick={handleSignOut}>Sign out</button>
              </>
            ) : (
              <>
                <NavLink to="/login" className="btn btn-ghost btn-sm">Sign in</NavLink>
                <NavLink to="/register" className="btn btn-primary btn-sm">Register</NavLink>
              </>
            )}
          </div>
        </nav>

        <Link to="/cart" className="cart-link" aria-label={`Cart, ${count} items`}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6h15l-1.5 9h-12z" /><path d="M6 6 5 3H2" /><circle cx="9" cy="20" r="1.4" /><circle cx="18" cy="20" r="1.4" /></svg>
          {count > 0 && <span className="cart-count">{count}</span>}
        </Link>
      </div>
    </header>
  );
}
