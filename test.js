const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");

const html = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");

const dom = new JSDOM(html, {
  runScripts: "dangerously",
  resources: "usable",
  url: "http://localhost/",
  pretendToBeVisual: true,
});

dom.window.alert = (msg) => { console.log("[alert]", msg); dom.window.__lastAlert = msg; };
dom.window.confirm = () => true;
let promptQueue = [];
dom.window.prompt = (msg, def) => {
  const v = promptQueue.length ? promptQueue.shift() : def;
  console.log("[prompt]", msg, "->", v);
  return v;
};

const combined = ["data.js", "i18n.js", "app.js"]
  .map((f) => fs.readFileSync(path.join(__dirname, f), "utf8"))
  .join("\n;\n");
dom.window.eval(combined);

dom.window.document.dispatchEvent(new dom.window.Event("DOMContentLoaded", { bubbles: true }));

const { document } = dom.window;
const click = (el) => el.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
const submit = (el) => el.dispatchEvent(new dom.window.Event("submit", { bubbles: true, cancelable: true }));
const change = (el) => el.dispatchEvent(new dom.window.Event("change", { bubbles: true }));

function assert(cond, msg) {
  if (!cond) throw new Error("FAIL: " + msg);
  console.log("OK:", msg);
}

// 1. Home view visible by default, others hidden
assert(document.querySelector('[data-view="home"]').hidden === false, "home view visible on load");
assert(document.querySelector('[data-view="find"]').hidden === true, "find view hidden on load");

// 2. Nav switches views
click(document.querySelector('[data-nav="find"]'));
assert(document.querySelector('[data-view="find"]').hidden === false, "find view shown after nav click");

// 3. Category/city selects populated
assert(document.getElementById("categorySelect").options.length === 10, "10 category options populated");
assert(document.getElementById("citySelect").options.length === 8, "8 city options populated");

// 4. Customer request -> SmartMatch produces results
const form = document.getElementById("requestForm");
form.querySelector('[name="customerName"]').value = "Test Customer";
form.querySelector('[name="customerPhone"]').value = "9999999999";
form.querySelector('[name="category"]').value = "Electrician";
form.querySelector('[name="city"]').value = "Jamui";
submit(form);
assert(document.getElementById("matchResults").hidden === false, "match results shown after request submit");
const cards = document.querySelectorAll("#matchList .worker-card");
assert(cards.length > 0, "at least one matched worker card rendered (" + cards.length + ")");
assert(cards[0].textContent.includes("Jamui"), "top match is in the requested city");

// 5. Requesting a worker creates a booking (verify via admin table)
click(cards[0].querySelector("button"));
click(document.querySelector('[data-nav="admin"]'));
let adminRows = document.querySelectorAll("#adminBookingsTable tbody tr");
assert(adminRows.length === 1, "1 booking visible in admin after request, got " + adminRows.length);
assert(adminRows[0].textContent.includes("Requested"), "booking status is Requested in admin table");

// 6. Worker dashboard: find and accept the booking
click(document.querySelector('[data-nav="dashboard"]'));
const workerNameCell = adminRows[0].children[3].textContent; // worker name column
const workerSelect = document.getElementById("workerSelect");
const targetOption = Array.from(workerSelect.options).find((o) => o.text.startsWith(workerNameCell));
assert(!!targetOption, "matched worker present in worker-select dropdown");
workerSelect.value = targetOption.value;
change(workerSelect);
let acceptBtn = Array.from(document.querySelectorAll("#workerRequests button")).find((b) => b.textContent === "Accept");
assert(!!acceptBtn, "Accept button found in worker requests");
click(acceptBtn);
let badge = document.querySelector("#workerJobs .badge");
assert(badge && badge.textContent === "Confirmed", "booking badge shows Confirmed after accept, got " + (badge && badge.textContent));

// 7. Worker marks job completed
const completeBtn = Array.from(document.querySelectorAll("#workerJobs button")).find((b) => b.textContent === "Mark job completed");
assert(!!completeBtn, "Mark job completed button found");
click(completeBtn);
badge = document.querySelector("#workerJobs .badge");
assert(badge.textContent.startsWith("Completed"), "booking badge shows Completed, got " + badge.textContent);

// 8. Customer pays via My Bookings
click(document.querySelector('[data-nav="bookings"]'));
document.getElementById("lookupPhone").value = "9999999999";
submit(document.getElementById("lookupForm"));
let payForm = document.querySelector("#customerBookings .inline-form");
assert(!!payForm, "payment form rendered for completed booking");
payForm.querySelector('[name="amount"]').value = "500";
submit(payForm);
submit(document.getElementById("lookupForm")); // re-lookup to see refreshed state
const invoiceText = document.querySelector("#customerBookings .booking-card").textContent;
assert(invoiceText.includes("₹500") && invoiceText.includes("Paid"), "invoice + Paid status visible after payment");
assert(invoiceText.includes("475"), "worker payout (500 - 5% fee = 475) shown in invoice text");

// 9. Customer rates
const rateForm = document.querySelector("#customerBookings .inline-form");
assert(!!rateForm, "rating form rendered for paid booking");
rateForm.querySelector('[name="stars"]').value = "5";
submit(rateForm);
submit(document.getElementById("lookupForm"));
const closedText = document.querySelector("#customerBookings .booking-card").textContent;
assert(closedText.includes("Closed"), "booking status Closed after rating");
assert(closedText.includes("rated this 5/5"), "rating value reflected in booking card");

// 10. Worker registration flow
click(document.querySelector('[data-nav="register"]'));
const wform = document.getElementById("workerForm");
wform.querySelector('[name="name"]').value = "New Worker";
wform.querySelector('[name="phone"]').value = "9123456789";
wform.querySelector('[name="city"]').value = "Patna";
document.querySelector('#skillChips input[value="Cleaner"]').checked = true;
submit(wform);
assert(document.querySelector('[data-view="dashboard"]').hidden === false, "routed to dashboard after registration");
assert(Array.from(document.getElementById("workerSelect").options).some((o) => o.text.startsWith("New Worker")), "new worker appears in worker select");

// 11. Admin totals updated
click(document.querySelector('[data-nav="admin"]'));
assert(document.querySelectorAll("#adminWorkersTable tbody tr").length === 11, "admin shows 11 workers (10 seed + 1 new)");

// 12. SMS simulation flow
promptQueue = ["SMS Customer", "9111111111", "Plumber", "Patna"];
click(document.getElementById("simulateSmsBtn"));
click(document.querySelector('[data-nav="admin"]'));
adminRows = document.querySelectorAll("#adminBookingsTable tbody tr");
assert(adminRows.length === 2, "2 bookings after SMS simulation, got " + adminRows.length);
assert(adminRows[0].textContent.includes("sms"), "latest booking channel is sms");
assert(!!dom.window.__lastAlert && dom.window.__lastAlert.includes("Confirmed"), "SMS flow produced a confirmation alert");

// 13. Language toggle
const before = document.querySelector('[data-i18n="home.title"]').textContent;
click(document.getElementById("langToggle"));
const after = document.querySelector('[data-i18n="home.title"]').textContent;
assert(before !== after, "language toggle changes headline text");
click(document.getElementById("langToggle")); // back to EN

console.log("\nALL CHECKS PASSED");
