// server.js - Express Server, Data Models, & API Routes
const express = require('express');
const mongoose = require('mongoose');

const app = express();
app.use(express.json());
app.use(express.static('public'));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/unbound_minds');

// --- DATABASE SCHEMAS ---
const userSchema = new mongoose.Schema({
  displayName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  role: { type: String, enum: ['member', 'guest_facilitator', 'facilitator', 'moderator', 'admin'], default: 'member' },
  preferences: { notificationsEmail: Boolean, notificationsInApp: Boolean },
  identityInterests: [String]
}, { timestamps: true });

const sessionSchema = new mongoose.Schema({
  title: String,
  topic: String,
  description: String,
  scheduledAt: Date,
  isPublished: { type: Boolean, default: true }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);
const Session = mongoose.model('Session', sessionSchema);

// --- API ENDPOINTS ---
// 1. Fetch Calendar Events
app.get('/api/events', async (req, res) => {
  try {
    const sessions = await Session.find({ isPublished: true });
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Generate Downloadable .ICS Calendar File
app.get('/api/events/:id/export.ics', async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) return res.status(404).send('Session not found');

    const startDate = new Date(session.scheduledAt);
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
    const formatDate = (d) => d.toISOString().replace(/-|:|\.\d+/g, '');

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Unbound Minds//EN',
      'BEGIN:VEVENT',
      `SUMMARY:${session.title}`,
      `DESCRIPTION:${session.description}`,
      `DTSTART:${formatDate(startDate)}`,
      `DTEND:${formatDate(endDate)}`,
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    res.setHeader('Content-Type', 'text/calendar');
    res.setHeader('Content-Disposition', `attachment; filename="event-${session._id}.ics"`);
    res.send(icsContent);
  } catch (err) {
    res.status(500).send('Error generating calendar file');
  }
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
