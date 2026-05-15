const PALETTES = [
  'linear-gradient(135deg,var(--accent),var(--accent-2))',
  'linear-gradient(135deg,oklch(0.78 0.14 200),oklch(0.62 0.16 240))',
  'linear-gradient(135deg,oklch(0.78 0.16 145),oklch(0.65 0.17 165))',
  'linear-gradient(135deg,oklch(0.78 0.18 320),oklch(0.62 0.19 0))',
];

const Avatar = ({ name, size = 36, square = false }) => {
  const initial = (name || '?').trim().charAt(0).toUpperCase();
  const idx = (initial.charCodeAt(0) || 0) % PALETTES.length;
  return (
    <div
      className={`avatar ${square ? 'r-square' : ''}`}
      style={{ width: size, height: size, background: PALETTES[idx], fontSize: size * 0.42 }}
    >
      {initial}
    </div>
  );
};

export default Avatar;
