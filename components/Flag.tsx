// Renders a flag image from flagcdn.com — works on all OS/browsers including Windows
// where emoji flags don't render.

interface Props {
  code: string; // ISO 3166-1 alpha-2 lowercase (e.g. "mx") or emoji fallback "🏳️"
  size?: number;
  className?: string;
}

export default function Flag({ code, size = 28, className = "" }: Props) {
  if (!code || code.length > 4) {
    // It's an emoji (multi-char unicode) — render as text fallback
    return <span className={`leading-none ${className}`} style={{ fontSize: size }}>{code}</span>;
  }
  const h = Math.round(size * 0.75);
  return (
    <img
      src={`https://flagcdn.com/w${size * 2}/${code}.png`}
      width={size}
      height={h}
      alt={code}
      className={`inline-block object-cover rounded-sm ${className}`}
      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
    />
  );
}
