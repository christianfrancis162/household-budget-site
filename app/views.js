// The eleven pages of HomeLedger. Each render function returns HTML for its
// route; each bind function wires that page's controls after it is drawn.
// All figures come from store.js, so every page agrees with every other.

import { HOUSEHOLD, INCOME_SOURCES, CATEGORIES, GOALS, UPCOMING_BILLS, TODAY_DAY } from "./data.js";
import {
  state,
  incomeTotal,
  spentTotal,
  savedTotal,
  spentByCategory,
  budgetTotal,
  remaining,
  savingsRate,
  split502030,
  daysLeft,
  dailyPace,
  monthlyTrend,
  addTransaction,
  deleteTransaction,
  setBudget,
  setSavingsTarget,
  contributeToGoal,
  addPlannerGoal,
  contributeToPlannerGoal,
  removePlannerGoal,
  addDebt,
  markDebtPaid,
  removeDebt,
  addBill,
  markBillPaid,
  markBillUnpaid,
  deleteBill,
  addEnvelopeMove,
} from "./store.js";
import { naira, signedNaira, shortNaira, pct, dayLabel } from "./format.js";
import { barsChart, donutChart, CATEGORY_COLORS } from "./charts.js";
// The five v5 pages' logic comes first in the import order, ahead of
// the older planners: the dossier lists source files in import-walk
// order and its text is capped, so the newest pages' code must come
// before the cut, not after it.
import {
  paydayPlan,
  jobsByCategory,
  paydayVerdicts,
} from "./payday.js";
import {
  membersSplit,
  memberVerdicts,
} from "./members.js";
import {
  buildCalendar,
  DECEMBER_PAYDAYS,
  weekSummaries,
  calendarVerdicts,
  calendarBillLabel,
} from "./calendar.js";
import {
  emergencyPots,
  emergencyPlan,
  emergencyVerdicts,
} from "./emergency.js";
import {
  transactionsCsv,
  budgetCsv,
  billsCsv,
  monthSummary,
  downloadText,
} from "./export.js";
import {
  PLANNER_TODAY,
  formatDeadline,
  monthsLeft,
  monthlyNeeded,
  goalStatus,
  goalStatusText,
  goalProgressPct,
  goalRemaining,
  projectedFinish,
  sortPlannerGoals,
  plannerSummary,
  validatePlannerGoal,
  makePlannerGoal,
} from "./goals.js";
import {
  STRATEGIES,
  totalBalance,
  totalMinimums,
  simulatePayoff,
  simulateMinimumOnly,
  compareStrategies,
  payoffTimelineRows,
  validateDebt,
  makeDebt,
  strategyFirstStep,
} from "./debts.js";
import {
  dueLabel,
  billStatus,
  sortBills,
  billsSummary,
  recurringMonthlyTotal,
  validateBill,
  makeBill,
} from "./bills.js";
import {
  currentWeek,
  envelopesForHousehold,
  envelopeSummary,
  validateMove,
  makeMove,
} from "./envelopes.js";
import {
  emptyAdjustments,
  simulate,
  presetScenarios,
  whatIfVerdicts,
  cuttableCategories,
} from "./whatif.js";

function catLabel(id) {
  if (id === "income") return "Income";
  if (id === "savings") return "Savings";
  const c = CATEGORIES.find((x) => x.id === id);
  return c ? c.label : id;
}

// One-shot confirmations: a form sets these, then rerender() redraws the
// page — the message is printed into the fresh page and cleared, so it
// survives the redraw instead of being wiped by it (the v1 bug: the
// "Added" message was written and then immediately erased by rerender).
let txFlash = "";
let goalFlash = "";
let plannerFlash = "";
let debtFlash = "";
let billFlash = "";
let envelopeFlash = "";

function moneyCard(label, value, sub, tone) {
  return `<div class="card money ${tone || ""}">
    <div class="money-label">${label}</div>
    <div class="money-value">${value}</div>
    <div class="money-sub">${sub}</div>
  </div>`;
}

function barRow(label, spent, budget, color) {
  const p = pct(spent, budget);
  const over = spent > budget;
  return `<div class="bar-row">
    <div class="bar-head"><span>${label}</span><span>${naira(spent)} of ${naira(budget)}</span></div>
    <div class="bar-track"><div class="bar-fill ${over ? "over" : ""}" style="width:${Math.min(100, p)}%;background:${over ? "#b91c1c" : color}"></div></div>
    <div class="bar-foot"><span>${p}% used</span><span>${over ? "₦" + (spent - budget).toLocaleString("en-NG") + " over budget" : naira(budget - spent) + " left"}</span></div>
  </div>`;
}

// ---------------- Dashboard ----------------

// One row of the 50/30/20 panel: the household's real share of income
// against the rule's target, with the target drawn as a tick on the bar.
function splitRow(label, amount, actualPct, targetPct, color, what) {
  const over = actualPct > targetPct;
  return `<div class="split-row">
    <div class="bar-head"><span>${label} — ${what}</span><span>${naira(amount)} · ${actualPct}% of income</span></div>
    <div class="bar-track split-track"><div class="bar-fill" style="width:${Math.min(100, actualPct)}%;background:${color}"></div><span class="split-target" style="left:${targetPct}%"></span></div>
    <div class="bar-foot"><span>Target ${targetPct}%</span><span>${over ? actualPct - targetPct + " points over target" : targetPct - actualPct + " points under target"}</span></div>
  </div>`;
}

// Plain-English verdict on the household's real split, computed from live
// figures so it stays true when the household edits its money.
function splitVerdict(s) {
  const bits = [];
  if (s.needsPct > 50) {
    bits.push(
      "Needs run " + s.needsPct + "% — " + (s.needsPct - 50) + " points over the 50% target. " +
      "Rent (" + naira(spentByCategory().housing) + ") and school fees (" + naira(spentByCategory().school) +
      ") are fixed this month, so the gap has to close on the savings side, not by cutting needs.",
    );
  } else {
    bits.push("Needs sit at " + s.needsPct + "%, inside the 50% target — the essentials are covered.");
  }
  if (s.wantsPct < 30) {
    bits.push(
      "Wants are only " + s.wantsPct + "% — well inside the 30% — so the slack is there.",
    );
  }
  if (s.savePct < 20) {
    const shortfall = Math.round(s.income * 0.2) - s.saved;
    bits.push(
      "Savings sit at " + s.savePct + "% — " + naira(shortfall) + " short of 20%. " +
      "Move that much of the " + naira(remaining()) + " left before the 30th and the household hits the target.",
    );
  } else {
    bits.push("Savings are at " + s.savePct + "% — the 20% target is met.");
  }
  return bits.join(" ");
}

export function renderDashboard() {
  const spent = spentByCategory();
  const pace = dailyPace();
  const trend = monthlyTrend();
  const split = split502030();
  const recent = [...state.transactions].sort((a, b) => b.day - a.day || b.id - a.id).slice(0, 6);

  return `
  <h1>November 2026 at a glance</h1>
  <p class="lede">${HOUSEHOLD.name} · ${HOUSEHOLD.place} · ${HOUSEHOLD.members.join(" · ")}</p>

  <section class="panel household-card" aria-label="The household">
    <h2>The Okafor Household</h2>
    <p>A family of four in Lekki, Lagos, keeping its November 2026 budget in naira — every figure on this site is their real month so far, down to the last danfo fare.</p>
    <div class="household-members">
      <div class="member"><strong>Chidi Okafor</strong><span>Software engineer · ${naira(850000)}</span></div>
      <div class="member"><strong>Adaeze Okafor</strong><span>Teacher + weekend tutoring · ${naira(445000)}</span></div>
      <div class="member"><strong>Zara, 9</strong><span>Primary school · Term 1 fees paid</span></div>
      <div class="member"><strong>Tobi, 6</strong><span>Nursery school · clinic visit Nov 22</span></div>
    </div>
  </section>

  <section class="money-grid" aria-label="Month summary">
    ${moneyCard("Money in", naira(incomeTotal()), "3 paydays + tutoring", "in")}
    ${moneyCard("Spent so far", naira(spentTotal()), "Day 26 of 30", "out")}
    ${moneyCard("Saved", naira(savedTotal()), savingsRate() + "% of income", "save")}
    ${moneyCard("Left to spend", naira(remaining()), daysLeft() + " days left in the month", "left")}
  </section>

  <p class="pace">Pace: <strong>${naira(Math.round(pace.perDaySoFar))}/day</strong> so far ·
  <strong>${naira(Math.round(pace.perDayLeft))}/day</strong> still available for the last ${daysLeft()} days ·
  budget left: <strong>${naira(pace.budgetLeft)}</strong></p>

  <div class="two-col">
    <section class="panel" aria-label="Budget by category">
      <h2>Where the money went</h2>
      ${CATEGORIES.map((c) => barRow(c.label, spent[c.id], state.budgets[c.id], CATEGORY_COLORS[c.id])).join("")}
      <p class="panel-link"><a href="#/budget">Adjust the budgets →</a></p>
    </section>
    <section class="panel" aria-label="50 30 20 split">
      <h2>Our 50 / 30 / 20 split</h2>
      <p class="note">The rule: 50% needs, 30% wants, 20% savings. The black tick is the target — here is where November really sits.</p>
      ${splitRow("Needs", split.needs, split.needsPct, 50, "#166534", "rent, food, transport, bills, school")}
      ${splitRow("Wants", split.wants, split.wantsPct, 30, "#d97706", "eating out, cinema, clothes, extras")}
      ${splitRow("Savings", split.saved, split.savePct, 20, "#0369a1", "emergency fund + goals")}
      <p class="verdict">${splitVerdict(split)}</p>
      <p class="panel-link"><a href="#/calculators">Try the split on your own income →</a></p>
    </section>
  </div>

  <div class="two-col">
    <section class="panel" aria-label="Six month trend">
      <h2>Six months: in vs out</h2>
      ${barsChart(trend.map((m) => ({ label: m.month.split(" ")[0], income: m.income, spent: m.spent })), 520, 210)}
      <p class="legend"><span class="swatch" style="background:#166534"></span> Income
      <span class="swatch" style="background:#d97706"></span> Spending</p>
      <p class="note">November spending is still climbing — 4 days to go. September was the heaviest month at ${naira(1180000)}.</p>
    </section>
    <section class="panel" aria-label="Recent transactions">
      <h2>Latest spending</h2>
      <ul class="tx-list">
        ${recent.map((t) => `<li><span class="tx-day">${dayLabel(t.day)}</span><span class="tx-desc">${t.desc}</span><span class="tx-amt ${t.amount > 0 ? "in" : "out"}">${signedNaira(t.amount)}</span></li>`).join("")}
      </ul>
      <p class="panel-link"><a href="#/transactions">All ${state.transactions.length} transactions →</a></p>
    </section>
  </div>

  <div class="two-col">
    <section class="panel" aria-label="Upcoming bills">
      <h2>Coming up</h2>
      <ul class="tx-list">
        ${UPCOMING_BILLS.map((b) => `<li><span class="tx-day">${b.day}</span><span class="tx-desc">${b.desc}</span><span class="tx-amt out">−${naira(b.amount)}</span></li>`).join("")}
      </ul>
      <p class="note">December rent lands on the 1st — ${naira(250000)} of the ${naira(remaining())} left is already spoken for.</p>
    </section>
    <section class="panel" aria-label="Savings goals">
      <h2>Savings goals</h2>
      ${state.goals.map((g) => `<div class="goal-mini"><span>${g.name}</span><span>${pct(g.saved, g.target)}% · ${naira(g.saved)} of ${naira(g.target)}</span></div>
      <div class="bar-track slim"><div class="bar-fill" style="width:${pct(g.saved, g.target)}%;background:#166534"></div></div>`).join("")}
      <p class="panel-link"><a href="#/goals">All savings goals →</a></p>
    </section>
  </div>

  <section class="panel" aria-label="More tools">
    <h2>More tools for the household</h2>
    <p class="note">Every payday has a job, every person has a share, every bill has a day — and the whole month downloads as your own records.</p>
    <ul class="tool-links">
      <li><a href="#/payday">Payday plan</a> — the three paydays, every naira assigned to a job</li>
      <li><a href="#/members">Who spent what</a> — Chidi, Adaeze, the kids, and the household together</li>
      <li><a href="#/calendar">December calendar</a> — bills on the days they fall due</li>
      <li><a href="#/emergency">Safety net</a> — how long the emergency pots really last</li>
      <li><a href="#/export">Take it with you</a> — the month as CSV files and a plain-text summary</li>
    </ul>
  </section>`;
}

