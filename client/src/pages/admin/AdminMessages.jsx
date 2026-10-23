import { useState } from 'react';
import { api } from '../../api';
import Icon from '../../components/Icon';
import { EmptyState, ErrorState, Loading, useConfirm } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useFetch } from '../../hooks/useFetch';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useI18n } from '../../i18n/LanguageContext';
import { sanitize } from '../../utils/validation';

/** One message card with its reply thread and an in-app reply form. */
function MessageCard({ m, onChanged }) {
  const { t, dateTime, errorText, serverText } = useI18n();
  const { isAdmin } = useAuth();
  const toast = useToast();
  const [confirm, confirmDialog] = useConfirm();
  const [reply, setReply] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const act = async (path, method, msg) => {
    try {
      await api(path, { method });
      if (msg) toast.success(msg);
      onChanged();
    } catch (err) {
      toast.error(errorText(err));
    }
  };

  const send = async (e) => {
    e.preventDefault();
    const body = sanitize(reply, 2000);
    if (body.length < 2) {
      setError(t('messages.writeFirst'));
      return;
    }
    setBusy(true);
    try {
      await api(`/admin/messages/${m._id}/reply`, { method: 'POST', body: { body } });
      toast.success(m.user ? t('messages.sentInApp') : t('messages.sentEmail'));
      setReply('');
      setError('');
      onChanged();
    } catch (err) {
      setError(err.details?.body ? serverText(err.details.body) : errorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className={`card message ${m.isRead ? '' : 'unread'}`}>
      {confirmDialog}
      <header>
        <strong>{m.subject}</strong>
        <time className="muted" dateTime={m.createdAt}>{dateTime(m.createdAt)}</time>
      </header>
      <p className="muted">
        {m.name} · <span dir="ltr">{m.email}</span>{' '}
        {m.user ? <span className="badge badge-completed">{t('messages.registered')}</span> : <span className="badge badge-pending">{t('messages.guest')}</span>}
      </p>
      <p className="message-body">{m.message}</p>

      {m.replies?.length > 0 && (
        <ul className="thread" aria-label={t('messages.replies')}>
          {m.replies.map((r, i) => (
            <li key={i} className="reply">
              <p className="reply-meta"><strong>{r.authorName}</strong> <span className="muted">· {dateTime(r.at)}</span></p>
              <p className="message-body">{r.body}</p>
            </li>
          ))}
        </ul>
      )}

      <form className="reply-form" onSubmit={send}>
        <label htmlFor={`reply-${m._id}`} className="sr-only">{t('messages.replyTo', { name: m.name })}</label>
        <textarea
          id={`reply-${m._id}`}
          rows={3}
          maxLength={2000}
          placeholder={t('messages.replyTo', { name: m.name })}
          value={reply}
          onChange={(e) => setReply(e.target.value)}
        />
        {error && <p className="field-error">{error}</p>}
        <div className="form-actions">
          <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>{busy ? t('contact.sending') : t('messages.send')}</button>
          {!m.isRead && <button type="button" className="btn btn-outline btn-sm" onClick={() => act(`/admin/messages/${m._id}/read`, 'PATCH')}><Icon name="check" size={16} /> {t('messages.markRead')}</button>}
          {isAdmin && (
            <button
              type="button"
              className="btn btn-ghost btn-sm danger"
              onClick={async () => (await confirm(t('messages.deleteConfirm'))) && act(`/admin/messages/${m._id}`, 'DELETE', t('messages.deleted'))}
            >
              <Icon name="trash" size={16} /> {t('common.delete')}
            </button>
          )}
        </div>
        <p className="field-hint">{m.user ? t('messages.hintAccount') : t('messages.hintGuest')}</p>
      </form>
    </li>
  );
}

export default function AdminMessages() {
  const { t } = useI18n();
  useDocumentTitle(t('admin.nav.messages'));
  const { data, loading, error, reload } = useFetch('/admin/messages');

  return (
    <>
      <header className="admin-head"><h1>{t('admin.nav.messages')}</h1></header>
      {loading && !data && <Loading />}
      {error && <ErrorState error={error} onRetry={reload} />}
      {data && data.messages.length === 0 && <EmptyState icon="mail" title={t('messages.inboxEmpty')} text={t('messages.inboxEmptyText')} />}
      <ul className="messages">
        {data?.messages.map((m) => <MessageCard key={m._id} m={m} onChanged={reload} />)}
      </ul>
    </>
  );
}
