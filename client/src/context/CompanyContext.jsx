// Company details (name, phone, WhatsApp, address, map, social links, logo) loaded once from the API.
// The admin edits them under Admin → Company, and the whole site updates.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, imageSrc } from '../api';

const CompanyContext = createContext(null);

const FALLBACK = {
  nameEn: 'Nabta Spices',
  nameAr: 'بهارات نبتة',
  phone: '0531130555',
  whatsapp: '966531130555',
  foundedYear: 2018,
  deliveryFee: 15,
  freeDeliveryFrom: 200,
};

export const BUNDLED_LOGO = `${import.meta.env.BASE_URL}logo.png`;

export function CompanyProvider({ children }) {
  const [company, setCompany] = useState(FALLBACK);
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(() => {
    api('/company')
      .then((data) => setCompany({ ...FALLBACK, ...data.company }))
      .catch(() => { /* keep the fallback so the site still works offline */ })
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const value = useMemo(() => {
    const fee = Number(company.deliveryFee) || 0;
    const freeFrom = Number(company.freeDeliveryFrom) || 0;
    return {
      company,
      loaded,
      reload,
      setCompany,
      logo: company.logoUrl ? imageSrc(company.logoUrl) : BUNDLED_LOGO,
      deliveryFee: fee,
      freeDeliveryFrom: freeFrom,
      /** Same rule as the server: free above the threshold (0 disables free delivery) */
      deliveryFor: (subtotal) => (subtotal === 0 || (freeFrom > 0 && subtotal >= freeFrom) ? 0 : fee),
      whatsappLink: (text = '') => (company.whatsapp ? `https://wa.me/${company.whatsapp}${text ? `?text=${encodeURIComponent(text)}` : ''}` : ''),
    };
  }, [company, loaded, reload]);

  return <CompanyContext.Provider value={value}>{children}</CompanyContext.Provider>;
}

export function useCompany() {
  const ctx = useContext(CompanyContext);
  if (!ctx) throw new Error('useCompany must be used inside <CompanyProvider>');
  return ctx;
}
