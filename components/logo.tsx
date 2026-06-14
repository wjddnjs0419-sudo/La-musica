type LogoProps = {
  className?: string;
  title?: string;
};

// 7 stripes running along the ribbon, offset across its width.
const STRIPES = 7;
const offsets = Array.from(
  { length: STRIPES },
  (_, i) => -23 + (46 / (STRIPES - 1)) * i,
);

const ribbonPath = (o: number) =>
  `M${40 + o} 210
   L${40 + o} 118
   A${44 - o} ${44 - o} 0 0 1 ${128 - o} 118
   L${128 - o} 162
   A${44 + o} ${44 + o} 0 0 0 ${216 + o} 162
   L${216 + o} 118
   A${44 - o} ${44 - o} 0 0 1 ${304 - o} 118
   L${304 - o} 210`;

/**
 * La Musica brand mark — striped M/U ribbon (no headset frame).
 * Pure SVG (extracted from the Figma export); inherits color via currentColor.
 * viewBox is tightened to the mark bounds so it stays crisp at small sizes.
 */
export default function Logo({ className, title = "La Musica" }: LogoProps) {
  return (
    <svg
      viewBox="3 31 338 199"
      className={className}
      style={{ display: "block" }}
      role="img"
      aria-label={title}
      xmlns="http://www.w3.org/2000/svg"
    >
      {offsets.map((o, i) => (
        <path
          key={i}
          d={ribbonPath(o)}
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );
}