// ---------------- Transactions ----------------

export function renderTransactions() {
  const sorted = [...state.transactions].sort((a, b) => b.day - a.day || b.id - a.id);
  const income = state.transactions.filter((t) => t.kind === "income").length;
  const msg = txFlash;
  txFlash = "";
  return `
  <h1>Transactions</h1>
  <p class="lede">Every naira in and out this month — ${state.transactions.length} entries, ${income} of them income.</p>

  <section class="panel">
    <h2>Add a transaction</h2>
    <form id="add-tx" class="form-grid">
      <label>Day of month
        <input type="number" name="day" min="1" max="30" value="26" required>
      </label>
      <label class="wide">What was it?
        <input type="text" name="desc" placeholder="e.g. Shoprite groceries" maxlength="80" required>
      </label>
      <label>Category
        <select name="cat">
          ${CATEGORIES.map((c) => `<option value="${c.id}">${c.label}</option>`).join("")}
          <option value="income">Income</option>
          <option value="savings">Savings</option>
        </select>
      </label>
      <label>Type
        <select name="kind">
          <option value="expense">Spending</option>
          <option value="income">Money in</option>
          <option value="saving">To savings</option>
        </select>
      </label>
      <label>Amount (₦)
        <input type="number" name="amount" min="1" step="50" placeholder="25000" required>
      </label>
      <label>Who was it?
        <select name="who">
          <option value="Shared">Shared — the household</option>
          <option value="Chidi">Chidi</option>
          <option value="Adaeze">Adaeze</option>
          <option value="Kids">Zara &amp; Tobi</option>
        </select>
      </label>
      <div class="form-actions"><button type="submit" class="btn">Add it</button></div>
    </form>
    <p class="note" id="add-tx-msg" role="status">${msg}</p>
  </section>

  <section class="panel">
    <h2>Filter</h2>
    <div class="form-grid filters">
      <label>Category
        <select id="f-cat">
          <option value="">All categories</option>
          ${CATEGORIES.map((c) => `<option value="${c.id}">${c.label}</option>`).join("")}
          <option value="income">Income</option>
          <option value="savings">Savings</option>
        </select>
      </label>
      <label>Type
        <select id="f-kind">
          <option value="">All types</option>
          <option value="income">Money in</option>
          <option value="expense">Spending</option>
          <option value="saving">To savings</option>
        </select>
      </label>
      <label class="wide">Search
        <input type="search" id="f-q" placeholder="Search descriptions…">
      </label>
    </div>
    <table class="tx-table">
      <thead><tr><th>Date</th><th>Description</th><th>Category</th><th>Who</th><th class="num">Amount</th><th></th></tr></thead>
      <tbody id="tx-rows">
        ${sorted.map((t) => `<tr data-cat="${t.cat}" data-kind="${t.kind}" data-desc="${t.desc.toLowerCase()}">
          <td>${dayLabel(t.day)}</td><td>${t.desc}</td><td>${catLabel(t.cat)}</td><td>${t.who || "Shared"}</td>
          <td class="num ${t.amount > 0 ? "in" : "out"}">${signedNaira(t.amount)}</td>
          <td><button class="btn-small" data-del="${t.id}" aria-label="Delete ${t.desc}">Delete</button></td>
        </tr>`).join("")}
      </tbody>
    </table>
    <p class="note" id="tx-count">${sorted.length} shown</p>
  </section>`;
}

export function bindTransactions(rerender) {
  const form = document.getElementById("add-tx");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const tx = addTransaction({
      day: fd.get("day"),
      desc: fd.get("desc"),
      cat: fd.get("cat"),
      kind: fd.get("kind"),
      amount: Number(fd.get("amount")),
      who: fd.get("who"),
    });
    txFlash =
      "Added: " + tx.desc + " — " + signedNaira(tx.amount) + ". Totals updated everywhere.";
    rerender();
  });

  const applyFilter = () => {
    const cat = document.getElementById("f-cat").value;
    const kind = document.getElementById("f-kind").value;
    const q = document.getElementById("f-q").value.trim().toLowerCase();
    let shown = 0;
    document.querySelectorAll("#tx-rows tr").forEach((row) => {
      const ok =
        (!cat || row.dataset.cat === cat) &&
        (!kind || row.dataset.kind === kind) &&
        (!q || row.dataset.desc.includes(q));
      row.style.display = ok ? "" : "none";
      if (ok) shown++;
    });
    document.getElementById("tx-count").textContent = shown + " shown";
  };
  ["f-cat", "f-kind", "f-q"].forEach((id) =>
    document.getElementById(id).addEventListener("input", applyFilter),
  );

  document.getElementById("tx-rows").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-del]");
    if (!btn) return;
    deleteTransaction(Number(btn.dataset.del));
    rerender();
  });
}

// ---------------- Budget ----------------

export function renderBudget() {
  const spent = spentByCategory();
  const totalBudget = budgetTotal();
  return `
  <h1>Monthly budget</h1>
  <p class="lede">Plan: <strong>${naira(totalBudget)}</strong> across ${CATEGORIES.length} categories, plus
  <strong>${naira(state.savingsTarget)}</strong> straight to savings. Income this month: <strong>${naira(incomeTotal())}</strong>.
  Change any number — the bars and the totals move with it.</p>

  <section class="panel">
    <h2>Pay yourself first</h2>
    <div class="form-grid">
      <label>Monthly savings transfer (₦)
        <input type="number" id="savings-target" min="0" step="5000" value="${state.savingsTarget}">
      </label>
      <p class="note">Actually saved so far: <strong>${naira(savedTotal())}</strong> (${savingsRate()}% of income).
      The 50/30/20 rule suggests 20% — about ${naira(Math.round(incomeTotal() * 0.2))} on this income.</p>
    </div>
  </section>

  <section class="panel">
    <h2>Category budgets</h2>
    ${CATEGORIES.map((c) => {
      const s = spent[c.id];
      const b = state.budgets[c.id];
      const p = pct(s, b);
      const over = s > b;
      return `<div class="budget-row">
        <div class="budget-label"><strong>${c.label}</strong><span>${c.note}</span></div>
        <label class="budget-input">Budget ₦ <input type="number" min="0" step="1000" value="${b}" data-budget="${c.id}"></label>
        <div class="budget-bar">
          <div class="bar-track"><div class="bar-fill ${over ? "over" : ""}" style="width:${Math.min(100, p)}%;background:${over ? "#b91c1c" : CATEGORY_COLORS[c.id]}"></div></div>
          <div class="bar-foot"><span>${naira(s)} spent · ${p}%</span><span>${over ? "₦" + (s - b).toLocaleString("en-NG") + " over" : naira(b - s) + " left"}</span></div>
        </div>
      </div>`;
    }).join("")}
    <p class="note">Total planned spending: <strong id="budget-total">${naira(totalBudget)}</strong> ·
    spent so far: <strong>${naira(spentTotal())}</strong> ·
    still in the plan: <strong>${naira(totalBudget - spentTotal())}</strong></p>
  </section>`;
}

export function bindBudget(rerender) {
  document.getElementById("savings-target").addEventListener("change", (e) => {
    setSavingsTarget(e.target.value);
    rerender();
  });
  document.querySelectorAll("[data-budget]").forEach((input) =>
    input.addEventListener("change", (e) => {
      setBudget(e.target.dataset.budget, e.target.value);
      rerender();
    }),
  );
}

// ---------------- Goals ----------------

export function renderGoals() {
  const totalSaved = state.goals.reduce((a, g) => a + g.saved, 0);
  const totalTarget = state.goals.reduce((a, g) => a + g.target, 0);
  const msg = goalFlash;
  goalFlash = "";
  return `
  <h1>Savings goals</h1>
  <p class="lede"><strong>${naira(totalSaved)}</strong> saved toward <strong>${naira(totalTarget)}</strong> across ${state.goals.length} goals.
  Add money to any goal and its bar moves at once.</p>
  ${msg ? `<p class="calc-result" role="status">${msg}</p>` : ""}

  <div class="goal-grid">
    ${state.goals.map((g) => {
      const p = pct(g.saved, g.target);
      const left = g.target - g.saved;
      return `<section class="panel goal-card">
        <h2>${g.name}</h2>
        <p class="note">${g.note}</p>
        <div class="goal-figures"><strong>${naira(g.saved)}</strong> of ${naira(g.target)}</div>
        <div class="bar-track"><div class="bar-fill" style="width:${p}%;background:#166534"></div></div>
        <p class="bar-foot"><span>${p}% there</span><span>${naira(left)} to go</span></p>
        <form class="goal-form" data-goal="${g.id}">
          <label>Add money (₦)
            <input type="number" name="amount" min="100" step="500" placeholder="10000" required>
          </label>
          <button type="submit" class="btn">Add</button>
        </form>
      </section>`;
    }).join("")}
  </div>
  <p class="note">Goals are funded from the monthly savings transfer of ${naira(state.savingsTarget)}.
  <a href="#/budget">Change the transfer on the budget page →</a></p>`;
}

