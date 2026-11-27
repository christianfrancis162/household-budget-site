// December bills manager — the household's bills as a working list, not a
// static note. Each bill has a due day in November or December 2026, a
// category and a monthly-or-once flag; the page marks bills paid, adds new
// ones and totals what is still to pay before December runs out.
//
// "Today" for the bills is 26 November 2026 (TODAY_DAY in data.js), so a
// December bill due on the 1st is 5 days away: the 4 days left in November
// plus the 1st itself. A November bill whose day has passed and is still
// unpaid is overdue — the household can see it at a glance and pay it.

import { CATEGORIES, DAYS_IN_MONTH, TODAY_DAY } from "./data.js";

// Days from today (26 Nov) until a bill falls due. November bills count
// down from today; December bills count the rest of November plus the day.
export function dueInDays(bill, todayDay = TODAY_DAY) {
  if (bill.month === "Nov") return bill.dueDay - todayDay;
  return DAYS_IN_MONTH - todayDay + bill.dueDay;
}

// Plain-English due label: "due today", "in 5 days", "overdue by 6 days".
export function dueLabel(bill, todayDay = TODAY_DAY) {
  const d = dueInDays(bill, todayDay);
  if (bill.paid) return "paid " + (bill.paidOn || "");
  if (d === 0) return "due today";
  if (d === 1) return "due tomorrow";
  if (d > 0) return "due in " + d + " days";
  if (d === -1) return "overdue by 1 day";
  return "overdue by " + -d + " days";
}

// One-word status the page styles: paid, overdue, due-soon (7 days or
// less), or upcoming. A paid bill is never overdue, however late it was.
export function billStatus(bill, todayDay = TODAY_DAY) {
  if (bill.paid) return "paid";
  const d = dueInDays(bill, todayDay);
  if (d < 0) return "overdue";
  if (d <= 7) return "due-soon";
  return "upcoming";
}

// Unpaid bills first, soonest due first; paid bills last, most recent first.
export function sortBills(bills, todayDay = TODAY_DAY) {
  return [...bills].sort((a, b) => {
    if (a.paid !== b.paid) return a.paid ? 1 : -1;
    if (!a.paid && !b.paid) return dueInDays(a, todayDay) - dueInDays(b, todayDay);
    return (b.paidOn || "").localeCompare(a.paidOn || "");
  });
}

// What the household still owes on unpaid bills, and what it has already
// cleared this round — the two numbers the page leads with.
export function billsDueTotal(bills) {
  return bills.filter((b) => !b.paid).reduce((sum, b) => sum + b.amount, 0);
}

export function billsPaidTotal(bills) {
  return bills.filter((b) => b.paid).reduce((sum, b) => sum + b.amount, 0);
}

// The next unpaid bill — the one the household should pay first.
export function nextBillDue(bills, todayDay = TODAY_DAY) {
  const unpaid = bills.filter((b) => !b.paid);
  if (!unpaid.length) return null;
  return sortBills(unpaid, todayDay)[0];
}

// Everything the bills page header needs in one object.
export function billsSummary(bills, todayDay = TODAY_DAY) {
  const unpaid = bills.filter((b) => !b.paid);
  const overdue = unpaid.filter((b) => dueInDays(b, todayDay) < 0);
  const dueSoon = unpaid.filter((b) => {
    const d = dueInDays(b, todayDay);
    return d >= 0 && d <= 7;
  });
  return {
    count: bills.length,
    unpaidCount: unpaid.length,
    paidCount: bills.length - unpaid.length,
    dueTotal: billsDueTotal(bills),
    paidTotal: billsPaidTotal(bills),
    overdueCount: overdue.length,
    dueSoonCount: dueSoon.length,
    next: nextBillDue(bills, todayDay),
  };
}

// The monthly-bill rhythm: what the household pays every month on
// recurring bills alone, so it can see the fixed load December carries
// before any one-off bill is added.
export function recurringMonthlyTotal(bills) {
  return bills
    .filter((b) => b.recurring === "monthly")
    .reduce((sum, b) => sum + b.amount, 0);
}

// --- Adding a bill ---

// What is wrong with a bill typed into the form, as plain sentences.
// Empty means the bill is fine to add.
export function validateBill({ desc, amount, dueDay, month, cat }) {
  const problems = [];
  if (!String(desc || "").trim()) problems.push("Give the bill a name — e.g. \"DSTv Compact\".");
  const n = Math.round(Number(amount));
  if (!Number.isFinite(n) || n <= 0) problems.push("The amount must be more than ₦0.");
  if (month !== "Nov" && month !== "Dec") problems.push("Pick November or December for the due month.");
  const day = Math.round(Number(dueDay));
  if (!Number.isFinite(day) || day < 1 || day > 31) problems.push("The due day must be a day of the month (1–31).");
  if (month === "Nov" && day > DAYS_IN_MONTH) problems.push("November has 30 days — the due day cannot be past 30.");
  const known = CATEGORIES.some((c) => c.id === cat);
  if (!known) problems.push("Pick a budget category for the bill.");
  return problems;
}

// Builds the bill the store keeps. `nextId` is the store's nextBillId;
// ids look like "b8" so they never collide with the seeded "b1".."b7".
export function makeBill({ desc, amount, dueDay, month, cat, recurring, note }, nextId) {
  return {
    id: "b" + nextId,
    desc: String(desc).trim(),
    amount: Math.round(Number(amount)),
    dueDay: Math.round(Number(dueDay)),
    month: month === "Nov" ? "Nov" : "Dec",
    cat,
    recurring: recurring === "monthly" ? "monthly" : "once",
    note: String(note || "").trim(),
    paid: false,
    paidOn: null,
  };
}
