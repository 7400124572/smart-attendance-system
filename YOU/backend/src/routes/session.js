const express = require("express");
const AttendanceSession = require("../models/AttendanceSession");
const User = require("../models/User");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

function generateCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function computeExpiresAt(createdAt, minutes) {
  const ms = Number(minutes || 3) * 60 * 1000;
  return new Date(createdAt.getTime() + ms);
}

// POST /api/session/create (teacher)
router.post("/session/create", requireAuth, requireRole("teacher"), async (req, res, next) => {
  try {
    const durationMinutes = req.body?.durationMinutes ?? 3;
    const createdAt = new Date();
    const expiresAt = computeExpiresAt(createdAt, durationMinutes);

    const code = generateCode();
    const session = await AttendanceSession.create({
      code,
      teacherId: req.user._id,
      createdAt,
      expiresAt,
      presentStudents: [],
    });

    res.json({
      session: {
        id: session._id,
        code: session.code,
        teacherId: session.teacherId,
        createdAt: session.createdAt,
        expiresAt: session.expiresAt,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/session/:id (teacher) - live attendance list
router.get("/session/:id", requireAuth, requireRole("teacher"), async (req, res, next) => {
  try {
    const session = await AttendanceSession.findById(req.params.id)
      .populate("presentStudents", "_id name email")
      .lean();
    if (!session) return res.status(404).json({ error: "Session not found" });
    if (String(session.teacherId) !== String(req.user._id)) return res.status(403).json({ error: "Forbidden" });

    res.json({
      session: {
        id: session._id,
        code: session.code,
        teacherId: session.teacherId,
        createdAt: session.createdAt,
        expiresAt: session.expiresAt,
        presentStudents: session.presentStudents,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/session/:id/analytics (teacher)
router.get("/session/:id/analytics", requireAuth, requireRole("teacher"), async (req, res, next) => {
  try {
    const session = await AttendanceSession.findById(req.params.id).lean();
    if (!session) return res.status(404).json({ error: "Session not found" });
    if (String(session.teacherId) !== String(req.user._id)) return res.status(403).json({ error: "Forbidden" });

    const totalStudents = await User.countDocuments({ role: "student" });
    const present = (session.presentStudents || []).length;
    const absent = Math.max(totalStudents - present, 0);
    const percentage = totalStudents === 0 ? 0 : (present / totalStudents) * 100;

    res.json({
      analytics: {
        totalStudents,
        presentStudents: present,
        absentStudents: absent,
        attendancePercentage: Number(percentage.toFixed(2)),
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/session/join (student) - enter code
router.post("/session/join", requireAuth, requireRole("student"), async (req, res, next) => {
  try {
    const { code } = req.body || {};
    if (!code) return res.status(400).json({ error: "code is required" });
    const normalized = String(code).trim().toUpperCase();

    const session = await AttendanceSession.findOne({ code: normalized });
    if (!session) return res.status(404).json({ error: "Invalid code" });

    const now = new Date();
    if (now > session.expiresAt) return res.status(400).json({ error: "Session expired" });

    const already = (session.presentStudents || []).some((id) => String(id) === String(req.user._id));
    if (already) return res.status(409).json({ error: "Attendance already marked" });

    session.presentStudents.push(req.user._id);
    await session.save();

    res.json({
      session: {
        id: session._id,
        code: session.code,
        createdAt: session.createdAt,
        expiresAt: session.expiresAt,
      },
      message: "Attendance marked",
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

