// HomeLedger seed data — the Okafor household, Lagos, November 2026.
// Every figure below is the household's real month so far. The app computes
// all totals from these transactions, so the dashboard, budget bars and
// reports always agree with each other.

export const HOUSEHOLD = {
  name: "The Okafor Household",
  place: "Lekki, Lagos",
  members: ["Chidi Okafor", "Adaeze Okafor", "Zara (9)", "Tobi (6)"],
  month: "November 2026",
  monthIndex: 10, // 0-based, for the trend chart
  currency: "NGN",
};

export const INCOME_SOURCES = [
  { who: "Chidi Okafor", what: "Software engineer salary", amount: 850000 },
  { who: "Adaeze Okafor", what: "Teacher salary", amount: 400000 },
  { who: "Adaeze Okafor", what: "Weekend tutoring", amount: 45000 },
];

// Monthly budget per category, in naira. Savings is the household's
// pay-yourself-first transfer, not spending.
export const CATEGORIES = [
  { id: "housing", label: "Housing", budget: 250000, note: "Rent, 3-bed flat" },
  { id: "food", label: "Food & Groceries", budget: 220000, note: "Shoprite + Mile 12 market" },
  { id: "transport", label: "Transport", budget: 120000, note: "Fuel, Bolt, danfo" },
  { id: "utilities", label: "Utilities", budget: 95000, note: "Power, water, internet, DSTv" },
  { id: "school", label: "School & Kids", budget: 150000, note: "Fees, books, uniform" },
  { id: "health", label: "Health", budget: 60000, note: "Pharmacy, clinic" },
  { id: "entertainment", label: "Entertainment", budget: 45000, note: "Eating out, cinema, football" },
  { id: "clothing", label: "Clothing", budget: 40000, note: "Shoes, outfits" },
  { id: "misc", label: "Miscellaneous", budget: 70000, note: "Gifts, odds and ends" },
];

export const SAVINGS_TARGET = 200000;

// Transactions for November 2026, newest last. Positive = money in,
// negative = money out. `kind` is income, expense, or saving (the monthly
// transfer to the savings account).
export const TRANSACTIONS = [
  { id: 1, day: 1, desc: "Salary — Chidi Okafor", cat: "income", kind: "income", amount: 850000 },
  { id: 2, day: 1, desc: "Rent — 3-bed flat, Lekki", cat: "housing", kind: "expense", amount: -250000 },
  { id: 3, day: 2, desc: "Shoprite groceries", cat: "food", kind: "expense", amount: -48500 },
  { id: 4, day: 3, desc: "Fuel — TotalEnergies", cat: "transport", kind: "expense", amount: -35000 },
  { id: 5, day: 4, desc: "Salary — Adaeze Okafor", cat: "income", kind: "income", amount: 400000 },
  { id: 6, day: 5, desc: "IKEDC electricity token", cat: "utilities", kind: "expense", amount: -25000 },
  { id: 7, day: 5, desc: "Savings transfer — Stanbic", cat: "savings", kind: "saving", amount: -200000 },
  { id: 8, day: 6, desc: "School fees — Term 1", cat: "school", kind: "expense", amount: -120000 },
  { id: 9, day: 7, desc: "Mile 12 market run", cat: "food", kind: "expense", amount: -32000 },
  { id: 10, day: 8, desc: "DSTv Compact subscription", cat: "utilities", kind: "expense", amount: -21000 },
  { id: 11, day: 9, desc: "Bolt rides", cat: "transport", kind: "expense", amount: -8500 },
  { id: 12, day: 10, desc: "Pharmacy — HealthPlus", cat: "health", kind: "expense", amount: -18400 },
  { id: 13, day: 12, desc: "Shoprite groceries", cat: "food", kind: "expense", amount: -41200 },
  { id: 14, day: 13, desc: "Fibre internet — monthly", cat: "utilities", kind: "expense", amount: -19500 },
  { id: 15, day: 14, desc: "Kids' shoes", cat: "clothing", kind: "expense", amount: -22000 },
  { id: 16, day: 15, desc: "Eating out — Kilimanjaro", cat: "entertainment", kind: "expense", amount: -15000 },
  { id: 17, day: 16, desc: "Fuel — TotalEnergies", cat: "transport", kind: "expense", amount: -30000 },
  { id: 18, day: 17, desc: "Water delivery", cat: "utilities", kind: "expense", amount: -12000 },
  { id: 19, day: 18, desc: "Mile 12 market run", cat: "food", kind: "expense", amount: -28750 },
  { id: 20, day: 19, desc: "Tutoring — Adaeze", cat: "income", kind: "income", amount: 45000 },
  { id: 21, day: 20, desc: "Bolt rides", cat: "transport", kind: "expense", amount: -12000 },
  { id: 22, day: 21, desc: "School books", cat: "school", kind: "expense", amount: -15000 },
  { id: 23, day: 21, desc: "Mile 12 market run", cat: "food", kind: "expense", amount: -26300 },
  { id: 24, day: 22, desc: "Clinic visit — Tobi", cat: "health", kind: "expense", amount: -12500 },
  { id: 25, day: 22, desc: "Water — borehole top-up", cat: "utilities", kind: "expense", amount: -8000 },
  { id: 26, day: 23, desc: "Cinema — kids", cat: "entertainment", kind: "expense", amount: -9500 },
  { id: 27, day: 23, desc: "Fuel top-up", cat: "transport", kind: "expense", amount: -9800 },
  { id: 28, day: 24, desc: "Shoprite groceries", cat: "food", kind: "expense", amount: -18900 },
  { id: 29, day: 24, desc: "Dress — Adaeze", cat: "clothing", kind: "expense", amount: -18500 },
  { id: 30, day: 25, desc: "Football + drinks", cat: "entertainment", kind: "expense", amount: -12000 },
  { id: 31, day: 26, desc: "Birthday gift — aunt", cat: "misc", kind: "expense", amount: -10000 },
];

// Income vs spending for the last six months, for the trend chart.
// November is the live month: its spending is computed from TRANSACTIONS.
export const MONTHLY_HISTORY = [
  { month: "Jun 2026", income: 1250000, spent: 1080000 },
  { month: "Jul 2026", income: 1250000, spent: 1140000 },
  { month: "Aug 2026", income: 1295000, spent: 1090000 },
  { month: "Sep 2026", income: 1250000, spent: 1180000 },
  { month: "Oct 2026", income: 1295000, spent: 1120000 },
  { month: "Nov 2026", income: 1295000, spent: null }, // filled in live
];

export const GOALS = [
  { id: "emergency", name: "Emergency fund", target: 1500000, saved: 975000, note: "6 months of essentials" },
  { id: "school-next", name: "Next term school fees", target: 300000, saved: 135000, note: "Due January 2027" },
  { id: "car", name: "Tokunbo car", target: 4500000, saved: 1200000, note: "Replace the 2009 Corolla" },
  { id: "december", name: "Detty December", target: 150000, saved: 112500, note: "Christmas + travel home" },
];

export const UPCOMING_BILLS = [
  { day: "1 Dec", desc: "Rent — December", amount: 250000, cat: "housing" },
  { day: "5 Dec", desc: "DSTv Compact", amount: 21000, cat: "utilities" },
  { day: "13 Dec", desc: "Fibre internet", amount: 19500, cat: "utilities" },
  { day: "15 Dec", desc: "School fees top-up", amount: 30000, cat: "school" },
];

export const DAYS_IN_MONTH = 30;
export const TODAY_DAY = 26;
