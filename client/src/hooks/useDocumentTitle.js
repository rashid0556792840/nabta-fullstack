import { useEffect } from 'react';
import { useI18n } from '../i18n/LanguageContext';
import { useCompany } from '../context/CompanyContext';

/** Sets the browser tab title, e.g. "Shop | Nabta Spices", in the current language. */
export function useDocumentTitle(title) {
  const { pick } = useI18n();
  const { company } = useCompany();
  const brand = pick(company, 'name');
  const tagline = pick(company, 'tagline');
  useEffect(() => {
    document.title = title ? `${title} | ${brand}` : [brand, tagline].filter(Boolean).join(' | ');
  }, [title, brand, tagline]);
}
