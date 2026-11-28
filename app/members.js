// Member split — who earns it, who spends it.
//
// Every transaction carries a `who`: Chidi, Adaeze, the kids (Zara and
// Tobi), or Shared — the spending that belongs to the household as a
// whole, like rent and groceries, rather than to one person. Income is
// attached to whoever earned it; the savings transfer is Shared, because
// the household saves together.
//
// The split answers the question the household actually argues about:
// who spends on what. The figures come from the same transaction list
// every other page reads, so the members' spending always adds up to
// the month's spending exactly.

import { CATEGORIES } from "./data.js";

// The household's members, in the order the page shows them. "Shared"
// is a member too — the household's joint spending.
export const MEMBERS = ["Chidi", "Adaeze", "Kids", "Shared"];

// A friendly name for a `who` value, for headings and sentences.
export function memberLabel(who) {
  if (who === "Chidi") return "Chidi Okafor";
  if (who === "Adaeze") return "Adaeze Okafor";
  if (who === "Kids") return "Zara & Tobi";
  return "Shared — the household";
}

// One member's month: what they earned, what they spent, what they
// spent it on (per category), and their share of the month's spending.
export function memberSummary(who, transactions) {
  const mine = transactions.filter((t) => (t.who || "Shared") === who);
  const income = mine
    .filter((t) => t.kind === "income")
    .reduce((s, t) => s + t.amount, 0);
  const spent = mine
    .filter((t) => t.kind === "expense")
    .reduce((s, t) => s + -t.amount, 0);
  const saved = mine
    .filter((t) => t.kind === "saving")
    .reduce((s, t) => s + -t.amount, 0);
  const byCategory = {};
  for (const t of mine) {
    if (t.kind !== "expense") continue;
    byCategory[t.cat] = (byCategory[t.cat] || 0) + -t.amount;
  }
  const topCategories = Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([cat, amount]) => ({
      label: (CATEGORIES.find((c) => c.id === cat) || { label: cat }).label,
      amount,
    }));
  return { who, label: memberLabel(who), income, spent, saved, byCategory, topCategories };
}

// The whole household's split: every member's summary, the totals, and
// each member's share of the spending — the shares add up to 100%.
export function membersSplit(transactions) {
  const members = MEMBERS.map((who) => memberSummary(who, transactions));
  const totalSpent = members.reduce((s, m) => s + m.spent, 0);
  const totalIncome = members.reduce((s, m) => s + m.income, 0);
  const totalSaved = members.reduce((s, m) => s + m.saved, 0);
  for (const m of members) {
    m.sharePct = totalSpent ? Math.round((m.spent / totalSpent) * 100) : 0;
    m.incomeSharePct = totalIncome ? Math.round((m.income / totalIncome) * 100) : 0;
  }
  return { members, totalSpent, totalIncome, totalSaved };
}

// Plain-English verdicts on the split: who earns what share, who spends
// what share, and where the joint spending sits.
export function memberVerdicts(split) {
  const lines = [];
  const chidi = split.members.find((m) => m.who === "Chidi");
  const adaeze = split.members.find((m) => m.who === "Adaeze");
  const shared = split.members.find((m) => m.who === "Shared");
  const kids = split.members.find((m) => m.who === "Kids");
  if (chidi && adaeze) {
    lines.push(
      "Chidi earns " + chidi.incomeSharePct + "% of the income and Adaeze " + adaeze.incomeSharePct +
        "% — but almost all day-to-day spending is Shared (" + shared.sharePct +
        "% of what the household spent), because rent, food and bills belong to the family, not to one person.",
    );
  }
  if (chidi && chidi.spent > 0) {
    const top = chidi.topCategories[0];
    lines.push(
      "Chidi's own spending is ₦" + chidi.spent.toLocaleString("en-NG") + " — mostly " +
        (top ? top.label.toLowerCase() + " (₦" + top.amount.toLocaleString("en-NG") + ")" : "small personal items") +
        ". He drives, so the fuel is his; the food and rent are the household's.",
    );
  }
  if (adaeze && adaeze.spent > 0) {
    lines.push(
      "Adaeze's own spending is ₦" + adaeze.spent.toLocaleString("en-NG") +
        " — her tutoring money goes to Christmas, not to herself.",
    );
  }
  if (kids) {
    lines.push(
      "Zara and Tobi account for ₦" + kids.spent.toLocaleString("en-NG") + " (" + kids.sharePct +
        "% of spending) — shoes, books, the clinic visit and the cinema. Their school fees sit under Shared, because the household pays them together.",
    );
  }
  return lines;
}
