import { useId } from "react";

/** Moving a clipped light band keeps the SVG path geometry fixed while the whole branch lights up. */
export function Connector({ active }: { active: boolean }) {
  const id = useId().replaceAll(":", "");
  return <svg className="bb-hud-connector" viewBox="0 0 16 40" preserveAspectRatio="none" data-active={active} aria-hidden>
    <defs>
      <linearGradient id={`${id}-light`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="var(--hf-primary)" stopOpacity="0" />
        <stop offset=".5" stopColor="var(--hf-primary)" />
        <stop offset="1" stopColor="var(--hf-primary)" stopOpacity="0" />
      </linearGradient>
      <clipPath id={`${id}-trace`}><path d="M1 0 V24 Q1 32 9 32 H16 V33 H9 Q0 33 0 24 V0Z" /></clipPath>
    </defs>
    <path d="M1 0 V24 Q1 32 9 32 H16" fill="none" stroke="currentColor" strokeWidth="1" vectorEffect="non-scaling-stroke" />
    <g className="bb-hud-trace-light" clipPath={`url(#${id}-trace)`}>
      <rect className="bb-hud-trace-sweep" x="0" y="-16" width="16" height="16" fill={`url(#${id}-light)`} />
    </g>
  </svg>;
}
