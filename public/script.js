let currentDate = new Date();
let events = [];

// Load ICS file and parse expiry dates
async function loadICS() {
    const res = await fetch("calendar.ics");
    const text = await res.text();

    const blocks = text.split("BEGIN:VEVENT").slice(1);

    events = blocks.map(block => {
        return {
            name: getField(block, "SUMMARY"),
            user: getField(block, "DESCRIPTION") || "Unknown User",
            expiry: new Date(getField(block, "DTEND"))
        };
    });

    generateCalendar();
}

// Extract ICS fields
function getField(text, field) {
    const line = text.split("\n").find(l => l.startsWith(field));
    return line ? line.replace(field + ":", "").trim() : "";
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

    // Blank days for alignment
    for (let i = 0; i < firstDay; i++) {
        grid.innerHTML += `<div class="day empty"></div>`;
    }

    // Days
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);

        const expiring = events.filter(e =>
            e.expiry.getFullYear() === date.getFullYear() &&
            e.expiry.getMonth() === date.getMonth() &&
            e.expiry.getDate() === date.getDate()
        );

        let classes = "day";
        let labels = "";

        if (expiring.length > 0) {
            classes += " expiry";
            labels = expiring
    .map(e => `
        <div class="user-name">${e.user}</div>
        <div class="cert-name">${e.name}</div>
    `)
    .join("");
        }

        grid.innerHTML += `
            <div class="${classes}">
                <div class="day-number">${day}</div>
                ${labels}
            </div>
        `;
    }
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
document.getElementById("addButton").onclick = () => popup.style.display = "block";
document.getElementById("closePopup").onclick = () => popup.style.display = "none";

// Save certificate
document.getElementById("saveCert").onclick = () => {
    const user = document.getElementById("userName").value;
    const name = document.getElementById("certName").value;
    const date = document.getElementById("certDate").value;

    if (!user || !name || !date) {
        alert("Please fill out all fields.");
        return;
    }

    events.push({
        user: user,
        name: name,
        expiry: new Date(date)
    });

    popup.style.display = "none";

    document.getElementById("userName").value = "";
    document.getElementById("certName").value = "";
    document.getElementById("certDate").value = "";

    generateCalendar();
};

loadICS();

function generateICS(events) {
    let ics = "BEGIN:VCALENDAR\nVERSION:2.0\nCALSCALE:GREGORIAN\nMETHOD:PUBLISH\n";

    events.forEach(e => {
        const dt = e.expiry;
        const dtstamp = dt.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

        ics += "BEGIN:VEVENT\n";
        ics += `SUMMARY:${e.user} – ${e.name} Certificate Expiry\n`;
        ics += `DTSTART:${dtstamp}\n`;
        ics += `DTEND:${dtstamp}\n`;
        ics += `DESCRIPTION:Certificate for ${e.user} (${e.name}) expires today.\n`;
        ics += `UID:${crypto.randomUUID()}@certs.local\n`;
        ics += "END:VEVENT\n";
    });

    ics += "END:VCALENDAR";

    return ics;
}

document.getElementById("downloadICS").onclick = () => {
    const icsData = generateICS(events);
    const blob = new Blob([icsData], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "certificate-expiry.ics";
    a.click();
};

function generateICS(events) {
    let ics = "BEGIN:VCALENDAR\nVERSION:2.0\nCALSCALE:GREGORIAN\nMETHOD:PUBLISH\n";

    events.forEach(e => {
        const dt = e.expiry;
        const dtstamp = dt.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

        ics += "BEGIN:VEVENT\n";
        ics += `SUMMARY:${e.user} – ${e.name} Certificate Expiry\n`;
        ics += `DTSTART:${dtstamp}\n`;
        ics += `DTEND:${dtstamp}\n`;
        ics += `DESCRIPTION:Certificate for ${e.user} (${e.name}) expires today.\n`;
        ics += `UID:${crypto.randomUUID()}@certs.local\n`;
        ics += "END:VEVENT\n";
    });

    ics += "END:VCALENDAR";
    return ics;
}

const express = require("express");
const app = express();
const crypto = require("crypto");
const PORT = 3000;


app.get("/certificate-calendar.ics", (req, res) => {
    const ics = generateICS(events);

    res.setHeader("Content-Type", "text/calendar");
    res.setHeader("Content-Disposition", "attachment; filename=certificate-calendar.ics");
    res.send(ics);
});

// Serve front-end files
app.use(express.static("public"));

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));

async function syncToServer() {
    await fetch("/api/update-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(events)
    });
}

events.push({
    user: user,
    name: name,
    expiry: new Date(date)
});

syncToServer();   // <‑‑ add this
generateCalendar();

app.use(express.json());

app.post("/api/update-events", (req, res) => {
    events = req.body.map(e => ({
        user: e.user,
        name: e.name,
        expiry: new Date(e.expiry)
    }));
    
    res.json({ status: "OK" });
});