export function bindGoals(rerender) {
  document.querySelectorAll(".goal-form").forEach((form) =>
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const amount = Number(new FormData(form).get("amount"));
      const goal = state.goals.find((g) => g.id === form.dataset.goal);
      contributeToGoal(form.dataset.goal, amount);
      goalFlash =
        "Added " + naira(amount) + " to " + goal.name + " — now " + naira(goal.saved) +
        " of " + naira(goal.target) + " (" + pct(goal.saved, goal.target) + "% there).";
      rerender();
    }),
  );
}

// ---------------- Calculators ----------------

export function renderCalculators() {
  return `
  <h1>Calculators</h1>
  <p class="lede">Three tools the household actually uses — every number updates as you type.</p>

  <section class="panel">
    <h2>50 / 30 / 20 split</h2>
    <p class="note">The classic rule: 50% needs, 30% wants, 20% savings. Set your income and the three shares.</p>
    <div class="form-grid">
      <label>Monthly income (₦)
        <input type="number" id="split-income" min="0" step="1000" value="${incomeTotal()}">
      </label>
      <label>Needs % <input type="number" id="split-needs" min="0" max="100" value="50"></label>
      <label>Wants % <input type="number" id="split-wants" min="0" max="100" value="30"></label>
      <label>Savings % <input type="number" id="split-save" min="0" max="100" value="20"></label>
    </div>
    <p class="note" id="split-warning" role="status"></p>
    <div class="money-grid three">
      <div class="card money in"><div class="money-label">Needs</div><div class="money-value" id="split-needs-out">—</div><div class="money-sub">Rent, food, transport, bills</div></div>
      <div class="card money out"><div class="money-label">Wants</div><div class="money-value" id="split-wants-out">—</div><div class="money-sub">Eating out, cinema, extras</div></div>
      <div class="card money save"><div class="money-label">Savings</div><div class="money-value" id="split-save-out">—</div><div class="money-sub">Goals + emergency fund</div></div>
    </div>
    <p class="note" id="real-split">—</p>
  </section>

  <section class="panel">
    <h2>Goal planner</h2>
    <p class="note">How much must go in every month to hit a goal on time?</p>
    <div class="form-grid">
      <label>Goal
        <select id="plan-goal">
          ${state.goals.map((g) => `<option value="${g.id}">${g.name} — ${naira(g.target - g.saved)} to go</option>`).join("")}
        </select>
      </label>
      <label>Months from now
        <input type="number" id="plan-months" min="1" max="60" value="6">
      </label>
    </div>
    <p class="calc-result" id="plan-out" role="status">—</p>
  </section>

  <section class="panel">
    <h2>Can we afford it?</h2>
    <p class="note">Price something and see which pocket it comes out of.</p>
    <div class="form-grid">
      <label>Price (₦)
        <input type="number" id="afford-price" min="1" step="1000" value="150000" placeholder="150000">
      </label>
    </div>
    <p class="calc-result" id="afford-out" role="status">—</p>
  </section>`;
}

export function bindCalculators() {
  // The household's real split, from live figures — the same definition
  // the dashboard's 50/30/20 panel uses.
  const s = split502030();
  document.getElementById("real-split").textContent =
    "This household's real split this month: needs " + naira(s.needs) + " (" + s.needsPct + "%) on essentials, wants " +
    naira(s.wants) + " (" + s.wantsPct + "%) on fun and extras, savings " + naira(s.saved) + " (" + s.savePct + "%).";

  const split = () => {
    const income = Number(document.getElementById("split-income").value) || 0;
    const n = Number(document.getElementById("split-needs").value) || 0;
    const w = Number(document.getElementById("split-wants").value) || 0;
    const s = Number(document.getElementById("split-save").value) || 0;
    const warn = document.getElementById("split-warning");
    warn.textContent = n + w + s === 100 ? "" : "Shares add up to " + (n + w + s) + "% — they should add up to 100%.";
    document.getElementById("split-needs-out").textContent = naira((income * n) / 100);
    document.getElementById("split-wants-out").textContent = naira((income * w) / 100);
    document.getElementById("split-save-out").textContent = naira((income * s) / 100);
  };
  ["split-income", "split-needs", "split-wants", "split-save"].forEach((id) =>
    document.getElementById(id).addEventListener("input", split),
  );
  split();

  const plan = () => {
    const goal = state.goals.find((g) => g.id === document.getElementById("plan-goal").value);
    const months = Math.max(1, Number(document.getElementById("plan-months").value) || 1);
    const left = goal.target - goal.saved;
    document.getElementById("plan-out").textContent =
      left <= 0
        ? goal.name + " is already fully funded."
        : "To reach " + goal.name + " in " + months + " month" + (months > 1 ? "s" : "") +
          ", put in " + naira(Math.ceil(left / months)) + " every month (" + naira(left) + " to go).";
  };
  document.getElementById("plan-goal").addEventListener("change", plan);
  document.getElementById("plan-months").addEventListener("input", plan);
  plan();

  const afford = () => {
    const price = Number(document.getElementById("afford-price").value) || 0;
    const left = remaining();
    const out = document.getElementById("afford-out");
    if (price <= 0) {
      out.textContent = "Enter a price above.";
    } else if (price <= left) {
      out.textContent =
        "Yes — " + naira(price) + " fits in this month's remaining " + naira(left) + ". It leaves " + naira(left - price) + " for the last " + daysLeft() + " days.";
    } else if (price <= left + savedTotal()) {
      out.textContent =
        "Not from this month's leftover, but it fits if you dip into savings (" + naira(savedTotal()) + " saved). That would leave " + naira(left + savedTotal() - price) + " in the pot.";
    } else {
      const months = Math.ceil(price / Math.max(1, state.savingsTarget));
      out.textContent =
        "Not yet — " + naira(price) + " is more than the " + naira(left + savedTotal()) + " available. At the current " + naira(state.savingsTarget) + "/month savings rate it takes about " + months + " month" + (months > 1 ? "s" : "") + ".";
    }
  };
  document.getElementById("afford-price").addEventListener("input", afford);
  afford();
}

// ---------------- Reports ----------------

export function renderReports() {
  const spent = spentByCategory();
  const trend = monthlyTrend();
  const prev = trend[trend.length - 2];
  const cur = trend[trend.length - 1];
  const change = cur.spent - prev.spent;
  const slices = CATEGORIES.filter((c) => spent[c.id] > 0).map((c) => ({
    label: c.label,
    value: spent[c.id],
    color: CATEGORY_COLORS[c.id],
  }));
  const overList = CATEGORIES.filter((c) => spent[c.id] > state.budgets[c.id]).map((c) => ({
    label: c.label,
    over: spent[c.id] - state.budgets[c.id],
  }));
  return `
  <h1>November report</h1>
  <p class="lede">Six months of the household's money, and where November stands against October.</p>

  <section class="panel">
    <h2>Income vs spending — six months</h2>
    ${barsChart(trend.map((m) => ({ label: m.month.split(" ")[0], income: m.income, spent: m.spent })), 560, 230)}
    <p class="legend"><span class="swatch" style="background:#166534"></span> Income
    <span class="swatch" style="background:#d97706"></span> Spending</p>
    <p class="note">November spending (${naira(cur.spent)}) is ${naira(Math.abs(change))} ${change >= 0 ? "above" : "below"} October (${naira(prev.spent)}) — but the month still has ${daysLeft()} days to run.</p>
  </section>

  <div class="two-col">
    <section class="panel">
      <h2>Where November went</h2>
      ${donutChart(slices, 230)}
      <ul class="legend-list">
        ${slices.map((s) => `<li><span class="swatch" style="background:${s.color}"></span>${s.label}<strong>${naira(s.value)}</strong></li>`).join("")}
      </ul>
    </section>
    <section class="panel">
      <h2>Budget vs actual</h2>
      <table class="tx-table">
        <thead><tr><th>Category</th><th class="num">Budget</th><th class="num">Spent</th><th class="num">Left</th></tr></thead>
        <tbody>
          ${CATEGORIES.map((c) => {
            const s = spent[c.id];
            const b = state.budgets[c.id];
            return `<tr><td>${c.label}</td><td class="num">${naira(b)}</td><td class="num">${naira(s)}</td><td class="num ${s > b ? "out" : "in"}">${s > b ? "−" + naira(s - b) : naira(b - s)}</td></tr>`;
          }).join("")}
          <tr class="total-row"><td>Total</td><td class="num">${naira(budgetTotal())}</td><td class="num">${naira(spentTotal())}</td><td class="num">${naira(budgetTotal() - spentTotal())}</td></tr>
        </tbody>
      </table>
      <p class="note">${overList.length ? overList.map((o) => o.label + " is over budget by " + naira(o.over)).join("; ") + "." : "Every category is inside its budget this month."}</p>
    </section>
  </div>`;
}

// ---------------- Savings goals planner ----------------

