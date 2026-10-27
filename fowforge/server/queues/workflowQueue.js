const { Queue } = require("bullmq");
const { redisOptions, getIsRedisAvailable, shouldConnect } = require("../config/redis");
const { processWorkflowJob } = require("../workers/workflowWorker");

let workflowQueue = null;

if (shouldConnect) {
  try {
    workflowQueue = new Queue("workflow-queue", {
      connection: redisOptions,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 2000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    });
  } catch (err) {
    console.warn("Could not initialize BullMQ Queue:", err.message);
  }
}

/**
 * Enqueue workflow execution job.
 * If Redis is active, queues into BullMQ.
 * If Redis is not available, executes asynchronously in background via setImmediate.
 */
async function addWorkflowJob(executionId, workflowId, triggerData = {}) {
  const isRedisUp = getIsRedisAvailable();

  if (isRedisUp && workflowQueue) {
    try {
      const job = await workflowQueue.add(
        "run-workflow",
        {
          executionId,
          workflowId,
          triggerData,
        },
        {
          jobId: `exec-${executionId}`,
        }
      );
      console.log(`[BullMQ] Added job ${job.id} to queue`);
      return { queued: true, type: "bullmq", jobId: job.id };
    } catch (err) {
      console.warn("BullMQ push failed, using async fallback:", err.message);
    }
  }

  // Non-blocking asynchronous background execution
  setImmediate(async () => {
    try {
      console.log(`[Async Background] Processing execution ${executionId}`);
      await processWorkflowJob({ executionId, workflowId, triggerData });
    } catch (err) {
      console.error(`[Async Background] Execution ${executionId} error:`, err.message);
    }
  });

  return { queued: true, type: "in-memory" };
}

module.exports = {
  workflowQueue,
  addWorkflowJob,
};
