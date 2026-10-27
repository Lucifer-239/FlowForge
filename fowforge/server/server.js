const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const dotenv = require("dotenv");
const connectDB = require("./config/database");

dotenv.config();

console.log("JWT_SECRET loaded:", !!process.env.JWT_SECRET);
console.log("JWT_EXPIRES_IN:", process.env.JWT_EXPIRES_IN);

const app = express();

const PORT = process.env.PORT || 5000;

// -----------------------------
// Security Middleware
// -----------------------------

app.use(helmet());

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json({ limit: "2mb" }));

// Rate Limiting: General API limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // 300 requests per 15 min
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests from this IP, please try again after 15 minutes",
  },
});

// Stricter Rate Limiter for Auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30, // 30 requests per 15 min
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many authentication attempts, please try again later",
  },
});

app.use("/api/", apiLimiter);
app.use("/api/auth", authLimiter);

const authRoutes = require("./routes/authRoutes");
const workflowRoutes = require("./routes/workflowRoutes");
const executionRoutes = require("./routes/executionRoutes");
const webhookRoutes = require("./routes/webhookRoutes");

app.use("/api/auth", authRoutes);
app.use("/api/workflows", workflowRoutes);
app.use("/api/executions", executionRoutes);
app.use("/api/webhooks", webhookRoutes);

// -----------------------------
// Health Check
// -----------------------------

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "FlowForge API is running",
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Backend connected successfully",
  });
});

// -----------------------------
// Global Error Handler
// -----------------------------

app.use((err, req, res, next) => {
  console.error("Unhandled Error:", err.stack || err.message);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal server error",
  });
});

// -----------------------------
// Start Server
// -----------------------------

const { initWorkflowWorker } = require("./workers/workflowWorker");
const { initScheduler } = require("./services/schedulerService");

const startServer = async () => {
  try {
    await connectDB();
    initWorkflowWorker();
    await initScheduler();

    app.listen(PORT, () => {
      console.log("-----------------------------------");
      console.log("FlowForge Backend");
      console.log("-----------------------------------");
      console.log(`Server running on port ${PORT}`);
      console.log(`http://localhost:${PORT}`);
      console.log("-----------------------------------");
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
};

startServer();
