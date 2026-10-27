const express = require("express");
const protect = require("../middleware/authMiddleware");
const {
  getExecutionDetails,
  retryExecution,
  getSystemAnalytics,
} = require("../controllers/executionController");

const router = express.Router();

// System Analytics Metrics Overview
router.get("/analytics/overview", protect, getSystemAnalytics);

// Get single execution details & logs
router.get("/:executionId", protect, getExecutionDetails);

// Retry an execution
router.post("/:executionId/retry", protect, retryExecution);

module.exports = router;


