const { Worker } = require("bullmq");
const { redisOptions, shouldConnect } = require("../config/redis");
const Execution = require("../models/Execution");
const Workflow = require("../models/Workflow");
const { runWorkflowEngine } = require("../engine/workflowEngine");

/**
 * Executes a workflow run job: runs engine, captures node logs, updates DB
 */
async function processWorkflowJob(jobData) {
  const { executionId, workflowId, triggerData = {} } = jobData;

  const execution = await Execution.findById(executionId);
  if (!execution) {
    throw new Error(`Execution record ${executionId} not found`);
  }

  const workflow = await Workflow.findById(workflowId);
  if (!workflow) {
    execution.status = "failed";
    execution.error = "Workflow not found";
    execution.completedAt = new Date();
    await execution.save();
    throw new Error(`Workflow ${workflowId} not found`);
  }

  // Set running state
  execution.status = "running";
  execution.startedAt = new Date();
  await execution.save();

  try {
    // Run DAG engine with live node update logging
    const result = await runWorkflowEngine(
      workflow,
      triggerData,
      async (nodeLog) => {
        // Upsert node log in execution document
        const existingIdx = execution.nodeLogs.findIndex(
          (l) => l.nodeId === nodeLog.nodeId
        );
        if (existingIdx >= 0) {
          execution.nodeLogs[existingIdx] = nodeLog;
        } else {
          execution.nodeLogs.push(nodeLog);
        }
        await execution.save();
      }
    );

    execution.status = "completed";
    execution.completedAt = new Date();
    execution.durationMs = execution.completedAt - execution.startedAt;
    execution.context = result.context;
    execution.nodeLogs = result.nodeLogs;
    await execution.save();

    return { success: true, executionId: execution._id };
  } catch (err) {
    execution.status = "failed";
    execution.completedAt = new Date();
    execution.durationMs = execution.completedAt - execution.startedAt;
    execution.error = err.message;
    await execution.save();

    throw err;
  }
}

let workflowWorker = null;

function initWorkflowWorker() {
  if (!shouldConnect) {
    return;
  }

  try {
    workflowWorker = new Worker(
      "workflow-queue",
      async (job) => {
        console.log(`[BullMQ Worker] Processing job ${job.id} for execution ${job.data.executionId}`);
        return await processWorkflowJob(job.data);
      },
      {
        connection: redisOptions,
        concurrency: 5,
      }
    );

    workflowWorker.on("completed", (job) => {
      console.log(`[BullMQ Worker] Job ${job.id} completed successfully`);
    });

    workflowWorker.on("failed", (job, err) => {
      console.error(`[BullMQ Worker] Job ${job?.id} failed:`, err.message);
    });

    workflowWorker.on("error", () => {});

    console.log("BullMQ Workflow Worker initialized");
  } catch (err) {
    console.warn("Could not start BullMQ worker:", err.message);
  }
}

module.exports = {
  processWorkflowJob,
  initWorkflowWorker,
};
