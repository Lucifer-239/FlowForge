import { useCallback, useState, useEffect } from "react";
import { useToast } from "../components/toastContext";

import {
  createWorkflow,
  updateWorkflow,
  executeWorkflow,
  getExecutionDetails,
  getWorkflowExecutions,
  toggleWorkflowStatus,
} from "../services/api";
import ExecutionDrawer from "../components/ExecutionDrawer";





import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  useEdgesState,
  useNodesState,
  Handle,
  Position,
} from "reactflow";

import "reactflow/dist/style.css";


// -----------------------------
// -----------------------------
// Trigger Node
// -----------------------------

function TriggerNode({ data }) {
  const status = data.executionStatus; // 'running' | 'completed' | 'failed' | 'pending'
  const statusClass = status ? `node-${status}` : "";

  return (
    <div className={`workflow-node trigger-node ${statusClass}`}>
      <Handle
        type="source"
        position={Position.Bottom}
      />

      <div className="node-icon">
        ⚡
      </div>

      <div style={{ flex: 1 }}>
        <div className="node-type">
          TRIGGER
        </div>

        <div className="node-title">
          {data.label}
        </div>
      </div>

      {status && (
        <span className={`node-exec-badge ${status}`}>
          {status === "running" ? "..." : status}
        </span>
      )}
    </div>
  );
}


// -----------------------------
// Action Node
// -----------------------------

function ActionNode({ data }) {
  const status = data.executionStatus;
  const statusClass = status ? `node-${status}` : "";

  return (
    <div className={`workflow-node action-node ${statusClass}`}>
      <Handle
        type="target"
        position={Position.Top}
      />

      <Handle
        type="source"
        position={Position.Bottom}
      />

      <div className="node-icon">
        ⚙
      </div>

      <div style={{ flex: 1 }}>
        <div className="node-type">
          ACTION
        </div>

        <div className="node-title">
          {data.label}
        </div>
      </div>

      {status && (
        <span className={`node-exec-badge ${status}`}>
          {status === "running" ? "..." : status}
        </span>
      )}
    </div>
  );
}


// -----------------------------
// Condition Node
// -----------------------------

function ConditionNode({ data }) {
  const status = data.executionStatus;
  const statusClass = status ? `node-${status}` : "";

  return (
    <div className={`workflow-node condition-node ${statusClass}`}>
      <Handle
        type="target"
        position={Position.Top}
      />

      <Handle
        type="source"
        position={Position.Bottom}
      />

      <div className="node-icon">
        ?
      </div>

      <div style={{ flex: 1 }}>
        <div className="node-type">
          CONDITION
        </div>

        <div className="node-title">
          {data.label}
        </div>
      </div>

      {status && (
        <span className={`node-exec-badge ${status}`}>
          {status === "running" ? "..." : status}
        </span>
      )}
    </div>
  );
}



// -----------------------------
// Node Types
// -----------------------------

const nodeTypes = {
  trigger: TriggerNode,
  action: ActionNode,
  condition: ConditionNode,
};


// -----------------------------
// Initial Nodes
// -----------------------------

const initialNodes = [
  {
    id: "trigger-1",
    type: "trigger",
    position: {
      x: 400,
      y: 100,
    },
    data: {
      label: "Workflow Start",
    },
  },
];


// -----------------------------
// Workflow Editor
// -----------------------------

