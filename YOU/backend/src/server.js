import mongoose from "mongoose";

mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("MongoDB Connected"))
.catch(err => console.log(err));
require("dotenv").config();

const cors = require("cors");
const express = require("express");
const morgan = require("morgan");

const authRoutes = require("./routes/auth");
const pollRoutes = require("./routes/poll");
const sessionRoutes = require("./routes/session");
const studentRoutes = require("./routes/student");
const { notFound, errorHandler } = require("./utils/errors");
const { connectDb } = require("./utils/connectDb");

const app = express();
const port = Number(process.env.PORT || 5000);
const corsOrigin = process.env.CORS_ORIGIN || "http://localhost:5173";

app.use(cors({ origin: corsOrigin }));
app.use(express.json());
app.use(morgan("dev"));

app.get("/api/health", (req, res) => {
  res.json({ ok: true, message: "Smart Attendance API is running" });
});

app.use("/api", authRoutes);
app.use("/api", pollRoutes);
app.use("/api", sessionRoutes);
app.use("/api", studentRoutes);

app.use(notFound);
app.use(errorHandler);

app.get("/", (req, res) => {
  res.send("🚀 Smart Attendance System Backend is Live");
});

async function startServer() {
  if (!process.env.JWT_SECRET) {
    throw new Error("Missing JWT_SECRET in environment");
  }

  await connectDb();
  app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start server:", error.message);
  process.exit(1);
});
