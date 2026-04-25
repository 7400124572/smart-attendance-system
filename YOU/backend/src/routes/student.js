const express = require("express");
const AttendanceSession = require("../models/AttendanceSession");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

// GET /api/student/attendance (student)
router.get("/student/attendance", requireAuth, requireRole("student"), async (req, res, next) => {
  try {
    const sessions = await AttendanceSession.find({ presentStudents: req.user._id })
      .select("_id code createdAt expiresAt teacherId")
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      history: sessions.map((s) => ({
        id: s._id,
        code: s.code,
        createdAt: s.createdAt,
        expiresAt: s.expiresAt,
        teacherId: s.teacherId,
      })),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

