let currentDate = new Date();
let events = []; // in-browser list used for rendering

// ---------- Optional: persist test data locally ----------
function saveLocal() {
  try { localStorage.setItem("cert_events", JSON.stringify(events)); } catch {}
}
function loadLocal() {
  try {
    const raw = localStorage.getItem("cert_events");
    if (raw) events = JSON.parse(raw).map(e => ({ ...e, expiry: new Date(e.expiry) }));
  } catch {}
}
// --------------------------------------------------------

// Send current events to the server so the ICS feed stays fresh
async function syncToServer() {
  try {
    // Send ISO strings for stable server storage
    const payload = events.map(e => ({
      user: e.user,
      name: e.name,
      expiry: new Date(e.expiry).toISOString().split("T")[0]  // YYYY-MM-DD (date only)
    }));
    await fetch("/api/update-events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  } catch (e) {
    console.warn("Could not sync to server:", e.message);
  }
}

// Build calendar
function generateCalendar() {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  document.getElementById("monthYear").textContent =
    currentDate.toLocaleString("default", { month: "long", year: "numeric" });

  const grid = document.getElementById("calendarGrid");
  grid.innerHTML = "";

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Blank days
  for (let i = 0; i < firstDay; i++) {
    grid.innerHTML += `<div class="day empty"></div>`;
  }

  // Days
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);

    const expiring = events.filter(e => sameDay(new Date(e.expiry), date));

    let classes = "day";
    let labels = "";

    if (expiring.length > 0) {
      classes += " expiry";
      labels = expiring.map(e => `
        <div class="user-name">${e.user}</div>
        <div class="cert-name">${e.name}</div>
      `).join("");
    }

    grid.innerHTML += `
      <div class="${classes}">
        <div class="day-number">${day}</div>
        ${labels}
      </div>
    `;
  }
}

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth() === b.getMonth() &&
         a.getDate() === b.getDate();
}

// Navigation buttons
document.getElementById("prevMonth").onclick = () => {
  currentDate.setMonth(currentDate.getMonth() - 1);
  generateCalendar();
};
document.getElementById("nextMonth").onclick = () => {
  currentDate.setMonth(currentDate.getMonth() + 1);
  generateCalendar();
};

// ------------------------------------------------------
// Add Certificate Popup
// ------------------------------------------------------
const popup = document.getElementById("popup");
document.getElementById("addButton").onclick = () => (popup.style.display = "block");
document.getElementById("closePopup").onclick = () => (popup.style.display = "none");

document.getElementById("saveCert").onclick = async () => {
  const user = document.getElementById("userName").value.trim();
  const name = document.getElementById("certName").value.trim();
  const dateStr = document.getElementById("certDate").value; // YYYY-MM-DD

  if (!user || !name || !dateStr) {
    alert("Please fill out all fields.");
    return;
  }

  // Store as a Date based on the plain date (no time)
  const [y, m, d] = dateStr.split("-").map(Number);
  const expiry = new Date(y, m - 1, d);

  events.push({ user, name, expiry });

  saveLocal();       // optional
  await syncToServer(); // <-- pushes to backend so ICS updates

  popup.style.display = "none";
  document.getElementById("userName").value = "";
  document.getElementById("certName").value = "";
  document.getElementById("certDate").value = "";

  generateCalendar();
};

// Initial load
loadLocal();          // optional
generateCalendar();
