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
  { id: 1, day: 1, desc: "Salary — Chidi Okafor", cat: "income", kind: "income", amount: 850000, who: "Chidi" },
  { id: 2, day: 1, desc: "Rent — 3-bed flat, Lekki", cat: "housing", kind: "expense", amount: -250000, who: "Shared" },
  { id: 3, day: 2, desc: "Shoprite groceries", cat: "food", kind: "expense", amount: -48500, who: "Shared" },
  { id: 4, day: 3, desc: "Fuel — TotalEnergies", cat: "transport", kind: "expense", amount: -35000, who: "Chidi" },
  { id: 5, day: 4, desc: "Salary — Adaeze Okafor", cat: "income", kind: "income", amount: 400000, who: "Adaeze" },
  { id: 6, day: 5, desc: "IKEDC electricity token", cat: "utilities", kind: "expense", amount: -25000, who: "Shared" },
  { id: 7, day: 5, desc: "Savings transfer — Stanbic", cat: "savings", kind: "saving", amount: -200000, who: "Shared" },
  { id: 8, day: 6, desc: "School fees — Term 1", cat: "school", kind: "expense", amount: -120000, who: "Shared" },
  { id: 9, day: 7, desc: "Mile 12 market run", cat: "food", kind: "expense", amount: -32000, who: "Shared" },
  { id: 10, day: 8, desc: "DSTv Compact subscription", cat: "utilities", kind: "expense", amount: -21000, who: "Shared" },
  { id: 11, day: 9, desc: "Bolt rides", cat: "transport", kind: "expense", amount: -8500, who: "Shared" },
  { id: 12, day: 10, desc: "Pharmacy — HealthPlus", cat: "health", kind: "expense", amount: -18400, who: "Shared" },
  { id: 13, day: 12, desc: "Shoprite groceries", cat: "food", kind: "expense", amount: -41200, who: "Shared" },
  { id: 14, day: 13, desc: "Fibre internet — monthly", cat: "utilities", kind: "expense", amount: -19500, who: "Shared" },
  { id: 15, day: 14, desc: "Kids' shoes", cat: "clothing", kind: "expense", amount: -22000, who: "Kids" },
  { id: 16, day: 15, desc: "Eating out — Kilimanjaro", cat: "entertainment", kind: "expense", amount: -15000, who: "Shared" },
  { id: 17, day: 16, desc: "Fuel — TotalEnergies", cat: "transport", kind: "expense", amount: -30000, who: "Chidi" },
  { id: 18, day: 17, desc: "Water delivery", cat: "utilities", kind: "expense", amount: -12000, who: "Shared" },
  { id: 19, day: 18, desc: "Mile 12 market run", cat: "food", kind: "expense", amount: -28750, who: "Shared" },
  { id: 20, day: 19, desc: "Tutoring — Adaeze", cat: "income", kind: "income", amount: 45000, who: "Adaeze" },
  { id: 21, day: 20, desc: "Bolt rides", cat: "transport", kind: "expense", amount: -12000, who: "Shared" },
  { id: 22, day: 21, desc: "School books", cat: "school", kind: "expense", amount: -15000, who: "Kids" },
  { id: 23, day: 21, desc: "Mile 12 market run", cat: "food", kind: "expense", amount: -26300, who: "Shared" },
  { id: 24, day: 22, desc: "Clinic visit — Tobi", cat: "health", kind: "expense", amount: -12500, who: "Kids" },
  { id: 25, day: 22, desc: "Water — borehole top-up", cat: "utilities", kind: "expense", amount: -8000, who: "Shared" },
  { id: 26, day: 23, desc: "Cinema — kids", cat: "entertainment", kind: "expense", amount: -9500, who: "Kids" },
  { id: 27, day: 23, desc: "Fuel top-up", cat: "transport", kind: "expense", amount: -9800, who: "Chidi" },
  { id: 28, day: 24, desc: "Shoprite groceries", cat: "food", kind: "expense", amount: -18900, who: "Shared" },
  { id: 29, day: 24, desc: "Dress — Adaeze", cat: "clothing", kind: "expense", amount: -18500, who: "Adaeze" },
  { id: 30, day: 25, desc: "Football + drinks", cat: "entertainment", kind: "expense", amount: -12000, who: "Chidi" },
  { id: 31, day: 26, desc: "Birthday gift — aunt", cat: "misc", kind: "expense", amount: -10000, who: "Shared" },
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
  { id: "emergency", name: "Emergency fund", target: 1500000, saved: 975000, note: "The household's main emergency pot — the Safety Net page works out what it really covers" },
  { id: "school-next", name: "Next term school fees", target: 300000, saved: 135000, note: "Due January 2027" },
  { id: "car", name: "Tokunbo car", target: 4500000, saved: 1200000, note: "Replace the 2009 Corolla" },
  { id: "december", name: "Detty December", target: 150000, saved: 112500, note: "Christmas + travel home" },
];