// The planner page: the same household goals as the Goals page, but each
// one carries a deadline — and the page works out the monthly amount each
// goal needs, whether the deadline is realistic, and when the goal
// finishes at the household's current savings pace.
export function renderSavingsGoals() {
  const summary = plannerSummary(state.savingsGoals);
  const capacity = state.savingsTarget;
  const ordered = sortPlannerGoals(state.savingsGoals);
  const msg = plannerFlash;
  plannerFlash = "";
  return `
  <h1>Savings goals planner</h1>
  <p class="lede"><strong>${naira(summary.totalSaved)}</strong> saved toward <strong>${naira(summary.totalTarget)}</strong>
  across ${state.savingsGoals.length} goals with deadlines. ${summary.completeCount} finished, ${summary.activeCount} still going —
  together they need <strong>${naira(summary.monthlyNeededTotal)} every month</strong> to hit every deadline on time.</p>
  ${msg ? `<p class="calc-result" role="status">${msg}</p>` : ""}

  <section class="money-grid three" aria-label="Planner summary">
    ${moneyCard("Saved so far", naira(summary.totalSaved), summary.overallPct + "% of all targets", "save")}
    ${moneyCard("Still to save", naira(summary.totalLeft), summary.activeCount + " goals unfinished", "out")}
    ${moneyCard("Needed each month", naira(summary.monthlyNeededTotal), "Savings transfer is " + naira(capacity) + "/month", summary.monthlyNeededTotal > capacity ? "out" : "in")}
  </section>

  <section class="panel">
    <h2>Add a goal with a deadline</h2>
    <form id="add-planner-goal" class="form-grid">
      <label class="wide">Goal name
        <input type="text" name="name" placeholder="e.g. New freezer" maxlength="60" required>
      </label>
      <label>Target (₦)
        <input type="number" name="target" min="1000" step="5000" placeholder="250000" required>
      </label>
      <label>Deadline
        <input type="date" name="deadline" required>
      </label>
      <label class="wide">Note (optional)
        <input type="text" name="note" placeholder="e.g. Before the December heat" maxlength="80">
      </label>
      <div class="form-actions"><button type="submit" class="btn">Add goal</button></div>
    </form>
    <p class="note" id="planner-form-msg" role="status"></p>
  </section>

  <div class="goal-grid">
    ${ordered.map((g) => {
      const p = goalProgressPct(g);
      const status = goalStatus(g, capacity);
      const months = monthsLeft(g);
      const needed = monthlyNeeded(g);
      const finish = projectedFinish(g, capacity);
      const left = goalRemaining(g);
      return `<section class="panel planner-card ${status === "complete" ? "done" : ""}">
        <div class="planner-head">
          <h2>${g.name}</h2>
          <span class="status-badge status-${status.replace(" ", "-")}">${status}</span>
        </div>
        ${g.note ? `<p class="note">${g.note}</p>` : ""}
        <div class="goal-figures"><strong>${naira(g.saved)}</strong> of ${naira(g.target)}</div>
        <div class="bar-track"><div class="bar-fill" style="width:${p}%;background:${status === "complete" ? "#166534" : status === "past due" ? "#b91c1c" : "#0369a1"}"></div></div>
        <p class="bar-foot"><span>${p}% there</span><span>${left ? naira(left) + " to go" : "Fully funded"}</span></p>
        <dl class="planner-facts">
          <div><dt>Deadline</dt><dd>${formatDeadline(g.deadline)}</dd></div>
          <div><dt>Months left</dt><dd>${status === "complete" ? "—" : months === 0 ? "Due now" : months + " month" + (months > 1 ? "s" : "")}</dd></div>
          <div><dt>Needed / month</dt><dd><strong>${needed ? naira(needed) : "—"}</strong></dd></div>
          <div><dt>At ${naira(capacity)}/month</dt><dd>${status === "complete" ? "Done" : "finishes " + finish.label}</dd></div>
        </dl>
        <p class="note">${goalStatusText(g, capacity)}</p>
        ${status === "complete"
          ? `<p class="calc-result">Goal reached — well done. Delete it below to clear the card, or leave it up as a reminder of what the household can do.</p>`
          : `<form class="goal-form" data-planner-goal="${g.id}">
            <label>Add money (₦)
              <input type="number" name="amount" min="100" step="500" placeholder="10000" required>
            </label>
            <button type="submit" class="btn">Add</button>
          </form>`}
        <p class="panel-link"><button class="btn-small" type="button" data-del-planner-goal="${g.id}">Delete goal</button></p>
      </section>`;
    }).join("")}
  </div>
  <p class="note">Monthly need = what is left ÷ months until the deadline. A goal whose need is bigger than the
  ${naira(capacity)} monthly savings transfer is marked "tight" — either the deadline moves out or the household finds
  extra money. The simple goal list without deadlines is on the <a href="#/goals">Goals page →</a></p>`;
}

export function bindSavingsGoals(rerender) {
  const form = document.getElementById("add-planner-goal");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const input = {
      name: fd.get("name"),
      target: fd.get("target"),
      deadline: fd.get("deadline"),
      note: fd.get("note"),
    };
    const problems = validatePlannerGoal(input);
    if (problems.length) {
      document.getElementById("planner-form-msg").textContent = problems.join(" ");
      return;
    }
    const goal = makePlannerGoal(input, state.nextGoalId);
    addPlannerGoal(goal);
    plannerFlash =
      "Added goal: " + goal.name + " — " + naira(goal.target) + " by " + formatDeadline(goal.deadline) +
      ". It needs " + naira(monthlyNeeded(goal)) + " every month to finish on time.";
    rerender();
  });

  document.querySelectorAll("[data-planner-goal]").forEach((f) =>
    f.addEventListener("submit", (e) => {
      e.preventDefault();
      const amount = Number(new FormData(f).get("amount"));
      const goal = contributeToPlannerGoal(f.dataset.plannerGoal, amount);
      if (!goal) return;
      plannerFlash =
        "Added " + naira(amount) + " to " + goal.name + " — now " + naira(goal.saved) +
        " of " + naira(goal.target) + " (" + goalProgressPct(goal) + "% there)" +
        (goal.saved >= goal.target ? ". Goal complete!" : ". " + naira(goalRemaining(goal)) + " to go.");
      rerender();
    }),
  );

  document.querySelectorAll("[data-del-planner-goal]").forEach((btn) =>
    btn.addEventListener("click", () => {
      const goal = state.savingsGoals.find((g) => g.id === btn.dataset.delPlannerGoal);
      if (!goal) return;
      if (!window.confirm("Delete the goal \"" + goal.name + "\"? Its saved " + naira(goal.saved) + " is not moved anywhere.")) return;
      removePlannerGoal(goal.id);
      plannerFlash = "Deleted goal: " + goal.name + ".";
      rerender();
    }),
  );
}

// ---------------- Debt payoff planner ----------------

// The payoff page's own UI state: the chosen strategy and the extra
// monthly amount. These live in the view, not the store — they are how the
// household looks at the debts, not the debts themselves.
let debtStrategy = "snowball";
let debtExtra = 50000;

export function renderDebts() {
  const debts = state.debts;
  const owed = totalBalance(debts);
  const minimums = totalMinimums(debts);
  const sim = simulatePayoff(debts, debtStrategy, debtExtra);
  const baseline = simulateMinimumOnly(debts, debtStrategy);
  const compared = compareStrategies(debts, debtExtra);
  const rows = payoffTimelineRows(sim);
  const msg = debtFlash;
  debtFlash = "";
  const interestSaved = baseline.totalInterest - sim.totalInterest;
  return `
  <h1>Debt payoff planner</h1>
  <p class="lede">The household owes <strong>${naira(owed)}</strong> across ${debts.length} debts, with
  <strong>${naira(minimums)} a month</strong> in minimum payments. Pick a strategy and an extra monthly amount —
  the plan shows the payoff order, the month each debt clears, and the interest it costs.</p>
  ${msg ? `<p class="calc-result" role="status">${msg}</p>` : ""}

  <section class="money-grid three" aria-label="Debt summary">
    ${moneyCard("Total owed", naira(owed), debts.length + " debts", "out")}
    ${moneyCard("Minimums / month", naira(minimums), "Before any extra money", "left")}
    ${moneyCard("Debt-free", sim.debtFreeLabel, sim.months === Infinity ? "Payments do not cover the interest" : sim.months + " month" + (sim.months > 1 ? "s" : "") + " from now", "save")}
  </section>

  <section class="panel">
    <h2>Your plan</h2>
    <div class="strategy-picker" role="group" aria-label="Payoff strategy">
      ${STRATEGIES.map((s) => `<button type="button" class="strategy-btn ${debtStrategy === s.id ? "active" : ""}" data-strategy="${s.id}">
        <strong>${s.name}</strong><span>${s.tagline}</span>
      </button>`).join("")}
    </div>
    <p class="note">${STRATEGIES.find((s) => s.id === debtStrategy).why}</p>
    <p class="note"><strong>${strategyFirstStep(debts, debtStrategy)}</strong></p>
    <div class="form-grid">
      <label>Extra payment each month (₦)
        <input type="number" id="debt-extra" min="0" step="5000" value="${debtExtra}">
      </label>
      <p class="note">On top of the ${naira(minimums)} minimums. The extra goes to the first debt in the
      ${debtStrategy === "snowball" ? "snowball" : "avalanche"} order, and when a debt clears, its minimum rolls into the next one.</p>
    </div>
    <p class="calc-result">With ${naira(debtExtra)} extra a month: debt-free by <strong>${sim.debtFreeLabel}</strong>,
    total interest <strong>${naira(sim.totalInterest)}</strong>. Minimum payments alone would cost
    <strong>${naira(baseline.totalInterest)}</strong> in interest and take ${baseline.months} months —
    the extra saves <strong>${naira(interestSaved)}</strong>.</p>
    <p class="note">Avalanche vs snowball on the same extra: ${compared.monthsSaved > 0 ? "avalanche finishes " + compared.monthsSaved + " month" + (compared.monthsSaved === 1 ? "" : "s") + " sooner and saves " + naira(compared.interestSaved) + " in interest." : "both finish in " + compared.avalanche.months + " months, but avalanche still saves " + naira(compared.interestSaved) + " in interest."} Snowball's first win comes sooner — the smallest debt clears first — which is why some households stick with it anyway.</p>
  </section>

  <section class="panel">
    <h2>Payoff timeline — ${debtStrategy === "snowball" ? "Snowball" : "Avalanche"} order</h2>
    <table class="tx-table payoff-table">
      <thead><tr><th>#</th><th>Debt</th><th>Clears</th><th class="num">Interest paid</th></tr></thead>
      <tbody>
        ${rows.map((r) => `<tr>
          <td>${r.step}</td><td>${r.name}${r.last ? " — then debt-free" : ""}</td>
          <td>${r.payoffLabel} (month ${r.payoffMonth})</td>
          <td class="num">${naira(r.interestPaid)}</td>
        </tr>`).join("")}
      </tbody>
    </table>
    <p class="note assumption">How this is worked out: each month, interest is added first (balance × APR ÷ 12), then the
    minimum payments go in, then the extra payment plus any freed-up minimums attack the first unpaid debt in the
    chosen order. No new borrowing, no missed payments, APRs stay as listed. Real lenders may charge fees on top.</p>
  </section>

  <section class="panel">
    <h2>The debts</h2>
    <div class="goal-grid">
      ${debts.map((d) => `<div class="panel debt-card">
        <div class="planner-head"><h2>${d.name}</h2><span class="status-badge status-debt">${d.apr}% APR</span></div>
        ${d.note ? `<p class="note">${d.note}</p>` : ""}
        <div class="goal-figures"><strong>${naira(d.balance)}</strong> owed</div>
        <dl class="planner-facts">
          <div><dt>Minimum / month</dt><dd>${naira(d.minPayment)}</dd></div>
          <div><dt>Monthly interest</dt><dd>${naira((d.balance * d.apr) / 100 / 12)}</dd></div>
        </dl>
        <p class="panel-link">
          <button class="btn-small" type="button" data-pay-debt="${d.id}">Mark as paid</button>
          <button class="btn-small" type="button" data-del-debt="${d.id}">Remove</button>
        </p>
      </div>`).join("")}
    </div>
  </section>

  <section class="panel">
    <h2>Add a debt</h2>
    <form id="add-debt" class="form-grid">
      <label class="wide">Debt name
        <input type="text" name="name" placeholder="e.g. Loan from uncle" maxlength="60" required>
      </label>
      <label>Balance (₦)
        <input type="number" name="balance" min="1000" step="1000" placeholder="100000" required>
      </label>
      <label>APR (%)
        <input type="number" name="apr" min="0" max="100" step="0.5" placeholder="18" required>
      </label>
      <label>Minimum / month (₦)
        <input type="number" name="minPayment" min="0" step="1000" placeholder="10000" required>
      </label>
      <label class="wide">Note (optional)
        <input type="text" name="note" placeholder="e.g. Repay by June" maxlength="80">
      </label>
      <div class="form-actions"><button type="submit" class="btn">Add debt</button></div>
    </form>
    <p class="note" id="debt-form-msg" role="status"></p>
  </section>`;
}

