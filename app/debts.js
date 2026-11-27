// Debt payoff planner — the maths behind the payoff page.
//
// Two classic strategies, one simulation. The household lists what it owes
// — balance, APR and minimum monthly payment per debt — picks a strategy
// and an extra monthly amount, and this module works out the payoff order,
// the month each debt clears, and the total interest paid.
//
// The simulation is simple interest on the monthly balance, stated on the
// page as an assumption: each month, interest is added first (balance x
// APR / 12), then the minimum payments go in, then whatever monthly money
// is left — the extra payment plus the minimums freed up by debts already
// cleared — goes to the first unpaid debt in the chosen order. That
// rollover is the whole point of both strategies: a cleared debt's payment
// does not vanish, it attacks the next debt.
//
// "Today" is November 2026, the household's current month, so month 1 of
// a plan is December 2026 and the debt-free date counts forward from there.
// Nothing here touches the DOM; views.js renders what these functions
// return.

export const PAYOFF_START_YEAR = 2026;
export const PAYOFF_START_MONTH = 10; // 0-based: November 2026
export const PAYOFF_MAX_MONTHS = 600; // 50 years — a plan longer than this is not a plan

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

// "May 2028" for a month index counted from the plan's first month.
// months = 1 means the first month of the plan (Dec 2026).
export function payoffMonthLabel(months) {
  const total = PAYOFF_START_YEAR * 12 + PAYOFF_START_MONTH + months;
  const year = Math.floor(total / 12);
  const month = total % 12;
  return MONTH_NAMES[month] + " " + year;
}

// Total still owed across every debt.
export function totalBalance(debts) {
  return debts.reduce((sum, d) => sum + Math.max(0, d.balance), 0);
}

// Total minimum payments across every debt — the floor of what the
// household pays each month before any extra money.
export function totalMinimums(debts) {
  return debts.reduce((sum, d) => sum + Math.max(0, d.minPayment), 0);
}

// The most expensive debt the household carries, by APR.
export function highestApr(debts) {
  if (!debts.length) return 0;
  return Math.max(...debts.map((d) => d.apr));
}

// The payoff order for a strategy. Snowball clears the smallest balance
// first — quick wins that keep a household going. Avalanche clears the
// highest APR first — the cheapest route in total interest. Ties break
// toward the other strategy's logic, so the order is always stable.
export function orderDebts(debts, strategy) {
  const copy = [...debts];
  if (strategy === "avalanche") {
    copy.sort((a, b) => b.apr - a.apr || a.balance - b.balance);
  } else {
    // Snowball is the default: smallest balance first.
    copy.sort((a, b) => a.balance - b.balance || b.apr - a.apr);
  }
  return copy;
}

// The two strategies, described for the picker on the page.
export const STRATEGIES = [
  {
    id: "snowball",
    name: "Snowball",
    tagline: "Smallest balance first",
    why: "Quick wins — the first debt clears fast, and its payment rolls into the next one. Best when motivation matters more than maths.",
  },
  {
    id: "avalanche",
    name: "Avalanche",
    tagline: "Highest interest first",
    why: "Cheapest in total — killing the most expensive debt first means less interest overall. Best when every naira counts.",
  },
];

// Runs one plan to the end. `extraMonthly` is the extra money on top of
// all the minimum payments. Returns the month each debt clears, the total
// interest, the total paid, and the debt-free date — or flags the debts
// that can never clear because their minimum does not cover the interest.
export function simulatePayoff(debts, strategy, extraMonthly) {
  const order = orderDebts(debts, strategy);
  const monthlyBudget = totalMinimums(debts) + Math.max(0, Math.round(Number(extraMonthly) || 0));
  const live = order.map((d) => ({
    id: d.id,
    name: d.name,
    balance: Math.max(0, d.balance),
    apr: d.apr,
    minPayment: Math.max(0, d.minPayment),
    interestPaid: 0,
    payoffMonth: null,
  }));
  const stuck = [];
  let totalInterest = 0;
  let month = 0;

  // A debt whose minimum payment is smaller than one month's interest
  // grows forever — no plan clears it. Flag it up front instead of
  // simulating 600 months of a balance going up.
  for (const d of live) {
    if (d.balance > 0 && d.minPayment <= (d.balance * d.apr) / 100 / 12) {
      stuck.push(d.name);
    }
  }
  if (stuck.length) {
    return {
      strategy,
      order: order.map((d) => d.name),
      months: Infinity,
      totalInterest: Infinity,
      totalPaid: Infinity,
      debtFreeLabel: "never at these payments",
      perDebt: live.map((d) => ({ ...d, payoffMonth: null })),
      stuck,
    };
  }

  while (live.some((d) => d.balance > 0) && month < PAYOFF_MAX_MONTHS) {
    month++;
    // 1. Interest lands on every open balance first.
    for (const d of live) {
      if (d.balance <= 0) continue;
      const interest = (d.balance * d.apr) / 100 / 12;
      d.balance += interest;
      d.interestPaid += interest;
      totalInterest += interest;
    }
    // 2. Minimum payments go to every open debt.
    let spent = 0;
    for (const d of live) {
      if (d.balance <= 0) continue;
      const pay = Math.min(d.minPayment, d.balance);
      d.balance -= pay;
      spent += pay;
      if (d.balance <= 0) d.payoffMonth = month;
    }
    // 3. Whatever monthly money is left attacks the first open debt in
    // the chosen order — that is the extra payment plus the minimums
    // freed up by debts already cleared.
    let leftover = monthlyBudget - spent;
    for (const d of live) {
      if (leftover <= 0) break;
      if (d.balance <= 0) continue;
      const pay = Math.min(leftover, d.balance);
      d.balance -= pay;
      leftover -= pay;
      if (d.balance <= 0) d.payoffMonth = month;
    }
  }

  const totalPaid = live.reduce((sum, d) => sum + d.interestPaid, 0) + totalBalance(debts);
  return {
    strategy,
    order: order.map((d) => d.name),
    months: month,
    totalInterest: Math.round(totalInterest),
    totalPaid: Math.round(totalPaid),
    debtFreeLabel: month >= PAYOFF_MAX_MONTHS ? "over 50 years" : payoffMonthLabel(month),
    perDebt: live.map((d) => ({
      id: d.id,
      name: d.name,
      payoffMonth: d.payoffMonth,
      payoffLabel: d.payoffMonth ? payoffMonthLabel(d.payoffMonth) : "—",
      interestPaid: Math.round(d.interestPaid),
    })),
    stuck: [],
  };
}

