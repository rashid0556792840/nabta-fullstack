import { Link } from 'react-router-dom';
import { EmptyState } from '../components/ui';
import { useI18n } from '../i18n/LanguageContext';

export default function NotFound() {
  const { t } = useI18n();
  return (
    <div className="container page">
      <EmptyState icon="search" title={t('notFound.title')} text={t('notFound.text')} action={<Link to="/" className="btn btn-primary">{t('notFound.home')}</Link>} />
    </div>
  );
}
