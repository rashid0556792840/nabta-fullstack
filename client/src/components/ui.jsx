// Small reusable UI pieces
import { useState } from 'react';
import { imageSrc } from '../api';
import { useI18n } from '../i18n/LanguageContext';
import Icon from './Icon';

export function Loading({ label }) {
  const { t } = useI18n();
  return (
    <div className="state" role="status">
      <span className="spinner" aria-hidden="true" />
      <p>{label || t('common.loading')}</p>
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  const { t, errorText } = useI18n();
  return (
    <div className="state state-error" role="alert">
      <p>{errorText(error) || t('errors.server_error')}</p>
      {onRetry && (
        <button type="button" className="btn btn-outline btn-sm" onClick={onRetry}>
          <Icon name="refresh" size={16} /> {t('common.retry')}
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, text, action, icon = 'box' }) {
  return (
    <div className="state state-empty">
      <span className="state-icon" aria-hidden="true"><Icon name={icon} size={30} /></span>
      <h2>{title}</h2>
      {text && <p>{text}</p>}
      {action}
    </div>
  );
}

export function StatusBadge({ status }) {
  const { status: label } = useI18n();
  return <span className={`badge badge-${status}`}>{label(status)}</span>;
}

/** Product image with a placeholder when there is no image or it fails to load. */
export function ProductImage({ src, alt, className = '' }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className={`img-placeholder ${className}`} role="img" aria-label={alt}>
        <Icon name="leaf" size={36} />
      </div>
    );
  }
  return <img className={className} src={imageSrc(src)} alt={alt} loading="lazy" onError={() => setFailed(true)} />;
}

/** Labelled form field that shows its validation message. */
export function Field({ label, error, hint, children, id, className = '' }) {
  return (
    <div className={`field ${error ? 'has-error' : ''} ${className}`}>
      <label htmlFor={id}>{label}</label>
      {children}
      {error ? (
        <p className="field-error" id={`${id}-error`}>{error}</p>
      ) : (
        hint && <p className="field-hint">{hint}</p>
      )}
    </div>
  );
}

/** Previous / next page buttons */
export function Pagination({ page, pages, onPage }) {
  const { t } = useI18n();
  if (!pages || pages <= 1) return null;
  return (
    <nav className="pagination" aria-label={t('common.pages')}>
      <button type="button" className="btn btn-outline btn-sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        <Icon name="back" size={16} className="flip-rtl" /> {t('common.prev')}
      </button>
      <span>{t('common.pageOf', { page, pages })}</span>
      <button type="button" className="btn btn-outline btn-sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>
        {t('common.next')} <Icon name="arrow" size={16} className="flip-rtl" />
      </button>
    </nav>
  );
}

/** Confirmation dialog built on the native <dialog> element, used instead of window.confirm */
export function useConfirm() {
  const [state, setState] = useState(null);
  const ask = (message, { danger = true, confirmLabel } = {}) =>
    new Promise((resolve) => setState({ message, danger, confirmLabel, resolve }));
  const close = (answer) => {
    state?.resolve(answer);
    setState(null);
  };
  const dialog = state ? <ConfirmDialog {...state} onClose={close} /> : null;
  return [ask, dialog];
}

function ConfirmDialog({ message, danger, confirmLabel, onClose }) {
  const { t } = useI18n();
  return (
    <div className="modal-backdrop" role="presentation" onClick={() => onClose(false)}>
      <div className="modal" role="alertdialog" aria-modal="true" aria-labelledby="confirm-msg" onClick={(e) => e.stopPropagation()}>
        <p id="confirm-msg">{message}</p>
        <div className="form-actions">
          <button type="button" className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={() => onClose(true)} autoFocus>
            {confirmLabel || t('common.confirm')}
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => onClose(false)}>{t('common.cancel')}</button>
        </div>
      </div>
    </div>
  );
}
