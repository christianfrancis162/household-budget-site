// Formatting helpers — naira amounts, percentages and dates, one place so
// every view writes money the same way.

// ₦1,250,000 — naira sign, thousands separated, no decimals.
export function naira(n) {
  const v = Math.round(n);
  const sign = v < 0 ? "-" : "";
  const digits = String(Math.abs(v)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return sign + "₦" + digits;
}

// Signed amount for a transaction row: +₦45,000 or −₦12,000.
export function signedNaira(n) {
  if (n > 0) return "+" + naira(n);
  if (n < 0) return "−" + naira(-n);
  return naira(0);
}

// Short form for chart labels: ₦1.25m, ₦850k.
export function shortNaira(n) {
  const abs = Math.abs(n);
  if (abs >= 1000000) return "₦" + (n / 1000000).toFixed(abs % 1000000 === 0 ? 0 : 2).replace(/\.?0+$/, "") + "m";
  if (abs >= 1000) return "₦" + Math.round(n / 1000) + "k";
  return naira(n);
}

export function pct(part, whole) {
  if (!whole) return 0;
  return Math.round((part / whole) * 100);
}

// "Nov 5" for a day number in November 2026.
export function dayLabel(day) {
  return "Nov " + day;
}

// Clamp a number into [lo, hi].
export function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}
