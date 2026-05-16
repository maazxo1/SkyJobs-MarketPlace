import { useState, useRef } from 'react';
import { uploadFile } from '../../api/upload.api';

const FileUpload = ({
  onUpload,
  accept = '*',
  multiple = false,
  label = 'Drop files here or click to browse',
  maxSizeMB = 25,
  disabled = false,
}) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [errors, setErrors] = useState([]);
  const inputRef = useRef(null);

  const processFiles = async (files) => {
    if (!files.length || disabled) return;
    setErrors([]);
    setUploading(true);
    setProgress(0);

    const results = [];
    const errs = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > maxSizeMB * 1024 * 1024) {
        errs.push(`${file.name}: exceeds ${maxSizeMB}MB limit`);
        continue;
      }
      try {
        const res = await uploadFile(file);
        results.push(res.data.data);
      } catch (err) {
        errs.push(`${file.name}: ${err.response?.data?.error || 'Upload failed'}`);
      }
      setProgress(Math.round(((i + 1) / files.length) * 100));
    }

    setUploading(false);
    setProgress(0);
    if (errs.length) setErrors(errs);
    if (results.length) onUpload(results);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    processFiles([...e.dataTransfer.files]);
  };

  return (
    <div style={{ width: '100%' }}>
      <div
        onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => !disabled && !uploading && inputRef.current?.click()}
        style={{
          border: `2px dashed ${dragOver ? 'var(--accent)' : 'var(--border-strong)'}`,
          borderRadius: 12,
          padding: '24px 20px',
          textAlign: 'center',
          cursor: disabled || uploading ? 'default' : 'pointer',
          transition: 'all .2s',
          background: dragOver
            ? 'color-mix(in oklch, var(--accent) 5%, transparent)'
            : 'color-mix(in oklch, var(--ink) 2%, transparent)',
          opacity: disabled ? 0.5 : 1,
        }}
      >
        <input
          ref={inputRef}
          type="file"
          style={{ display: 'none' }}
          accept={accept}
          multiple={multiple}
          onChange={(e) => processFiles([...e.target.files])}
          disabled={disabled}
        />

        {uploading ? (
          <div>
            <div style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 10, fontWeight: 500 }}>
              Uploading… {progress}%
            </div>
            <div style={{
              height: 5, background: 'var(--border)', borderRadius: 3,
              overflow: 'hidden', maxWidth: 220, margin: '0 auto',
            }}>
              <div style={{
                height: '100%', width: `${progress}%`,
                background: 'var(--accent)', borderRadius: 3,
                transition: 'width .15s ease',
              }} />
            </div>
          </div>
        ) : (
          <div>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: 'color-mix(in oklch, var(--accent) 12%, transparent)',
              border: '1px solid color-mix(in oklch, var(--accent) 25%, transparent)',
              display: 'grid', placeItems: 'center',
              margin: '0 auto 10px',
              color: 'var(--accent)',
              fontSize: 20,
            }}>
              ↑
            </div>
            <p style={{ fontSize: 13, color: 'var(--ink-2)', fontWeight: 500, margin: '0 0 4px' }}>{label}</p>
            <p style={{ fontSize: 11, color: 'var(--ink-4)', margin: 0 }}>
              Max {maxSizeMB}MB per file
            </p>
          </div>
        )}
      </div>

      {errors.length > 0 && (
        <div style={{ marginTop: 8 }}>
          {errors.map((e, i) => (
            <p key={i} style={{ fontSize: 11, color: 'var(--danger)', margin: '2px 0' }}>{e}</p>
          ))}
        </div>
      )}
    </div>
  );
};

export default FileUpload;
