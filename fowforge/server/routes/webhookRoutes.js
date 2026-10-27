const express = require("express");
const Workflow = require("../models/Workflow");
const Execution = require("../models/Execution");
const { addWorkflowJob } = require("../queues/workflowQueue");

const router = express.Router();

/**
 * Public Webhook Endpoint
 * POST /api/webhooks/:workflowId
 */
router.post("/:workflowId", async (req, res) => {
  try {
    const { workflowId } = req.params;
    const token = req.headers["x-workflow-token"] || req.query.token;

    const workflow = await Workflow.findById(workflowId);

    if (!workflow) {
      return res.status(404).json({
        success: false,
        message: "Workflow not found",
      });
    }

    if (workflow.status !== "active") {
      return res.status(403).json({
        success: false,
        message: "Workflow is not active. Webhook rejected.",
      });
    }

    // Optional token validation if token was provided in header/query
    if (workflow.webhookToken && token && token !== workflow.webhookToken) {
      return res.status(401).json({
        success: false,
        message: "Invalid webhook token",
      });
    }

    const payload = {
      body: req.body,
      query: req.query,
      headers: req.headers,
      receivedAt: new Date(),
    };

    const execution = await Execution.create({
      workflow: workflow._id,
      triggeredBy: "webhook",
      status: "pending",
      triggerData: payload,
    });

    const queueResult = await addWorkflowJob(
      execution._id.toString(),
      workflow._id.toString(),
      payload
    );

    return res.status(202).json({
      success: true,
      message: "Webhook event accepted and execution queued",
      executionId: execution._id,
      status: execution.status,
      queueType: queueResult.type,
    });
  } catch (err) {
    console.error("Webhook processing error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to process webhook event",
    });
  }
});

module.exports = router;
