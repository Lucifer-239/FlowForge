const express = require("express");

const {
  createWorkflow,
  getWorkflows,
  getWorkflow,
  updateWorkflow,
  deleteWorkflow,
  toggleWorkflowStatus,
} = require("../controllers/workflowController");

const {
  executeWorkflow,
  getWorkflowExecutions,
} = require("../controllers/executionController");

const protect = require("../middleware/authMiddleware");

const router = express.Router();

// Create workflow
router.post("/", protect, createWorkflow);

// Get all workflows belonging to logged-in user
router.get("/", protect, getWorkflows);

// Get single workflow
router.get("/:id", protect, getWorkflow);

// Update workflow
router.put("/:id", protect, updateWorkflow);

// Delete workflow
router.delete("/:id", protect, deleteWorkflow);

// Toggle active/inactive status
router.patch("/:id/toggle-status", protect, toggleWorkflowStatus);

// Execute workflow
router.post("/:id/execute", protect, executeWorkflow);

// Get execution history for a workflow
router.get("/:id/executions", protect, getWorkflowExecutions);

module.exports = router;
