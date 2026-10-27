const cron = require("node-cron");
const Workflow = require("../models/Workflow");
const Execution = require("../models/Execution");
const { addWorkflowJob } = require("../queues/workflowQueue");

// Map of workflowId -> cron.ScheduledTask
const scheduledTasks = new Map();

/**
 * Triggers a scheduled workflow execution
 */
async function triggerScheduledRun(workflowId) {
  try {
    const workflow = await Workflow.findById(workflowId);
    if (!workflow || workflow.status !== "active" || !workflow.schedule?.isEnabled) {
      // If workflow was deactivated or deleted, unschedule
      unscheduleWorkflow(workflowId);
      return;
    }

    console.log(`[Scheduler] Triggering scheduled execution for workflow: ${workflow.name} (${workflow._id})`);

    const execution = await Execution.create({
      workflow: workflow._id,
      triggeredBy: "schedule",
      status: "pending",
      triggerData: { scheduledAt: new Date() },
    });

    await addWorkflowJob(execution._id.toString(), workflow._id.toString(), { scheduledAt: new Date() });

    workflow.schedule.lastRunAt = new Date();
    await workflow.save();
  } catch (err) {
    console.error(`[Scheduler] Error running workflow ${workflowId}:`, err.message);
  }
}

/**
 * Register / update schedule for a single workflow
 */
function scheduleWorkflow(workflow) {
  const workflowId = workflow._id.toString();

  // Stop any previously running cron task for this workflow
  unscheduleWorkflow(workflowId);

  const isEnabled = workflow.schedule?.isEnabled && workflow.status === "active";
  const cronExp = workflow.schedule?.cronExpression?.trim();

  if (!isEnabled || !cronExp) {
    return;
  }

  if (!cron.validate(cronExp)) {
    console.warn(`[Scheduler] Invalid cron expression '${cronExp}' for workflow ${workflow._id}`);
    return;
  }

  const task = cron.schedule(cronExp, () => {
    triggerScheduledRun(workflowId);
  });

  scheduledTasks.set(workflowId, task);
  console.log(`[Scheduler] Scheduled workflow '${workflow.name}' with cron: ${cronExp}`);
}

/**
 * Stop and remove a scheduled task
 */
function unscheduleWorkflow(workflowId) {
  const idStr = String(workflowId);
  const existingTask = scheduledTasks.get(idStr);
  if (existingTask) {
    existingTask.stop();
    scheduledTasks.delete(idStr);
    console.log(`[Scheduler] Unscheduled workflow ${idStr}`);
  }
}

/**
 * Load all active scheduled workflows on server start
 */
async function initScheduler() {
  try {
    const scheduledWorkflows = await Workflow.find({
      status: "active",
      "schedule.isEnabled": true,
      "schedule.cronExpression": { $exists: true, $ne: "" },
    });

    console.log(`[Scheduler] Initializing schedules for ${scheduledWorkflows.length} active workflow(s)`);

    for (const wf of scheduledWorkflows) {
      scheduleWorkflow(wf);
    }
  } catch (err) {
    console.error("[Scheduler] Error initializing schedules:", err.message);
  }
}

module.exports = {
  scheduleWorkflow,
  unscheduleWorkflow,
  initScheduler,
};
