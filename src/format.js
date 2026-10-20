// Presentation-only formatting. The engine never formats; the UI calls these.
const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const num = (dp) => new Intl.NumberFormat('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp });

export const money = (v) => (Number.isFinite(v) ? usd.format(Object.is(v, -0) || Math.abs(v) < 0.5 ? 0 : v) : '—');
export const hours = (v) => (Number.isFinite(v) ? `${num(0).format(v)} GPU-h` : '—');
export const count = (v) => (Number.isFinite(v) ? num(0).format(v) : '—');
export const pct = (v, dp = 1) => (Number.isFinite(v) ? `${(v * 100).toFixed(dp)}%` : '—');
export const tokens = (v) => (Number.isFinite(v) ? (Math.abs(v) >= 1e6 ? `${(v / 1e6).toFixed(2)}M` : num(0).format(v)) : '—');
export const decimal = (v, dp = 2) => (Number.isFinite(v) ? num(dp).format(v) : '—');

// Namespace used by UI modules that prefer `format.money(x)` style calls.
export const format = { money, hours, count, pct, tokens, decimal };
