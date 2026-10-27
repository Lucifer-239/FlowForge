import { useEffect, useState } from "react";
import {
  getWorkflows,
  deleteWorkflow,
  getSystemAnalytics,
} from "../services/api";

function Dashboard({
  user,
  onLogout,
  onCreateWorkflow,
  onOpenWorkflow,
}) {
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [metrics, setMetrics] = useState({
    totalWorkflows: 0,
    activeWorkflows: 0,
    scheduledWorkflows: 0,
    totalExecutions: 0,
    successfulExecutions: 0,
    failedExecutions: 0,
    runningExecutions: 0,
    successRate: 100,
    avgDurationMs: 0,
  });
  const [recentExecutions, setRecentExecutions] = useState([]);

  // LOAD WORKFLOWS & SYSTEM METRICS
  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        setError("");

        const token = localStorage.getItem("token");

        if (!token) {
          setError("Authentication token not found.");
          return;
        }

        const [workflowData, analyticsData] = await Promise.all([
          getWorkflows(token),
          getSystemAnalytics(token).catch(() => ({ metrics: null, recentExecutions: [] })),
        ]);

        setWorkflows(workflowData.workflows || []);
        if (analyticsData.metrics) {
          setMetrics(analyticsData.metrics);
        }
        if (analyticsData.recentExecutions) {
          setRecentExecutions(analyticsData.recentExecutions);
        }
      } catch (err) {
        console.error("Failed to load dashboard data:", err);
        setError(err.response?.data?.message || "Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);


  // DELETE WORKFLOW
  const handleDeleteWorkflow = async (workflowId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this workflow?"
    );

    if (!confirmed) {
      return;
    }

    try {
      const token = localStorage.getItem("token");

      await deleteWorkflow(
        workflowId,
        token
      );

      setWorkflows((currentWorkflows) =>
        currentWorkflows.filter(
          (workflow) =>
            workflow._id !== workflowId
        )
      );
    } catch (error) {
      console.error(
        "Delete workflow error:",
        error
      );

      alert(
        error.response?.data?.message ||
          "Failed to delete workflow"
      );
    }
  };

  return (
    <div className="dashboard">

      <nav className="dashboard-nav">

        <div className="logo">
          Flow<span>Forge</span>
        </div>

        <div className="dashboard-user">

          <span>
            {user?.name}
          </span>

          <button onClick={onLogout}>
            Logout
          </button>

        </div>

      </nav>

      <main className="dashboard-content">

        <div className="dashboard-header">

          <div>
            <p className="dashboard-label">
              WORKSPACE
            </p>

            <h1>
              Welcome back, {user?.name} 👋
            </h1>

            <p>
              Build and automate your workflows from one place.
            </p>
          </div>

          <button
            className="create-workflow"
            onClick={onCreateWorkflow}
          >
            + Create Workflow
          </button>

        </div>

        <div className="dashboard-grid">

          <div className="dashboard-card">
            <div className="card-icon">⚡</div>
            <h3>Workflows</h3>
            <strong>{metrics.totalWorkflows || workflows.length}</strong>
            <p>{metrics.activeWorkflows || 0} active • {metrics.scheduledWorkflows || 0} scheduled</p>
          </div>

          <div className="dashboard-card">
            <div className="card-icon">▶</div>
            <h3>Executions</h3>
            <strong>{metrics.totalExecutions || 0}</strong>
            <p>Total runs • Avg: {metrics.avgDurationMs || 0}ms</p>
          </div>

          <div className="dashboard-card">
            <div className="card-icon" style={{ color: "#10b981" }}>✓</div>
            <h3>Success Rate</h3>
            <strong>{metrics.successRate}%</strong>
            <p>{metrics.successfulExecutions || 0} succeeded</p>
          </div>

          <div className="dashboard-card">
            <div className="card-icon" style={{ color: "#ef4444" }}>!</div>
            <h3>Failed</h3>
            <strong style={{ color: metrics.failedExecutions > 0 ? "#ef4444" : "white" }}>
              {metrics.failedExecutions || 0}
            </strong>
            <p>Runs needing retry</p>
          </div>

        </div>

        {/* RECENT EXECUTIONS AUDIT */}
        {recentExecutions.length > 0 && (
          <div style={{ marginBottom: "35px" }}>
            <h3 style={{ fontSize: "16px", marginBottom: "12px", color: "#e4e4e7" }}>
              ⚡ Recent Execution Activity
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "12px" }}>
              {recentExecutions.map((exec) => (
                <div
                  key={exec._id}
                  style={{
                    backgroundColor: "#171922",
                    padding: "12px 16px",
                    borderRadius: "8px",
                    border: "1px solid #282b36",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <strong style={{ fontSize: "13px", display: "block", color: "#f3f4f6" }}>
                      {exec.workflow?.name || "Workflow Run"}
                    </strong>
                    <span style={{ fontSize: "11px", color: "#71717a" }}>
                      {new Date(exec.createdAt).toLocaleTimeString()} • {exec.durationMs ? `${exec.durationMs}ms` : "-"}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: "700",
                      padding: "3px 8px",
                      borderRadius: "12px",
                      backgroundColor:
                        exec.status === "completed"
                          ? "rgba(16, 185, 129, 0.15)"
                          : exec.status === "failed"
                          ? "rgba(239, 68, 68, 0.15)"
                          : "rgba(59, 130, 246, 0.15)",
                      color:
                        exec.status === "completed"
                          ? "#34d399"
                          : exec.status === "failed"
                          ? "#f87171"
                          : "#60a5fa",
                    }}
                  >
                    {exec.status.toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}


        {/* WORKFLOW LIST */}

        {loading ? (

          <div className="empty-workflows">
            <h2>
              Loading workflows...
            </h2>
          </div>

        ) : error ? (

          <div className="empty-workflows">
            <h2>
              Session Notice
            </h2>

            <p style={{ color: "#f87171", marginBottom: "16px" }}>
              {error}
            </p>

            <button
              onClick={onLogout}
              style={{
                backgroundColor: "#4f46e5",
                color: "white",
                border: "none",
                padding: "10px 20px",
                borderRadius: "8px",
                fontWeight: "600",
                cursor: "pointer"
              }}
            >
              Log in again
            </button>
          </div>

        ) : workflows.length === 0 ? (

          <div className="empty-workflows">

            <div className="empty-icon">
              ◇
            </div>

            <h2>
              No workflows yet
            </h2>

            <p>
              Create your first workflow and start automating.
            </p>

            <button
              className="create-workflow"
              onClick={onCreateWorkflow}
            >
              Create Your First Workflow
            </button>

          </div>

        ) : (
          <div>
            <div className="workflow-section-title">
              <span>🗂️</span> Your Workflows ({workflows.length})
            </div>

            <div className="workflow-grid">
              {workflows.map((workflow) => (
                <div
                  className="workflow-card"
                  key={workflow._id}
                >
                  <div>
                    <div className="workflow-card-header">
                      <h3 className="workflow-card-title">
                        <span>⚡</span> {workflow.name}
                      </h3>

                      <span className={`workflow-status ${workflow.status || "draft"}`}>
                        {workflow.status || "draft"}
                      </span>
                    </div>

                    <p className="workflow-card-desc">
                      {workflow.description || "No description configured."}
                    </p>
                  </div>

                  <div>
                    <div className="workflow-card-info">
                      <span>
                        <strong>{workflow.nodes?.length || 0}</strong> nodes
                      </span>
                      <span>•</span>
                      <span>
                        <strong>{workflow.edges?.length || 0}</strong> connections
                      </span>
                      {workflow.schedule?.isEnabled && (
                        <>
                          <span>•</span>
                          <span style={{ color: "#818cf8" }}>⏰ Scheduled</span>
                        </>
                      )}
                    </div>

                    <div className="workflow-card-actions">
                      <button
                        className="open-workflow"
                        onClick={() => onOpenWorkflow(workflow)}
                      >
                        ✏️ Open Editor
                      </button>

                      <button
                        className="delete-workflow"
                        onClick={() => handleDeleteWorkflow(workflow._id)}
                        title="Delete workflow"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        )}

      </main>

    </div>
  );
}

export default Dashboard;