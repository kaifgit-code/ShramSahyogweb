// ShramSahyog demo app — client-only, persisted to localStorage.
// Not a real backend: this simulates the product loop described in the pitch.

const STORE_KEY = "shramsahyog_v2";
const COOP_FEE_RATE = 0.05; // nominal cooperative fee

let state = loadState();
let currentWorkerId = sessionStorage.getItem("ss_current_worker") || "";

// ---------- persistence ----------
function loadState() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* fall through to seed */ }
  return seedState();
}

function seedState() {
  const workers = SEED_WORKERS.map((w, i) => ({ id: "w" + (i + 1), ...w }));
  const s = { workers, bookings: [], complaints: [], nextBookingId: 1 };
  localStorage.setItem(STORE_KEY, JSON.stringify(s));
  return s;
}

function save() {
  localStorage.setItem(STORE_KEY, JSON.stringify(state));
}

function toast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.add("toast--show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove("toast--show"), 2600);
}

// ---------- routing ----------
function showView(name) {
  document.querySelectorAll(".view").forEach((v) => {
    v.hidden = v.getAttribute("data-view") !== name;
  });
  document.querySelectorAll("[data-nav]").forEach((b) => {
    b.classList.toggle("is-active", b.getAttribute("data-nav") === name);
  });
  if (name === "dashboard") renderDashboard();
  if (name === "admin") renderAdmin();
  if (name === "support") renderComplaintList(lastComplaintPhone);
  try { window.scrollTo(0, 0); } catch (e) { /* not critical */ }
}

document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-nav]");
  if (btn) showView(btn.getAttribute("data-nav"));
});

// ---------- helpers ----------
function starString(rating) {
  const full = Math.round(rating);
  return "★".repeat(full) + "☆".repeat(5 - full);
}

function statusLabel(status) {
  return {
    requested: "Requested",
    confirmed: "Confirmed",
    completed: "Completed — awaiting payment",
    paid: "Paid — awaiting rating",
    rated: "Closed",
    declined: "Declined"
  }[status] || status;
}

function findWorker(id) {
  return state.workers.find((w) => w.id === id);
}

function kycBadge(w) {
  return w.kyc === "verified"
    ? '<span class="verified-tick" title="KYC verified">🛡️✓ Verified</span>'
    : '<span class="kyc-pending" title="KYC pending">KYC pending</span>';
}

// ---------- populate static selects ----------
function populateStaticFields() {
  const catSelect = document.getElementById("categorySelect");
  const citySelect = document.getElementById("citySelect");
  const workerCitySelect = document.getElementById("workerCitySelect");
  CATEGORIES.forEach((c) => catSelect.appendChild(new Option(c, c)));
  CITIES.forEach((c) => {
    citySelect.appendChild(new Option(c, c));
    workerCitySelect.appendChild(new Option(c, c));
  });

  const chipWrap = document.getElementById("skillChips");
  CATEGORIES.forEach((c) => {
    const id = "skill_" + c.replace(/\s+/g, "");
    const label = document.createElement("label");
    label.className = "chip";
    label.innerHTML = '<input type="checkbox" name="skills" value="' + c + '" id="' + id + '"><span>' + c + '</span>';
    chipWrap.appendChild(label);
  });
}

// ---------- SmartMatch ----------
function smartMatch(category, city, urgent) {
  const sameCity = state.workers.filter(
    (w) => w.available && w.skills.includes(category) && w.city === city
  );
  let pool = sameCity.length
    ? sameCity
    : state.workers.filter((w) => w.available && w.skills.includes(category));
  if (urgent) {
    // urgent: widen to every city, prioritise fastest-responding (highest rated) worker
    pool = state.workers.filter((w) => w.available && w.skills.includes(category));
  }
  return pool
    .sort((a, b) => (b.kyc === "verified") - (a.kyc === "verified") || b.rating - a.rating || b.completedJobs - a.completedJobs)
    .slice(0, 6);
}

function renderWorkerCard(w, opts) {
  opts = opts || {};
  const div = document.createElement("div");
  div.className = "worker-card";
  div.innerHTML =
    '<div class="worker-card__top">' +
      '<div><h4>' + w.name + '</h4><p class="muted">' + w.skills.join(", ") + ' · ' + w.city + '</p></div>' +
      '<div class="rating">' + starString(w.rating) + ' <span class="muted">' + w.rating.toFixed(1) + ' (' + w.ratingsCount + ')</span></div>' +
    '</div>' +
    '<p class="muted small">' + kycBadge(w) + ' · ' + (w.coop || "Independent cooperative member") + ' · ' + w.completedJobs + ' jobs completed</p>';

  if (opts.action) {
    const btn = document.createElement("button");
    btn.className = "btn btn--primary btn--small";
    btn.type = "button";
    btn.textContent = opts.actionLabel || "Request this worker";
    btn.addEventListener("click", () => opts.action(w));
    div.appendChild(btn);
  }
  return div;
}

