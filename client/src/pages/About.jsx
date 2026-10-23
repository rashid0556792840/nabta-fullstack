import { Link } from 'react-router-dom';
import Icon from '../components/Icon';
import { useCompany } from '../context/CompanyContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useI18n } from '../i18n/LanguageContext';

export default function About() {
  const { t, pick, number } = useI18n();
  useDocumentTitle(t('nav.about'));
  const { company, logo } = useCompany();
  const since = company.foundedYear || 2018;
  const now = new Date().getFullYear();

  // The story from the founding year to today
  const timeline = [
    { year: since, title: t('about.t1'), text: t('about.t1Text') },
    { year: now, title: t('about.t4'), text: t('about.t4Text') },
  ];

  return (
    <div className="container page">
      <article className="about">
        <header className="about-hero">
          <div>
            <p className="kicker">{t('about.kicker', { year: since })}</p>
            <h1>{t('about.title')}</h1>
            <p className="lead-dark">{t('about.lead', { name: pick(company, 'name'), year: since, years: number(now - since) })}</p>
          </div>
          <img src={logo} alt={pick(company, 'name')} className="about-logo" />
        </header>

        <section className="story card">
          <h2>{t('about.storyTitle')}</h2>
          <p>{t('about.story1', { year: since })}</p>
          <p>{t('about.story2')}</p>
          <p>{t('about.story3')}</p>
        </section>

        <section aria-labelledby="timeline-title" className="section">
          <h2 id="timeline-title">{t('about.timelineTitle')}</h2>
          <ol className="timeline">
            {timeline.map((s) => (
              <li key={s.year}>
                <span className="timeline-year">{s.year}</span>
                <div>
                  <h3>{s.title}</h3>
                  <p>{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="about-grid">
          <div className="card value">
            <Icon name="shield" size={28} />
            <h3>{t('about.v1')}</h3>
            <p>{t('about.v1Text')}</p>
          </div>
          <div className="card value">
            <Icon name="leaf" size={28} />
            <h3>{t('about.v2')}</h3>
            <p>{t('about.v2Text')}</p>
          </div>
          <div className="card value">
            <Icon name="users" size={28} />
            <h3>{t('about.v3')}</h3>
            <p>{t('about.v3Text')}</p>
          </div>
        </section>

        <figure className="quote">
          <blockquote>{t('about.quote')}</blockquote>
          <figcaption>{pick(company, 'name')}</figcaption>
        </figure>
        <Link to="/shop" className="btn btn-primary btn-lg">{t('home.shopNow')}</Link>
      </article>
    </div>
  );
}
