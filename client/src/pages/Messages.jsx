import { Link } from 'react-router-dom';
import Icon from '../components/Icon';
import { EmptyState, ErrorState, Loading } from '../components/ui';
import { useFetch } from '../hooks/useFetch';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useI18n } from '../i18n/LanguageContext';

/** Customer view: messages sent through the contact form and the store's replies. */
export default function Messages() {
  const { t, dateTime } = useI18n();
  useDocumentTitle(t('nav.messages'));
  const { data, loading, error, reload } = useFetch('/contact/mine');

  return (
    <div className="container page narrow">
      <header className="page-head order-head">
        <div>
          <h1>{t('nav.messages')}</h1>
          <p className="muted">{t('messages.text')}</p>
        </div>
        <Link to="/contact" className="btn btn-primary btn-sm"><Icon name="plus" size={16} /> {t('messages.new')}</Link>
      </header>

      {loading && <Loading />}
      {error && <ErrorState error={error} onRetry={reload} />}
      {data && data.messages.length === 0 && (
        <EmptyState icon="mail" title={t('messages.noneTitle')} text={t('messages.noneText')} action={<Link to="/contact" className="btn btn-primary">{t('nav.contact')}</Link>} />
      )}

      <ul className="messages">
        {data?.messages.map((m) => (
          <li key={m._id} className="card message">
            <header>
              <strong>{m.subject}</strong>
              <span className={`badge ${m.replies.length ? 'badge-completed' : 'badge-pending'}`}>
                {m.replies.length ? t('messages.answered') : t('messages.waiting')}
              </span>
            </header>
            <p className="muted small">{t('messages.youWrote')} · {dateTime(m.createdAt)}</p>
            <p className="message-body">{m.message}</p>
            {m.replies.length > 0 && (
              <ul className="thread" aria-label={t('messages.replies')}>
                {m.replies.map((r, i) => (
                  <li key={i} className="reply">
                    <p className="reply-meta"><strong>{r.authorName}</strong> <span className="muted">· {t('messages.team')} · {dateTime(r.at)}</span></p>
                    <p className="message-body">{r.body}</p>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
