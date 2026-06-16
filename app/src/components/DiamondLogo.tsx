interface DiamondLogoProps {
  size?: number;
  className?: string;
}

export function DiamondLogo({ size = 24, className = '' }: DiamondLogoProps) {
  const s = size;
  const half = s / 2;
  const inner = s * 0.35;

  return (
    <svg
      width={s}
      height={s}
      viewBox={`0 0 ${s} ${s}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Outer diamond */}
      <path
        d={`M${half} 0 L${s} ${half} L${half} ${s} L0 ${half} Z`}
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
      />
      {/* Inner diamond */}
      <path
        d={`M${half} ${half - inner} L${half + inner} ${half} L${half} ${half + inner} L${half - inner} ${half} Z`}
        stroke="currentColor"
        strokeWidth="1.5"
        fill="currentColor"
        fillOpacity="0.15"
      />
      {/* Diagonal lines */}
      <line x1={half} y1={0} x2={half} y2={s} stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.4" />
      <line x1={0} y1={half} x2={s} y2={half} stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.4" />
      {/* Top accent mark */}
      <line x1={half - inner * 0.5} y1={half - inner * 0.8} x2={half + inner * 0.5} y2={half - inner * 0.8} stroke="currentColor" strokeWidth="1" strokeOpacity="0.8" />
    </svg>
  );
}
