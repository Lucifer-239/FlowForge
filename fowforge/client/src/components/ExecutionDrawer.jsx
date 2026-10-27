import React, { useState } from "react";
import { retryExecution } from "../services/api";

export default function ExecutionDrawer({
  isOpen,
  onClose,
  executions,
  isLoading,
  onRefresh,
  token,
  onRetrySuccess,
  onSelectExecution,
}) {
  const [selectedExecution, setSelectedExecution] = useState(null);
  const [retryingId, setRetryingId] = useState(null);

  if (!isOpen) return null;

  const handleSelect = (exec) => {
    setSelectedExecution(exec);
    if (onSelectExecution) {
      onSelectExecution(exec);
    }
  };


  const handleRetry = async (e, execId) => {
    e.stopPropagation();
    try {
      setRetryingId(execId);
      const res = await retryExecution(execId, token);
      alert("Retry queued successfully!");
      if (onRetrySuccess) {
        onRetrySuccess(res.execution);
      }
      if (onRefresh) {
        onRefresh();
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to retry execution");
    } finally {
      setRetryingId(null);
    }
  };

  const getStatusBadge = (status) => {
    const map = {
      completed: { bg: "#dcfce7", color: "#15803d", text: "SUCCESS" },
      failed: { bg: "#fee2e2", color: "#b91c1c", text: "FAILED" },
      running: { bg: "#e0f2fe", color: "#0369a1", text: "RUNNING" },
      pending: { bg: "#fef3c7", color: "#b45309", text: "PENDING" },
    };
    const style = map[status] || { bg: "#f3f4f6", color: "#374151", text: status?.toUpperCase() };
    return (
      <span
        style={{
          backgroundColor: style.bg,
          color: style.color,
          padding: "3px 8px",
          borderRadius: "12px",
          fontSize: "11px",
          fontWeight: "700",
          letterSpacing: "0.5px",
        }}
      >
        {style.text}
      </span>
    );
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        bottom: 0,
        width: "520px",
        backgroundColor: "#1e1e24",
        color: "#f3f4f6",
        boxShadow: "-5px 0 25px rgba(0,0,0,0.5)",
        zIndex: 1000,
        display: "flex",
        flexDirection: "column",
        borderLeft: "1px solid #2d2d3a",
        fontFamily: "Inter, sans-serif",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "18px 22px",
          borderBottom: "1px solid #2d2d3a",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          backgroundColor: "#18181f",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "20px" }}>📜</span>
          <h3 style={{ margin: 0, fontSize: "17px", fontWeight: "600" }}>
            Execution History
          </h3>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={onRefresh}
            disabled={isLoading}
            style={{
              background: "#2d2d3a",
              border: "none",
              color: "#e5e7eb",
              padding: "6px 12px",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "12px",
            }}
          >
            {isLoading ? "Refreshing..." : "↻ Refresh"}
          </button>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "#9ca3af",
              fontSize: "18px",
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: "14px" }}>
        {selectedExecution ? (
          /* Execution Detail & Node Logs View */
          <div>
            <button
              onClick={() => setSelectedExecution(null)}
              style={{
                background: "transparent",
                border: "none",
                color: "#60a5fa",
                cursor: "pointer",
                padding: "0 0 12px 0",
                fontSize: "13px",
                display: "flex",
                alignItems: "center",
                gap: "5px",
              }}
            >
              ← Back to all executions
            </button>

            <div
              style={{
                backgroundColor: "#252530",
                borderRadius: "8px",
                padding: "16px",
                border: "1px solid #323244",
                marginBottom: "16px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span style={{ fontSize: "14px", fontWeight: "600" }}>Execution #{selectedExecution._id.slice(-6)}</span>
                {getStatusBadge(selectedExecution.status)}
              </div>
              <div style={{ fontSize: "12px", color: "#9ca3af", display: "flex", flexDirection: "column", gap: "4px" }}>
                <div>Triggered: <strong>{selectedExecution.triggeredBy || "manual"}</strong></div>
                <div>Started: {new Date(selectedExecution.startedAt || selectedExecution.createdAt).toLocaleString()}</div>
                <div>Duration: <strong>{selectedExecution.durationMs ? `${selectedExecution.durationMs}ms` : "N/A"}</strong></div>
                {selectedExecution.error && (
                  <div style={{ color: "#ef4444", marginTop: "6px", padding: "8px", background: "rgba(239,68,68,0.1)", borderRadius: "4px" }}>
                    ⚠️ {selectedExecution.error}
                  </div>
                )}
              </div>
            </div>

            <h4 style={{ margin: "0 0 10px 0", fontSize: "14px", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Node-Level Execution Logs ({selectedExecution.nodeLogs?.length || 0})
            </h4>

            {(!selectedExecution.nodeLogs || selectedExecution.nodeLogs.length === 0) ? (
              <div style={{ color: "#6b7280", fontSize: "13px", textAlign: "center", padding: "20px" }}>
                No node logs recorded for this execution.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {selectedExecution.nodeLogs.map((log, idx) => (
                  <div
                    key={log.nodeId || idx}
                    style={{
                      backgroundColor: "#252530",
                      borderRadius: "6px",
                      border: "1px solid #323244",
                      padding: "12px",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                      <span style={{ fontWeight: "600", fontSize: "13px" }}>
                        {idx + 1}. {log.label || log.nodeId}
                      </span>
                      {getStatusBadge(log.status)}
                    </div>

                    <div style={{ fontSize: "11px", color: "#9ca3af", marginBottom: "8px" }}>
                      Type: <code>{log.nodeType}</code> • Duration: {log.durationMs ? `${log.durationMs}ms` : "-"}
                    </div>

                    {log.error && (
                      <div style={{ color: "#f87171", fontSize: "12px", background: "#3b1c1c", padding: "6px 8px", borderRadius: "4px", marginBottom: "6px" }}>
                        Error: {log.error}
                      </div>
                    )}

                    {log.output && (
                      <details style={{ fontSize: "11px", color: "#cbd5e1", marginTop: "4px" }}>
                        <summary style={{ cursor: "pointer", color: "#60a5fa" }}>View Output Payload</summary>
                        <pre style={{ background: "#18181f", padding: "8px", borderRadius: "4px", overflowX: "auto", marginTop: "4px" }}>
                          {JSON.stringify(log.output, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Execution List View */
          <div>
            {executions.length === 0 ? (
              <div style={{ textAlign: "center", color: "#6b7280", padding: "40px 10px", fontSize: "14px" }}>
                ⚡ No executions recorded yet.<br />Run this workflow to view historical logs!
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {executions.map((exec) => (
                  <div
                    key={exec._id}
                    onClick={() => handleSelect(exec)}
                    style={{

                      backgroundColor: "#252530",
                      borderRadius: "8px",
                      padding: "14px",
                      border: "1px solid #323244",
                      cursor: "pointer",
                      transition: "border-color 0.15s ease",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#6366f1")}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#323244")}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                      <span style={{ fontWeight: "600", fontSize: "13px" }}>
                        #{exec._id.slice(-6)}
                      </span>
                      {getStatusBadge(exec.status)}
                    </div>

                    <div style={{ fontSize: "12px", color: "#9ca3af", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span>{new Date(exec.createdAt).toLocaleTimeString()} • {exec.durationMs ? `${exec.durationMs}ms` : "-"}</span>
                      <div style={{ display: "flex", gap: "8px" }}>
                        {exec.status === "failed" && (
                          <button
                            onClick={(e) => handleRetry(e, exec._id)}
                            disabled={retryingId === exec._id}
                            style={{
                              background: "#374151",
                              color: "#f3f4f6",
                              border: "none",
                              borderRadius: "4px",
                              padding: "3px 8px",
                              fontSize: "11px",
                              cursor: "pointer",
                            }}
                          >
                            {retryingId === exec._id ? "Retrying..." : "↻ Retry"}
                          </button>
                        )}
                        <span style={{ color: "#60a5fa", fontSize: "12px" }}>Details →</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
