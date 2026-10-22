// Small reusable UI pieces
import { useState } from 'react';
import { imageSrc } from '../api';
import { STATUS_LABELS } from '../utils/format';

export function Loading({ label = 'Loading…' }) {
  return (
    <div className="state" role="status">
      <span className="spinner" aria-hidden="true" />
      <p>{label}</p>
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  return (
    <div className="state state-error" role="alert">
      <p>{error?.message || 'Something went wrong.'}</p>
      {onRetry && <button type="button" className="btn btn-outline btn-sm" onClick={onRetry}>Try again</button>}
    </div>
  );
}

export function EmptyState({ title, text, action }) {
  return (
    <div className="state state-empty">
      <div className="state-icon" aria-hidden="true">🌱</div>
      <h2>{title}</h2>
      {text && <p>{text}</p>}
      {action}
    </div>
  );
}

export function StatusBadge({ status }) {
  return <span className={`badge badge-${status}`}>{STATUS_LABELS[status] || status}</span>;
}

/** Product image with a leafy placeholder when there is no image or it fails to load. */
export function ProductImage({ src, alt, className = '' }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className={`img-placeholder ${className}`} role="img" aria-label={alt}>
        <span aria-hidden="true">🪴</span>
      </div>
    );
  }
  return <img className={className} src={imageSrc(src)} alt={alt} loading="lazy" onError={() => setFailed(true)} />;
}

/** Labelled form field that shows its validation message. */
export function Field({ label, error, hint, children, id }) {
  return (
    <div className={`field ${error ? 'has-error' : ''}`}>
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
