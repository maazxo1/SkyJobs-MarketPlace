import Icon from './Icon';

const Modal = ({ open, onClose, title, children, width = 480 }) => {
  if (!open) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'oklch(0 0 0 / 0.55)',
        display: 'grid', placeItems: 'center',
        zIndex: 100, backdropFilter: 'blur(6px)',
      }}
    >
      <div
        className="slide-up"
        onClick={(e) => e.stopPropagation()}
        style={{
          width, maxWidth: '92vw',
          background: 'var(--bg-2)',
          border: '1px solid var(--border-strong)',
          borderRadius: 'var(--r-lg)', padding: 24,
        }}
      >
        <div className="row between" style={{ marginBottom: 16 }}>
          <h3 className="display-3" style={{ margin: 0 }}>{title}</h3>
          <button className="icon-btn" onClick={onClose}><Icon name="x" size={14} /></button>
        </div>
        {children}
      </div>
    </div>
  );
};

export default Modal;
