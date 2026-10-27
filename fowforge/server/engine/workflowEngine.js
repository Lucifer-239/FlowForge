const { executeHttpRequest, executeCondition, executeDelay } = require("./nodeHandlers");

/**
 * Traverses and executes a workflow graph (DAG).
 *
 * @param {Object} workflow - The Workflow document containing { nodes, edges }
 * @param {Object} triggerData - Initial data injected at trigger (e.g., webhook payload or manual inputs)
 * @param {Function} onNodeUpdate - Optional callback to notify progress (nodeId, status, output, error)
 */
async function runWorkflowEngine(workflow, triggerData = {}, onNodeUpdate = null) {
  const nodes = workflow.nodes || [];
  const edges = workflow.edges || [];

  if (nodes.length === 0) {
    throw new Error("Workflow contains no nodes to execute");
  }

  // 1. Locate the entry trigger node
  const triggerNode = nodes.find(
    (n) => n.type === "trigger" || n.data?.type === "trigger" || n.type === "triggerNode"
  );

  if (!triggerNode) {
    throw new Error("No trigger node found in this workflow");
  }

  // Global workflow execution context
  const context = {
    trigger: triggerData,
    steps: {},
  };

  const nodeLogs = [];
  const visitedNodeIds = new Set();

  // Helper map: nodeId -> Node object
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  // Queue of nodes to process (starts with trigger)
  const executionQueue = [{ node: triggerNode, incomingHandle: null }];

  while (executionQueue.length > 0) {
    const { node, incomingHandle } = executionQueue.shift();

    if (visitedNodeIds.has(node.id)) {
      continue;
    }
    visitedNodeIds.add(node.id);

    const startedAt = new Date();
    const logEntry = {
      nodeId: node.id,
      nodeType: node.type || node.data?.type || "unknown",
      label: node.data?.label || node.id,
      status: "running",
      input: { context: JSON.parse(JSON.stringify(context)) },
      startedAt,
    };

    if (onNodeUpdate) {
      await onNodeUpdate(logEntry);
    }

    // Configurable error policy on node level: 'stop' (default) | 'continue' | 'retry'
    const onErrorPolicy = node.data?.config?.onError || "stop";
    const maxNodeRetries = Number(node.data?.config?.maxRetries || (onErrorPolicy === "retry" ? 2 : 0));
    let attempt = 0;
    let nodeSucceeded = false;
    let lastError = null;

    while (attempt <= maxNodeRetries && !nodeSucceeded) {
      attempt++;
      try {
        let output = {};
        const nodeType = (node.type || node.data?.type || "").toLowerCase();

        // Execute based on node type
        if (nodeType.includes("trigger")) {
          output = { triggered: true, data: triggerData };
        } else if (nodeType.includes("action") || nodeType === "httprequest") {
          output = await executeHttpRequest(node, context);
        } else if (nodeType.includes("condition")) {
          output = await executeCondition(node, context);
        } else if (nodeType.includes("delay")) {
          output = await executeDelay(node);
        } else {
          // Fallback generic node pass-through
          output = { executed: true, data: node.data };
        }

        const completedAt = new Date();
        logEntry.status = "completed";
        logEntry.output = output;
        logEntry.completedAt = completedAt;
        logEntry.durationMs = completedAt - startedAt;
        logEntry.retriesUsed = attempt - 1;

        // Store in context for downstream nodes
        context.steps[node.id] = output;
        nodeLogs.push(logEntry);
        nodeSucceeded = true;

        if (onNodeUpdate) {
          await onNodeUpdate(logEntry);
        }

        // Determine next nodes via outgoing edges
        const outgoingEdges = edges.filter((e) => e.source === node.id);

        for (const edge of outgoingEdges) {
          const nextNode = nodeMap.get(edge.target);
          if (!nextNode) continue;

          // Condition branching check:
          if (nodeType.includes("condition")) {
            const conditionPassed = Boolean(output.result);
            const handle = edge.sourceHandle;

            if (handle === "true" && !conditionPassed) continue;
            if (handle === "false" && conditionPassed) continue;
          }

          executionQueue.push({ node: nextNode, incomingHandle: edge.targetHandle });
        }
      } catch (err) {
        lastError = err;
        if (attempt <= maxNodeRetries) {
          console.log(`[Workflow Engine] Retrying node '${node.id}' (Attempt ${attempt}/${maxNodeRetries})`);
          await new Promise((r) => setTimeout(r, 1000 * attempt));
        }
      }
    }

    if (!nodeSucceeded) {
      const completedAt = new Date();
      logEntry.status = "failed";
      logEntry.error = lastError?.message || String(lastError);
      logEntry.completedAt = completedAt;
      logEntry.durationMs = completedAt - startedAt;
      logEntry.retriesUsed = attempt - 1;

      nodeLogs.push(logEntry);

      if (onNodeUpdate) {
        await onNodeUpdate(logEntry);
      }

      // If policy is continue, log error and allow downstream execution
      if (onErrorPolicy === "continue") {
        console.warn(`[Workflow Engine] Node '${node.id}' failed, but continuing per policy.`);
        context.steps[node.id] = { error: logEntry.error, status: "failed" };
      } else {
        // Stop execution
        throw new Error(`Execution failed at node '${logEntry.label}' (${node.id}): ${lastError?.message}`);
      }
    }
  }


  return {
    success: true,
    context,
    nodeLogs,
  };
}

module.exports = {
  runWorkflowEngine,
};
