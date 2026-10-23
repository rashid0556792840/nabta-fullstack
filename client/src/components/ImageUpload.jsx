import { useRef, useState } from 'react';
import { api } from '../api';
import { useToast } from '../context/ToastContext';
import { useI18n } from '../i18n/LanguageContext';
import Icon from './Icon';
import { Field, ProductImage } from './ui';

/** Image field: upload a file (stored in MongoDB by the API) or paste an https link. */
export default function ImageUpload({ id, label, value, onChange, error, hint, previewClass = 'upload-preview', allowLink = true }) {
  const { t, errorText } = useI18n();
  const toast = useToast();
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const upload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error(t('errors.image_too_large'));
      return;
    }
    const form = new FormData();
    form.append('image', file);
    setUploading(true);
    try {
      const res = await api('/images', { method: 'POST', form });
      onChange(res.url);
      toast.success(t('upload.done'));
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="upload-row">
      <ProductImage src={value} alt={t('upload.preview')} className={previewClass} />
      <div className="upload-fields">
        {allowLink ? (
          <Field id={id} label={label} error={error} hint={hint || t('upload.hint')}>
            <input id={id} dir="ltr" value={value} onChange={(e) => onChange(e.target.value)} maxLength={300} placeholder="https://…" />
          </Field>
        ) : (
          <p className="field-label">{label}</p>
        )}
        <div className="form-actions">
          <label className="btn btn-outline btn-sm file-btn">
            <Icon name="upload" size={16} /> {uploading ? t('upload.uploading') : t('upload.button')}
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={upload} disabled={uploading} />
          </label>
          {value && <button type="button" className="btn btn-ghost btn-sm" onClick={() => onChange('')}>{t('upload.remove')}</button>}
        </div>
      </div>
    </div>
  );
}
