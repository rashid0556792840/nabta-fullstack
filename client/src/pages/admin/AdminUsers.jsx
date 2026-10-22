import { useState } from 'react';
import { api } from '../../api';
import { ErrorState, Loading } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useDebounce } from '../../hooks/useDebounce';
import { useFetch } from '../../hooks/useFetch';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { formatDate, formatMoney } from '../../utils/format';

export default function AdminUsers() {
  useDocumentTitle('Customers');
  const { user: me } = useAuth();
  const toast = useToast();
  const [q, setQ] = useState('');
  const debounced = useDebounce(q);
  const { data, loading, error, reload } = useFetch(`/admin/users?q=${encodeURIComponent(debounced)}`);

  const update = async (u, body, msg) => {
    try {
      await api(`/admin/users/${u._id}`, { method: 'PATCH', body });
      toast.success(msg);
      reload();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <>
      <header className="admin-head"><h1>Customers &amp; accounts</h1></header>
      <input type="search" className="admin-search" placeholder="Search by name or email…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search users" />
      {loading && <Loading />}
      {error && <ErrorState error={error} onRetry={reload} />}
      {data && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th scope="col">Name</th><th scope="col">Role</th><th scope="col">Joined</th><th scope="col">Orders</th><th scope="col" className="num">Spent</th><th scope="col">Account</th></tr>
            </thead>
            <tbody>
              {data.users.map((u) => (
                <tr key={u._id}>
                  <td>{u.name}<br /><small className="muted">{u.email}</small></td>
                  <td>{u.role === 'admin' ? <span className="badge badge-confirmed">Admin</span> : 'Customer'}</td>
                  <td>{formatDate(u.createdAt)}</td>
                  <td>{u.orderCount}</td>
                  <td className="num">{formatMoney(u.totalSpent)}</td>
                  <td className="actions">
                    {String(u._id) === String(me._id) ? (
                      <span className="muted">You</span>
                    ) : (
                      <button
                        type="button"
                        className={`btn btn-sm ${u.isActive ? 'btn-ghost danger' : 'btn-outline'}`}
                        onClick={() => update(u, { isActive: !u.isActive }, u.isActive ? 'Account disabled.' : 'Account enabled.')}
                      >
                        {u.isActive ? 'Disable' : 'Enable'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
