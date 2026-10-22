import { Link } from 'react-router-dom';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export default function About() {
  useDocumentTitle('About');
  return (
    <div className="container page">
      <article className="about">
        <header className="page-head">
          <p className="kicker">Our story</p>
          <h1>Growing greener homes, one plant at a time.</h1>
        </header>
        <div className="about-grid">
          <section className="card">
            <h2>What we do</h2>
            <p>Nabta (نبتة, "a sprout") is an online plant store. We hand-pick indoor and outdoor plants, pots and care essentials, and deliver them with cash on delivery.</p>
          </section>
          <section className="card">
            <h2>How it works</h2>
            <ol>
              <li>Browse the catalogue and add items to your cart.</li>
              <li>Check out with your delivery address.</li>
              <li>Track your order as it moves from pending to delivered.</li>
            </ol>
          </section>
          <section className="card">
            <h2>Built with</h2>
            <p>React (Vite) on the front end, a Node.js + Express REST API, and MongoDB for data. Deployed on Render.</p>
          </section>
        </div>
        <figure className="quote">
          <blockquote>“The best time to plant a tree was 20 years ago. The second best time is now.”</blockquote>
          <figcaption>Proverb</figcaption>
        </figure>
        <Link to="/shop" className="btn btn-primary">Start shopping</Link>
      </article>
    </div>
  );
}
