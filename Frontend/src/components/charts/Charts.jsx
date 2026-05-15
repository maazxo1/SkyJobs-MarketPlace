/* Spark — small inline sparkline */
export const Spark = ({ data = [12,18,15,22,20,28,25,30,28,36,30,42,38,46], stroke = 'var(--accent)', w = 220, h = 56 }) => {
  const max = Math.max(...data), min = Math.min(...data);
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * (w - 4) + 2;
    const y = h - 4 - ((v - min) / (max - min || 1)) * (h - 8);
    return [x, y];
  });
  const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ flexShrink: 0 }}>
      <path d={d} fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

/* FlowChart — area chart for earnings / GMV */
export const FlowChart = ({ w = 360, h = 140, data: customData }) => {
  const data = customData || [40,55,42,72,60,90,72,110,88,76,96,108,82,95,118,100,128,114];
  const max = Math.max(...data), min = Math.min(...data);
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * (w - 8) + 4;
    const y = h - 16 - ((v - min) / (max - min || 1)) * (h - 30);
    return [x, y];
  });
  const path = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  const area = path + ` L ${w - 4} ${h - 4} L 4 ${h - 4} Z`;
  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id="gFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%"   stopColor="var(--accent)" stopOpacity="0.35"/>
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0"/>
        </linearGradient>
      </defs>
      <path d={area} fill="url(#gFill)"/>
      <path d={path} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      {pts.map((p, i) => i % 4 === 3
        ? <circle key={i} cx={p[0]} cy={p[1]} r="2.5" fill="var(--accent)"/>
        : null)}
    </svg>
  );
};

/* Donut — win rate / completion ring */
export const Donut = ({ value = 0.62, size = 96, label = '' }) => {
  const r = size / 2 - 6;
  const c = 2 * Math.PI * r;
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size/2} cy={size/2} r={r} stroke="var(--border)" strokeWidth="6" fill="none"/>
        <circle cx={size/2} cy={size/2} r={r} stroke="var(--accent)" strokeWidth="6" fill="none"
                strokeDasharray={`${c * value} ${c}`} strokeLinecap="round"
                transform={`rotate(-90 ${size/2} ${size/2})`}/>
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center' }}>
        <div>
          <div className="num" style={{ fontSize: size * 0.22, fontWeight: 600 }}>{Math.round(value * 100)}%</div>
          {label && <div className="muted" style={{ fontSize: 10, marginTop: 2 }}>{label}</div>}
        </div>
      </div>
    </div>
  );
};
