// HomeLedger router — hash routes, one page per job, every page reached
// by a link in the nav and by its own URL.
//
// Routes:
//   #/               Dashboard
//   #/transactions   Every transaction, add + filter + delete
//   #/budget         Monthly budgets, editable
//   #/goals          Savings goals, contribute
//   #/savings-goals  Savings goals planner — deadlines + monthly need
//   #/debts          Debt payoff planner — snowball vs avalanche
//   #/calculators    50/30/20 split, goal planner, affordability
//   #/reports        Six-month report
//   #/bills          Bills manager — pay, add, track what is still owed
//   #/envelopes      Weekly envelopes — zero-based, day-to-day spending
//   #/what-if        What-if simulator — replay the month with a change
//   #/payday         Payday plan — every payday has a job
//   #/members        Who spent what — the member split
//   #/calendar       December calendar — bills on the days they fall due
//   #/emergency      Safety net — the emergency-fund planner
//   #/export         Take it with you — the month as CSV files and a summary
//
// The page sets window.__shotReady to false while a route loads and to
// true once it has rendered, so screenshots are taken of finished pages.

import {
  renderDashboard,
  renderTransactions,
  bindTransactions,
  renderBudget,
  bindBudget,
  renderGoals,
  bindGoals,
  renderSavingsGoals,
  bindSavingsGoals,
  renderDebts,
  bindDebts,
  renderCalculators,
  bindCalculators,
  renderReports,
  renderBills,
  bindBills,
  renderEnvelopes,
  bindEnvelopes,
  renderWhatIf,
  bindWhatIf,
  renderPayday,
  renderMembers,
  renderCalendar,
  bindCalendar,
  renderEmergency,
  bindEmergency,
  renderExport,
  bindExport,
} from "./views.js";

const ROUTES = {
  "/": { title: "Dashboard", render: renderDashboard, bind: null },
  "/transactions": { title: "Transactions", render: renderTransactions, bind: bindTransactions },
  "/budget": { title: "Budget", render: renderBudget, bind: bindBudget },
  "/goals": { title: "Goals", render: renderGoals, bind: bindGoals },
  "/savings-goals": { title: "Savings Goals", render: renderSavingsGoals, bind: bindSavingsGoals },
  "/debts": { title: "Debt Payoff", render: renderDebts, bind: bindDebts },
  "/calculators": { title: "Calculators", render: renderCalculators, bind: bindCalculators },
  "/reports": { title: "Reports", render: renderReports, bind: null },
  "/bills": { title: "Bills", render: renderBills, bind: bindBills },
  "/envelopes": { title: "Weekly Envelopes", render: renderEnvelopes, bind: bindEnvelopes },
  "/what-if": { title: "What-If Simulator", render: renderWhatIf, bind: bindWhatIf },
  "/payday": { title: "Payday Plan", render: renderPayday, bind: null },
  "/members": { title: "Who Spent What", render: renderMembers, bind: null },
  "/calendar": { title: "December Calendar", render: renderCalendar, bind: bindCalendar },
  "/emergency": { title: "Safety Net", render: renderEmergency, bind: bindEmergency },
  "/export": { title: "Take It With You", render: renderExport, bind: bindExport },
};

const main = document.getElementById("view");

function routeFromHash() {
  const hash = window.location.hash || "#/";
  const path = hash.slice(1).split("?")[0] || "/";
  return ROUTES[path] ? path : "/";
}

function draw() {
  window.__shotReady = false;
  const path = routeFromHash();
  const route = ROUTES[path];
  main.innerHTML = route.render();
  document.querySelectorAll("nav a").forEach((a) => {
    a.classList.toggle("active", a.getAttribute("href") === "#" + path);
    if (a.getAttribute("href") === "#" + path) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
  document.title = "HomeLedger — " + route.title;
  const rerender = () => draw();
  if (route.bind) route.bind(rerender);
  window.__shotReady = true;
}

window.addEventListener("hashchange", draw);

document.getElementById("reset-data").addEventListener("click", () => {
  if (window.confirm("Reset HomeLedger to the sample November data? Your changes will be lost.")) {
    import("./store.js").then((m) => {
      m.resetAll();
      draw();
    });
  }
});

draw();
