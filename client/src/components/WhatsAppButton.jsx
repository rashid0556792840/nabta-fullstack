import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCompany } from '../context/CompanyContext';
import { useI18n } from '../i18n/LanguageContext';
import Icon from './Icon';

/** Floating "chat on WhatsApp" button for customers (hidden in the admin and driver screens). */
export default function WhatsAppButton() {
  const { whatsappLink } = useCompany();
  const { isStaff, isDriver } = useAuth();
  const { t } = useI18n();
  const { pathname } = useLocation();
  const href = whatsappLink(t('contact.whatsappHello'));
  if (!href || isStaff || isDriver || pathname.startsWith('/admin') || pathname.startsWith('/delivery')) return null;
  return (
    <a className="wa-float" href={href} target="_blank" rel="noopener noreferrer" aria-label={t('contact.whatsapp')}>
      <Icon name="whatsapp" size={26} strokeWidth={1.7} />
    </a>
  );
}