export function bindDebts(rerender) {
  document.querySelectorAll("[data-strategy]").forEach((btn) =>
    btn.addEventListener("click", () => {
      debtStrategy = btn.dataset.strategy;
      rerender();
    }),
  );

  document.getElementById("debt-extra").addEventListener("input", (e) => {
    debtExtra = Math.max(0, Math.round(Number(e.target.value) || 0));
    // Recompute the summary live without a full redraw, so typing does
    // not lose the cursor — the full numbers refresh on the next redraw.
    const sim = simulatePayoff(state.debts, debtStrategy, debtExtra);
    const baseline = simulateMinimumOnly(state.debts, debtStrategy);
    const result = document.querySelector(".calc-result");
    if (result) {
      result.innerHTML =
        "With " + naira(debtExtra) + " extra a month: debt-free by <strong>" + sim.debtFreeLabel + "</strong>, " +
        "total interest <strong>" + naira(sim.totalInterest) + "</strong>. Minimum payments alone would cost " +
        "<strong>" + naira(baseline.totalInterest) + "</strong> in interest and take " + baseline.months + " months — " +
        "the extra saves <strong>" + naira(baseline.totalInterest - sim.totalInterest) + "</strong>.";
    }
  });

  document.querySelectorAll("[data-pay-debt]").forEach((btn) =>
    btn.addEventListener("click", () => {
      const debt = state.debts.find((d) => d.id === btn.dataset.payDebt);
      if (!debt) return;
      if (!window.confirm("Mark \"" + debt.name + "\" (" + naira(debt.balance) + ") as paid off? It leaves the list and its " + naira(debt.minPayment) + "/month minimum is freed for the next debt.")) return;
      markDebtPaid(debt.id);
      debtFlash = "Paid off: " + debt.name + ". " + (state.debts.length ? state.debts.length + " debt" + (state.debts.length > 1 ? "s" : "") + " left — " + naira(totalBalance(state.debts)) + " still owed." : "The household is debt-free!");
      rerender();
    }),
  );

  document.querySelectorAll("[data-del-debt]").forEach((btn) =>
    btn.addEventListener("click", () => {
      const debt = state.debts.find((d) => d.id === btn.dataset.delDebt);
      if (!debt) return;
      if (!window.confirm("Remove \"" + debt.name + "\" from the list? Use this only when a debt was entered by mistake — mark it paid when it is really cleared.")) return;
      removeDebt(debt.id);
      debtFlash = "Removed debt: " + debt.name + ".";
      rerender();
    }),
  );

  document.getElementById("add-debt").addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const input = {
      name: fd.get("name"),
      balance: fd.get("balance"),
      apr: fd.get("apr"),
      minPayment: fd.get("minPayment"),
      note: fd.get("note"),
    };
    const problems = validateDebt(input);
    if (problems.length) {
      document.getElementById("debt-form-msg").textContent = problems.join(" ");
      return;
    }
    const debt = makeDebt(input, state.nextDebtId);
    addDebt(debt);
    debtFlash =
      "Added debt: " + debt.name + " — " + naira(debt.balance) + " at " + debt.apr + "% APR, " +
      naira(debt.minPayment) + "/month minimum. Total owed is now " + naira(totalBalance(state.debts)) + ".";
    rerender();
  });
}

// ---------------- Bills manager ----------------

// The bills page: every bill the household owes, soonest first, with
// what is still to pay and what is already cleared. Paying a bill only
// marks it paid — it never adds a transaction, because a December bill
// is not November spending.
export function renderBills() {
  const summary = billsSummary(state.bills);
  const flash = billFlash;
  billFlash = "";
  const rows = sortBills(state.bills).map((b) => {
    const status = billStatus(b);
    const badge =
      status === "paid" ? `<span class="status-badge status-complete">Paid</span>` :
      status === "overdue" ? `<span class="status-badge status-past-due">Overdue</span>` :
      status === "due-soon" ? `<span class="status-badge status-tight">Due soon</span>` :
      `<span class="status-badge">Upcoming</span>`;
    return `<li class="bill-row ${status}">
      <span class="tx-day">${b.month} ${b.dueDay}</span>
      <span class="tx-desc">${b.desc}<small>${b.note ? " — " + b.note : ""} · ${catLabel(b.cat)} · ${b.recurring === "monthly" ? "every month" : "one-off"}</small></span>
      <span class="tx-amt ${b.paid ? "in" : "out"}">${b.paid ? "" : "−"}${naira(b.amount)}</span>
      <span class="bill-due">${dueLabel(b)}</span>
      ${badge}
      ${b.paid
        ? `<button class="btn-small" type="button" data-unpay-bill="${b.id}">Undo</button>`
        : `<button class="btn-small" type="button" data-pay-bill="${b.id}">Mark paid</button>`}
      <button class="btn-small" type="button" data-del-bill="${b.id}">Remove</button>
    </li>`;
  }).join("");
  return `
  <h1>Bills</h1>
  <p class="lede">Every bill the household owes, soonest first — pay them here and the totals move with you.</p>
  ${flash ? `<p class="note" role="status">${flash}</p>` : ""}

  <div class="money-grid">
    ${moneyCard("Still to pay", naira(summary.dueTotal), summary.unpaidCount + " bill" + (summary.unpaidCount === 1 ? "" : "s") + " unpaid", "out")}
    ${moneyCard("Paid so far", naira(summary.paidTotal), summary.paidCount + " bill" + (summary.paidCount === 1 ? "" : "s") + " cleared", "in")}
    ${moneyCard("Every month", naira(recurringMonthlyTotal(state.bills)), "recurring bills alone, before one-offs", "")}
  </div>

  <section class="panel" aria-label="Bills">
    <h2>December bills${summary.overdueCount ? " — " + summary.overdueCount + " overdue" : ""}</h2>
    <ul class="tx-list">
      ${rows}
    </ul>
    <p class="note">${summary.next ? "Pay next: " + summary.next.desc + " (" + naira(summary.next.amount) + ", " + dueLabel(summary.next) + ")." : "Nothing left to pay — every bill on the list is cleared."}</p>
  </section>

  <section class="panel" aria-label="Add a bill">
    <h2>Add a bill</h2>
    <form id="add-bill" class="form-grid">
      <label>Bill name<input name="desc" type="text" placeholder="e.g. DSTv Compact" required></label>
      <label>Amount (₦)<input name="amount" type="number" min="1" step="1" placeholder="21000" required></label>
      <label>Due month
        <select name="month"><option value="Dec">December</option><option value="Nov">November</option></select>
      </label>
      <label>Due day<input name="dueDay" type="number" min="1" max="31" placeholder="5" required></label>
      <label>Category
        <select name="cat">${CATEGORIES.map((c) => `<option value="${c.id}">${c.label}</option>`).join("")}</select>
      </label>
      <label>Repeats
        <select name="recurring"><option value="monthly">Every month</option><option value="once">One-off</option></select>
      </label>
      <label>Note<input name="note" type="text" placeholder="Optional — e.g. pay before it cuts off"></label>
      <div class="form-actions"><button class="btn" type="submit">Add bill</button><span id="bill-form-msg" role="alert"></span></div>
    </form>
  </section>`;
}

export function bindBills(rerender) {
  document.querySelectorAll("[data-pay-bill]").forEach((btn) =>
    btn.addEventListener("click", () => {
      const bill = state.bills.find((b) => b.id === btn.dataset.payBill);
      if (!bill) return;
      if (!window.confirm("Mark \"" + bill.desc + "\" (" + naira(bill.amount) + ", due " + bill.month + " " + bill.dueDay + ") as paid?")) return;
      markBillPaid(bill.id);
      const summary = billsSummary(state.bills);
      billFlash = "Paid: " + bill.desc + " — " + naira(bill.amount) + ". Still to pay: " + naira(summary.dueTotal) + " across " + summary.unpaidCount + " bill" + (summary.unpaidCount === 1 ? "" : "s") + ".";
      rerender();
    }),
  );

  document.querySelectorAll("[data-unpay-bill]").forEach((btn) =>
    btn.addEventListener("click", () => {
      const bill = state.bills.find((b) => b.id === btn.dataset.unpayBill);
      if (!bill) return;
      markBillUnpaid(bill.id);
      billFlash = "Undid payment: " + bill.desc + " is unpaid again.";
      rerender();
    }),
  );

  document.querySelectorAll("[data-del-bill]").forEach((btn) =>
    btn.addEventListener("click", () => {
      const bill = state.bills.find((b) => b.id === btn.dataset.delBill);
      if (!bill) return;
      if (!window.confirm("Remove \"" + bill.desc + "\" from the bills list? Use this only when a bill was entered by mistake.")) return;
      deleteBill(bill.id);
      billFlash = "Removed bill: " + bill.desc + ".";
      rerender();
    }),
  );

  document.getElementById("add-bill").addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const input = {
      desc: fd.get("desc"),
      amount: fd.get("amount"),
      dueDay: fd.get("dueDay"),
      month: fd.get("month"),
      cat: fd.get("cat"),
      recurring: fd.get("recurring"),
      note: fd.get("note"),
    };
    const problems = validateBill(input);
    if (problems.length) {
      document.getElementById("bill-form-msg").textContent = problems.join(" ");
      return;
    }
    const bill = makeBill(input, state.nextBillId);
    addBill(bill);
    billFlash =
      "Added bill: " + bill.desc + " — " + naira(bill.amount) + ", due " + bill.month + " " + bill.dueDay +
      " (" + dueLabel(bill) + "). Still to pay: " + naira(billsSummary(state.bills).dueTotal) + ".";
    rerender();
  });
}

