const mongoose = require("mongoose");

const AttendanceSessionSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, index: true },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    createdAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true, index: true },
    presentStudents: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }]
  },
  { timestamps: false }
);

AttendanceSessionSchema.index({ code: 1, expiresAt: 1 });

module.exports = mongoose.model("AttendanceSession", AttendanceSessionSchema);

