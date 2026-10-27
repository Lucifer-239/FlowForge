import React, { useState, useCallback } from "react";
import { ToastContext } from "./toastContext";

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = "info", duration = 3500) => {
    const id = Date.now() + Math.random().toString();
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div
        style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          pointerEvents: "none",
        }}
      >
        {toasts.map((toast) => {
          let bg = "#1f2937";
          let border = "#374151";
          let icon = "ℹ️";

          if (toast.type === "success") {
            bg = "#064e3b";
            border = "#059669";
            icon = "✅";
          } else if (toast.type === "error") {
            bg = "#450a0a";
            border = "#dc2626";
            icon = "❌";
          } else if (toast.type === "warning") {
            bg = "#78350f";
            border = "#d97706";
            icon = "⚠️";
          }

          return (
            <div
              key={toast.id}
              style={{
                pointerEvents: "auto",
                backgroundColor: bg,
                border: `1px solid ${border}`,
                color: "#f9fafb",
                padding: "12px 18px",
                borderRadius: "8px",
                boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
                fontSize: "13px",
                fontWeight: "500",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                minWidth: "260px",
                maxWidth: "380px",
              }}
            >
              <span>{icon}</span>
              <span style={{ flex: 1 }}>{toast.message}</span>
              <button
                onClick={() => removeToast(toast.id)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#9ca3af",
                  cursor: "pointer",
                  fontSize: "14px",
                }}
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