// ---------------- Weekly envelopes ----------------

// The envelope page: the household's day-to-day spending split into
// weekly envelopes, for the week it is in now (week 4, Nov 22–28).
// An envelope's allowance is its share of the month in proportion to
// the days in the week, and what it spent is the transactions in that
// category on those days.
export function renderEnvelopes() {
  const week = currentWeek();
  const envelopes = envelopesForHousehold(state.budgets, state.transactions, state.envelopeMoves);
  const summary = envelopeSummary(envelopes);
  const flash = envelopeFlash;
  envelopeFlash = "";
  const cards = envelopes.map((e) => {
    const badge =
      e.pace === "over" ? `<span class="status-badge status-past-due">Over envelope</span>` :
      e.pace === "tight" ? `<span class="status-badge status-tight">Tight</span>` :
      `<span class="status-badge status-on-track">On track</span>`;
    return `<div class="card envelope-card">
      <div class="planner-head"><h3>${e.label}</h3>${badge}</div>
      <p class="note">${e.note}</p>
      ${barRow("Week " + e.week + " spending", e.spent, e.available, CATEGORY_COLORS[e.catId])}
      <div class="planner-facts">
        <span>Allowance <strong>${naira(e.allowance)}</strong></span>
        <span>Moved <strong>${e.moved >= 0 ? "+" : "−"}${naira(Math.abs(e.moved))}</strong></span>
        <span>Left <strong>${naira(e.left)}</strong></span>
      </div>
      <p class="note">${e.pace === "over"
        ? "Over by " + naira(-e.left) + " — move money in from another envelope, or hold spending here until Sunday."
        : e.pace === "tight"
          ? "Less than a quarter left with " + (week.end - TODAY_DAY) + " days to go in the week — spend carefully."
          : naira(e.left) + " left for the rest of the week."}</p>
    </div>`;
  }).join("");
  return `
  <h1>Weekly envelopes</h1>
  <p class="lede">Zero-based envelopes for the spending the household does day to day. Week ${week.week} runs Nov ${week.start}–${week.end}; each envelope holds its share of the month for those days.</p>
  ${flash ? `<p class="note" role="status">${flash}</p>` : ""}

  <div class="money-grid">
    ${moneyCard("This week's envelopes", naira(summary.allowance), "across 5 day-to-day categories", "")}
    ${moneyCard("Spent this week", naira(summary.spent), "Nov " + week.start + "–" + TODAY_DAY, "out")}
    ${moneyCard("Left in the envelopes", naira(summary.left), summary.overCount ? summary.overCount + " envelope" + (summary.overCount === 1 ? "" : "s") + " over" : "every envelope inside its week", summary.overCount ? "out" : "in")}
  </div>

  <div class="goal-grid">
    ${cards}
  </div>

  <section class="panel" aria-label="Move money between envelopes">
    <h2>Move money between envelopes</h2>
    <p class="note">Short in one envelope and flush in another? Move money across — the envelopes always add up to the month's budget for these categories, and a move only ever affects this week.</p>
    <form id="move-envelope" class="form-grid">
      <label>From
        <select name="from">${envelopes.map((e) => `<option value="${e.catId}">${e.label} — ${naira(e.left)} left</option>`).join("")}</select>
      </label>
      <label>To
        <select name="to">${envelopes.map((e) => `<option value="${e.catId}">${e.label}</option>`).join("")}</select>
      </label>
      <label>Amount (₦)<input name="amount" type="number" min="1" step="1" placeholder="10000" required></label>
      <div class="form-actions"><button class="btn" type="submit">Move money</button><span id="move-form-msg" role="alert"></span></div>
    </form>
  </section>

  <p class="note">Week 5 (Nov 29–30) is a 2-day stub week — its allowance is 2/30 of the month, not a full week. Rent, school fees, utilities and health are fixed bills, not envelopes: they are paid once, so they do not get a weekly allowance.</p>`;
}

export function bindEnvelopes(rerender) {
  document.getElementById("move-envelope").addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const input = { from: fd.get("from"), to: fd.get("to"), amount: fd.get("amount") };
    const envelopes = envelopesForHousehold(state.budgets, state.transactions, state.envelopeMoves);
    const problems = validateMove(input, envelopes);
    if (problems.length) {
      document.getElementById("move-form-msg").textContent = problems.join(" ");
      return;
    }
    const move = makeMove(input, currentWeek());
    addEnvelopeMove(move);
    const from = envelopes.find((x) => x.catId === move.from);
    const to = envelopes.find((x) => x.catId === move.to);
    envelopeFlash =
      "Moved " + naira(move.amount) + " from " + (from ? from.label : move.from) + " to " + (to ? to.label : move.to) +
      " for week " + move.week + ". " + (to ? to.label : move.to) + " now has " + naira((to ? to.available : 0) + move.amount - (to ? to.spent : 0)) + " left this week.";
    rerender();
  });
}

// ---------------- What-if simulator ----------------

// The simulator's working figures live on this page only — the page
// never writes them back to the store, so trying a change can never
// change the household's real money.
let whatIfAdj = emptyAdjustments();
let whatIfPresetName = "";

export function renderWhatIf() {
  const base = {
    income: incomeTotal(),
    spentByCat: spentByCategory(),
    saved: savedTotal(),
    spent: spentTotal(),
  };
  const sim = simulate(base, whatIfAdj);
  const verdicts = whatIfVerdicts(base, sim);
  const presets = presetScenarios(base);
  const cuttable = cuttableCategories(base.spentByCat);
  const changed = whatIfAdj.cuts.length > 0 || whatIfAdj.extraIncome > 0 || whatIfAdj.extraSavings > 0;
  return `
  <h1>What-if simulator</h1>
  <p class="lede">Try a change before making it — cut a category, add income, save more — and see the month replayed with it applied. Nothing here touches the household's real money.</p>

  <div class="money-grid">
    ${moneyCard("Income", naira(base.income), "this month, so far", "")}
    ${moneyCard("Spent", naira(base.spent), "across all categories", "out")}
    ${moneyCard("Saved", naira(base.saved), base.saved ? Math.round((base.saved / base.income) * 100) + "% savings rate" : "nothing saved yet", "in")}
    ${moneyCard("Left", naira(base.income - base.spent - base.saved), "income minus spending minus savings", "")}
  </div>

  <section class="panel" aria-label="Try a preset">
    <h2>Try a preset</h2>
    <div class="strategy-picker">
      ${presets.map((p) => `<button class="btn strategy-btn${whatIfPresetName === p.id ? " active" : ""}" type="button" data-preset="${p.id}">${p.name}</button>`).join("")}
      <button class="btn strategy-btn" type="button" data-preset="reset">Reset</button>
    </div>
    <p class="note">${whatIfPresetName ? presets.find((p) => p.id === whatIfPresetName)?.desc || "" : "Or set your own change below."}</p>
  </section>

  <section class="panel" aria-label="Your own change">
    <h2>Your own change</h2>
    <form id="what-if" class="form-grid">
      <label>Cut a category
        <select name="cutCat"><option value="">No cut</option>${cuttable.map((c) => `<option value="${c.id}"${whatIfAdj.cuts[0]?.cat === c.id ? " selected" : ""}>${c.label} — spent ${naira(c.spent)}</option>`).join("")}</select>
      </label>
      <label>Cut by (₦)<input name="cutAmount" type="number" min="0" step="1000" value="${whatIfAdj.cuts[0]?.amount || ""}" placeholder="20000"></label>
      <label>Extra income (₦)<input name="extraIncome" type="number" min="0" step="1000" value="${whatIfAdj.extraIncome || ""}" placeholder="45000"></label>
      <label>Extra savings (₦)<input name="extraSavings" type="number" min="0" step="1000" value="${whatIfAdj.extraSavings || ""}" placeholder="50000"></label>
      <div class="form-actions"><button class="btn" type="submit">Run the numbers</button><span id="whatif-form-msg" role="alert"></span></div>
    </form>
    <p class="note">Money cut from a category is saved instead — the household keeps what it does not spend. Extra savings is moved from what is left into savings.</p>
  </section>

  <section class="panel" aria-label="The month replayed">
    <h2>The month replayed${changed ? " — with your change" : ""}</h2>
    <div class="money-grid">
      ${moneyCard("Left after the change", naira(sim.remaining), sim.remaining >= 0 ? "what the household keeps" : "short for the month", sim.remaining >= 0 ? "in" : "out")}
      ${moneyCard("Savings rate", sim.savingsRate + "%", "was " + Math.round((base.saved / base.income) * 100) + "%", sim.savingsRate >= Math.round((base.saved / base.income) * 100) ? "in" : "")}
      ${moneyCard("Spent after the change", naira(sim.spent), "was " + naira(base.spent), "")}
    </div>
    ${splitRow("Needs", sim.split.needs, sim.split.needsPct, 50, "#166534", "rent, food, transport, bills, school")}
    ${splitRow("Wants", sim.split.wants, sim.split.wantsPct, 30, "#d97706", "entertainment, clothing, misc")}
    ${splitRow("Savings", sim.split.saved, sim.split.savePct, 20, "#1d4ed8", "the monthly transfer")}
    <ul class="legend-list">
      ${verdicts.map((v) => `<li>${v}</li>`).join("")}
    </ul>
  </section>`;
}

