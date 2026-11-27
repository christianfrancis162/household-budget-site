// The household's live state. Seed data comes from data.js; any change the
// household makes is kept in localStorage (guarded — the site works fine
// from a plain file open where storage is blocked) and can be reset.
//
// Every total the site shows is derived here from the transaction list, so
// the dashboard, the budget page and the reports can never disagree.

import {
  TRANSACTIONS,
  CATEGORIES,
  GOALS,
  SAVINGS_GOALS,
  DEBTS,
  BILLS,
  SAVINGS_TARGET,
  MONTHLY_HISTORY,
  DAYS_IN_MONTH,
  TODAY_DAY,
} from "./data.js";
import { pct } from "./format.js";

const STORAGE_KEY = "homeledger-v1";

function deepCopy(v) {
  return JSON.parse(JSON.stringify(v));
}

function loadSaved() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.transactions)) return null;
    return parsed;
  } catch (e) {
    return null;
  }
}

function save(state) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    // Storage blocked (private mode, file://) — the site still works,
    // changes just last until the page is closed.
  }
}

// The live state. `budgets` is a map category id -> monthly budget.
export const state = {
  transactions: deepCopy(TRANSACTIONS),
  budgets: Object.fromEntries(CATEGORIES.map((c) => [c.id, c.budget])),
  savingsTarget: SAVINGS_TARGET,
  goals: deepCopy(GOALS),
  // The planner's goals (with deadlines) and the household's debts live
  // beside the simple goals list — same persistence, separate lists, so
  // the two pages can never clobber each other.
  savingsGoals: deepCopy(SAVINGS_GOALS),
  debts: deepCopy(DEBTS),
  // The bills manager's list and the envelope moves. Bills carry their
  // paid flag, so paying one is a state change like any other; envelope
  // moves are stamped with their week, so they only ever affect the
  // week they were made in.
  bills: deepCopy(BILLS),
  envelopeMoves: [],
  nextId: TRANSACTIONS.length + 1,
  nextGoalId: SAVINGS_GOALS.length + 1,
  nextDebtId: DEBTS.length + 1,
  nextBillId: BILLS.length + 1,
};

const saved = loadSaved();
if (saved) {
  state.transactions = saved.transactions;
  state.budgets = { ...state.budgets, ...saved.budgets };
  state.savingsTarget = saved.savingsTarget || SAVINGS_TARGET;
  state.goals = saved.goals || deepCopy(GOALS);
  state.savingsGoals = saved.savingsGoals || deepCopy(SAVINGS_GOALS);
  state.debts = saved.debts || deepCopy(DEBTS);
  state.bills = Array.isArray(saved.bills) && saved.bills.length ? saved.bills : deepCopy(BILLS);
  state.envelopeMoves = Array.isArray(saved.envelopeMoves) ? saved.envelopeMoves : [];
  state.nextId = saved.nextId || state.transactions.length + 1;
  state.nextGoalId = saved.nextGoalId || state.savingsGoals.length + 1;
  state.nextDebtId = saved.nextDebtId || state.debts.length + 1;
  state.nextBillId = saved.nextBillId || state.bills.length + 1;
}

function persist() {
  save({
    transactions: state.transactions,
    budgets: state.budgets,
    savingsTarget: state.savingsTarget,
    goals: state.goals,
    savingsGoals: state.savingsGoals,
    debts: state.debts,
    bills: state.bills,
    envelopeMoves: state.envelopeMoves,
    nextId: state.nextId,
    nextGoalId: state.nextGoalId,
    nextDebtId: state.nextDebtId,
    nextBillId: state.nextBillId,
  });
}

export function resetAll() {
  state.transactions = deepCopy(TRANSACTIONS);
  state.budgets = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.budget]));
  state.savingsTarget = SAVINGS_TARGET;
  state.goals = deepCopy(GOALS);
  state.savingsGoals = deepCopy(SAVINGS_GOALS);
  state.debts = deepCopy(DEBTS);
  state.bills = deepCopy(BILLS);
  state.envelopeMoves = [];
  state.nextId = TRANSACTIONS.length + 1;
  state.nextGoalId = SAVINGS_GOALS.length + 1;
  state.nextDebtId = DEBTS.length + 1;
  state.nextBillId = BILLS.length + 1;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    /* storage unavailable — nothing to clear */
  }
}

// --- Mutations (every form on the site calls one of these) ---

export function addTransaction({ day, desc, cat, kind, amount }) {
  const tx = {
    id: state.nextId++,
    day: Number(day) || TODAY_DAY,
    desc: String(desc).trim(),
    cat,
    kind,
    amount: kind === "income" ? Math.abs(amount) : -Math.abs(amount),
  };
  state.transactions.push(tx);
  state.transactions.sort((a, b) => a.day - b.day || a.id - b.id);
  persist();
  return tx;
}

export function deleteTransaction(id) {
  state.transactions = state.transactions.filter((t) => t.id !== id);
  persist();
}

export function setBudget(catId, amount) {
  const v = Math.max(0, Math.round(Number(amount) || 0));
  state.budgets[catId] = v;
  persist();
}

export function setSavingsTarget(amount) {
  state.savingsTarget = Math.max(0, Math.round(Number(amount) || 0));
  persist();
}

export function contributeToGoal(goalId, amount) {
  const goal = state.goals.find((g) => g.id === goalId);
  if (!goal) return;
  goal.saved = Math.min(goal.target, goal.saved + Math.max(0, Math.round(Number(amount) || 0)));
  persist();
}

// --- Savings-goals planner mutations ---

// Adds a goal built by goals.js's makePlannerGoal. Returns the new goal.
export function addPlannerGoal(goal) {
  state.savingsGoals.push(goal);
  state.nextGoalId++;
  persist();
  return goal;
}

