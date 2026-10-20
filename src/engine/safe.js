// Guarded arithmetic: every division in the engine goes through here so that
// zero / negative / non-finite inputs never surface as NaN or Infinity.
export const safeDiv = (num, den, fallback = 0) => {
  if (!Number.isFinite(num) || !Number.isFinite(den) || den === 0) return fallback;
  const v = num / den;
  return Number.isFinite(v) ? v : fallback;
};

export const finite = (v, fallback = 0) => (Number.isFinite(v) ? v : fallback);

export const clampMin = (v, min) => Math.max(min, finite(v, min));
