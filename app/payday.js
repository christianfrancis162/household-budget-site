// Payday plan — every payday has a job (zero-based).
//
// The household is paid three times in November: Chidi's salary on the
// 1st, Adaeze's salary on the 4th, and Adaeze's tutoring money on the
// 19th. The plan assigns each payday's naira to a job — rent, food,
// savings, the December goal — so that every payday's money is spoken
// for before it is spent. The jobs partition the month's real plan:
// the three paydays add up to the month's income exactly, and the jobs
// add up to the paydays exactly, so nothing is double-counted and
// nothing is left drifting.
//
// The jobs are the plan, not the spending: what the household actually
// spent is on the Transactions page. A job's amount is what the payday
// was meant to cover; the page says plainly where the plan and the
// spending differ (the transport job, for example, was planned at
// ₦100,000 and the household spent ₦95,300 of it).

import { INCOME_SOURCES } from "./data.js";

// The three November paydays, with the jobs each payday covers. Jobs
// carry a category so the page can say which part of the budget they
// belong to; "savings" and "set-aside" are not spending categories.
export const PAYDAYS = [
  {
    day: 1,
    who: "Chidi Okafor",
    what: "Software engineer salary",
    amount: 850000,
    jobs: [
      { job: "Rent — 3-bed flat, Lekki", amount: 250000, cat: "housing" },
      { job: "School fees — Term 1", amount: 120000, cat: "school" },
      { job: "Savings transfer — Stanbic", amount: 200000, cat: "savings" },
      { job: "Food — first half of the month", amount: 110000, cat: "food" },
      { job: "Transport — fuel and Bolt", amount: 60000, cat: "transport" },
      { job: "Utilities — power, DSTv, internet", amount: 45000, cat: "utilities" },
      { job: "Food top-up — week 3 market run", amount: 65000, cat: "food" },
    ],
  },
  {
    day: 4,
    who: "Adaeze Okafor",
    what: "Teacher salary",
    amount: 400000,
    jobs: [
      { job: "Food — second half of the month", amount: 45000, cat: "food" },
      { job: "Utilities — the rest of the month", amount: 50000, cat: "utilities" },
      { job: "Health — pharmacy and clinic", amount: 30000, cat: "health" },
      { job: "School books — Zara and Tobi", amount: 15000, cat: "school" },
      { job: "Clothing — shoes and outfits", amount: 40000, cat: "clothing" },
      { job: "Entertainment — eating out and cinema", amount: 45000, cat: "entertainment" },
      { job: "Miscellaneous — gifts and odds and ends", amount: 70000, cat: "misc" },
      { job: "Transport top-up — end-of-month fuel", amount: 40000, cat: "transport" },
      { job: "Set aside — December school top-up and health buffer", amount: 65000, cat: "set-aside" },
    ],
  },
  {
    day: 19,
    who: "Adaeze Okafor",
    what: "Weekend tutoring",
    amount: 45000,
    jobs: [
      { job: "Detty December — Christmas and travel home", amount: 45000, cat: "savings" },
    ],
  },
];

// One payday worked out: what its jobs add up to, what is left
// unassigned, and whether every naira has a job.
export function planPayday(payday) {
  const assigned = payday.jobs.reduce((s, j) => s + j.amount, 0);
  const leftover = payday.amount - assigned;
  return {
    day: payday.day,
    who: payday.who,
    what: payday.what,
    amount: payday.amount,
    jobs: payday.jobs,
    assigned,
    leftover,
    fullyAssigned: leftover === 0,
  };
}

// The whole month's payday plan: every payday planned, the month's
// income, what the jobs add up to, and the slack between the two.
export function paydayPlan() {
  const paydays = PAYDAYS.map(planPayday);
  const income = paydays.reduce((s, p) => s + p.amount, 0);
  const assigned = paydays.reduce((s, p) => s + p.assigned, 0);
  const leftover = income - assigned;
  return { paydays, income, assigned, leftover, fullyAssigned: leftover === 0 };
}

// What the jobs add up to per category, so the page can show the plan
// beside the budget: food's jobs, for example, should land on the
// food budget, not somewhere else.
export function jobsByCategory() {
  const out = {};
  for (const p of PAYDAYS) {
    for (const j of p.jobs) {
      out[j.cat] = (out[j.cat] || 0) + j.amount;
    }
  }
  return out;
}

// Plain-English verdicts on the plan, from live figures: whether every
// payday is fully assigned, and what the unplanned slack is for.
// `planTotal` is the month's plan (budgets plus the savings transfer),
// so the verdict can say what the extra tutoring income is doing.
export function paydayVerdicts(plan, incomeSources, planTotal) {
  const lines = [];
  if (plan.fullyAssigned) {
    lines.push(
      "Every naira has a job: the three paydays add up to ₦" +
        plan.income.toLocaleString("en-NG") +
        " and the jobs add up to the same — nothing is left drifting.",
    );
  } else if (plan.leftover > 0) {
    lines.push(
      "₦" + plan.leftover.toLocaleString("en-NG") +
        " of the month's pay is not assigned to a job yet — assign it to a goal or an envelope, or it will drift into miscellaneous.",
    );
  } else {
    lines.push(
      "The jobs add up to ₦" + (-plan.leftover).toLocaleString("en-NG") +
        " more than the paydays — the plan promises money the household does not have. Cut a job.",
    );
  }
  const tutoring = (incomeSources || INCOME_SOURCES).find((s) => s.what === "Weekend tutoring");
  if (tutoring) {
    lines.push(
      "Adaeze's tutoring (₦" + tutoring.amount.toLocaleString("en-NG") +
        ") goes straight to Detty December — the extra work pays for Christmas, not for day-to-day spending.",
    );
  }
  lines.push(
    "The November plan itself is ₦" + (planTotal || 0).toLocaleString("en-NG") +
      " (budgets plus the savings transfer); the extra ₦" +
      (tutoring ? tutoring.amount.toLocaleString("en-NG") : "45,000") +
      " of tutoring income is already working on December.",
  );
  return lines;
}
