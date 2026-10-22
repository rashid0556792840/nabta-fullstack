import { useState } from 'react';
import { api } from '../../api';
import { EmptyState, ErrorState, Loading } from '../../components/ui';
import { useToast } from '../../context/ToastContext';
import { useFetch } from '../../hooks/useFetch';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { formatDateTime } from '../../utils/format';
import { sanitize } from '../../utils/validation';

/** One message card with its reply thread and an in-app reply form. */
function MessageCard({ m, onChanged }) {
  const toast = useToast();
  const [reply, setReply] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const act = async (path, method, msg) => {
    try {
      await api(path, { method });
      if (msg) toast.success(msg);
      onChanged();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const send = async (e) => {
    e.preventDefault();
    const body = sanitize(reply, 2000);
    if (body.length < 2) {
      setError('Write a reply first.');
      return;
    }
    setBusy(true);
    try {
      await api(`/admin/messages/${m._id}/reply`, { method: 'POST', body: { body } });
      toast.success(m.user ? 'Reply sent - the customer will see it under Messages.' : 'Reply sent by email.');
      setReply('');
      setError('');
      onChanged();
    } catch (err) {
      setError(err.details?.body || err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className={`card message ${m.isRead ? '' : 'unread'}`}>
      <header>
        <strong>{m.subject}</strong>
        <time className="muted" dateTime={m.createdAt}>{formatDateTime(m.createdAt)}</time>
      </header>
      <p className="muted">
        {m.name} · {m.email}{' '}
        {m.user ? <span className="badge badge-delivered">Registered customer</span> : <span className="badge badge-pending">Guest</span>}
      </p>
      <p className="message-body">{m.message}</p>

      {m.replies?.length > 0 && (
        <ul className="thread" aria-label="Replies">
          {m.replies.map((r, i) => (
            <li key={i} className="reply">
              <p className="reply-meta"><strong>{r.authorName}</strong> <span className="muted">· {formatDateTime(r.at)}</span></p>
              <p className="message-body">{r.body}</p>
            </li>
          ))}
        </ul>
      )}

      <form className="reply-form" onSubmit={send}>
        <label htmlFor={`reply-${m._id}`} className="sr-only">Reply to {m.name}</label>
        <textarea
          id={`reply-${m._id}`}
          rows={3}
          maxLength={2000}
          placeholder={`Reply to ${m.name}…`}
          value={reply}
          onChange={(e) => setReply(e.target.value)}
        />
        {error && <p className="field-error">{error}</p>}
        <div className="form-actions">
          <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>{busy ? 'Sending…' : 'Send reply'}</button>
          {!m.isRead && <button type="button" className="btn btn-outline btn-sm" onClick={() => act(`/admin/messages/${m._id}/read`, 'PATCH')}>Mark as read</button>}
          <button type="button" className="btn btn-ghost btn-sm danger" onClick={() => window.confirm('Delete this message?') && act(`/admin/messages/${m._id}`, 'DELETE', 'Message deleted.')}>Delete</button>
        </div>
        <p className="field-hint">
          {m.user ? 'Shown in the customer’s Messages page and emailed to them.' : 'This sender has no account, so the reply is sent by email.'}
        </p>
      </form>
    </li>
  );
}

export default function AdminMessages() {
  useDocumentTitle('Messages');
  const { data, loading, error, reload } = useFetch('/admin/messages');

  return (
    <>
      <header className="admin-head"><h1>Contact messages</h1></header>
      {loading && !data && <Loading />}
      {error && <ErrorState error={error} onRetry={reload} />}
      {data && data.messages.length === 0 && <EmptyState title="Inbox is empty" text="Messages from the contact form appear here." />}
      <ul className="messages">
        {data?.messages.map((m) => <MessageCard key={m._id} m={m} onChanged={reload} />)}
      </ul>
    </>
  );
}
