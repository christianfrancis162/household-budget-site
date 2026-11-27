// Weekly envelope budgets — the zero-based envelope method, for the
// spending the household does day to day. Each envelope is one category's
// share of the month split into weeks: food, transport, entertainment,
// clothing and misc. Rent, school fees and utilities are fixed bills, not
// envelopes — they are paid once, so they do not get a weekly allowance.
//
// November 2026 has 30 days, split into weeks of 7, 7, 7, 7 and 2 days.
// Today is 26 November, so the household is in week 4 (days 22–28). An
// envelope's allowance is its share of the month in proportion to the
// days in its week, and what it has spent is the transactions in that
// category on those days. The household can also move money between
// envelopes — the move is recorded, so the envelopes always add up to
// the month's budget for those categories.

import { CATEGORIES, DAYS_IN_MONTH, TODAY_DAY } from "./data.js";

// The categories that get envelopes: the day-to-day spending. Fixed
// costs (housing, school, utilities, health) are bills, not envelopes.
export const ENVELOPE_CATEGORIES = ["food", "transport", "entertainment", "clothing", "misc"];

// The weeks of November 2026, as day ranges. Week 5 is a 2-day stub.
export const WEEKS = [
  { week: 1, start: 1, end: 7 },
  { week: 2, start: 8, end: 14 },
  { week: 3, start: 15, end: 21 },
  { week: 4, start: 22, end: 28 },
  { week: 5, start: 29, end: 30 },
];

// Which week a day falls in. Day 26 is week 4.
export function weekOfMonth(day) {
  const found = WEEKS.find((w) => day >= w.start && day <= w.end);
  return found || WEEKS[WEEKS.length - 1];
}

// The week the household is in now, with its day range.
export function currentWeek(todayDay = TODAY_DAY) {
  return weekOfMonth(todayDay);
}

// A week's fair share of a monthly budget, in proportion to its days:
// week 4 (7 days) gets 7/30 of the month, week 5 (2 days) gets 2/30.
export function weeklyAllowance(monthlyBudget, week) {
  const days = week.end - week.start + 1;
  return Math.round((monthlyBudget * days) / DAYS_IN_MONTH);
}

// What the household has spent in one category during one week.
export function spentInWeek(transactions, catId, week) {
  return transactions
    .filter((t) => t.kind === "expense" && t.cat === catId && t.day >= week.start && t.day <= week.end)
    .reduce((sum, t) => sum + -t.amount, 0);
}

// Money moved into (+) or out of (−) one envelope's week, from the
// recorded moves. Moves only apply to the week they were made in.
export function movedNet(moves, catId, week) {
  let net = 0;
  for (const m of moves || []) {
    if (m.week !== week.week) continue;
    if (m.to === catId) net += m.amount;
    if (m.from === catId) net -= m.amount;
  }
  return net;
}

// One envelope, fully worked out: its weekly allowance, what it has
// spent this week, what was moved in or out, what is left, and the pace
// verdict. Pace is "over" when the envelope is spent past its allowance,
// "tight" when less than a quarter is left, otherwise "on-track".
export function envelopeFor(catId, budgets, transactions, moves, todayDay = TODAY_DAY) {
  const cat = CATEGORIES.find((c) => c.id === catId);
  const week = currentWeek(todayDay);
  const monthly = budgets[catId] || 0;
  const allowance = weeklyAllowance(monthly, week);
  const spent = spentInWeek(transactions, catId, week);
  const moved = movedNet(moves, catId, week);
  const available = allowance + moved;
  const left = available - spent;
  const pace = left < 0 ? "over" : left < available * 0.25 ? "tight" : "on-track";
  return {
    catId,
    label: cat ? cat.label : catId,
    note: cat ? cat.note : "",
    monthly,
    week: week.week,
    weekStart: week.start,
    weekEnd: week.end,
    allowance,
    moved,
    available,
    spent,
    left,
    pctUsed: available ? Math.round((spent / available) * 100) : 0,
    pace,
  };
}

// All five envelopes for the current week, in the categories' own order.
export function envelopesForHousehold(budgets, transactions, moves, todayDay = TODAY_DAY) {
  return ENVELOPE_CATEGORIES.map((id) => envelopeFor(id, budgets, transactions, moves, todayDay));
}

// The week's envelope totals, for the page header.
export function envelopeSummary(envelopes) {
  return {
    allowance: envelopes.reduce((s, e) => s + e.available, 0),
    spent: envelopes.reduce((s, e) => s + e.spent, 0),
    left: envelopes.reduce((s, e) => s + e.left, 0),
    overCount: envelopes.filter((e) => e.pace === "over").length,
    tightCount: envelopes.filter((e) => e.pace === "tight").length,
  };
}

// --- Moving money between envelopes ---

// What is wrong with a move typed into the form, as plain sentences.
// `envelopes` is the current week's list, so the check can see what the
// source envelope still holds. Empty means the move is fine.
export function validateMove({ from, to, amount }, envelopes) {
  const problems = [];
  if (!from || !to) problems.push("Pick the envelope to move from and the one to move to.");
  else if (from === to) problems.push("Move money to a different envelope — from and to are the same.");
  const n = Math.round(Number(amount));
  if (!Number.isFinite(n) || n <= 0) problems.push("The amount to move must be more than ₦0.");
  const source = (envelopes || []).find((e) => e.catId === from);
  if (source && Number.isFinite(n) && n > source.left) {
    problems.push(
      "The " + source.label + " envelope only has " + n.toLocaleString("en-NG") +
      " naira left this week — move that much or less.",
    );
  }
  return problems;
}

// Builds the move the store records. Moves are stamped with the week
// they belong to, so last week's moves never change this week's math.
export function makeMove({ from, to, amount }, week) {
  return {
    from,
    to,
    amount: Math.round(Number(amount)),
    week: week.week,
    weekLabel: "Week " + week.week + " (Nov " + week.start + "–" + week.end + ")",
  };
}