// ---------- FIND A WORKER (customer request) ----------
document.getElementById("requestForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const f = e.target;
  const data = {
    customerName: f.elements.customerName.value.trim(),
    customerPhone: f.elements.customerPhone.value.trim(),
    category: f.elements.category.value,
    city: f.elements.city.value,
    preferredTime: f.elements.preferredTime.value.trim(),
    description: f.elements.description.value.trim(),
    urgent: f.elements.urgent.checked
  };
  const matches = smartMatch(data.category, data.city, data.urgent);
  const resultsWrap = document.getElementById("matchResults");
  const list = document.getElementById("matchList");
  list.innerHTML = "";

  if (!matches.length) {
    list.innerHTML = '<p class="muted">No available workers for ' + data.category + ' right now — try another category or city.</p>';
  } else {
    matches.forEach((w) => {
      list.appendChild(
        renderWorkerCard(w, {
          action: (worker) => createBooking(Object.assign({}, data, { workerId: worker.id, channel: "app" })),
          actionLabel: "Request this worker"
        })
      );
    });
  }
  resultsWrap.hidden = false;
  try { resultsWrap.scrollIntoView({ behavior: "smooth", block: "start" }); } catch (e) { /* not critical */ }
});

document.getElementById("emergencyBtn").addEventListener("click", () => {
  document.getElementById("urgentCheck").checked = true;
  showView("find");
  toast("Urgent request — SmartMatch will search every city for the fastest available worker.");
});

function createBooking(details) {
  const booking = {
    id: "b" + state.nextBookingId++,
    customerName: details.customerName,
    customerPhone: details.customerPhone,
    category: details.category,
    city: details.city,
    preferredTime: details.preferredTime || "",
    description: details.description || "",
    urgent: !!details.urgent,
    workerId: details.workerId,
    channel: details.channel || "app",
    status: "requested",
    amount: null,
    paymentMode: null,
    coopFee: null,
    workerPayout: null,
    rating: null,
    comment: null,
    createdAt: new Date().toISOString()
  };
  state.bookings.push(booking);
  save();
  const worker = findWorker(details.workerId);
  toast("Request sent to " + (worker ? worker.name : "worker") + ". Booking ID " + booking.id + ".");
  return booking;
}

// ---------- REGISTER AS WORKER ----------
document.getElementById("workerForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const f = e.target;
  const skills = Array.from(f.querySelectorAll('input[name="skills"]:checked')).map((i) => i.value);
  if (!skills.length) {
    toast("Pick at least one skill.");
    return;
  }
  const worker = {
    id: "w" + Date.now(),
    name: f.elements.name.value.trim(),
    phone: f.elements.phone.value.trim(),
    city: f.elements.city.value,
    coop: f.elements.coop.value.trim(),
    skills,
    kyc: f.elements.kyc.value,
    certificate: f.elements.certificate.value.trim(),
    rating: 5.0,
    ratingsCount: 0,
    completedJobs: 0,
    available: true
  };
  state.workers.push(worker);
  save();
  currentWorkerId = worker.id;
  sessionStorage.setItem("ss_current_worker", worker.id);
  toast("Welcome, " + worker.name + "! Your profile is live.");
  f.reset();
  populateWorkerSelect();
  document.getElementById("workerSelect").value = worker.id;
  showView("dashboard");
});

// ---------- WORKER DASHBOARD ----------
function populateWorkerSelect() {
  const sel = document.getElementById("workerSelect");
  sel.innerHTML = "";
  sel.appendChild(new Option("— choose a worker —", ""));
  state.workers.forEach((w) => sel.appendChild(new Option(w.name + " (" + w.city + ")", w.id)));
  if (currentWorkerId && findWorker(currentWorkerId)) sel.value = currentWorkerId;
}

document.getElementById("workerSelect").addEventListener("change", (e) => {
  currentWorkerId = e.target.value;
  sessionStorage.setItem("ss_current_worker", currentWorkerId);
  renderDashboard();
});

