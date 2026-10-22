import { api } from '../../api';
import { EmptyState, ErrorState, Loading } from '../../components/ui';
import { useToast } from '../../context/ToastContext';
import { useFetch } from '../../hooks/useFetch';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { formatDateTime } from '../../utils/format';

export default function AdminMessages() {
  useDocumentTitle('Messages');
  const toast = useToast();
  const { data, loading, error, reload } = useFetch('/admin/messages');

  const act = async (path, method, msg) => {
    try {
      await api(path, { method });
      if (msg) toast.success(msg);
      reload();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <>
      <header className="admin-head"><h1>Contact messages</h1></header>
      {loading && <Loading />}
      {error && <ErrorState error={error} onRetry={reload} />}
      {data && data.messages.length === 0 && <EmptyState title="Inbox is empty" text="Messages from the contact form appear here." />}
      <ul className="messages">
        {data?.messages.map((m) => (
          <li key={m._id} className={`card message ${m.isRead ? '' : 'unread'}`}>
            <header>
              <strong>{m.subject}</strong>
              <time className="muted" dateTime={m.createdAt}>{formatDateTime(m.createdAt)}</time>
            </header>
            <p className="muted">{m.name} · <a href={`mailto:${m.email}?subject=${encodeURIComponent(`Re: ${m.subject}`)}`}>{m.email}</a></p>
            <p className="message-body">{m.message}</p>
            <div className="form-actions">
              {!m.isRead && <button type="button" className="btn btn-outline btn-sm" onClick={() => act(`/admin/messages/${m._id}/read`, 'PATCH')}>Mark as read</button>}
              <a className="btn btn-primary btn-sm" href={`mailto:${m.email}?subject=${encodeURIComponent(`Re: ${m.subject}`)}`}>Reply</a>
              <button type="button" className="btn btn-ghost btn-sm danger" onClick={() => window.confirm('Delete this message?') && act(`/admin/messages/${m._id}`, 'DELETE', 'Message deleted.')}>Delete</button>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
