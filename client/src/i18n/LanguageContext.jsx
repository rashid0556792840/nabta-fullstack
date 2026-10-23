// Arabic / English support. Arabic is the default and switches the whole page to right-to-left.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { MESSAGES, SERVER_TEXT_AR } from './messages';

const LanguageContext = createContext(null);
const STORAGE_KEY = 'nabta.lang';

function initialLang() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'ar' || saved === 'en') return saved;
  } catch { /* ignore */ }
  return 'ar';
}

function interpolate(text, params) {
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (m, k) => (params[k] !== undefined && params[k] !== null ? String(params[k]) : m));
}

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(initialLang);
  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  // Keep <html lang dir> in sync so the browser, screen readers and CSS logical properties follow
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
    try { localStorage.setItem(STORAGE_KEY, lang); } catch { /* ignore */ }
  }, [lang, dir]);

  const setLang = useCallback((next) => setLangState(next === 'en' ? 'en' : 'ar'), []);

  const value = useMemo(() => {
    const dict = MESSAGES[lang];
    const plural = new Intl.PluralRules(lang);
    const locale = lang === 'ar' ? 'ar-SA-u-nu-latn-ca-gregory' : 'en-GB';
    // Whole riyals show without decimals (SAR 25), halalas with two (SAR 27.50)
    const moneyLocale = lang === 'ar' ? 'ar-SA-u-nu-latn' : 'en-US';
    const moneyWhole = new Intl.NumberFormat(moneyLocale, { style: 'currency', currency: 'SAR', maximumFractionDigits: 0 });
    const moneyCents = new Intl.NumberFormat(moneyLocale, { style: 'currency', currency: 'SAR', minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const number = new Intl.NumberFormat(locale);

    /** t('cart.title') or t('cart.items', { count: 3 }) - picks the plural form when `count` is given */
    const t = (key, params) => {
      let text;
      if (params && typeof params.count === 'number') {
        text = dict[`${key}.${plural.select(params.count)}`] ?? dict[`${key}.other`];
      }
      text = text ?? dict[key] ?? MESSAGES.en[key] ?? key;
      return interpolate(text, params);
    };

    /** Shows the Arabic field (nameAr) in Arabic and the English field (name) in English, with fallback */
    const pick = (obj, field = 'name') => {
      if (!obj) return '';
      const ar = obj[`${field}Ar`];
      const en = obj[field] ?? obj[`${field}En`];
      return lang === 'ar' ? ar || en || '' : en || ar || '';
    };

    /** Translates an API error using its code, falling back to the server message */
    const errorText = (err) => {
      if (!err) return '';
      if (err.code && dict[`errors.${err.code}`]) return t(`errors.${err.code}`, { ...err.params, name: err.params?.[lang === 'ar' ? 'nameAr' : 'name'] || err.params?.name });
      return serverText(err.message);
    };

    /** Field messages from the server are English sentences; translate the known ones */
    const serverText = (msg) => (lang === 'ar' && msg ? SERVER_TEXT_AR[msg] || msg : msg || '');
    const fieldErrors = (details) => Object.fromEntries(Object.entries(details || {}).map(([k, v]) => [k, serverText(v)]));

    return {
      lang,
      dir,
      setLang,
      t,
      pick,
      errorText,
      fieldErrors,
      serverText,
      money: (n) => {
        const v = Math.round((Number(n) || 0) * 100) / 100;
        return (Number.isInteger(v) ? moneyWhole : moneyCents).format(v);
      },
      number: (n) => number.format(Number(n) || 0),
      date: (d) => new Date(d).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' }),
      dateTime: (d) => new Date(d).toLocaleString(locale, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }),
      weekday: (d) => new Date(d).toLocaleDateString(locale, { weekday: 'short' }),
      status: (s) => dict[`status.${s}`] || s,
      join: (parts) => parts.filter(Boolean).join(lang === 'ar' ? '، ' : ', '),
      grams: (g) => (g ? (g >= 1000 ? t('unit.kg', { n: number.format(g / 1000) }) : t('unit.g', { n: number.format(g) })) : ''),
    };
  }, [lang, dir, setLang]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useI18n must be used inside <LanguageProvider>');
  return ctx;
}
