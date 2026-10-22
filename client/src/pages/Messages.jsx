import { Link } from 'react-router-dom';
import { EmptyState, ErrorState, Loading } from '../components/ui';
import { useFetch } from '../hooks/useFetch';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { formatDateTime } from '../utils/format';

/** Customer view: messages sent through the contact form and the store's replies. */
export default function Messages() {
  useDocumentTitle('Messages');
  const { data, loading, error, reload } = useFetch('/contact/mine');

  return (
    <div className="container page narrow">
      <header className="page-head order-head">
        <div>
          <h1>Messages</h1>
          <p className="muted">Your questions to the Nabta team and our replies.</p>
        </div>
        <Link to="/contact" className="btn btn-primary btn-sm">New message</Link>
      </header>

      {loading && <Loading />}
      {error && <ErrorState error={error} onRetry={reload} />}
      {data && data.messages.length === 0 && (
        <EmptyState title="No messages yet" text="Questions you send from the contact page appear here with our replies." action={<Link to="/contact" className="btn btn-primary">Contact us</Link>} />
      )}

      <ul className="messages">
        {data?.messages.map((m) => (
          <li key={m._id} className="card message">
            <header>
              <strong>{m.subject}</strong>
              <span className={`badge ${m.replies.length ? 'badge-delivered' : 'badge-pending'}`}>
                {m.replies.length ? 'Answered' : 'Waiting for reply'}
              </span>
            </header>
            <p className="muted small">You wrote · {formatDateTime(m.createdAt)}</p>
            <p className="message-body">{m.message}</p>
            {m.replies.length > 0 && (
              <ul className="thread" aria-label="Replies from Nabta">
                {m.replies.map((r, i) => (
                  <li key={i} className="reply">
                    <p className="reply-meta"><strong>{r.authorName}</strong> <span className="muted">· Nabta team · {formatDateTime(r.at)}</span></p>
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