export function bindWhatIf(rerender) {
  document.querySelectorAll("[data-preset]").forEach((btn) =>
    btn.addEventListener("click", () => {
      const base = {
        income: incomeTotal(),
        spentByCat: spentByCategory(),
        saved: savedTotal(),
        spent: spentTotal(),
      };
      if (btn.dataset.preset === "reset") {
        whatIfAdj = emptyAdjustments();
        whatIfPresetName = "";
      } else {
        const preset = presetScenarios(base).find((p) => p.id === btn.dataset.preset);
        if (!preset) return;
        whatIfAdj = {
          cuts: preset.adjustments.cuts.map((c) => ({ ...c })),
          extraIncome: preset.adjustments.extraIncome,
          extraSavings: preset.adjustments.extraSavings,
        };
        whatIfPresetName = preset.id;
      }
      rerender();
    }),
  );

  document.getElementById("what-if").addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const cutCat = fd.get("cutCat");
    const cutAmount = Math.max(0, Math.round(Number(fd.get("cutAmount")) || 0));
    const extraIncome = Math.max(0, Math.round(Number(fd.get("extraIncome")) || 0));
    const extraSavings = Math.max(0, Math.round(Number(fd.get("extraSavings")) || 0));
    if (cutCat && cutAmount <= 0) {
      document.getElementById("whatif-form-msg").textContent = "Pick how much to cut from the category — more than ₦0.";
      return;
    }
    if (!cutCat && !extraIncome && !extraSavings) {
      document.getElementById("whatif-form-msg").textContent = "Set at least one change — a cut, extra income or extra savings.";
      return;
    }
    whatIfAdj = {
      cuts: cutCat && cutAmount > 0 ? [{ cat: cutCat, amount: cutAmount }] : [],
      extraIncome,
      extraSavings,
    };
    whatIfPresetName = "";
    rerender();
  });
}

// ---------------- Payday plan ----------------

// The payday page: the three November paydays, each with its jobs, so
// the household can see that every naira was assigned before it was
// spent — and where the plan and the real spending differ.
export function renderPayday() {
  const plan = paydayPlan();
  const jobs = jobsByCategory();
  const spent = spentByCategory();
  const verdicts = paydayVerdicts(plan, INCOME_SOURCES, budgetTotal() + state.savingsTarget);
  return `
  <h1>Payday plan — every payday has a job</h1>
  <p class="lede">Three paydays this month, <strong>${naira(plan.income)}</strong> between them. Each payday's
  money is assigned to a job before it is spent — rent, food, savings, Christmas — so nothing is left drifting.
  The jobs add up to <strong>${naira(plan.assigned)}</strong>${plan.fullyAssigned ? ", exactly the month's pay" : ", leaving " + naira(plan.leftover) + " unassigned"}.</p>

  <section class="money-grid three" aria-label="Payday totals">
    ${moneyCard("Paydays", naira(plan.income), "3 paydays: Nov 1, 4 and 19", "in")}
    ${moneyCard("Assigned to jobs", naira(plan.assigned), plan.fullyAssigned ? "every naira has a job" : naira(plan.leftover) + " unassigned", "save")}
    ${moneyCard("Left to spend", naira(remaining()), daysLeft() + " days left in the month", "left")}
  </section>

  ${plan.paydays.map((p) => `
  <section class="panel" aria-label="Payday Nov ${p.day}">
    <div class="planner-head"><h2>Nov ${p.day} — ${p.who}</h2>
    <span class="status-badge ${p.fullyAssigned ? "status-on-track" : "status-tight"}">${p.fullyAssigned ? "Fully assigned" : naira(p.leftover) + " unassigned"}</span></div>
    <p class="note">${p.what} — ${naira(p.amount)}</p>
    <table class="tx-table">
      <thead><tr><th>Job</th><th class="num">Amount</th></tr></thead>
      <tbody>
        ${p.jobs.map((j) => `<tr><td>${j.job}</td><td class="num">${naira(j.amount)}</td></tr>`).join("")}
        <tr class="total-row"><td>Assigned</td><td class="num">${naira(p.assigned)}</td></tr>
      </tbody>
    </table>
  </section>`).join("")}

  <section class="panel" aria-label="Plan against the budget">
    <h2>Plan against the budget</h2>
    <p class="note">What the jobs add up to per category, next to what the household actually spent there — the plan and the spending, side by side.</p>
    <table class="tx-table">
      <thead><tr><th>Category</th><th class="num">Planned (jobs)</th><th class="num">Actually spent</th></tr></thead>
      <tbody>
        ${CATEGORIES.map((c) => `<tr><td>${c.label}</td><td class="num">${naira(jobs[c.id] || 0)}</td><td class="num">${naira(spent[c.id])}</td></tr>`).join("")}
        <tr class="total-row"><td>Savings + set aside</td><td class="num">${naira((jobs.savings || 0) + (jobs["set-aside"] || 0))}</td><td class="num">${naira(savedTotal())}</td></tr>
      </tbody>
    </table>
    <p class="note">Transport was planned at ${naira(jobs.transport || 0)} and the household spent ${naira(spent.transport)} of it —
    the plan held. Food's jobs add up to ${naira(jobs.food || 0)} against a ${naira(state.budgets.food)} budget: the plan spends less than the budget allows.</p>
  </section>

  <section class="panel" aria-label="Verdicts">
    <h2>What the plan says</h2>
    <ul class="legend-list">
      ${verdicts.map((v) => `<li>${v}</li>`).join("")}
    </ul>
  </section>`;
}

// ---------------- Who spent what ----------------

// The members page: who earned it, who spent it, and on what. Shared
// spending — rent, food, bills — belongs to the household as a whole,
// and the page says so instead of pretending one person paid it.
export function renderMembers() {
  const split = membersSplit(state.transactions);
  const verdicts = memberVerdicts(split);
  return `
  <h1>Who spent what</h1>
  <p class="lede">Four ways to look at the same month: Chidi, Adaeze, Zara &amp; Tobi, and Shared — the spending that
  belongs to the household as a whole. The members' spending adds up to the month's spending exactly:
  <strong>${naira(split.totalSpent)}</strong>.</p>

  <section class="money-grid" aria-label="Member totals">
    ${moneyCard("Earned", naira(split.totalIncome), "Chidi " + naira(split.members.find((m) => m.who === "Chidi").income) + " · Adaeze " + naira(split.members.find((m) => m.who === "Adaeze").income), "in")}
    ${moneyCard("Spent", naira(split.totalSpent), "across all four", "out")}
    ${moneyCard("Saved", naira(split.totalSaved), "the household saves together", "save")}
    ${moneyCard("Shared spending", naira(split.members.find((m) => m.who === "Shared").spent), split.members.find((m) => m.who === "Shared").sharePct + "% of all spending", "")}
  </section>

  <div class="goal-grid">
    ${split.members.map((m) => `
    <section class="panel member-card">
      <div class="planner-head"><h2>${m.label}</h2><span class="status-badge">${m.sharePct}% of spending</span></div>
      <div class="goal-figures"><strong>${naira(m.spent)}</strong> spent · <strong>${naira(m.income)}</strong> earned</div>
      <div class="bar-track"><div class="bar-fill" style="width:${m.sharePct}%;background:#166534"></div></div>
      <p class="bar-foot"><span>${m.sharePct}% of the month's spending</span><span>${m.income ? m.incomeSharePct + "% of the income" : "no income of their own"}</span></p>
      ${m.topCategories.length ? `<p class="note">Biggest spending: ${m.topCategories.map((t) => t.label + " " + naira(t.amount)).join(" · ")}.</p>` : `<p class="note">No personal spending this month — everything they spent sits under Shared.</p>`}
      ${m.saved ? `<p class="note">Saved ${naira(m.saved)} this month.</p>` : ""}
    </section>`).join("")}
  </div>

  <section class="panel" aria-label="Verdicts">
    <h2>What the split says</h2>
    <ul class="legend-list">
      ${verdicts.map((v) => `<li>${v}</li>`).join("")}
    </ul>
    <p class="panel-link"><a href="#/transactions">See every transaction with who spent it →</a></p>
  </section>`;
}

// ---------------- December calendar ----------------

// The calendar page: December's bills on the days they fall due, next
// to the two December paydays. Paying a bill here works exactly as on
// the Bills page — the bill stays on the list, marked paid.
let calendarFlash = "";

export function renderCalendar() {
  const weeks = buildCalendar(2026, 11, state.bills, DECEMBER_PAYDAYS);
  const summaries = weekSummaries(weeks);
  const verdicts = calendarVerdicts(weeks, state.bills);
  const decTotal = state.bills.filter((b) => b.month === "Dec").reduce((s, b) => s + b.amount, 0);
  const flash = calendarFlash;
  calendarFlash = "";
  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return `
  <h1>December calendar</h1>
  <p class="lede">December 2026 — every bill on the day it falls due, and the two paydays that cover them.
  December's bills add up to <strong>${naira(decTotal)}</strong>; the paydays land in week 1, so the rent is covered the day it is due.</p>
  ${flash ? `<p class="calc-result" role="status">${flash}</p>` : ""}

  <section class="panel" aria-label="December 2026 calendar">
    <div class="cal-grid cal-head" aria-hidden="true">
      ${dayNames.map((d) => `<span>${d}</span>`).join("")}
    </div>
    ${weeks.map((week, wi) => `<div class="cal-grid">
      ${week.map((cell) => {
        if (!cell.inMonth) return `<div class="cal-cell blank"></div>`;
        const bills = cell.bills.map((b) => `
          <div class="cal-bill ${b.paid ? "paid" : ""}">
            <span>${b.desc} — ${naira(b.amount)}</span>
            <span class="cal-bill-status">${calendarBillLabel(b)}</span>
            ${b.paid ? "" : `<button class="btn-small" type="button" data-pay-cal-bill="${b.id}">Mark paid</button>`}
          </div>`).join("");
        const paydays = cell.paydays.map((p) => `
          <div class="cal-payday">Payday — ${p.who.split(" ")[0]} ${naira(p.amount)}</div>`).join("");
        return `<div class="cal-cell">
          <span class="cal-day">${cell.day}</span>
          ${paydays}${bills}
        </div>`;
      }).join("")}
    </div>`).join("")}
    <p class="note">Week totals — ${summaries.map((s) => "week " + s.week + ": " + naira(s.total) + (s.paydayTotal ? " due, " + naira(s.paydayTotal) + " paid in" : " due")).join(" · ")}.</p>
  </section>

  <section class="panel" aria-label="Verdicts">
    <h2>What December looks like</h2>
    <ul class="legend-list">
      ${verdicts.map((v) => `<li>${v}</li>`).join("")}
    </ul>
    <p class="panel-link"><a href="#/bills">Manage the bills — pay, add, remove →</a></p>
  </section>`;
}

