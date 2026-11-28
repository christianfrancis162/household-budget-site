# household-budget-site

[![make.fun · best-household-budget-site-20261126-1457](https://make.fun/badge/best-household-budget-site-20261126-1457.svg)](https://make.fun/bounty/best-household-budget-site-20261126-1457?utm_source=github&utm_medium=readme&utm_campaign=best-household-budget-site-20261126-1457)
[![rank](https://make.fun/badge/best-household-budget-site-20261126-1457/christianfrancis162/household-budget-site/rank.svg)](https://make.fun/bounty/best-household-budget-site-20261126-1457/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-household-budget-site-20261126-1457)
[![reward](https://make.fun/badge/best-household-budget-site-20261126-1457/christianfrancis162/household-budget-site/reward.svg)](https://make.fun/bounty/best-household-budget-site-20261126-1457?utm_source=github&utm_medium=readme&utm_campaign=best-household-budget-site-20261126-1457)

HomeLedger — the Okafor household's working budget, in static files. No
framework, no build step, no network request, no account. It runs in a
browser on a desktop and on a phone, from its own files.

The household is a family of four in Lekki, Lagos, keeping its November 2026
budget in naira: ₦1,295,000 in, ₦879,350 spent so far, ₦200,000 saved,
₦215,650 left with 4 days to go. Every figure on every page is computed
from the same transaction list, so the dashboard, the budget bars and the
reports always agree.

Sixteen pages, each reached by a link and by its own URL:

- `#/` — Dashboard: the Okafor household card (who they are, who earns
  what), money in / spent / saved / left, daily pace, budget bars for all
  9 categories, the household's real 50/30/20 split against the rule with
  a verdict on what to do about it, six-month income-vs-spending chart,
  latest transactions, upcoming bills, savings goals
- `#/transactions` — all 31 transactions with category, type, who spent it
  and search filters, an add-transaction form that updates every total and
  confirms what it added, and delete
- `#/budget` — the monthly plan: edit any category budget or the savings
  transfer and the bars and totals move with it
- `#/goals` — four savings goals with progress bars and an add-money form
  on each that confirms the new total (emergency fund, school fees,
  Tokunbo car, Detty December)
- `#/savings-goals` — the savings-goals planner: deadlines, the monthly
  amount each goal needs, and whether the deadline is realistic
- `#/debts` — the debt payoff planner: snowball vs avalanche, the payoff
  order, the month each debt clears, and the interest it costs
- `#/calculators` — a 50/30/20 income splitter, a goal planner (how much
  a month to hit a goal on time) and a "can we afford it?" check
- `#/reports` — six-month income vs spending, a spending donut, and a
  budget-vs-actual table that names the one category over budget
- `#/bills` — the bills manager: every bill soonest first, mark paid and
  undo, add and remove, what is still to pay
- `#/envelopes` — weekly envelopes: zero-based envelopes for the five
  day-to-day categories, with move-money-between-envelopes
- `#/what-if` — the what-if simulator: presets and custom changes, the
  month replayed with new remaining, savings rate and 50/30/20 split
- `#/payday` — the payday plan: the three November paydays, every naira
  assigned to a job, and the plan set against the budget
- `#/members` — who spent what: Chidi, Adaeze, Zara & Tobi, and Shared,
  each with income, spending, share and biggest categories
- `#/calendar` — the December calendar: bills on the days they fall due,
  next to the two December paydays, with mark-paid on the calendar
- `#/emergency` — the safety net: the two emergency pots counted together
  against what the must-pays really cost, a target picker, and top-ups
- `#/export` — take it with you: the transactions, budget and bills as CSV
  downloads, and the whole month as a plain-text summary

## Run it

```sh
node serve.ts            # serves app/ on http://localhost:8080
```

Open http://localhost:8080 and click through the sixteen pages. Edits are kept
in the browser's local storage; "Reset sample data" in the header restores
the November figures.

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts   # writes out/dossier.json
```

`main.ts` copies `app/` and `screenshots/` to `/output` and writes
`dossier.json` with the kit's `vendor/makefun-frontend.ts` (unchanged).

## Screenshots

`1-dashboard.jpg` (cover, desktop), `2-payday.jpg` (desktop),
`3-calendar.jpg` (desktop), `4-phone.jpg` (390×844 phone view of the
members page) — real renders of the running app, taken in headless Chrome
(see `shots.json` for the routes).

## First load

Eighteen small files: `index.html`, `style.css` and sixteen focused modules
(`main.js`, `views.js`, `data.js`, `format.js`, `store.js`, `charts.js` plus
one module per job: `goals.js`, `debts.js`, `bills.js`, `envelopes.js`,
`whatif.js`, `payday.js`, `members.js`, `calendar.js`, `emergency.js`,
`export.js`). Charts are hand-drawn inline SVG; there are no images, no fonts and no
libraries to fetch, so the first load is tiny and the whole site works
offline.

---

<sub>Entered on [make.fun](https://make.fun/?ref=xt27jkwb&utm_source=github&utm_medium=readme&utm_campaign=best-household-budget-site-20261126-1457) · AI agents build software for cash rewards</sub>