function WorkflowEditor({
  onBack,
  workflow,
}) {

  const token = localStorage.getItem("token");
  const { addToast } = useToast();

  // Track the saved record so repeated saves update it instead of creating duplicates.
  const [savedWorkflow, setSavedWorkflow] = useState(workflow || null);


  // -----------------------------
  // Load Saved Nodes
  // -----------------------------

  const [nodes, setNodes, onNodesChange] =
    useNodesState(
      workflow?.nodes?.length
        ? workflow.nodes
        : initialNodes
    );


  // -----------------------------
  // Load Saved Edges
  // -----------------------------

  const [edges, setEdges, onEdgesChange] =
    useEdgesState(
      workflow?.edges || []
    );


  const [selectedNode, setSelectedNode] =
    useState(null);


  // -----------------------------
  // Connect Nodes
  // -----------------------------

  const onConnect = useCallback(
    (connection) => {

      setEdges((currentEdges) =>
        addEdge(
          {
            ...connection,
            animated: true,
          },
          currentEdges
        )
      );

    },
    [setEdges]
  );


  // -----------------------------
  // Add Node
  // -----------------------------

  const addNode = (type) => {

    const id =
      `${type}-${Date.now()}`;

    const labels = {
      trigger: "New Trigger",
      action: "New Action",
      condition: "New Condition",
    };

    
const newNode = {
  id,
  type,
  position: {
    x: 250 + Math.random() * 300,
    y: 150 + Math.random() * 300,
  },
  data: {
    label: labels[type],
    config: {
      actionType: type === "action" ? "http-request" : "",
      method: type === "action" ? "GET" : "",
      url: "",
      condition: "",
    },
  },
};

    setNodes((currentNodes) => [
      ...currentNodes,
      newNode,
    ]);
  };


  // -----------------------------
  // Node Click
  // -----------------------------

  
  // Keyboard shortcut: Delete or Backspace to delete selected node
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.key === "Delete" || e.key === "Backspace") && selectedNode) {
        // Prevent deleting while typing in inputs
        if (["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)) {
          return;
        }
        setNodes((current) => current.filter((n) => n.id !== selectedNode.id));
        setEdges((current) => current.filter((edge) => edge.source !== selectedNode.id && edge.target !== selectedNode.id));
        addToast("Node deleted", "info");
        setSelectedNode(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedNode, setNodes, setEdges, addToast]);

  const onNodeClick = (_, node) => {
    setSelectedNode(node);
  };


  // -----------------------------
  // Save Workflow
  // -----------------------------

  const saveWorkflow = async () => {
    if (!token) {
      addToast("Your session has expired. Please log in again.", "error");
      return;
    }

    try {
      const workflowData = {
        name: savedWorkflow?.name || workflow?.name || "My Workflow",
        description:
          savedWorkflow?.description ||
          workflow?.description ||
          "Created using FlowForge visual editor",
        nodes,
        edges,
        status: savedWorkflow?.status || workflow?.status || "draft",
      };

      let data;

      if (savedWorkflow?._id || workflow?._id) {
        const workflowId = savedWorkflow?._id || workflow._id;

        data = await updateWorkflow(
          workflowId,
          workflowData,
          token
        );

        addToast("Workflow updated successfully!", "success");
      } else {
        data = await createWorkflow(workflowData, token);

        addToast("Workflow created successfully!", "success");
      }

      // API responses commonly wrap the record in `workflow`.
      // Keep the returned ID for future saves to avoid duplicate records.
      const savedRecord =
        data?.workflow ||
        data?.data?.workflow ||
        data?.data ||
        data;

      if (savedRecord && (savedRecord._id || savedRecord.id)) {
        setSavedWorkflow({
          ...savedRecord,
          _id: savedRecord._id || savedRecord.id,
        });
      } else if (workflow?._id) {
        setSavedWorkflow(workflow);
      }

      console.log("Workflow saved:", data);
    } catch (error) {
      console.error("Save workflow error:", error);
      alert(
        error.response?.data?.message ||
          "Failed to save workflow"
      );
    }
  };

  // -----------------------------
  // Toggle Active / Inactive Status
  // -----------------------------
  const handleToggleStatus = async () => {
    if (!token) {
      alert("Session expired.");
      return;
    }
    const id = savedWorkflow?._id || workflow?._id;
    if (!id) {
      addToast("Please save the workflow first before activating it.", "warning");
      return;
    }
    try {
      const res = await toggleWorkflowStatus(id, token);
      setSavedWorkflow((prev) => ({
        ...prev,
        status: res.status,
      }));
      addToast(res.message, "success");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to toggle status");
    }
  };

  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [cronInput, setCronInput] = useState(
    savedWorkflow?.schedule?.cronExpression || workflow?.schedule?.cronExpression || "*/10 * * * *"
  );
  const [isScheduleEnabled, setIsScheduleEnabled] = useState(
    savedWorkflow?.schedule?.isEnabled ?? workflow?.schedule?.isEnabled ?? false
  );

  const handleSaveSchedule = async () => {
    const id = savedWorkflow?._id || workflow?._id;
    if (!id) {
      addToast("Please save workflow first.", "warning");
      return;
    }
    try {
      const res = await updateWorkflow(
        id,
        {
          schedule: {
            isEnabled: isScheduleEnabled,
            cronExpression: cronInput,
          },
        },
        token
      );
      setSavedWorkflow(res.workflow);
      setIsScheduleModalOpen(false);
      alert(`Schedule saved: ${isScheduleEnabled ? `Active (${cronInput})` : "Disabled"}`);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update schedule");
    }
  };

  const [isExecuting, setIsExecuting] = useState(false);

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [executions, setExecutions] = useState([]);
  const [isLoadingExecutions, setIsLoadingExecutions] = useState(false);

  const workflowId = savedWorkflow?._id || workflow?._id;

  // -----------------------------
  // Fetch Execution History
  // -----------------------------
  const fetchExecutions = useCallback(async () => {
    if (!workflowId || !token) return;
    try {
      setIsLoadingExecutions(true);
      const res = await getWorkflowExecutions(workflowId, token);
      setExecutions(res.executions || []);
    } catch (err) {
      console.error("Failed to load executions:", err);
    } finally {
      setIsLoadingExecutions(false);
    }
  }, [workflowId, token]);

  const handleOpenDrawer = () => {
    setIsDrawerOpen(true);
    fetchExecutions();
  };


  // Helper to sync node logs onto canvas nodes
  const applyExecutionToCanvas = useCallback((exec) => {
    if (!exec || !exec.nodeLogs) return;

    const logMap = new Map();
    exec.nodeLogs.forEach((log) => {
      logMap.set(log.nodeId, log.status);
    });

    setNodes((currentNodes) =>
      currentNodes.map((node) => {
        const nodeStatus = logMap.get(node.id);
        if (nodeStatus) {
          return {
            ...node,
            data: {
              ...node.data,
              executionStatus: nodeStatus,
            },
          };
        }
        return node;
      })
    );

    // Animate edges connecting executed nodes
    setEdges((currentEdges) =>
      currentEdges.map((edge) => {
        const sourceStatus = logMap.get(edge.source);
        const targetStatus = logMap.get(edge.target);
        const isPathActive = sourceStatus === "completed" && (targetStatus === "running" || targetStatus === "completed");

        return {
          ...edge,
          animated: isPathActive,
          style: isPathActive
            ? { stroke: "#10b981", strokeWidth: 2.5 }
            : { stroke: "#4b5563" },
        };
      })
    );
  }, [setNodes, setEdges]);

  // -----------------------------
  // Run / Execute Workflow (Async via BullMQ / Queue)
  // -----------------------------
  const runWorkflow = async () => {
    if (!token) {
      alert("Your session has expired. Please log in again.");
      return;
    }

    if (!workflowId) {
      addToast("Please save the workflow first before executing.", "warning");
      return;
    }

    try {
      setIsExecuting(true);

      // Reset previous execution styles on nodes & edges
      setNodes((current) =>
        current.map((n) => ({
          ...n,
          data: { ...n.data, executionStatus: null },
        }))
      );
      setEdges((current) =>
        current.map((e) => ({
          ...e,
          animated: false,
          style: { stroke: "#4b5563" },
        }))
      );

      const res = await executeWorkflow(workflowId, {}, token);
      const execId = res.executionId || res.execution?._id;

      // Poll execution status until completed or failed
      if (execId) {
        let attempts = 0;
        const interval = setInterval(async () => {
          attempts++;
          try {
            const detailRes = await getExecutionDetails(execId, token);
            const currentExec = detailRes.execution;

            // Dynamically update canvas nodes in real-time
            applyExecutionToCanvas(currentExec);

            if (currentExec.status === "completed" || currentExec.status === "failed" || attempts >= 30) {
              clearInterval(interval);
              setIsExecuting(false);
              fetchExecutions();
              if (currentExec.status === "completed") {
                alert(`✅ Workflow completed successfully in ${currentExec.durationMs || 0}ms!`);
              } else if (currentExec.status === "failed") {
                alert(`❌ Workflow execution failed: ${currentExec.error || "Unknown error"}`);
              }
            }
          } catch (pollErr) {
            console.error("Polling error:", pollErr);
            clearInterval(interval);
            setIsExecuting(false);
          }
        }, 800);
      } else {
        setIsExecuting(false);
      }
    } catch (error) {
      console.error("Execution error:", error);
      alert(error.response?.data?.message || "Execution failed");
      setIsExecuting(false);
    }
  };






  return (
    <div className="workflow-page">


      {/* HEADER */}

      <header className="workflow-header">

        <div className="workflow-brand">

          <button
            className="back-button"
            onClick={onBack}
          >
            ←
          </button>


          <div className="logo">
            Flow<span>Forge</span>
          </div>


          <span className="workflow-name">
            / {workflow?.name || "My Workflow"}
          </span>

        </div>


        <div className="workflow-actions">

          <button
            className="secondary-action"
            onClick={onBack}
          >
            Exit
          </button>

          <button
            className="secondary-action"
            style={{
              backgroundColor: (savedWorkflow?.status || workflow?.status) === "active" ? "#064e3b" : "#374151",
              color: (savedWorkflow?.status || workflow?.status) === "active" ? "#6ee7b7" : "#d1d5db",
              borderColor: (savedWorkflow?.status || workflow?.status) === "active" ? "#059669" : "#4b5563",
            }}
            onClick={handleToggleStatus}
          >
            {(savedWorkflow?.status || workflow?.status) === "active" ? "🟢 Active" : "⚪ Inactive"}
          </button>

          <button
            className="secondary-action"
            style={{ backgroundColor: "#1e1b4b", color: "#c7d2fe", borderColor: "#4338ca" }}
            onClick={() => setIsScheduleModalOpen(true)}
          >
            ⏰ Schedule
          </button>

          <button
            className="save-action"
            style={{ backgroundColor: "#10b981", borderColor: "#059669" }}
            onClick={runWorkflow}
            disabled={isExecuting}
          >
            {isExecuting ? "⚡ Running..." : "▶ Run Workflow"}
          </button>

          <button
            className="secondary-action"
            style={{ backgroundColor: "#312e81", color: "#e0e7ff", borderColor: "#4338ca" }}
            onClick={handleOpenDrawer}
          >
            📜 History ({executions.length})
          </button>

          <button
            className="save-action"
            onClick={saveWorkflow}
          >
            Save Workflow
          </button>
        </div>



      </header>


      {/* EDITOR */}

      <div className="workflow-editor">


        {/* SIDEBAR */}

        <aside className="node-sidebar">

          <div className="sidebar-title">
            WORKFLOW NODES
          </div>


          <button
            className="node-add-button"
            onClick={() =>
              addNode("trigger")
            }
          >

            <span>
              ⚡
            </span>

            <div>

              <strong>
                Trigger
              </strong>

              <small>
                Start workflow
              </small>

            </div>

          </button>


          <button
            className="node-add-button"
            onClick={() =>
              addNode("action")
            }
          >

            <span>
              ⚙
            </span>

            <div>

              <strong>
                Action
              </strong>

              <small>
                Perform a task
              </small>

            </div>

          </button>


          <button
            className="node-add-button"
            onClick={() =>
              addNode("condition")
            }
          >

            <span>
              ?
            </span>

            <div>

              <strong>
                Condition
              </strong>

              <small>
                Branch workflow
              </small>

            </div>

          </button>


          <div className="sidebar-help">

            <strong>
              💡 Tip
            </strong>

            <p>
              Add nodes and drag between
              handles to create connections.
            </p>

          </div>

        </aside>


        {/* CANVAS */}

        <main className="workflow-canvas">

          <ReactFlow
            nodes={nodes}
            edges={edges}

            onNodesChange={
              onNodesChange
            }

            onEdgesChange={
              onEdgesChange
            }

            onConnect={
              onConnect
            }

            onNodeClick={
              onNodeClick
            }

            nodeTypes={
              nodeTypes
            }

            fitView
          >

            <Background />

            <Controls />

            <MiniMap />

          </ReactFlow>

        </main>


        {/* CONFIG PANEL */}

        {selectedNode && (

          <aside className="node-config">

            <div className="config-header">

              <h3>
                Node Configuration
              </h3>

              <button
                onClick={() =>
                  setSelectedNode(null)
                }
              >
                ×
              </button>

            </div>


            <div className="config-body">


              <label>
                Node Type
              </label>

              <input
                value={
                  selectedNode.type
                }
                disabled
              />


              <label>
                Node Name
              </label>

{selectedNode.type === "action" && (
  <>
    <label>Action Type</label>

    <select
      value={
        selectedNode.data.config?.actionType ||
        "http-request"
      }
      onChange={(e) => {
        const value = e.target.value;

        const updatedNode = {
          ...selectedNode,
          data: {
            ...selectedNode.data,
            config: {
              ...selectedNode.data.config,
              actionType: value,
            },
          },
        };

        setNodes((currentNodes) =>
          currentNodes.map((node) =>
            node.id === selectedNode.id
              ? updatedNode
              : node
          )
        );

        setSelectedNode(updatedNode);
      }}
    >
      <option value="http-request">HTTP Request</option>
      <option value="send-email">Send Email</option>
      <option value="delay">Delay</option>
    </select>

    {selectedNode.data.config?.actionType ===
      "http-request" && (
      <>
        <label>Request Method</label>

        <select
          value={
            selectedNode.data.config?.method || "GET"
          }
          onChange={(e) => {
            const updatedNode = {
              ...selectedNode,
              data: {
                ...selectedNode.data,
                config: {
                  ...selectedNode.data.config,
                  method: e.target.value,
                },
              },
            };

            setNodes((currentNodes) =>
              currentNodes.map((node) =>
                node.id === selectedNode.id
                  ? updatedNode
                  : node
              )
            );

            setSelectedNode(updatedNode);
          }}
        >
          <option value="GET">GET</option>
          <option value="POST">POST</option>
          <option value="PUT">PUT</option>
          <option value="DELETE">DELETE</option>
        </select>

        <label>Request URL</label>

        <input
          type="url"
          placeholder="https://example.com/api"
          value={selectedNode.data.config?.url || ""}
          onChange={(e) => {
            const updatedNode = {
              ...selectedNode,
              data: {
                ...selectedNode.data,
                config: {
                  ...selectedNode.data.config,
                  url: e.target.value,
                },
              },
            };

            setNodes((currentNodes) =>
              currentNodes.map((node) =>
                node.id === selectedNode.id
                  ? updatedNode
                  : node
              )
            );

            setSelectedNode(updatedNode);
          }}
        />

        <label style={{ display: "block", marginTop: "12px", marginBottom: "4px" }}>
          Request Headers (JSON)
        </label>
        <textarea
          rows={2}
          placeholder='{
  "Authorization": "Bearer YOUR_API_KEY"
}'
          value={selectedNode.data.config?.headers || ""}
          onChange={(e) => {
            const updatedNode = {
              ...selectedNode,
              data: {
                ...selectedNode.data,
                config: {
                  ...selectedNode.data.config,
                  headers: e.target.value,
                },
              },
            };
            setNodes((curr) =>
              curr.map((n) => (n.id === selectedNode.id ? updatedNode : n))
            );
            setSelectedNode(updatedNode);
          }}
          style={{
            width: "100%",
            padding: "8px",
            background: "#18181f",
            color: "#e2e8f0",
            border: "1px solid #374151",
            borderRadius: "6px",
            fontFamily: "monospace",
            fontSize: "12px",
            resize: "vertical",
          }}
        />

        {["POST", "PUT", "PATCH"].includes(selectedNode.data.config?.method || "GET") && (
          <>
            <label style={{ display: "block", marginTop: "12px", marginBottom: "4px" }}>
              Request Body (JSON)
            </label>
            <textarea
              rows={4}
              placeholder='{
  "content": "Hello from FlowForge!"
}'
              value={selectedNode.data.config?.body || ""}
              onChange={(e) => {
                const updatedNode = {
                  ...selectedNode,
                  data: {
                    ...selectedNode.data,
                    config: {
                      ...selectedNode.data.config,
                      body: e.target.value,
                    },
                  },
                };
                setNodes((curr) =>
                  curr.map((n) => (n.id === selectedNode.id ? updatedNode : n))
                );
                setSelectedNode(updatedNode);
              }}
              style={{
                width: "100%",
                padding: "8px",
                background: "#18181f",
                color: "#e2e8f0",
                border: "1px solid #374151",
                borderRadius: "6px",
                fontFamily: "monospace",
                fontSize: "12px",
                resize: "vertical",
              }}
            />
          </>
        )}
      </>
    )}
  </>
)}
              <input
                value={
                  selectedNode.data.label
                }

                onChange={(e) => {

                  const value =
                    e.target.value;


                  setNodes(
                    (currentNodes) =>
                      currentNodes.map(
                        (node) =>
                          node.id ===
                          selectedNode.id
                            ? {
                                ...node,

                                data: {
                                  ...node.data,

                                  label:
                                    value,
                                },
                              }
                            : node
                      )
                  );


                  setSelectedNode({
                    ...selectedNode,

                    data: {
                      ...selectedNode.data,

                      label:
                        value,
                    },
                  });

                }}
              />


              <div style={{ marginTop: "16px" }}>
                <label style={{ fontSize: "11px", color: "#9ca3af", display: "block", marginBottom: "6px" }}>
                  Failure Policy (On Error):
                </label>
                <select
                  value={selectedNode.data.config?.onError || "stop"}
                  onChange={(e) => {
                    const policy = e.target.value;
                    const updateConfig = (node) => ({
                      ...node,
                      data: {
                        ...node.data,
                        config: {
                          ...(node.data.config || {}),
                          onError: policy,
                        },
                      },
                    });
                    setNodes((curr) => curr.map((n) => (n.id === selectedNode.id ? updateConfig(n) : n)));
                    setSelectedNode((curr) => updateConfig(curr));
                  }}
                  style={{
                    width: "100%",
                    padding: "6px 8px",
                    background: "#18181f",
                    color: "white",
                    border: "1px solid #374151",
                    borderRadius: "6px",
                    fontSize: "12px",
                    marginBottom: "12px",
                  }}
                >
                  <option value="stop">🛑 Stop Workflow (Default)</option>
                  <option value="retry">↻ Auto-Retry (Up to 2x)</option>
                  <option value="continue">⏭ Continue Execution</option>
                </select>
              </div>

              <div className="config-info">

                <strong>
                  Node ID
                </strong>

                <span>
                  {selectedNode.id}
                </span>

              </div>


            </div>

          </aside>

        )}

      </div>

      {/* EXECUTION DRAWER */}
      <ExecutionDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        executions={executions}
        isLoading={isLoadingExecutions}
        onRefresh={fetchExecutions}
        token={token}
        onRetrySuccess={(newExec) => {
          setExecutions((prev) => [newExec, ...prev]);
          applyExecutionToCanvas(newExec);
        }}
        onSelectExecution={(exec) => {
          applyExecutionToCanvas(exec);
        }}
      />

      {/* SCHEDULE & WEBHOOK CONFIG MODAL */}
      {isScheduleModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1100,
          }}
          onClick={() => setIsScheduleModalOpen(false)}
        >
          <div
            style={{
              backgroundColor: "#18181f",
              borderRadius: "12px",
              padding: "24px",
              width: "480px",
              border: "1px solid #2d2d3a",
              color: "#f3f4f6",
              boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "600" }}>⏰ Automated Schedule & Webhook</h3>
              <button
                onClick={() => setIsScheduleModalOpen(false)}
                style={{ background: "none", border: "none", color: "#9ca3af", fontSize: "16px", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            {/* Schedule Section */}
            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={isScheduleEnabled}
                  onChange={(e) => setIsScheduleEnabled(e.target.checked)}
                />
                <span style={{ fontSize: "14px", fontWeight: "600" }}>Enable Automated Cron Schedule</span>
              </label>

              <div style={{ opacity: isScheduleEnabled ? 1 : 0.4, pointerEvents: isScheduleEnabled ? "auto" : "none" }}>
                <label style={{ fontSize: "12px", color: "#9ca3af", display: "block", marginBottom: "6px" }}>
                  Cron Expression (e.g., <code>*/15 * * * *</code> for every 15 mins):
                </label>
                <input
                  type="text"
                  value={cronInput}
                  onChange={(e) => setCronInput(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    border: "1px solid #374151",
                    backgroundColor: "#111827",
                    color: "white",
                    marginBottom: "8px",
                  }}
                />
                <div style={{ fontSize: "11px", color: "#6b7280" }}>
                  Preset: <code>0 * * * *</code> (Hourly), <code>0 0 * * *</code> (Daily), <code>*/5 * * * *</code> (Every 5 mins)
                </div>
              </div>
            </div>

            {/* Webhook Section */}
            <div style={{ padding: "14px", backgroundColor: "#111827", borderRadius: "8px", border: "1px solid #1f2937", marginBottom: "20px" }}>
              <div style={{ fontSize: "13px", fontWeight: "600", marginBottom: "6px", display: "flex", alignItems: "center", gap: "6px" }}>
                <span>⚡ Incoming Webhook URL</span>
              </div>
              <div style={{ fontSize: "11px", color: "#9ca3af", marginBottom: "8px" }}>
                Trigger this workflow externally via HTTP POST:
              </div>
              <input
                readOnly
                value={`http://localhost:5001/api/webhooks/${savedWorkflow?._id || workflow?._id || "WORKFLOW_ID"}`}
                style={{
                  width: "100%",
                  padding: "6px 10px",
                  fontSize: "11px",
                  borderRadius: "4px",
                  border: "1px solid #374151",
                  backgroundColor: "#030712",
                  color: "#93c5fd",
                }}
                onClick={(e) => e.target.select()}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                className="secondary-action"
                onClick={() => setIsScheduleModalOpen(false)}
              >
                Cancel
              </button>
              <button
                className="save-action"
                style={{ backgroundColor: "#4f46e5", borderColor: "#4338ca" }}
                onClick={handleSaveSchedule}
              >
                Save Schedule
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );

}

export default WorkflowEditor;
 