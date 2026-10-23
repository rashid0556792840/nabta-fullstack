// In-app notifications: the bell polls the API every 30 seconds while the tab is visible.
// Each notification is stored as a type + data, so it is shown in the reader's language.
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useI18n } from '../i18n/LanguageContext';
import Icon from './Icon';

const POLL_MS = 30000;

export function useNotificationText() {
  const { t, status, money, lang } = useI18n();
  return (n) => {
    const d = n.data || {};
    return t(`notif.${n.type}`, {
      ...d,
      status: d.status ? status(d.status) : '',
      total: d.total !== undefined ? money(d.total) : '',
      name: lang === 'ar' ? d.nameAr || d.name : d.name,
    });
  };
}

export default function NotificationsBell() {
  const { t, dateTime } = useI18n();
  const text = useNotificationText();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState({ notifications: [], unread: 0 });
  const boxRef = useRef(null);

  const load = useCallback(() => {
    api('/notifications').then(setData).catch(() => { /* try again on the next poll */ });
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') load();
    }, POLL_MS);
    const onVisible = () => document.visibilityState === 'visible' && load();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [load]);

  // Close when clicking outside or pressing Escape
  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => boxRef.current && !boxRef.current.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const openItem = async (n) => {
    setOpen(false);
    if (!n.readAt) {
      setData((d) => ({
        unread: Math.max(0, d.unread - 1),
        notifications: d.notifications.map((x) => (x._id === n._id ? { ...x, readAt: new Date().toISOString() } : x)),
      }));
      api(`/notifications/${n._id}/read`, { method: 'PATCH' }).catch(() => {});
    }
    if (n.link) navigate(n.link);
  };

  const readAll = async () => {
    await api('/notifications/read-all', { method: 'POST' }).catch(() => {});
    load();
  };

  return (
    <div className="bell" ref={boxRef}>
      <button
        type="button"
        className="icon-btn"
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={t('notif.title') + (data.unread ? ` (${data.unread})` : '')}
        onClick={() => {
          setOpen((o) => !o);
          if (!open) load();
        }}
      >
        <Icon name="bell" size={22} />
        {data.unread > 0 && <span className="dot-count">{data.unread > 9 ? '9+' : data.unread}</span>}
      </button>
      {open && (
        <div className="bell-panel" role="region" aria-label={t('notif.title')}>
          <header>
            <strong>{t('notif.title')}</strong>
            {data.unread > 0 && <button type="button" className="link-btn" onClick={readAll}>{t('notif.readAll')}</button>}
          </header>
          {data.notifications.length === 0 ? (
            <p className="bell-empty">{t('notif.empty')}</p>
          ) : (
            <ul>
              {data.notifications.map((n) => (
                <li key={n._id}>
                  <button type="button" className={`bell-item ${n.readAt ? '' : 'unread'}`} onClick={() => openItem(n)}>
                    <span className={`bell-icon type-${n.type}`} aria-hidden="true"><Icon name={ICONS[n.type] || 'bell'} size={16} /></span>
                    <span>
                      <span className="bell-text">{text(n)}</span>
                      <time dateTime={n.createdAt}>{dateTime(n.createdAt)}</time>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

const ICONS = {
  order_placed: 'cart',
  order_status: 'box',
  delivery_assigned: 'truck',
  delivery_accepted: 'truck',
  delivery_done: 'check',
  delivery_cancelled: 'close',
  stock_low: 'tag',
  message_new: 'mail',
  message_reply: 'mail',
};