export function bindCalendar(rerender) {
  document.querySelectorAll("[data-pay-cal-bill]").forEach((btn) =>
    btn.addEventListener("click", () => {
      const bill = state.bills.find((b) => b.id === btn.dataset.payCalBill);
      if (!bill) return;
      if (!window.confirm("Mark \"" + bill.desc + "\" (" + naira(bill.amount) + ", due Dec " + bill.dueDay + ") as paid?")) return;
      markBillPaid(bill.id);
      calendarFlash = "Paid: " + bill.desc + " — " + naira(bill.amount) + ". Still to pay in December: " + naira(billsSummary(state.bills).dueTotal) + ".";
      rerender();
    }),
  );
}

// ---------------- Safety net ----------------

// The emergency-fund planner page: the two pots counted together,
// measured against what the household really spends on the must-pays,
// with a target the household picks and the monthly amount it takes
// to get there. A top-up form adds money to the main pot, like the
// Goals page does.
let emergencyTargetMonths = 6;
let emergencyMonthsToSave = 12;
let emergencyFlash = "";

export function renderEmergency() {
  const pots = emergencyPots(state.goals, state.savingsGoals);
  const plan = emergencyPlan(spentByCategory(), emergencyTargetMonths, emergencyMonthsToSave, pots);
  const verdicts = emergencyVerdicts(plan, pots, state.savingsTarget);
  const flash = emergencyFlash;
  emergencyFlash = "";
  return `
  <h1>Safety net — the emergency fund</h1>
  <p class="lede">The household keeps two emergency pots. Together they hold <strong>${naira(pots.totalSaved)}</strong>
  against <strong>${naira(plan.essentials)}</strong> a month of must-pays — rent, food, transport, utilities, at what
  November actually cost. That is <strong>${plan.monthsCoveredText}</strong> of cover.</p>
  ${flash ? `<p class="calc-result" role="status">${flash}</p>` : ""}

  <section class="money-grid three" aria-label="Safety net totals">
    ${moneyCard("Must-pays / month", naira(plan.essentials), "housing, food, transport, utilities — actual November spend", "out")}
    ${moneyCard("Saved in the pots", naira(pots.totalSaved), "main pot " + naira(pots.main ? pots.main.saved : 0) + " · second pot " + naira(pots.second ? pots.second.saved : 0), "save")}
    ${moneyCard("Cover now", plan.monthsCoveredText, "at " + naira(plan.essentials) + " a month", plan.monthsCovered >= 3 ? "in" : "out")}
  </section>

  <section class="panel" aria-label="The two pots">
    <h2>The two pots</h2>
    ${[pots.main, pots.second].map((p) => p ? `
    <div class="bar-row">
      <div class="bar-head"><span>${p.name} — ${p.target ? "target " + naira(p.target) : ""}</span><span>${naira(p.saved)} saved</span></div>
      <div class="bar-track"><div class="bar-fill" style="width:${Math.min(100, pct(p.saved, p.target))}%;background:#166534"></div></div>
      <div class="bar-foot"><span>${pct(p.saved, p.target)}% of its target</span><span>${p.target ? "covers about " + (Math.round((p.target / plan.essentials) * 10) / 10) + " months of must-pays" : ""}</span></div>
    </div>` : "").join("")}
    <p class="note">The main pot lives on the <a href="#/goals">Goals page</a>; the second pot lives in the
    <a href="#/savings-goals">savings-goals planner</a>, due June 2027. The planner counts both together, because a safety net is what the household has, not what one card says.</p>
  </section>

  <section class="panel" aria-label="Plan the target">
    <h2>Plan the target</h2>
    <div class="form-grid">
      <label>Cover for how many months?
        <select id="emergency-target">
          <option value="3"${emergencyTargetMonths === 3 ? " selected" : ""}>3 months</option>
          <option value="6"${emergencyTargetMonths === 6 ? " selected" : ""}>6 months</option>
          <option value="12"${emergencyTargetMonths === 12 ? " selected" : ""}>12 months</option>
        </select>
      </label>
      <label>Reach it in how many months?
        <input type="number" id="emergency-months" min="1" max="36" value="${emergencyMonthsToSave}">
      </label>
    </div>
    <p class="calc-result">${plan.covered
      ? "The " + plan.targetMonths + "-month target (" + naira(plan.target) + ") is already met — the pots hold " + naira(plan.saved) + "."
      : "To reach " + plan.targetMonths + " months (" + naira(plan.target) + ") in " + plan.monthsToSave + " months, put in " + naira(plan.monthlyNeeded) + " every month. Still to find: " + naira(plan.gap) + "."}</p>
    <ul class="legend-list">
      ${verdicts.map((v) => `<li>${v}</li>`).join("")}
    </ul>
  </section>

  <section class="panel" aria-label="Top up the main pot">
    <h2>Top up the main pot</h2>
    <p class="note">Add money to the emergency fund on the Goals page — it moves the cover on this page at once, because both pages read the same pot.</p>
    <form class="goal-form" id="emergency-topup">
      <label>Add money (₦)
        <input type="number" name="amount" min="100" step="500" placeholder="10000" required>
      </label>
      <button type="submit" class="btn">Add to the emergency fund</button>
    </form>
  </section>`;
}

export function bindEmergency(rerender) {
  document.getElementById("emergency-target").addEventListener("change", (e) => {
    emergencyTargetMonths = Number(e.target.value) || 6;
    rerender();
  });
  document.getElementById("emergency-months").addEventListener("input", (e) => {
    emergencyMonthsToSave = Math.max(1, Math.round(Number(e.target.value) || 1));
    rerender();
  });
  document.getElementById("emergency-topup").addEventListener("submit", (e) => {
    e.preventDefault();
    const amount = Number(new FormData(e.target).get("amount"));
    const goal = state.goals.find((g) => g.id === "emergency");
    contributeToGoal("emergency", amount);
    emergencyFlash =
      "Added " + naira(amount) + " to the emergency fund — now " + naira(goal.saved) +
      " of " + naira(goal.target) + " (" + pct(goal.saved, goal.target) + "% there).";
    rerender();
  });
}

// ---------------- Take it with you ----------------

// The export page: the household's records as files it owns — the
// transactions, the budget, the bills, and the whole month as a
// plain-text summary. Every file is built from the live figures, so
// an edit made anywhere on the site is in the download.
let exportFlash = "";

export function renderExport() {
  const flash = exportFlash;
  exportFlash = "";
  const txCount = state.transactions.length;
  const billCount = state.bills.length;
  return `
  <h1>Take it with you</h1>
  <p class="lede">The household's records belong to the household. Download them as files you own — open the CSVs in a
  spreadsheet, keep the summary with your papers. Every file is built from the month as it stands right now, including
  any change you made on this site.</p>
  ${flash ? `<p class="calc-result" role="status">${flash}</p>` : ""}

  <div class="goal-grid">
    <section class="panel">
      <h2>Transactions — CSV</h2>
      <p class="note">${txCount} transactions, newest last: day, description, category, who spent it, type, amount in naira.
      Money in is positive, money out is negative.</p>
      <p><button class="btn" type="button" data-export="transactions">Download transactions.csv</button></p>
    </section>
    <section class="panel">
      <h2>Budget — CSV</h2>
      <p class="note">${CATEGORIES.length} categories: the monthly budget, what was spent, what is left, and the percentage used.</p>
      <p><button class="btn" type="button" data-export="budget">Download budget.csv</button></p>
    </section>
    <section class="panel">
      <h2>Bills — CSV</h2>
      <p class="note">${billCount} bills, soonest first: due date, bill, category, amount, whether it repeats, and whether it is paid.</p>
      <p><button class="btn" type="button" data-export="bills">Download bills.csv</button></p>
    </section>
    <section class="panel">
      <h2>Month summary — text</h2>
      <p class="note">November 2026 in plain text: the headline figures, the 50/30/20 split, every category against its
      budget, the goals, the debts and the bills still to pay.</p>
      <p><button class="btn" type="button" data-export="summary">Download november-2026-summary.txt</button></p>
    </section>
  </div>
  <p class="note">Downloads are made in your browser from the figures on this site — no network, no account, nothing leaves the household.</p>`;
}

export function bindExport(rerender) {
  document.querySelectorAll("[data-export]").forEach((btn) =>
    btn.addEventListener("click", () => {
      const kind = btn.dataset.export;
      let ok = false;
      if (kind === "transactions") {
        ok = downloadText("homeledger-transactions-november-2026.csv", transactionsCsv(state.transactions), "text/csv;charset=utf-8");
        if (ok) exportFlash = "Downloaded transactions.csv — " + state.transactions.length + " transactions.";
      } else if (kind === "budget") {
        ok = downloadText("homeledger-budget-november-2026.csv", budgetCsv(CATEGORIES, state.budgets, spentByCategory()), "text/csv;charset=utf-8");
        if (ok) exportFlash = "Downloaded budget.csv — " + CATEGORIES.length + " categories.";
      } else if (kind === "bills") {
        ok = downloadText("homeledger-bills-december-2026.csv", billsCsv(state.bills), "text/csv;charset=utf-8");
        if (ok) exportFlash = "Downloaded bills.csv — " + state.bills.length + " bills.";
      } else if (kind === "summary") {
        const split = split502030();
        const figures = {
          income: naira(incomeTotal()),
          spent: naira(spentTotal()),
          saved: naira(savedTotal()),
          savingsRate: savingsRate(),
          left: naira(remaining()),
          daysLeft: daysLeft(),
          split: { needsPct: split.needsPct, wantsPct: split.wantsPct, savePct: split.savePct },
          categories: CATEGORIES.map((c) => ({
            label: c.label,
            budget: naira(state.budgets[c.id]),
            spent: naira(spentByCategory()[c.id]),
            left: naira(state.budgets[c.id] - spentByCategory()[c.id]),
            pct: pct(spentByCategory()[c.id], state.budgets[c.id]),
          })),
          goals: state.goals.map((g) => ({
            name: g.name,
            saved: naira(g.saved),
            target: naira(g.target),
            pct: pct(g.saved, g.target),
          })),
          debtTotal: naira(totalBalance(state.debts)),
          debtCount: state.debts.length,
          billsDue: naira(billsSummary(state.bills).dueTotal),
          billsUnpaid: billsSummary(state.bills).unpaidCount,
        };
        ok = downloadText("homeledger-november-2026-summary.txt", monthSummary(figures));
        if (ok) exportFlash = "Downloaded the November 2026 summary.";
      }
      if (!ok) exportFlash = "The download did not start — this browser blocked it. Try again, or copy the figures from the page.";
      rerender();
    }),
  );
}
