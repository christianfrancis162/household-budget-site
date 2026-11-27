// Savings-goals planner — the maths behind the planner page.
//
// The household's plain Goals page is a simple list with a progress bar.
// This module is the planner: every goal carries a deadline, and the page
// answers the question the list cannot — "how much must go in every month
// to hit this goal on time, and are we on track?"
//
// All dates are plain ISO strings ("2027-03-15"). "Today" is the
// household's today: 26 November 2026, the same day the rest of the site
// uses (see TODAY_DAY in data.js). Nothing here touches the DOM; views.js
// renders what these functions return.

export const PLANNER_TODAY = new Date(2026, 10, 26); // 26 Nov 2026

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

// "2027-03-15" -> a Date at local midnight. Returns null for junk input
// instead of an invalid Date, so a bad deadline can never crash a page.
export function parseDeadline(iso) {
  if (typeof iso !== "string") return null;
  const parts = iso.split("-");
  if (parts.length !== 3) return null;
  const year = Number(parts[0]);
  const month = Number(parts[1]) - 1;
  const day = Number(parts[2]);
  if (!year || month < 0 || month > 11 || day < 1 || day > 31) return null;
  const d = new Date(year, month, day);
  if (d.getFullYear() !== year || d.getMonth() !== month || d.getDate() !== day) return null;
  return d;
}

// "2027-03-15" -> "15 Mar 2027". Falls back to the raw string when the
// date does not parse, so a stored goal always shows something.
export function formatDeadline(iso) {
  const d = parseDeadline(iso);
  if (!d) return String(iso || "");
  return d.getDate() + " " + MONTH_NAMES[d.getMonth()] + " " + d.getFullYear();
}

// "Mar 2027" for a Date — used for projected finish dates.
export function monthYearLabel(date) {
  return MONTH_NAMES[date.getMonth()] + " " + date.getFullYear();
}

// Whole days from `from` to `to`. Negative when `to` is in the past.
export function daysBetween(from, to) {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.round((to.getTime() - from.getTime()) / msPerDay);
}

// Whole months left until a goal's deadline, counted in 30.44-day months
// and rounded up — a goal due in 19 days still needs one month's worth of
// money. Returns 0 when the deadline has passed or is today.
export function monthsLeft(goal, today = PLANNER_TODAY) {
  const deadline = parseDeadline(goal.deadline);
  if (!deadline) return 0;
  const days = daysBetween(today, deadline);
  if (days <= 0) return 0;
  return Math.ceil(days / 30.44);
}

// True when the deadline has passed and the goal is still short.
export function isPastDue(goal, today = PLANNER_TODAY) {
  if (goal.saved >= goal.target) return false;
  const deadline = parseDeadline(goal.deadline);
  if (!deadline) return false;
  return daysBetween(today, deadline) < 0;
}

// True when the goal is fully funded, whatever the deadline says.
export function isComplete(goal) {
  return goal.saved >= goal.target;
}

// Progress as a whole percent, capped at 100 so an over-funded goal does
// not draw a bar wider than its track.
export function goalProgressPct(goal) {
  if (!goal.target) return 0;
  return Math.min(100, Math.round((goal.saved / goal.target) * 100));
}

// Naira still needed to finish the goal. Never negative.
export function goalRemaining(goal) {
  return Math.max(0, Math.round(goal.target - goal.saved));
}

// The monthly amount that finishes the goal exactly on its deadline:
// what is left, divided by the months left, rounded up to the naira.
// A complete goal needs nothing. A past-due goal needs all of what is
// left, right now — there are no months left to spread it over.
export function monthlyNeeded(goal, today = PLANNER_TODAY) {
  const left = goalRemaining(goal);
  if (left === 0) return 0;
  const months = monthsLeft(goal, today);
  if (months === 0) return left;
  return Math.ceil(left / months);
}

// One-word status for the badge on a goal card. `monthlyCapacity` is what
// the household can actually put aside each month — their savings transfer
// — so "tight" means the goal's monthly need is bigger than the money
// available for all goals put together.
export function goalStatus(goal, monthlyCapacity, today = PLANNER_TODAY) {
  if (isComplete(goal)) return "complete";
  if (isPastDue(goal, today)) return "past due";
  if (monthlyNeeded(goal, today) > monthlyCapacity) return "tight";
  return "on track";
}

