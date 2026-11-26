// Charts drawn as inline SVG — no library, no network, just numbers in
// and a picture out. Both builders return an SVG string.

import { shortNaira, naira } from "./format.js";

// Grouped bars: income (green) vs spending (amber) per month.
// `rows` is [{ label, income, spent }]. Width/height in px.
export function barsChart(rows, width = 560, height = 220) {
  const padL = 58;
  const padB = 26;
  const padT = 14;
  const innerW = width - padL - 8;
  const innerH = height - padT - padB;
  const max = Math.max(...rows.flatMap((r) => [r.income, r.spent]), 1);
  const slot = innerW / rows.length;
  const barW = Math.max(8, Math.floor(slot * 0.28));

  let out = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Monthly income versus spending bar chart">`;
  // Gridlines at 0 / half / max.
  for (const f of [0, 0.5, 1]) {
    const y = padT + innerH * (1 - f);
    out += `<line x1="${padL}" y1="${y}" x2="${width - 8}" y2="${y}" stroke="#e7e0d2" stroke-width="1"/>`;
    out += `<text x="${padL - 6}" y="${y + 4}" text-anchor="end" font-size="11" fill="#78716c">${shortNaira(max * f)}</text>`;
  }
  rows.forEach((r, i) => {
    const cx = padL + slot * i + slot / 2;
    const hI = (r.income / max) * innerH;
    const hS = (r.spent / max) * innerH;
    out += `<rect x="${cx - barW - 2}" y="${padT + innerH - hI}" width="${barW}" height="${hI}" rx="3" fill="#166534"/>`;
    out += `<rect x="${cx + 2}" y="${padT + innerH - hS}" width="${barW}" height="${hS}" rx="3" fill="#d97706"/>`;
    out += `<text x="${cx}" y="${height - 8}" text-anchor="middle" font-size="11" fill="#57534e">${r.label}</text>`;
  });
  out += "</svg>";
  return out;
}

// Donut: share of spending per category.
// `slices` is [{ label, value, color }]. Center shows the total.
export function donutChart(slices, size = 220) {
  const total = slices.reduce((a, s) => a + s.value, 0) || 1;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 14;
  const inner = r - 30;
  let angle = -Math.PI / 2;
  let out = `<svg viewBox="0 0 ${size} ${size}" role="img" aria-label="Spending by category donut chart">`;
  for (const s of slices) {
    if (s.value <= 0) continue;
    const frac = s.value / total;
    const a0 = angle;
    const a1 = angle + frac * Math.PI * 2;
    const large = frac > 0.5 ? 1 : 0;
    const x0 = cx + r * Math.cos(a0);
    const y0 = cy + r * Math.sin(a0);
    const x1 = cx + r * Math.cos(a1);
    const y1 = cy + r * Math.sin(a1);
    const xi1 = cx + inner * Math.cos(a1);
    const yi1 = cy + inner * Math.sin(a1);
    const xi0 = cx + inner * Math.cos(a0);
    const yi0 = cy + inner * Math.sin(a0);
    out += `<path d="M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1} L ${xi1} ${yi1} A ${inner} ${inner} 0 ${large} 0 ${xi0} ${yi0} Z" fill="${s.color}"><title>${s.label}: ${naira(s.value)}</title></path>`;
    angle = a1;
  }
  out += `<text x="${cx}" y="${cy - 4}" text-anchor="middle" font-size="13" fill="#78716c">Spent</text>`;
  out += `<text x="${cx}" y="${cy + 16}" text-anchor="middle" font-size="17" font-weight="700" fill="#1c1917">${shortNaira(total)}</text>`;
  out += "</svg>";
  return out;
}

// Category colours, one per budget category, kept in a single place so the
// donut, the legend and the budget bars all agree.
export const CATEGORY_COLORS = {
  housing: "#166534",
  food: "#d97706",
  transport: "#0369a1",
  utilities: "#7c3aed",
  school: "#db2777",
  health: "#0891b2",
  entertainment: "#ca8a04",
  clothing: "#4d7c0f",
  misc: "#78716c",
};
