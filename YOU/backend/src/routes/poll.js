const express = require("express");
const Poll = require("../models/Poll");
const AttendanceSession = require("../models/AttendanceSession");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

// POST /api/poll/create (teacher)
router.post("/poll/create", requireAuth, requireRole("teacher"), async (req, res, next) => {
  try {
    const { sessionId, question, options, type } = req.body || {};
    if (!sessionId || !question) return res.status(400).json({ error: "sessionId and question are required" });

    const session = await AttendanceSession.findById(sessionId).lean();
    if (!session) return res.status(404).json({ error: "Session not found" });
    if (String(session.teacherId) !== String(req.user._id)) return res.status(403).json({ error: "Forbidden" });

    let finalOptions = Array.isArray(options) ? options.map(String) : [];
    if (type === "yesno") finalOptions = ["Yes", "No"];
    if (!finalOptions.length) return res.status(400).json({ error: "options are required (or type=yesno)" });

    const poll = await Poll.create({
      sessionId,
      teacherId: req.user._id,
      question,
      options: finalOptions,
      responses: [],
      active: true,
    });

    res.json({
      poll: {
        id: poll._id,
        sessionId: poll.sessionId,
        question: poll.question,
        options: poll.options,
        active: poll.active,
        createdAt: poll.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/poll/session/:sessionId (teacher or student) - fetch active polls for session
router.get("/poll/session/:sessionId", requireAuth, async (req, res, next) => {
  try {
    const polls = await Poll.find({ sessionId: req.params.sessionId, active: true })
      .select("_id sessionId question options active createdAt")
      .sort({ createdAt: -1 })
      .lean();
    res.json({ polls: polls.map((p) => ({ ...p, id: p._id })) });
  } catch (err) {
    next(err);
  }
});

// POST /api/poll/answer (student)
router.post("/poll/answer", requireAuth, requireRole("student"), async (req, res, next) => {
  try {
    const { pollId, selected } = req.body || {};
    if (!pollId || !selected) return res.status(400).json({ error: "pollId and selected are required" });

    const poll = await Poll.findById(pollId);
    if (!poll) return res.status(404).json({ error: "Poll not found" });
    if (!poll.active) return res.status(400).json({ error: "Poll is closed" });
    if (!poll.options.includes(String(selected))) return res.status(400).json({ error: "Invalid option" });

    const already = poll.responses.some((r) => String(r.studentId) === String(req.user._id));
    if (already) return res.status(409).json({ error: "Already answered" });

    poll.responses.push({ studentId: req.user._id, selected: String(selected) });
    await poll.save();

    res.json({ message: "Answer recorded" });
  } catch (err) {
    next(err);
  }
});

// GET /api/poll/:id/results (teacher)
router.get("/poll/:id/results", requireAuth, requireRole("teacher"), async (req, res, next) => {
  try {
    const poll = await Poll.findById(req.params.id).lean();
    if (!poll) return res.status(404).json({ error: "Poll not found" });
    if (String(poll.teacherId) !== String(req.user._id)) return res.status(403).json({ error: "Forbidden" });

    const counts = {};
    for (const opt of poll.options) counts[opt] = 0;
    for (const r of poll.responses) {
      if (counts[r.selected] !== undefined) counts[r.selected] += 1;
    }

    res.json({
      results: {
        pollId: poll._id,
        question: poll.question,
        options: poll.options,
        counts,
        totalResponses: poll.responses.length,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