// The same plan with no extra money at all — the baseline the page
// compares against, so the household can see what the extra payment buys.
export function simulateMinimumOnly(debts, strategy) {
  return simulatePayoff(debts, strategy, 0);
}

// Runs both strategies with the same extra payment and lines the results
// up side by side: months, interest, debt-free date, and how much the
// cheaper one saves. Avalanche is never more expensive than snowball —
// the saving is usually small, and the page says so honestly.
export function compareStrategies(debts, extraMonthly) {
  const snowball = simulatePayoff(debts, "snowball", extraMonthly);
  const avalanche = simulatePayoff(debts, "avalanche", extraMonthly);
  const interestSaved = snowball.totalInterest - avalanche.totalInterest;
  const monthsSaved = snowball.months - avalanche.months;
  return {
    snowball,
    avalanche,
    cheaper: interestSaved >= 0 ? "avalanche" : "snowball",
    interestSaved: Math.max(0, interestSaved),
    monthsSaved: Math.max(0, monthsSaved),
  };
}

// The month-by-month payoff story, one row per debt in payoff order:
// which month it clears, what it cost in interest, and what its payment
// frees up for the next debt. The view renders this as the timeline.
export function payoffTimelineRows(sim) {
  const paid = sim.perDebt.filter((d) => d.payoffMonth !== null);
  paid.sort((a, b) => a.payoffMonth - b.payoffMonth);
  return paid.map((d, i) => ({
    step: i + 1,
    name: d.name,
    payoffMonth: d.payoffMonth,
    payoffLabel: d.payoffLabel,
    interestPaid: d.interestPaid,
    last: i === paid.length - 1,
  }));
}

// Checks a new debt from the add-debt form. Returns a list of problems;
// an empty list means the debt is fine to save. A minimum payment of
// zero is allowed — it just means the debt gets no monthly payment until
// the extra money reaches it — but the form warns about it on the page.
export function validateDebt({ name, balance, apr, minPayment }) {
  const problems = [];
  if (!String(name || "").trim()) problems.push("Give the debt a name.");
  const bal = Math.round(Number(balance) || 0);
  if (bal < 1000) problems.push("Balance must be at least ₦1,000.");
  if (bal > 100000000) problems.push("Balance looks too big — check the number.");
  const rate = Number(apr);
  if (Number.isNaN(rate) || rate < 0) problems.push("APR must be 0 or more.");
  if (rate > 100) problems.push("APR above 100% looks wrong — check the number.");
  const min = Math.round(Number(minPayment) || 0);
  if (min < 0) problems.push("Minimum payment cannot be negative.");
  if (min > 0 && bal > 0 && min <= (bal * Math.max(0, rate)) / 100 / 12) {
    problems.push(
      "Minimum payment does not cover one month's interest — this debt would grow instead of shrinking.",
    );
  }
  return problems;
}

// Builds a new debt object from the add-debt form, with a fresh id.
// The caller supplies the next id number; the shape matches the seed data.
export function makeDebt({ name, balance, apr, minPayment, note }, nextId) {
  return {
    id: "d" + nextId,
    name: String(name).trim(),
    balance: Math.round(Number(balance) || 0),
    apr: Math.round(Number(apr) || 0),
    minPayment: Math.round(Number(minPayment) || 0),
    note: String(note || "").trim(),
  };
}

// One line the page uses under the strategy picker: what the chosen
// strategy does first, in plain words.
export function strategyFirstStep(debts, strategy) {
  const ordered = orderDebts(debts, strategy);
  if (!ordered.length) return "No debts listed.";
  const first = ordered[0];
  if (strategy === "avalanche") {
    return "First target: " + first.name + " — the most expensive at " + first.apr + "% APR.";
  }
  return "First target: " + first.name + " — the smallest balance at " +
    first.balance.toLocaleString("en-NG") + " naira.";
}
