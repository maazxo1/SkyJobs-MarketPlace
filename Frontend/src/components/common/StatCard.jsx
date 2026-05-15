import { Spark } from '../charts/Charts';

const StatCard = ({ label, value, sub, accent, spark, sparkData }) => (
  <div className="glass" style={{ padding: 'var(--pad)' }}>
    <div className="row between" style={{ alignItems: 'flex-start' }}>
      <div>
        <div className="eyebrow" style={{ marginBottom: 8 }}>{label}</div>
        <div className="num" style={{ fontSize: 32, fontWeight: 500, letterSpacing: '-0.02em', color: accent || 'var(--ink)' }}>
          {value}
        </div>
        {sub && <div className="muted" style={{ fontSize: 11, marginTop: 6 }}>{sub}</div>}
      </div>
      {spark && <Spark data={sparkData} w={120} h={40} />}
    </div>
  </div>
);

export default StatCard;
