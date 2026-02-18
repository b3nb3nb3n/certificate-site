const express = require("express");
const crypto = require("crypto");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Serve your front end files
app.use(express.static(path.join(__dirname, "public")));

let events = []; // Server-side storage for certificate expiry events

// Format date for ICS standard
function formatICSDate(d) {
    const pad = (n) => String(n).padStart(2, "0");
    return (
        d.getUTCFullYear() +
        pad(d.getUTCMonth() + 1) +
        pad(d.getUTCDate()) +
        "T" +
        pad(d.getUTCHours()) +
        pad(d.getUTCMinutes()) +
        pad(d.getUTCSeconds()) +
        "Z"
    );
}

// Generate ICS file content
function generateICS(list) {
    let ics = "BEGIN:VCALENDAR\nVERSION:2.0\nCALSCALE:GREGORIAN\nMETHOD:PUBLISH\n";

    list.forEach((e) => {
        const dt = new Date(e.expiry);
        const dtstamp = formatICSDate(dt);
        const uid = crypto.randomUUID();

        ics += "BEGIN:VEVENT\n";
        ics += `UID:${uid}\n`;
        ics += `DTSTAMP:${dtstamp}\n`;
        ics += `DTSTART:${dtstamp}\n`;
        ics += `DTEND:${dtstamp}\n`;
        ics += `SUMMARY:${e.user} – ${e.name} Expires\n`;
        ics += `DESCRIPTION:Certificate for ${e.user} (${e.name}) expires today.\n`;
        ics += "END:VEVENT\n";
    });

    ics += "END:VCALENDAR";
    return ics;
}

// API for the front-end to sync events
app.post("/api/update-events", (req, res) => {
    events = req.body;
    res.json({ message: "Events updated", count: events.length });
});

// ICS endpoint for Outlook
app.get("/certificate-calendar.ics", (req, res) => {
    const ics = generateICS(events);
    res.setHeader("Content-Type", "text/calendar");
    res.send(ics);
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});