// Plain-English version of the status, for the line under a goal's name.
export function goalStatusText(goal, monthlyCapacity, today = PLANNER_TODAY) {
  const status = goalStatus(goal, monthlyCapacity, today);
  if (status === "complete") return "Fully funded — the money is there.";
  if (status === "past due") {
    return "Deadline passed with " + goalRemaining(goal).toLocaleString("en-NG") +
      " naira still to go — pick a new date or top it up now.";
  }
  if (status === "tight") {
    return "Needs more per month than the household's whole savings transfer — " +
      "spread the deadline out or find extra money.";
  }
  return "On track at the current savings pace.";
}

// When a goal finishes if the household puts in `monthlyAmount` every
// month from today. Returns { months, label } where label is "Mar 2027".
// A monthly amount of zero never finishes — returns months: Infinity.
export function projectedFinish(goal, monthlyAmount, today = PLANNER_TODAY) {
  const left = goalRemaining(goal);
  if (left === 0) return { months: 0, label: "already funded" };
  const perMonth = Math.max(0, Math.round(Number(monthlyAmount) || 0));
  if (perMonth <= 0) return { months: Infinity, label: "never at ₦0/month" };
  const months = Math.ceil(left / perMonth);
  const finish = new Date(today.getFullYear(), today.getMonth() + months, 1);
  return { months, label: monthYearLabel(finish) };
}

// The planner's sort: unfinished goals first, past-due ones at the very
// top, then by nearest deadline; finished goals sink to the bottom.
export function sortPlannerGoals(goals, today = PLANNER_TODAY) {
  const copy = [...goals];
  const rank = (g) => {
    if (isComplete(g)) return 3;
    if (isPastDue(g, today)) return 0;
    return 1;
  };
  copy.sort((a, b) => {
    const ra = rank(a);
    const rb = rank(b);
    if (ra !== rb) return ra - rb;
    const da = parseDeadline(a.deadline);
    const db = parseDeadline(b.deadline);
    if (da && db) return da.getTime() - db.getTime();
    if (da) return -1;
    if (db) return 1;
    return a.name.localeCompare(b.name);
  });
  return copy;
}

// Whole-page totals for the header cards: what is saved, what is still
// needed, how many goals are done, and the monthly amount across every
// unfinished goal — the number the household has to find each month.
export function plannerSummary(goals, today = PLANNER_TODAY) {
  let totalTarget = 0;
  let totalSaved = 0;
  let completeCount = 0;
  let monthlyNeededTotal = 0;
  for (const g of goals) {
    totalTarget += g.target;
    totalSaved += g.saved;
    if (isComplete(g)) completeCount++;
    else monthlyNeededTotal += monthlyNeeded(g, today);
  }
  return {
    totalTarget,
    totalSaved,
    totalLeft: Math.max(0, totalTarget - totalSaved),
    completeCount,
    activeCount: goals.length - completeCount,
    monthlyNeededTotal,
    overallPct: totalTarget ? Math.min(100, Math.round((totalSaved / totalTarget) * 100)) : 0,
  };
}

// Checks a new goal from the add-goal form. Returns a list of problems;
// an empty list means the goal is fine to save. The deadline must be a
// real date after today — a goal due in the past is past due the day it
// is created.
export function validatePlannerGoal({ name, target, deadline }, today = PLANNER_TODAY) {
  const problems = [];
  if (!String(name || "").trim()) problems.push("Give the goal a name.");
  const amount = Math.round(Number(target) || 0);
  if (amount < 1000) problems.push("Target must be at least ₦1,000.");
  if (amount > 100000000) problems.push("Target looks too big — check the number.");
  const d = parseDeadline(deadline);
  if (!d) {
    problems.push("Pick a deadline date.");
  } else if (daysBetween(today, d) <= 0) {
    problems.push("Deadline must be a future date.");
  }
  return problems;
}

// Builds a new goal object from the add-goal form, with a fresh id.
// The caller supplies the next id number; the shape matches the seed data.
export function makePlannerGoal({ name, target, deadline, note }, nextId) {
  return {
    id: "sg" + nextId,
    name: String(name).trim(),
    target: Math.round(Number(target) || 0),
    saved: 0,
    deadline: String(deadline),
    note: String(note || "").trim(),
  };
}