// The goals planner's list: the same household goals that have a hard
// deadline attached. The planner works out the monthly amount each one
// needs, so the household can see which deadlines are realistic and which
// need more money or more time. Deadlines are ISO dates; "today" for the
// planner is 26 November 2026.
export const SAVINGS_GOALS = [
  { id: "sg1", name: "New generator", target: 850000, saved: 320000, deadline: "2027-03-15", note: "5.5kVA — the old one died in October" },
  { id: "sg2", name: "Children's school fees", target: 600000, saved: 150000, deadline: "2027-01-10", note: "Term 2 fees for Zara and Tobi" },
  { id: "sg3", name: "Emergency fund", target: 1000000, saved: 640000, deadline: "2027-06-30", note: "Kept separate from the main pot — the Safety Net page counts both pots together" },
];

// What the household owes: balance, APR and minimum monthly payment per
// debt. The payoff planner runs the snowball and avalanche strategies over
// this list. The phone is a 0% instalment — it costs nothing to carry, so
// the avalanche leaves it until last.
export const DEBTS = [
  { id: "d1", name: "Cooperative loan", balance: 250000, apr: 18, minPayment: 25000, note: "Staff cooperative, Chidi" },
  { id: "d2", name: "Credit card", balance: 120000, apr: 24, minPayment: 10000, note: "GTBank card — cleared monthly, mostly" },
  { id: "d3", name: "Phone on instalment", balance: 85000, apr: 0, minPayment: 15000, note: "Adaeze's phone, Slot — 0% instalment" },
];

export const UPCOMING_BILLS = [
  { day: "1 Dec", desc: "Rent — December", amount: 250000, cat: "housing" },
  { day: "5 Dec", desc: "DSTv Compact", amount: 21000, cat: "utilities" },
  { day: "13 Dec", desc: "Fibre internet", amount: 19500, cat: "utilities" },
  { day: "15 Dec", desc: "School fees top-up", amount: 30000, cat: "school" },
];

// The bills manager's list: the same December bills as UPCOMING_BILLS,
// plus the November water bill already paid, each with an id, a due day
// and month, and a monthly-or-once flag. The manager reads this list,
// not the dashboard's short list, so paying a bill here never changes
// what the dashboard shows — the dashboard's list stays a plain preview.
export const BILLS = [
  { id: "b1", desc: "Rent — December", amount: 250000, cat: "housing", dueDay: 1, month: "Dec", recurring: "monthly", note: "3-bed flat, Lekki", paid: false, paidOn: null },
  { id: "b2", desc: "DSTv Compact", amount: 21000, cat: "utilities", dueDay: 5, month: "Dec", recurring: "monthly", note: "Pay before the 5th or it cuts off", paid: false, paidOn: null },
  { id: "b3", desc: "Water delivery", amount: 12000, cat: "utilities", dueDay: 8, month: "Dec", recurring: "monthly", note: "Two dispensers a month", paid: false, paidOn: null },
  { id: "b4", desc: "Generator fuel reserve", amount: 40000, cat: "utilities", dueDay: 10, month: "Dec", recurring: "monthly", note: "Diesel for December", paid: false, paidOn: null },
  { id: "b5", desc: "Fibre internet", amount: 19500, cat: "utilities", dueDay: 13, month: "Dec", recurring: "monthly", note: "Monthly subscription", paid: false, paidOn: null },
  { id: "b6", desc: "School fees top-up", amount: 30000, cat: "school", dueDay: 15, month: "Dec", recurring: "once", note: "Term 1 balance for Zara and Tobi", paid: false, paidOn: null },
  { id: "b7", desc: "Water delivery — November", amount: 12000, cat: "utilities", dueDay: 20, month: "Nov", recurring: "monthly", note: "Paid on the 20th", paid: true, paidOn: "Nov 20" },
];

export const DAYS_IN_MONTH = 30;
export const TODAY_DAY = 26;
