import { useState } from 'react';
import { api } from '../../api';
import Icon from '../../components/Icon';
import { ErrorState, Loading } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useDebounce } from '../../hooks/useDebounce';
import { useFetch } from '../../hooks/useFetch';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useI18n } from '../../i18n/LanguageContext';

const ROLES = ['customer', 'supervisor', 'delivery', 'admin'];

export default function AdminUsers() {
  const { t, date, money, number, errorText } = useI18n();
  useDocumentTitle(t('admin.nav.users'));
  const { user: me } = useAuth();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [role, setRole] = useState('');
  const debounced = useDebounce(q);
  const { data, loading, error, reload } = useFetch(`/admin/users?q=${encodeURIComponent(debounced)}${role ? `&role=${role}` : ''}`);

  const update = async (u, body, msg) => {
    try {
      await api(`/admin/users/${u._id}`, { method: 'PATCH', body });
      toast.success(msg);
      reload();
    } catch (err) {
      toast.error(errorText(err));
    }
  };

  return (
    <>
      <header className="admin-head"><h1>{t('users.title')}</h1></header>
      <p className="muted small">{t('users.hint')}</p>
      <div className="toolbar">
        <span className="input-icon grow">
          <Icon name="search" size={18} />
          <input type="search" placeholder={t('users.search')} value={q} onChange={(e) => setQ(e.target.value)} aria-label={t('users.search')} />
        </span>
        <label className="sort">
          {t('users.role')}
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="">{t('adminOrders.all')}</option>
            {ROLES.map((r) => <option key={r} value={r}>{t(`role.${r}`)}</option>)}
          </select>
        </label>
      </div>
      {loading && !data && <Loading />}
      {error && <ErrorState error={error} onRetry={reload} />}
      {data && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">{t('users.name')}</th>
                <th scope="col">{t('users.role')}</th>
                <th scope="col">{t('users.joined')}</th>
                <th scope="col">{t('admin.nav.orders')}</th>
                <th scope="col" className="num">{t('users.spent')}</th>
                <th scope="col">{t('users.account')}</th>
              </tr>
            </thead>
            <tbody>
              {data.users.map((u) => {
                const self = String(u._id) === String(me._id);
                return (
                  <tr key={u._id} className={u.isActive ? '' : 'row-disabled'}>
                    <td>{u.name}<br /><small className="muted" dir="ltr">{u.email}</small></td>
                    <td>
                      {self ? (
                        <span className={`badge role-${u.role}`}>{t(`role.${u.role}`)}</span>
                      ) : (
                        <select
                          className="role-select"
                          value={u.role}
                          aria-label={t('users.roleFor', { name: u.name })}
                          onChange={(e) => update(u, { role: e.target.value }, t('users.roleChanged', { name: u.name, role: t(`role.${e.target.value}`) }))}
                        >
                          {ROLES.map((r) => <option key={r} value={r}>{t(`role.${r}`)}</option>)}
                        </select>
                      )}
                    </td>
                    <td>{date(u.createdAt)}</td>
                    <td>{number(u.orderCount)}</td>
                    <td className="num">{money(u.totalSpent)}</td>
                    <td className="actions">
                      {self ? (
                        <span className="muted">{t('users.you')}</span>
                      ) : (
                        <button
                          type="button"
                          className={`btn btn-sm ${u.isActive ? 'btn-ghost danger' : 'btn-outline'}`}
                          onClick={() => update(u, { isActive: !u.isActive }, u.isActive ? t('users.disabled') : t('users.enabled'))}
                        >
                          {u.isActive ? t('users.disable') : t('users.enable')}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
