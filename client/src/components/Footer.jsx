import { Link } from 'react-router-dom';
import { useCompany } from '../context/CompanyContext';
import { useI18n } from '../i18n/LanguageContext';
import Icon from './Icon';

const SOCIAL = [
  ['instagramUrl', 'instagram', 'Instagram'],
  ['xUrl', 'x', 'X'],
  ['snapchatUrl', 'snapchat', 'Snapchat'],
  ['tiktokUrl', 'tiktok', 'TikTok'],
];

export default function Footer() {
  const { company, logo, whatsappLink, freeDeliveryFrom } = useCompany();
  const { t, pick, money } = useI18n();
  const socials = SOCIAL.filter(([field]) => company[field]);

  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <section className="footer-brand">
          <img src={logo} alt={pick(company, 'name')} className="footer-logo" width="140" height="65" />
          <p>{t('footer.about', { year: company.foundedYear || 2018 })}</p>
          {socials.length > 0 && (
            <ul className="socials" aria-label={t('footer.follow')}>
              {socials.map(([field, icon, label]) => (
                <li key={field}>
                  <a href={company[field]} target="_blank" rel="noopener noreferrer" aria-label={label}>
                    <Icon name={icon} size={18} />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>
        <nav aria-label={t('footer.shop')}>
          <h2 className="footer-title">{t('footer.shop')}</h2>
          <ul>
            <li><Link to="/shop">{t('footer.allProducts')}</Link></li>
            <li><Link to="/cart">{t('nav.cart')}</Link></li>
            <li><Link to="/orders">{t('footer.track')}</Link></li>
          </ul>
        </nav>
        <nav aria-label={t('footer.company')}>
          <h2 className="footer-title">{t('footer.company')}</h2>
          <ul>
            <li><Link to="/about">{t('nav.about')}</Link></li>
            <li><Link to="/contact">{t('nav.contact')}</Link></li>
          </ul>
        </nav>
        <section>
          <h2 className="footer-title">{t('footer.reach')}</h2>
          <ul className="footer-contact">
            {company.phone && (
              <li><Icon name="phone" size={16} /> <a href={`tel:${company.phone}`} dir="ltr">{company.phone}</a></li>
            )}
            {company.whatsapp && (
              <li><Icon name="whatsapp" size={16} /> <a href={whatsappLink()} target="_blank" rel="noopener noreferrer">{t('contact.whatsapp')}</a></li>
            )}
            {pick(company, 'address') && (
              <li>
                <Icon name="pin" size={16} />{' '}
                {company.mapsUrl ? <a href={company.mapsUrl} target="_blank" rel="noopener noreferrer">{pick(company, 'address')}</a> : pick(company, 'address')}
              </li>
            )}
            {company.email && <li><Icon name="mail" size={16} /> <a href={`mailto:${company.email}`}>{company.email}</a></li>}
          </ul>
          {freeDeliveryFrom > 0 && <p className="footer-note">{t('footer.delivery', { amount: money(freeDeliveryFrom) })}</p>}
        </section>
      </div>
      <p className="container footer-bottom">© {new Date().getFullYear()} {pick(company, 'name')} · {t('footer.rights')}</p>
    </footer>
  );
}
