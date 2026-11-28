// Safety net — the emergency-fund planner.
//
// The household keeps two emergency pots: the main one on the Goals
// page (₦975,000 of a ₦1,500,000 target) and a second one in the
// savings-goals planner (₦640,000 of ₦1,000,000, due June 2027). The
// planner counts both pots together and measures them against what
// the household actually spends on the must-pays — rent, food,
// transport and utilities — so "months covered" is a real number, not
// a wish.
//
// "Essentials" here means the four must-pay categories at what the
// household actually spent on them this month, not their budgets: the
// month is nearly over, so the spending is the honest figure. The
// planner then works out, for a target of 3, 6 or 12 months, how much
// is still missing and what to put in every month to get there by a
// chosen date.

import { GOALS, SAVINGS_GOALS } from "./data.js";

// The must-pay categories: the spending that cannot stop — rent, food,
// getting around, and keeping the lights and water on.
export const ESSENTIAL_CATEGORIES = ["housing", "food", "transport", "utilities"];

// What the household actually spent on the must-pays this month, from
// the live per-category spending. `spentByCat` is the store's
// spentByCategory() — the same figures the budget page shows.
export function essentialsMonthly(spentByCat) {
  return ESSENTIAL_CATEGORIES.reduce((s, id) => s + (spentByCat[id] || 0), 0);
}

// The two emergency pots, found by name in the two goal lists. Both
// pots count: the household's safety net is the two together.
export function emergencyPots(goals, plannerGoals) {
  const main = (goals || GOALS).find((g) => g.id === "emergency") || null;
  const second = (plannerGoals || SAVINGS_GOALS).find((g) => g.id === "sg3") || null;
  const mainSaved = main ? main.saved : 0;
  const secondSaved = second ? second.saved : 0;
  return {
    main: main
      ? { name: main.name, saved: main.saved, target: main.target }
      : null,
    second: second
      ? { name: second.name, saved: second.saved, target: second.target, deadline: second.deadline }
      : null,
    totalSaved: mainSaved + secondSaved,
    totalTarget: (main ? main.target : 0) + (second ? second.target : 0),
  };
}

// The plan, for a chosen target in months and a chosen number of
// months to get there. `today` is a Date the page passes in (26 Nov
// 2026); the finish date is worked out from it, so the page can say
// "there by October 2027" in plain words.
export function emergencyPlan(spentByCat, targetMonths, monthsToSave, pots) {
  const essentials = essentialsMonthly(spentByCat);
  const saved = (pots || emergencyPots()).totalSaved;
  const monthsCovered = essentials ? saved / essentials : 0;
  const target = Math.round(essentials * targetMonths);
  const gap = Math.max(0, target - saved);
  const monthlyNeeded = monthsToSave > 0 ? Math.ceil(gap / monthsToSave) : 0;
  return {
    essentials,
    saved,
    monthsCovered,
    monthsCoveredText:
      monthsCovered >= 1
        ? "about " + (Math.round(monthsCovered * 2) / 2) + " months"
        : "less than a month",
    targetMonths,
    target,
    gap,
    monthsToSave,
    monthlyNeeded,
    covered: gap === 0,
  };
}

// Plain-English verdicts on the safety net: how long the pots last,
// what the goals' own targets really cover, and what the monthly
// amount means against the household's savings transfer.
export function emergencyVerdicts(plan, pots, savingsTransfer) {
  const lines = [];
  lines.push(
    "The two pots together hold ₦" + plan.saved.toLocaleString("en-NG") +
      " — the main pot ₦" + (pots.main ? pots.main.saved.toLocaleString("en-NG") : "0") +
      ", the second pot ₦" + (pots.second ? pots.second.saved.toLocaleString("en-NG") : "0") +
      ". Against ₦" + plan.essentials.toLocaleString("en-NG") +
      " a month of must-pays, that is " + plan.monthsCoveredText + " of cover.",
  );
  if (pots.main) {
    const mainMonths = plan.essentials ? pots.main.target / plan.essentials : 0;
    lines.push(
      "The main goal's own ₦" + pots.main.target.toLocaleString("en-NG") + " target covers about " +
        (Math.round(mainMonths * 10) / 10) + " months of must-pays — not six. The old note said six months; the numbers say otherwise, so the planner shows the real figure.",
    );
  }
  if (plan.covered) {
    lines.push(
      "The " + plan.targetMonths + "-month target is already met — the household could stop adding and still be covered.",
    );
  } else {
    lines.push(
      "To reach " + plan.targetMonths + " months (₦" + plan.target.toLocaleString("en-NG") +
        ") in " + plan.monthsToSave + " months, put in ₦" + plan.monthlyNeeded.toLocaleString("en-NG") +
        " every month — that is ₦" + plan.gap.toLocaleString("en-NG") + " still to find.",
    );
    if (savingsTransfer && plan.monthlyNeeded > savingsTransfer) {
      lines.push(
        "That is more than the whole ₦" + savingsTransfer.toLocaleString("en-NG") +
          " monthly savings transfer, so the target needs either more time or extra money on top of the transfer — the transfer alone cannot do it.",
      );
    } else if (savingsTransfer) {
      lines.push(
        "That fits inside the ₦" + savingsTransfer.toLocaleString("en-NG") +
          " monthly savings transfer — the household can get there without finding new money.",
      );
    }
  }
  return lines;
}
