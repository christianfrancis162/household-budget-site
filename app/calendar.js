// Bill calendar — December 2026 at a glance.
//
// The bills manager lists what the household owes; the calendar shows
// WHEN. December's bills sit on the days they fall due, next to the
// two December paydays, so the household can see at a glance which
// weeks are heavy and which are light. Weeks run Monday to Sunday.
//
// December 2026 starts on a Tuesday, so the first row opens with
// Monday 30 November (outside the month, shown blank). Bills come from
// the live bills list, so paying one on the Bills page — or here —
// moves its badge on the calendar at once.

import { dueLabel, billStatus } from "./bills.js";

// Build the calendar grid for a month: rows of 7 cells, Monday first.
// A cell is { day, inMonth, bills, paydays } — days outside the month
// carry inMonth false and stay blank.
export function buildCalendar(year, monthIndex, bills, paydays) {
  const first = new Date(year, monthIndex, 1);
  // Monday-first offset: Sunday (0) becomes 6, Monday (1) becomes 0.
  const leadBlanks = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < leadBlanks; i++) {
    cells.push({ day: null, inMonth: false, bills: [], paydays: [] });
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const dayBills = (bills || []).filter(
      (b) => b.month === "Dec" && b.dueDay === day,
    );
    const dayPaydays = (paydays || []).filter((p) => p.day === day);
    cells.push({ day, inMonth: true, bills: dayBills, paydays: dayPaydays });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ day: null, inMonth: false, bills: [], paydays: [] });
  }
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  return weeks;
}

// The two December paydays, from the same income the payday plan uses:
// Chidi's salary on the 1st, Adaeze's on the 4th.
export const DECEMBER_PAYDAYS = [
  { day: 1, who: "Chidi Okafor", what: "Salary", amount: 850000 },
  { day: 4, who: "Adaeze Okafor", what: "Salary", amount: 400000 },
];

// What each week of the calendar holds: the bills due that week, what
// they add up to, and the paydays landing in it.
export function weekSummaries(weeks) {
  return weeks.map((week, i) => {
    const bills = week.flatMap((c) => c.bills);
    const unpaid = bills.filter((b) => !b.paid);
    const total = bills.reduce((s, b) => s + b.amount, 0);
    const due = unpaid.reduce((s, b) => s + b.amount, 0);
    const paydays = week.flatMap((c) => c.paydays);
    const paydayTotal = paydays.reduce((s, p) => s + p.amount, 0);
    return {
      week: i + 1,
      days: week.filter((c) => c.inMonth).map((c) => c.day),
      billCount: bills.length,
      total,
      due,
      paidCount: bills.length - unpaid.length,
      paydays,
      paydayTotal,
    };
  });
}

// Plain-English verdicts on the month: which week is heaviest, what is
// already covered by the paydays, and what is still to pay.
export function calendarVerdicts(weeks, bills) {
  const lines = [];
  const summaries = weekSummaries(weeks);
  const heaviest = summaries.reduce((a, b) => (b.total > a.total ? b : a), summaries[0]);
  const decBills = (bills || []).filter((b) => b.month === "Dec");
  const total = decBills.reduce((s, b) => s + b.amount, 0);
  const due = decBills.filter((b) => !b.paid).reduce((s, b) => s + b.amount, 0);
  lines.push(
    "December's bills add up to ₦" + total.toLocaleString("en-NG") + " across " + decBills.length +
      " bills — ₦" + due.toLocaleString("en-NG") + " of it still to pay.",
  );
  if (heaviest && heaviest.total > 0) {
    lines.push(
      "Week " + heaviest.week + " (Dec " + heaviest.days[0] + "–" + heaviest.days[heaviest.days.length - 1] +
        ") is the heaviest: ₦" + heaviest.total.toLocaleString("en-NG") +
        " falls due, most of it the ₦250,000 rent on the 1st.",
    );
  }
  const light = summaries.filter((w) => w.total === 0);
  if (light.length) {
    lines.push(
      "Week" + (light.length > 1 ? "s " : " ") + light.map((w) => w.week).join(" and ") +
        " ha" + (light.length > 1 ? "ve" : "s") + " no bills at all — the household can breathe there.",
    );
  }
  lines.push(
    "Both December paydays land in week 1 (₦1,250,000 together), so the rent is covered the day it falls due — the tight week is week 2, not week 1.",
  );
  return lines;
}

// A short status word for a bill on the calendar, from the same rule
// the bills page uses — paid, overdue, due soon, or upcoming.
export function calendarBillLabel(bill) {
  const status = billStatus(bill);
  if (status === "paid") return "Paid" + (bill.paidOn ? " " + bill.paidOn : "");
  if (status === "overdue") return "Overdue — " + dueLabel(bill);
  if (status === "due-soon") return "Due soon — " + dueLabel(bill);
  return dueLabel(bill);
}
