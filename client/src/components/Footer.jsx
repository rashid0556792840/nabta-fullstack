import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <section>
          <h2 className="footer-title">Nabta</h2>
          <p>Thoughtfully chosen plants and garden essentials, delivered across the Kingdom.</p>
        </section>
        <nav aria-label="Shop links">
          <h2 className="footer-title">Shop</h2>
          <ul>
            <li><Link to="/shop">All products</Link></li>
            <li><Link to="/cart">Cart</Link></li>
            <li><Link to="/orders">Track orders</Link></li>
          </ul>
        </nav>
        <nav aria-label="Company links">
          <h2 className="footer-title">Company</h2>
          <ul>
            <li><Link to="/about">About us</Link></li>
            <li><Link to="/contact">Contact</Link></li>
          </ul>
        </nav>
        <section>
          <h2 className="footer-title">Delivery</h2>
          <p>Free delivery on orders over SAR 200. Cash on delivery.</p>
        </section>
      </div>
      <p className="container footer-bottom">© {new Date().getFullYear()} Nabta · Group 3 Full Stack Development project</p>
    </footer>
  );
}
