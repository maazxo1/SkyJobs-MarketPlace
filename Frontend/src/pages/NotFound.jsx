import { Link, useNavigate } from 'react-router-dom';
import Icon from '../components/common/Icon';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 500 }}>
      <div style={{ textAlign: 'center', maxWidth: 420 }}>
        <div className="num" style={{ fontSize: 120, fontWeight: 700, lineHeight: 1, color: 'var(--border)', userSelect: 'none', marginBottom: 24 }}>
          404
        </div>
        <h1 className="display-2" style={{ marginBottom: 10 }}>
          Page <span className="display-italic">not found</span>.
        </h1>
        <p className="muted" style={{ fontSize: 14, lineHeight: 1.65, marginBottom: 28 }}>
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="row gap-3" style={{ justifyContent: 'center', flexWrap: 'wrap', marginBottom: 32 }}>
          <button className="btn ghost" onClick={() => navigate(-1)}>← Go back</button>
          <Link to="/" className="btn amber">Back to home <Icon name="arrow-right" size={14} /></Link>
        </div>
        <div className="muted" style={{ fontSize: 12, marginTop: 16 }}>
          Or try:{' '}
          <Link to="/jobs" style={{ color: 'var(--accent)', fontWeight: 600 }}>Browse briefs</Link>
          {' · '}
          <Link to="/register" style={{ color: 'var(--accent)', fontWeight: 600 }}>Register</Link>
          {' · '}
          <Link to="/login" style={{ color: 'var(--accent)', fontWeight: 600 }}>Sign in</Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
