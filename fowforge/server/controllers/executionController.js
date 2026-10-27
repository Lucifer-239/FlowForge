const Execution = require("../models/Execution");
const Workflow = require("../models/Workflow");
const { addWorkflowJob } = require("../queues/workflowQueue");

/**
 * Execute a workflow asynchronously using Queue
 * POST /api/workflows/:id/execute
 */
const executeWorkflow = async (req, res) => {
  try {
    const { id } = req.params;
    const { triggerData = {} } = req.body;

    const workflow = await Workflow.findOne({
      _id: id,
      owner: req.user.id,
    });

    if (!workflow) {
      return res.status(404).json({
        success: false,
        message: "Workflow not found",
      });
    }

    if (!workflow.nodes || workflow.nodes.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Workflow has no nodes to execute",
      });
    }

    // 1. Create Execution record in 'pending' state
    const execution = await Execution.create({
      workflow: workflow._id,
      triggeredBy: "manual",
      status: "pending",
      triggerData,
    });

    // 2. Dispatch to background queue (BullMQ or async worker)
    const queueResult = await addWorkflowJob(
      execution._id.toString(),
      workflow._id.toString(),
      triggerData
    );

    // 3. Respond immediately with executionId and status
    return res.status(202).json({
      success: true,
      message: "Workflow execution queued successfully",
      executionId: execution._id,
      status: execution.status,
      queueType: queueResult.type,
      execution,
    });
  } catch (error) {
    console.error("Execute workflow error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error enqueuing workflow execution",
    });
  }
};


/**
 * Get all executions for a specific workflow
 * GET /api/workflows/:id/executions
 */
const getWorkflowExecutions = async (req, res) => {
  try {
    const { id } = req.params;

    // Verify ownership
    const workflow = await Workflow.findOne({
      _id: id,
      owner: req.user.id,
    });

    if (!workflow) {
      return res.status(404).json({
        success: false,
        message: "Workflow not found",
      });
    }

    const executions = await Execution.find({ workflow: id })
      .sort({ createdAt: -1 })
      .limit(50);

    return res.json({
      success: true,
      count: executions.length,
      executions,
    });
  } catch (error) {
    console.error("Get workflow executions error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch executions",
    });
  }
};

/**
 * Get a single execution with full node logs
 * GET /api/executions/:executionId
 */
const getExecutionDetails = async (req, res) => {
  try {
    const { executionId } = req.params;

    const execution = await Execution.findById(executionId).populate("workflow");

    if (!execution) {
      return res.status(404).json({
        success: false,
        message: "Execution record not found",
      });
    }

    // Verify owner
    if (String(execution.workflow.owner) !== String(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to view this execution",
      });
    }

    return res.json({
      success: true,
      execution,
    });
  } catch (error) {
    console.error("Get execution details error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch execution details",
    });
  }
};

/**
 * Retry a failed or existing execution
 * POST /api/executions/:executionId/retry
 */
const retryExecution = async (req, res) => {
  try {
    const { executionId } = req.params;

    const previousExecution = await Execution.findById(executionId).populate("workflow");

    if (!previousExecution) {
      return res.status(404).json({
        success: false,
        message: "Execution record not found",
      });
    }

    if (String(previousExecution.workflow.owner) !== String(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to retry this execution",
      });
    }

    const workflow = previousExecution.workflow;

    // Create a new Execution instance for the retry
    const newExecution = await Execution.create({
      workflow: workflow._id,
      triggeredBy: previousExecution.triggeredBy || "manual",
      status: "pending",
      triggerData: previousExecution.triggerData || {},
    });

    // Enqueue the new retry job
    const queueResult = await addWorkflowJob(
      newExecution._id.toString(),
      workflow._id.toString(),
      previousExecution.triggerData || {}
    );

    return res.status(202).json({
      success: true,
      message: "Workflow retry queued successfully",
      executionId: newExecution._id,
      status: newExecution.status,
      queueType: queueResult.type,
      execution: newExecution,
    });
  } catch (error) {
    console.error("Retry execution error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retry execution",
    });
  }
};

/**
 * Get Admin & Dashboard System Analytics Metrics
 * GET /api/executions/analytics/overview
 */
const getSystemAnalytics = async (req, res) => {
  try {
    // Workflows owned by user
    const userWorkflows = await Workflow.find({ owner: req.user.id });
    const workflowIds = userWorkflows.map((w) => w._id);

    // Total executions across all user workflows
    const totalExecutions = await Execution.countDocuments({
      workflow: { $in: workflowIds },
    });

    const successfulExecutions = await Execution.countDocuments({
      workflow: { $in: workflowIds },
      status: "completed",
    });

    const failedExecutions = await Execution.countDocuments({
      workflow: { $in: workflowIds },
      status: "failed",
    });

    const runningExecutions = await Execution.countDocuments({
      workflow: { $in: workflowIds },
      status: "running",
    });

    const activeWorkflowsCount = userWorkflows.filter((w) => w.status === "active").length;
    const scheduledWorkflowsCount = userWorkflows.filter((w) => w.schedule?.isEnabled).length;

    // Calculate average runtime
    const completedExecs = await Execution.find({
      workflow: { $in: workflowIds },
      status: "completed",
      durationMs: { $gt: 0 },
    })
      .select("durationMs")
      .limit(100);

    const avgDurationMs = completedExecs.length > 0
      ? Math.round(completedExecs.reduce((acc, curr) => acc + curr.durationMs, 0) / completedExecs.length)
      : 0;

    const successRate = totalExecutions > 0
      ? Math.round((successfulExecutions / totalExecutions) * 100)
      : 100;

    // Recent 10 executions across user's workspace
    const recentExecutions = await Execution.find({
      workflow: { $in: workflowIds },
    })
      .populate("workflow", "name status")
      .sort({ createdAt: -1 })
      .limit(10);

    return res.json({
      success: true,
      metrics: {
        totalWorkflows: userWorkflows.length,
        activeWorkflows: activeWorkflowsCount,
        scheduledWorkflows: scheduledWorkflowsCount,
        totalExecutions,
        successfulExecutions,
        failedExecutions,
        runningExecutions,
        successRate,
        avgDurationMs,
      },
      recentExecutions,
    });
  } catch (error) {
    console.error("Get analytics error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch analytics metrics",
    });
  }
};

module.exports = {
  executeWorkflow,
  getWorkflowExecutions,
  getExecutionDetails,
  retryExecution,
  getSystemAnalytics,
};


