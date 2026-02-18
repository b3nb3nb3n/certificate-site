const express = require("express");
const crypto = require("crypto");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Serve your front end files
app.use(express.static(path.join(__dirname, "public")));

let events = []; // Server-side storage for certificate expiry events

// ---- Helpers for ICS ----
const pad2 = (n) => String(n).padStart(2, "0");

function formatICSDateYMD_local(d) {
  // Use local date parts to avoid timezone shifting the day
  return `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}`;
}

function formatDTSTAMP_utc(now = new Date()) {
  // DTSTAMP uses UTC timestamp
  return `${now.getUTCFullYear()}${pad2(now.getUTCMonth() + 1)}${pad2(now.getUTCDate())}T${pad2(
    now.getUTCHours()
  )}${pad2(now.getUTCMinutes())}${pad2(now.getUTCSeconds())}Z`;
}

// Generate ICS file content
function generateICS(list) {
  let ics = "BEGIN:VCALENDAR\nVERSION:2.0\nCALSCALE:GREGORIAN\nMETHOD:PUBLISH\nPRODID:-//Certificate Expiry//EN\n";

  const dtstamp = formatDTSTAMP_utc();

  list.forEach((e) => {
    const expiry = new Date(e.expiry);

    // All‑day event on the expiry date.
    const startYMD = formatICSDateYMD_local(expiry);

    // For all‑day events, DTEND is the *next day* (exclusive end)
    const nextDay = new Date(expiry);
    nextDay.setDate(nextDay.getDate() + 1);
    const endYMD = formatICSDateYMD_local(nextDay);

    const uid = (e.uid) || (crypto.randomUUID() + "@certs.local");
    const summary = `${e.user ? e.user + " – " : ""}${e.name} Expires`;
    const description = `Certificate ${e.name}${e.user ? ` for ${e.user}` : ""} expires on ${expiry.toDateString()}.`;

    ics += "BEGIN:VEVENT\n";
    ics += `UID:${uid}\n`;
    ics += `DTSTAMP:${dtstamp}\n`;
    ics += `SUMMARY:${summary}\n`;
    ics += `DESCRIPTION:${description}\n`;
    ics += `DTSTART;VALUE=DATE:${startYMD}\n`;
    ics += `DTEND;VALUE=DATE:${endYMD}\n`;
    // Two reminders: 7 days and 1 day before
    ics += "BEGIN:VALARM\nTRIGGER:-P7D\nACTION:DISPLAY\nDESCRIPTION:Certificate expires in 7 days\nEND:VALARM\n";
    ics += "BEGIN:VALARM\nTRIGGER:-P1D\nACTION:DISPLAY\nDESCRIPTION:Certificate expires tomorrow\nEND:VALARM\n";
    ics += "END:VEVENT\n";
  });

  ics += "END:VCALENDAR";
  return ics;
}

// API for the front-end to sync events
app.post("/api/update-events", (req, res) => {
  // Expecting an array of { user, name, expiry }
  events = (req.body || []).map(e => ({
    user: e.user || "",
    name: e.name || "",
    expiry: e.expiry,    // keep as ISO string; we convert when generating ICS
  }));
  res.json({ message: "Events updated", count: events.length });
});

// ICS endpoint for Outlook (and for manual download)
app.get("/certificate-calendar.ics", (req, res) => {
  const ics = generateICS(events);
  res.setHeader("Content-Type", "text/calendar; charset=utf-8");
  res.setHeader("Content-Disposition", "inline; filename=certificate-calendar.ics");
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.send(ics);
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
  console.log(`ICS feed at /certificate-calendar.ics`);
});