function renderDashboard() {
  populateWorkerSelect();
  const body = document.getElementById("workerDashboardBody");
  const worker = findWorker(currentWorkerId);
  if (!worker) {
    body.hidden = true;
    return;
  }
  body.hidden = false;

  document.getElementById("workerProfileCard").innerHTML =
    '<div class="avatar">' + worker.name.charAt(0) + '</div>' +
    '<div><h4 style="margin-bottom:4px;">' + worker.name + '</h4>' +
    '<p class="muted small">' + worker.city + ' · ' + worker.skills.join(", ") + '</p>' +
    '<p class="small" style="margin-top:4px;">' + kycBadge(worker) +
    (worker.certificate ? ' · Certificate: ' + worker.certificate : '') + '</p></div>';

  const myBookings = state.bookings.filter((b) => b.workerId === worker.id);
  const earnings = myBookings
    .filter((b) => b.workerPayout)
    .reduce((sum, b) => sum + b.workerPayout, 0);

  document.getElementById("workerStats").innerHTML =
    '<div class="stat-box"><span class="stat-box__num">' + worker.rating.toFixed(1) + '</span><span class="stat-box__label">Rating (' + worker.ratingsCount + ')</span></div>' +
    '<div class="stat-box"><span class="stat-box__num">' + worker.completedJobs + '</span><span class="stat-box__label">Jobs completed</span></div>' +
    '<div class="stat-box"><span class="stat-box__num">₹' + earnings.toFixed(0) + '</span><span class="stat-box__label">Total payout</span></div>';

  const requests = myBookings.filter((b) => b.status === "requested");
  const reqWrap = document.getElementById("workerRequests");
  reqWrap.innerHTML = "";
  if (!requests.length) reqWrap.innerHTML = '<p class="muted">No new requests right now.</p>';
  requests.forEach((b) => reqWrap.appendChild(bookingCard(b, { role: "worker" })));

  const jobs = myBookings.filter((b) => b.status !== "requested");
  const jobsWrap = document.getElementById("workerJobs");
  jobsWrap.innerHTML = "";
  if (!jobs.length) jobsWrap.innerHTML = '<p class="muted">Nothing here yet.</p>';
  jobs.slice().reverse().forEach((b) => jobsWrap.appendChild(bookingCard(b, { role: "worker" })));
}

// ---------- booking card (shared by worker + customer views) ----------
function bookingCard(b, opts) {
  const role = opts.role;
  const worker = findWorker(b.workerId);
  const div = document.createElement("div");
  div.className = "booking-card";

  div.innerHTML =
    '<div class="booking-card__head">' +
      '<div><strong>' + b.category + '</strong> · ' + b.city + (b.urgent ? ' <span class="badge badge--urgent">Urgent</span>' : '') +
      '<p class="muted small">Booking ' + b.id + ' · ' + (role === "worker" ? b.customerName : (worker ? worker.name : "—")) + ' · ' + new Date(b.createdAt).toLocaleDateString() + '</p></div>' +
      '<span class="badge badge--' + b.status + '">' + statusLabel(b.status) + '</span>' +
    '</div>' +
    (b.description ? '<p class="muted small">"' + b.description + '"</p>' : "") +
    '<div class="booking-card__actions"></div>';

  const actions = div.querySelector(".booking-card__actions");

  if (role === "worker" && b.status === "requested") {
    addBtn(actions, "Accept", "primary", () => {
      b.status = "confirmed";
      save();
      renderDashboard();
      toast("Job accepted. It now shows under active jobs.");
    });
    addBtn(actions, "Decline", "ghost", () => {
      b.status = "declined";
      save();
      renderDashboard();
    });
  }

  if (role === "worker" && b.status === "confirmed") {
    addBtn(actions, "Mark job completed", "primary", () => {
      b.status = "completed";
      save();
      renderDashboard();
      toast("Marked completed. Customer can now pay.");
    });
  }

  if (role === "customer" && b.status === "completed") {
    div.appendChild(paymentForm(b));
  }

  if (role === "customer" && b.status === "paid") {
    div.appendChild(ratingForm(b));
  }

  if (b.status === "rated" && b.rating) {
    const p = document.createElement("p");
    p.className = "muted small";
    p.textContent = "You rated this " + b.rating + "/5" + (b.comment ? ' — "' + b.comment + '"' : "") + ".";
    div.appendChild(p);
  }

  if ((b.status === "paid" || b.status === "rated") && b.amount) {
    const p = document.createElement("p");
    p.className = "muted small";
    p.textContent = "Invoice: ₹" + b.amount + " paid via " + b.paymentMode + " · cooperative fee ₹" + b.coopFee.toFixed(0) + " · worker payout ₹" + b.workerPayout.toFixed(0) + ".";
    div.appendChild(p);
  }

  return div;
}

