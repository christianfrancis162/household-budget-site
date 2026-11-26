// The six pages of HomeLedger. Each render function returns HTML for its
// route; each bind function wires that page's controls after it is drawn.
// All figures come from store.js, so every page agrees with every other.

import { HOUSEHOLD, CATEGORIES, GOALS, UPCOMING_BILLS } from "./data.js";
import {
  state,
  incomeTotal,
  spentTotal,
  savedTotal,
  spentByCategory,
  budgetTotal,
  remaining,
  savingsRate,
  daysLeft,
  dailyPace,
  monthlyTrend,
  addTransaction,
  deleteTransaction,
  setBudget,
  setSavingsTarget,
  contributeToGoal,
} from "./store.js";
import { naira, signedNaira, shortNaira, pct, dayLabel } from "./format.js";
import { barsChart, donutChart, CATEGORY_COLORS } from "./charts.js";

function catLabel(id) {
  if (id === "income") return "Income";
  if (id === "savings") return "Savings";
  const c = CATEGORIES.find((x) => x.id === id);
  return c ? c.label : id;
}

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

export function renderDashboard() {
  const spent = spentByCategory();
  const pace = dailyPace();
  const trend = monthlyTrend();
  const recent = [...state.transactions].sort((a, b) => b.day - a.day || b.id - a.id).slice(0, 6);
  const goals = state.goals.slice(0, 3);

  return `
  <h1>November 2026 at a glance</h1>
  <p class="lede">${HOUSEHOLD.name} · ${HOUSEHOLD.place} · ${HOUSEHOLD.members.join(" · ")}</p>

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
    <section class="panel" aria-label="Six month trend">
      <h2>Six months: in vs out</h2>
      ${barsChart(trend.map((m) => ({ label: m.month.split(" ")[0], income: m.income, spent: m.spent })), 520, 210)}
      <p class="legend"><span class="swatch" style="background:#166534"></span> Income
      <span class="swatch" style="background:#d97706"></span> Spending</p>
      <p class="note">November spending is still climbing — 4 days to go. September was the heaviest month at ${naira(1180000)}.</p>
    </section>
  </div>

  <div class="two-col">
    <section class="panel" aria-label="Recent transactions">
      <h2>Latest spending</h2>
      <ul class="tx-list">
        ${recent.map((t) => `<li><span class="tx-day">${dayLabel(t.day)}</span><span class="tx-desc">${t.desc}</span><span class="tx-amt ${t.amount > 0 ? "in" : "out"}">${signedNaira(t.amount)}</span></li>`).join("")}
      </ul>
      <p class="panel-link"><a href="#/transactions">All ${state.transactions.length} transactions →</a></p>
    </section>
    <section class="panel" aria-label="Bills and goals">
      <h2>Coming up</h2>
      <ul class="tx-list">
        ${UPCOMING_BILLS.map((b) => `<li><span class="tx-day">${b.day}</span><span class="tx-desc">${b.desc}</span><span class="tx-amt out">−${naira(b.amount)}</span></li>`).join("")}
      </ul>
      <h2 class="goals-h">Savings goals</h2>
      ${goals.map((g) => `<div class="goal-mini"><span>${g.name}</span><span>${pct(g.saved, g.target)}% · ${naira(g.saved)} of ${naira(g.target)}</span></div>
      <div class="bar-track slim"><div class="bar-fill" style="width:${pct(g.saved, g.target)}%;background:#166534"></div></div>`).join("")}
      <p class="panel-link"><a href="#/goals">All savings goals →</a></p>
    </section>
  </div>`;
}

// ---------------- Transactions ----------------

export function renderTransactions() {
  const sorted = [...state.transactions].sort((a, b) => b.day - a.day || b.id - a.id);
  const income = state.transactions.filter((t) => t.kind === "income").length;
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
      <div class="form-actions"><button type="submit" class="btn">Add it</button></div>
    </form>
    <p class="note" id="add-tx-msg" role="status"></p>
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
      <thead><tr><th>Date</th><th>Description</th><th>Category</th><th class="num">Amount</th><th></th></tr></thead>
      <tbody id="tx-rows">
        ${sorted.map((t) => `<tr data-cat="${t.cat}" data-kind="${t.kind}" data-desc="${t.desc.toLowerCase()}">
          <td>${dayLabel(t.day)}</td><td>${t.desc}</td><td>${catLabel(t.cat)}</td>
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
    });
    document.getElementById("add-tx-msg").textContent =
      "Added: " + tx.desc + " — " + signedNaira(tx.amount) + ". Totals updated everywhere.";
    form.reset();
    form.elements.day.value = 26;
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
  return `
  <h1>Savings goals</h1>
  <p class="lede"><strong>${naira(totalSaved)}</strong> saved toward <strong>${naira(totalTarget)}</strong> across ${state.goals.length} goals.
  Add money to any goal and its bar moves at once.</p>

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
      contributeToGoal(form.dataset.goal, Number(new FormData(form).get("amount")));
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
  // The household's real split, from live figures: wants are entertainment,
  // clothing and misc; everything else spent is needs.
  const spent = spentByCategory();
  const wants = spent.entertainment + spent.clothing + spent.misc;
  const needs = spentTotal() - wants;
  document.getElementById("real-split").textContent =
    "This household's real split this month: needs " + naira(needs) + " on essentials, wants " +
    naira(wants) + " on fun and extras, savings " + naira(savedTotal()) + ".";

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
