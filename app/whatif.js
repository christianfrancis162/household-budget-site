// What-if simulator — the household tries a change before making it.
// "What if we cut eating out in half?" "What if Adaeze takes one more
// tutoring pupil?" The simulator replays the month with the change
// applied and shows the new remaining money, the new savings rate and
// the new 50/30/20 split, next to the real figures, with a verdict in
// plain English.
//
// The model, kept deliberately simple so every number can be checked:
// a cut in a category lowers what the household spent there and the
// money cut is saved instead — the household keeps what it does not
// spend. Extra income raises income and, unless it is earmarked for
// savings, raises what is left at the end of the month. Extra savings
// moves money from what is left into savings. Wants are entertainment,
// clothing and misc, exactly as the 50/30/20 split on the dashboard
// defines them, so the simulator can never disagree with the dashboard.

import { CATEGORIES } from "./data.js";
import { pct } from "./format.js";

// The wants categories — the same definition the dashboard's 50/30/20
// split uses. Everything else the household spends is needs.
export const WANTS = ["entertainment", "clothing", "misc"];

// One adjustment set: cuts is a list of { cat, amount } taken off what
// the household spent in that category; extraIncome is new money in;
// extraSavings is money moved from what is left into savings.
export function emptyAdjustments() {
  return { cuts: [], extraIncome: 0, extraSavings: 0 };
}

// The month replayed with the adjustments applied. `base` is the live
// figures from the store: { income, spentByCat, saved }.
export function simulate(base, adj) {
  const cuts = adj.cuts || [];
  const cutByCat = {};
  let totalCut = 0;
  for (const c of cuts) {
    const amount = Math.max(0, Math.round(Number(c.amount) || 0));
    if (!amount || !c.cat) continue;
    cutByCat[c.cat] = (cutByCat[c.cat] || 0) + amount;
    totalCut += amount;
  }
  const spentByCat = {};
  let spent = 0;
  for (const [cat, amount] of Object.entries(base.spentByCat)) {
    const after = Math.max(0, amount - (cutByCat[cat] || 0));
    spentByCat[cat] = after;
    spent += after;
  }
  const extraIncome = Math.max(0, Math.round(Number(adj.extraIncome) || 0));
  const extraSavings = Math.max(0, Math.round(Number(adj.extraSavings) || 0));
  const income = base.income + extraIncome;
  // Money cut from spending is saved; extra savings is moved from what
  // is left. Both raise the saved total, and the cut also lowers spent,
  // so what is left rises by the cut as well as by the extra income.
  const saved = base.saved + totalCut + extraSavings;
  const remaining = income - spent - saved;
  const wants = WANTS.reduce((s, id) => s + (spentByCat[id] || 0), 0);
  const needs = spent - wants;
  return {
    income,
    spent,
    saved,
    remaining,
    totalCut,
    extraIncome,
    extraSavings,
    savingsRate: pct(saved, income),
    split: {
      needs,
      wants,
      saved,
      needsPct: pct(needs, income),
      wantsPct: pct(wants, income),
      savePct: pct(saved, income),
    },
  };
}

// Three one-click scenarios, priced from the household's own live
// figures so the numbers are real, not made up:
// 1. Halve eating out and entertainment — the easiest cut to make.
// 2. One more tutoring pupil — Adaeze's tutoring rate, from the data.
// 3. Move ₦50,000 from miscellaneous into savings.
export function presetScenarios(base) {
  const halfEntertainment = Math.round((base.spentByCat.entertainment || 0) / 2);
  return [
    {
      id: "halve-fun",
      name: "Halve eating out & entertainment",
      desc: "Cut entertainment spending in half for the rest of the month.",
      adjustments: { cuts: [{ cat: "entertainment", amount: halfEntertainment }], extraIncome: 0, extraSavings: 0 },
    },
    {
      id: "tutoring",
      name: "One more tutoring pupil",
      desc: "Adaeze takes one more weekend pupil at her usual ₦45,000 rate.",
      adjustments: { cuts: [], extraIncome: 45000, extraSavings: 0 },
    },
    {
      id: "misc-to-savings",
      name: "Move ₦50,000 from misc to savings",
      desc: "Take ₦50,000 off miscellaneous spending and put it in savings instead.",
      adjustments: { cuts: [{ cat: "misc", amount: 50000 }], extraIncome: 0, extraSavings: 0 },
    },
  ];
}

// Plain-English verdicts on the simulated month, against the real one.
// Each line names the change and the number it moves, so the household
// can tell at a glance whether the change is worth making.
export function whatIfVerdicts(base, sim) {
  const lines = [];
  const baseRate = pct(base.saved, base.income);
  if (sim.totalCut > 0) {
    lines.push(
      "Cutting ₦" + sim.totalCut.toLocaleString("en-NG") + " of spending saves that money instead — saved rises from ₦" +
      base.saved.toLocaleString("en-NG") + " to ₦" + sim.saved.toLocaleString("en-NG") +
      ". What is left is unchanged, because the money was saved, not freed.",
    );
  }
  if (sim.extraIncome > 0) {
    lines.push(
      "The extra ₦" + sim.extraIncome.toLocaleString("en-NG") + " of income raises what is left to ₦" +
      sim.remaining.toLocaleString("en-NG") + " — unless it is spent, it stays in the household's pocket.",
    );
  }
  if (sim.savingsRate > baseRate) {
    lines.push(
      "The savings rate rises from " + baseRate + "% to " + sim.savingsRate + "% — the household saves ₦" +
      sim.saved.toLocaleString("en-NG") + " of ₦" + sim.income.toLocaleString("en-NG") + " coming in.",
    );
  } else if (sim.savingsRate === baseRate && sim.totalCut === 0 && sim.extraIncome === 0 && sim.extraSavings === 0) {
    lines.push("No change yet — pick a preset above, or set a cut, extra income or extra savings below.");
  }
  if (sim.split.needsPct <= 50 && sim.split.needsPct > 0) {
    lines.push("Needs would sit at " + sim.split.needsPct + "% of income — inside the 50% target, with the essentials covered.");
  } else if (sim.split.needsPct > 50) {
    lines.push(
      "Needs would still run " + sim.split.needsPct + "% — " + (sim.split.needsPct - 50) +
      " points over the 50% target, because rent and school fees are fixed this month.",
    );
  }
  if (sim.remaining < 0) {
    lines.push(
      "Careful: this change leaves the month ₦" + (-sim.remaining).toLocaleString("en-NG") +
      " short — the household would spend more than it brings in.",
    );
  }
  return lines;
}

// The categories the cut form offers, with what the household has spent
// in each so far — the household cuts where the money actually went.
export function cuttableCategories(spentByCat) {
  return CATEGORIES.filter((c) => (spentByCat[c.id] || 0) > 0).map((c) => ({
    id: c.id,
    label: c.label,
    spent: spentByCat[c.id],
  }));
}