function addBtn(container, label, kind, onClick) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "btn btn--" + kind + " btn--small";
  btn.textContent = label;
  btn.addEventListener("click", onClick);
  container.appendChild(btn);
}

function paymentForm(b) {
  const wrap = document.createElement("form");
  wrap.className = "inline-form";
  wrap.innerHTML =
    '<label class="small">Amount (₹)<input type="number" min="1" name="amount" required></label>' +
    '<label class="small">Pay via<select name="mode"><option value="UPI">UPI</option><option value="Cash">Cash</option></select></label>' +
    '<button class="btn btn--primary btn--small" type="submit">Pay &amp; get invoice</button>';
  wrap.addEventListener("submit", (e) => {
    e.preventDefault();
    const amount = parseFloat(wrap.elements.amount.value);
    if (!amount || amount <= 0) return;
    const coopFee = amount * COOP_FEE_RATE;
    b.amount = amount;
    b.paymentMode = wrap.elements.mode.value;
    b.coopFee = coopFee;
    b.workerPayout = amount - coopFee;
    b.status = "paid";
    const worker = findWorker(b.workerId);
    if (worker) worker.completedJobs += 1;
    save();
    renderCustomerBookings(b.customerPhone);
    toast("Payment recorded. Invoice generated.");
  });
  return wrap;
}

function ratingForm(b) {
  const wrap = document.createElement("form");
  wrap.className = "inline-form";
  wrap.innerHTML =
    '<label class="small">Rate this worker<select name="stars">' +
      '<option value="5">★★★★★ Excellent</option>' +
      '<option value="4">★★★★☆ Good</option>' +
      '<option value="3">★★★☆☆ Okay</option>' +
      '<option value="2">★★☆☆☆ Poor</option>' +
      '<option value="1">★☆☆☆☆ Very poor</option>' +
    '</select></label>' +
    '<label class="small">Comment (optional)<input type="text" name="comment" placeholder="Punctual, tidy work"></label>' +
    '<button class="btn btn--primary btn--small" type="submit">Submit rating</button>';
  wrap.addEventListener("submit", (e) => {
    e.preventDefault();
    const stars = parseInt(wrap.elements.stars.value, 10);
    b.rating = stars;
    b.comment = wrap.elements.comment.value.trim();
    b.status = "rated";
    const worker = findWorker(b.workerId);
    if (worker) {
      const totalPoints = worker.rating * worker.ratingsCount + stars;
      worker.ratingsCount += 1;
      worker.rating = totalPoints / worker.ratingsCount;
    }
    save();
    renderCustomerBookings(b.customerPhone);
    toast("Thanks for rating — this updates the worker's public score.");
  });
  return wrap;
}

// ---------- MY BOOKINGS (customer lookup) ----------
document.getElementById("lookupForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const phone = document.getElementById("lookupPhone").value.trim();
  renderCustomerBookings(phone);
});

function renderCustomerBookings(phone) {
  const wrap = document.getElementById("customerBookings");
  wrap.innerHTML = "";
  const mine = state.bookings.filter((b) => b.customerPhone === phone);
  if (!mine.length) {
    wrap.innerHTML = '<p class="muted">No bookings found for that number yet.</p>';
    return;
  }
  mine.slice().reverse().forEach((b) => wrap.appendChild(bookingCard(b, { role: "customer" })));
}

// ---------- SMS / IVR SIMULATION ----------
document.getElementById("simulateSmsBtn").addEventListener("click", () => {
  const name = prompt("SMS: What's your name?");
  if (!name) return;
  const phone = prompt("SMS: Your 10-digit phone number?");
  if (!phone) return;
  const category = prompt("SMS: What service do you need? (" + CATEGORIES.join(", ") + ")", "Electrician");
  if (!category) return;
  const city = prompt("SMS: Which city? (" + CITIES.join(", ") + ")", CITIES[0]);
  if (!city) return;

  const matches = smartMatch(category, city, false);
  if (!matches.length) {
    toast("SMS reply: Sorry, no " + category + " available near " + city + " right now.");
    return;
  }
  const worker = matches[0];
  createBooking({ customerName: name, customerPhone: phone, category, city, channel: "sms", workerId: worker.id });
  const b = state.bookings[state.bookings.length - 1];
  b.status = "confirmed";
  save();
  alert("SMS reply: Confirmed! " + worker.name + " (" + worker.rating.toFixed(1) + "★, " + worker.city + ") will contact you at " + phone + ". Booking ID " + b.id + ".");
});

// ---------- SUPPORT / COMPLAINTS ----------
let lastComplaintPhone = "";

