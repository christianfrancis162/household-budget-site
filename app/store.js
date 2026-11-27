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
  nextId: TRANSACTIONS.length + 1,
};

const saved = loadSaved();
if (saved) {
  state.transactions = saved.transactions;
  state.budgets = { ...state.budgets, ...saved.budgets };
  state.savingsTarget = saved.savingsTarget || SAVINGS_TARGET;
  state.goals = saved.goals || deepCopy(GOALS);
  state.nextId = saved.nextId || state.transactions.length + 1;
}

function persist() {
  save({
    transactions: state.transactions,
    budgets: state.budgets,
    savingsTarget: state.savingsTarget,
    goals: state.goals,
    nextId: state.nextId,
  });
}

export function resetAll() {
  state.transactions = deepCopy(TRANSACTIONS);
  state.budgets = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.budget]));
  state.savingsTarget = SAVINGS_TARGET;
  state.goals = deepCopy(GOALS);
  state.nextId = TRANSACTIONS.length + 1;
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