// Adds money to a planner goal, capped at its target — a goal never shows
// more saved than its target, and the extra simply is not counted.
export function contributeToPlannerGoal(goalId, amount) {
  const goal = state.savingsGoals.find((g) => g.id === goalId);
  if (!goal) return null;
  const added = Math.max(0, Math.round(Number(amount) || 0));
  goal.saved = Math.min(goal.target, goal.saved + added);
  persist();
  return goal;
}

// Removes a planner goal entirely. Returns true when something was removed.
export function removePlannerGoal(goalId) {
  const before = state.savingsGoals.length;
  state.savingsGoals = state.savingsGoals.filter((g) => g.id !== goalId);
  if (state.savingsGoals.length !== before) {
    persist();
    return true;
  }
  return false;
}

// --- Debt payoff mutations ---

// Adds a debt built by debts.js's makeDebt. Returns the new debt.
export function addDebt(debt) {
  state.debts.push(debt);
  state.nextDebtId++;
  persist();
  return debt;
}

// Marks a debt paid off and takes it off the list — the payoff plan then
// reruns without it, and its minimum payment is freed for the next debt.
// Returns the removed debt, or null when the id is not found.
export function markDebtPaid(debtId) {
  const debt = state.debts.find((d) => d.id === debtId);
  if (!debt) return null;
  state.debts = state.debts.filter((d) => d.id !== debtId);
  persist();
  return debt;
}

// Removes a debt without marking it paid — for a debt that was entered by
// mistake. Returns true when something was removed.
export function removeDebt(debtId) {
  const before = state.debts.length;
  state.debts = state.debts.filter((d) => d.id !== debtId);
  if (state.debts.length !== before) {
    persist();
    return true;
  }
  return false;
}

// --- Bills manager mutations ---

// Adds a bill built by bills.js's makeBill. Returns the new bill.
export function addBill(bill) {
  state.bills.push(bill);
  state.nextBillId++;
  persist();
  return bill;
}

// Marks a bill paid and stamps it with today's date ("Nov 26") — the
// bill stays on the list, marked paid, so the household can see what
// it has cleared. Returns the bill, or null when it is not found.
export function markBillPaid(billId) {
  const bill = state.bills.find((b) => b.id === billId);
  if (!bill) return null;
  bill.paid = true;
  bill.paidOn = "Nov " + TODAY_DAY;
  persist();
  return bill;
}

// Unmarks a bill paid — for one marked by mistake. Returns the bill,
// or null when it is not found.
export function markBillUnpaid(billId) {
  const bill = state.bills.find((b) => b.id === billId);
  if (!bill) return null;
  bill.paid = false;
  bill.paidOn = null;
  persist();
  return bill;
}

// Removes a bill entirely. Returns true when something was removed.
export function deleteBill(billId) {
  const before = state.bills.length;
  state.bills = state.bills.filter((b) => b.id !== billId);
  if (state.bills.length !== before) {
    persist();
    return true;
  }
  return false;
}

// --- Envelope moves ---

// Records a move of money between two envelopes, built by
// envelopes.js's makeMove. The move is stamped with its week, so it
// only ever changes the week it was made in. Returns the move.
export function addEnvelopeMove(move) {
  state.envelopeMoves.push(move);
  persist();
  return move;
}

// --- Derived totals ---

export function incomeTotal() {
  return state.transactions
    .filter((t) => t.kind === "income")
    .reduce((sum, t) => sum + t.amount, 0);
}

export function savedTotal() {
  return state.transactions
    .filter((t) => t.kind === "saving")
    .reduce((sum, t) => sum + -t.amount, 0);
}

export function spentByCategory() {
  const out = {};
  for (const c of CATEGORIES) out[c.id] = 0;
  for (const t of state.transactions) {
    if (t.kind === "expense" && out[t.cat] !== undefined) out[t.cat] += -t.amount;
  }
  return out;
}

export function spentTotal() {
  return Object.values(spentByCategory()).reduce((a, b) => a + b, 0);
}

export function budgetTotal() {
  return Object.values(state.budgets).reduce((a, b) => a + b, 0);
}

export function remaining() {
  return incomeTotal() - spentTotal() - savedTotal();
}

export function savingsRate() {
  const income = incomeTotal();
  return income ? Math.round((savedTotal() / income) * 100) : 0;
}

// The household's 50/30/20 split, from live figures: wants are
// entertainment, clothing and misc; everything else spent is needs;
// savings are the monthly transfer to the savings account. The
// calculators page and the dashboard both read this one definition,
// so the split can never disagree between pages.
export function split502030() {
  const spent = spentByCategory();
  const income = incomeTotal();
  const wants = spent.entertainment + spent.clothing + spent.misc;
  const needs = spentTotal() - wants;
  const saved = savedTotal();
  return {
    income,
    needs,
    wants,
    saved,
    needsPct: pct(needs, income),
    wantsPct: pct(wants, income),
    savePct: pct(saved, income),
  };
}

export function daysLeft() {
  return Math.max(0, DAYS_IN_MONTH - TODAY_DAY);
}

// Daily spending pace: what the household spends per day so far, and what
// it can still spend per day for the rest of the month without going over
// the total budget.
export function dailyPace() {
  const perDaySoFar = spentTotal() / TODAY_DAY;
  const left = Math.max(0, budgetTotal() - spentTotal());
  const perDayLeft = daysLeft() ? left / daysLeft() : 0;
  return { perDaySoFar, perDayLeft, budgetLeft: left };
}

export function monthlyTrend() {
  const history = deepCopy(MONTHLY_HISTORY);
  const last = history[history.length - 1];
  last.spent = spentTotal();
  last.income = incomeTotal();
  return history;
}