document.getElementById("complaintForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const f = e.target;
  const complaint = {
    id: "c" + Date.now(),
    phone: f.elements.phone.value.trim(),
    type: f.elements.type.value,
    text: f.elements.text.value.trim(),
    status: "open",
    createdAt: new Date().toISOString()
  };
  state.complaints.push(complaint);
  save();
  lastComplaintPhone = complaint.phone;
  f.reset();
  renderComplaintList(complaint.phone);
  toast("Complaint submitted. Our support team will review it.");
});

function renderComplaintList(phone) {
  const wrap = document.getElementById("complaintList");
  if (!wrap) return;
  const mine = phone ? state.complaints.filter((c) => c.phone === phone) : [];
  wrap.innerHTML = "";
  if (!mine.length) {
    wrap.innerHTML = '<p class="muted">No complaints filed yet from this session.</p>';
    return;
  }
  mine.slice().reverse().forEach((c) => {
    const div = document.createElement("div");
    div.className = "support-item";
    div.innerHTML =
      "<b>" + c.type + ' <span class="badge badge--' + c.status + '">' + c.status + "</span></b>" +
      '<p class="muted small">' + c.text + "</p>";
    wrap.appendChild(div);
  });
}

// ---------- ADMIN ----------
function renderAdmin() {
  const totalFees = state.bookings.reduce((sum, b) => sum + (b.coopFee || 0), 0);
  const byStatus = {};
  state.bookings.forEach((b) => (byStatus[b.status] = (byStatus[b.status] || 0) + 1));

  document.getElementById("adminStats").innerHTML =
    '<div class="stat-box"><span class="stat-box__num">' + state.workers.length + '</span><span class="stat-box__label">Registered workers</span></div>' +
    '<div class="stat-box"><span class="stat-box__num">' + state.bookings.length + '</span><span class="stat-box__label">Total bookings</span></div>' +
    '<div class="stat-box"><span class="stat-box__num">₹' + totalFees.toFixed(0) + '</span><span class="stat-box__label">Cooperative fund collected</span></div>' +
    '<div class="stat-box"><span class="stat-box__num">' + (byStatus.rated || 0) + '</span><span class="stat-box__label">Jobs closed &amp; rated</span></div>';

  const wTable = document.getElementById("adminWorkersTable");
  wTable.querySelector("thead").innerHTML = "<tr><th>Name</th><th>City</th><th>Skills</th><th>KYC</th><th>Rating</th><th>Jobs</th></tr>";
  wTable.querySelector("tbody").innerHTML = state.workers
    .map((w) => "<tr><td>" + w.name + "</td><td>" + w.city + "</td><td>" + w.skills.join(", ") + "</td><td>" + (w.kyc === "verified" ? "✓ Verified" : "Pending") + "</td><td>" + w.rating.toFixed(1) + " (" + w.ratingsCount + ")</td><td>" + w.completedJobs + "</td></tr>")
    .join("");

  const bTable = document.getElementById("adminBookingsTable");
  bTable.querySelector("thead").innerHTML = "<tr><th>ID</th><th>Category</th><th>City</th><th>Worker</th><th>Status</th><th>Channel</th></tr>";
  bTable.querySelector("tbody").innerHTML = state.bookings
    .slice()
    .reverse()
    .map((b) => {
      const w = findWorker(b.workerId);
      return "<tr><td>" + b.id + "</td><td>" + b.category + (b.urgent ? " 🚨" : "") + "</td><td>" + b.city + "</td><td>" + (w ? w.name : "—") + "</td><td>" + statusLabel(b.status) + "</td><td>" + b.channel + "</td></tr>";
    })
    .join("");

  const cTable = document.getElementById("adminComplaintsTable");
  cTable.querySelector("thead").innerHTML = "<tr><th>ID</th><th>Phone</th><th>Type</th><th>Status</th></tr>";
  cTable.querySelector("tbody").innerHTML = state.complaints
    .slice()
    .reverse()
    .map((c) => "<tr><td>" + c.id + "</td><td>" + c.phone + "</td><td>" + c.type + "</td><td>" + c.status + "</td></tr>")
    .join("") || "<tr><td colspan='4' class='muted'>No complaints yet.</td></tr>";
}

document.getElementById("resetDemoBtn").addEventListener("click", () => {
  if (!confirm("Reset all demo workers and bookings?")) return;
  state = seedState();
  currentWorkerId = "";
  sessionStorage.removeItem("ss_current_worker");
  renderAdmin();
  populateWorkerSelect();
  toast("Demo data reset.");
});

// ---------- init ----------
populateStaticFields();
populateWorkerSelect();
showView("home");
