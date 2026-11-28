// Export — take the household's money out of the site.
//
// The household's records belong to the household, not to the site:
// every list on the site downloads as a CSV the household can open in
// a spreadsheet, and the whole month downloads as a plain-text
// summary. Downloads are made in the browser from the live figures —
// no network, no account — with an <a download> link fed by a Blob,
// so what downloads is always the month as it stands right now,
// including any edit the household has made.
//
// A CSV field is quoted whenever it holds a comma, a quote or a line
// break, and a quote inside a field is doubled — the usual rule, so
// the files open cleanly in Excel and Google Sheets.

import { CATEGORIES } from "./data.js";

// Quote one CSV field the standard way.
export function csvField(value) {
  const text = String(value ?? "");
  if (/[",\n\r]/.test(text)) return '"' + text.replace(/"/g, '""') + '"';
  return text;
}

// Join rows of fields into CSV text, one row per line.
export function toCsv(rows) {
  return rows.map((row) => row.map(csvField).join(",")).join("\n") + "\n";
}

// The transactions file: every transaction, newest last, with the day,
// what it was, its category, who spent it, its type and its amount in
// naira (money in positive, money out negative).
export function transactionsCsv(transactions) {
  const rows = [["Day", "Description", "Category", "Who", "Type", "Amount (NGN)"]];
  const sorted = [...transactions].sort((a, b) => a.day - b.day || a.id - b.id);
  for (const t of sorted) {
    const cat =
      t.cat === "income" ? "Income" :
      t.cat === "savings" ? "Savings" :
      (CATEGORIES.find((c) => c.id === t.cat) || { label: t.cat }).label;
    rows.push([t.day, t.desc, cat, t.who || "Shared", t.kind, t.amount]);
  }
  return toCsv(rows);
}

// The budget file: one row per category — the monthly budget, what was
// spent, what is left, and the percentage used.
export function budgetCsv(categories, budgets, spentByCat) {
  const rows = [["Category", "Monthly budget (NGN)", "Spent (NGN)", "Left (NGN)", "Used (%)"]];
  for (const c of categories) {
    const budget = budgets[c.id] || 0;
    const spent = spentByCat[c.id] || 0;
    const left = budget - spent;
    const used = budget ? Math.round((spent / budget) * 100) : 0;
    rows.push([c.label, budget, spent, left, used]);
  }
  return toCsv(rows);
}

// The bills file: every bill, soonest first, with its due date, amount,
// category, whether it repeats, and whether it is paid.
export function billsCsv(bills) {
  const rows = [["Due", "Bill", "Category", "Amount (NGN)", "Repeats", "Status"]];
  const sorted = [...bills].sort((a, b) => {
    if (a.month !== b.month) return a.month === "Nov" ? -1 : 1;
    return a.dueDay - b.dueDay;
  });
  for (const b of sorted) {
    const cat = (CATEGORIES.find((c) => c.id === b.cat) || { label: b.cat }).label;
    rows.push([
      b.month + " " + b.dueDay,
      b.desc,
      cat,
      b.amount,
      b.recurring === "monthly" ? "Every month" : "One-off",
      b.paid ? "Paid" + (b.paidOn ? " " + b.paidOn : "") : "Unpaid",
    ]);
  }
  return toCsv(rows);
}

// The month summary: a plain-text record of November 2026 — the
// headline figures, the 50/30/20 split, every category against its
// budget, the goals, the debts and the bills still to pay. `figures`
// is everything the page already computed, so the summary can never
// disagree with the site.
export function monthSummary(figures) {
  const lines = [];
  lines.push("HomeLedger — The Okafor Household — November 2026");
  lines.push("=".repeat(52));
  lines.push("");
  lines.push("Money in:    " + figures.income);
  lines.push("Spent:       " + figures.spent);
  lines.push("Saved:       " + figures.saved + " (" + figures.savingsRate + "% of income)");
  lines.push("Left:        " + figures.left + " (" + figures.daysLeft + " days to go)");
  lines.push("");
  lines.push("50 / 30 / 20 split — needs " + figures.split.needsPct + "%, wants " +
    figures.split.wantsPct + "%, savings " + figures.split.savePct + "%");
  lines.push("");
  lines.push("Budget by category:");
  for (const row of figures.categories) {
    lines.push("  " + row.label + ": " + row.spent + " of " + row.budget +
      " (" + row.pct + "% used, " + row.left + " left)");
  }
  lines.push("");
  lines.push("Savings goals:");
  for (const g of figures.goals) {
    lines.push("  " + g.name + ": " + g.saved + " of " + g.target + " (" + g.pct + "%)");
  }
  lines.push("");
  lines.push("Debts: " + figures.debtTotal + " owed across " + figures.debtCount + " debts");
  lines.push("Bills still to pay: " + figures.billsDue + " across " + figures.billsUnpaid + " bills");
  lines.push("");
  lines.push("Made by HomeLedger, from the household's own figures. No account, no network.");
  return lines.join("\n") + "\n";
}

// Offer text as a download in the browser: build a Blob, point a
// temporary link at it, click the link, then clean up. Returns true
// when the download was started.
export function downloadText(filename, text, mime) {
  try {
    const blob = new Blob([text], { type: mime || "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  } catch (e) {
    return false;
  }
}
