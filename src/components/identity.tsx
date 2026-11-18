import { COLLEGE_META } from "@/lib/format";
import { weightTotal } from "@/lib/scoring";
import { DIMENSIONS, type Dimension, type ResidentialCollege, type Weights } from "@/types";

export const DIMENSION_COLOR: Record<Dimension, string> = {
  academics: "#42d9f5",
  fitness: "#34d399",
  social: "#f5b942",
  exploration: "#8eabff",
  recovery: "#d8b4fe",
};

export function Avatar({
  initials,
  hue,
  size = "md",
}: {
  initials: string;
  hue: number;
  size?: "sm" | "md" | "lg";
}) {
  const box = size === "lg" ? "h-16 w-16 text-xl" : size === "sm" ? "h-9 w-9 text-xs" : "h-12 w-12 text-sm";
  return (
    <div
      className={`${box} grid shrink-0 place-items-center rounded-full font-semibold text-white shadow-lg`}
      style={{ background: `linear-gradient(160deg, hsl(${hue} 75% 58%), hsl(${hue} 45% 24%))` }}
      aria-hidden
    >
      {initials}
    </div>
  );
}

export function CollegeBadge({ college }: { college: ResidentialCollege | null }) {
  if (!college) {
    return (
      <span className="inline-flex items-center rounded-full border border-warning/40 bg-warning/10 px-2.5 py-1 text-xs font-semibold text-warning">
        Practice rival
      </span>
    );
  }
  const meta = COLLEGE_META[college];
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2 py-1 text-xs text-foreground/90">
      <span
        className="grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold text-white"
        style={{ background: `hsl(${meta.hue} 42% 32%)` }}
      >
        {meta.code}
      </span>
      {college}
    </span>
  );
}

export function WeightDonut({ weights }: { weights: Weights }) {
  let cursor = 0;
  const stops = DIMENSIONS.map((dimension) => {
    const start = cursor;
    cursor += Math.max(0, weights[dimension]);
    return `${DIMENSION_COLOR[dimension]} ${start}% ${cursor}%`;
  }).join(", ");
  const total = weightTotal(weights);
  return (
    <div
      className="relative h-40 w-40 rounded-full"
      style={{ background: `conic-gradient(${stops || "#18283e 0 100%"})` }}
      role="img"
      aria-label={`Wellness balance totaling ${total} percent`}
    >
      <div className="absolute inset-[18%] grid place-items-center rounded-full bg-surface text-center">
        <div>
          <p className={`text-xl font-semibold ${total === 100 ? "text-foreground" : "text-warning"}`}>{total}%</p>
          <p className="text-[10px] uppercase tracking-[0.16em] text-muted">total</p>
        </div>
      </div>
    </div>
  );
}
