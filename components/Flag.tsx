// Renders a flag image from flagcdn.com — works on all OS/browsers including Windows.
// Valid widths on flagcdn: 20, 40, 80, 160, 320, 640

interface Props {
  code: string; // ISO 3166-1 alpha-2 lowercase e.g. "mx", "gb-sct"
  size?: number;
  className?: string;
}

// Detect emoji: multi-byte unicode chars have code points > 255
function isEmoji(s: string) {
  return !s || [...s].some(c => c.codePointAt(0)! > 255);
}

// Pick nearest valid flagcdn width
function cdnWidth(size: number): number {
  if (size <= 20) return 20;
  if (size <= 40) return 40;
  if (size <= 80) return 80;
  if (size <= 160) return 160;
  return 320;
}

export default function Flag({ code, size = 28, className = "" }: Props) {
  if (isEmoji(code)) {
    return <span className={`leading-none ${className}`} style={{ fontSize: size }}>{code || "🏳️"}</span>;
  }
  const w = cdnWidth(size * 2);
  const h = Math.round(size * 0.75);
  return (
    <img
      src={`https://flagcdn.com/w${w}/${code}.png`}
      width={size}
      height={h}
      alt={code}
      className={`inline-block object-cover rounded-sm ${className}`}
      onError={(e) => { (e.target as HTMLImageElement).replaceWith(Object.assign(document.createTextNode("🏳️"))); }}
    />
  );
}
