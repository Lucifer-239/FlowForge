import { useState, useEffect } from "react";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import WorkflowEditor from "./pages/WorkflowEditor";

import "./App.css";

function App() {

  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("user");
    const savedToken = localStorage.getItem("token");

    // Only consider logged in if both user and token exist
    if (!savedUser || !savedToken) {
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      return null;
    }

    try {
      return JSON.parse(savedUser);
    } catch {
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      return null;
    }
  });


  const [showRegister, setShowRegister] = useState(false);
  const [showWorkflowEditor, setShowWorkflowEditor] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState(null);

  // Auto-listen for expired/invalid tokens from the axios interceptor
  useEffect(() => {
    const handleAuthExpired = () => {
      setUser(null);
      setSelectedWorkflow(null);
      setShowWorkflowEditor(false);
    };

    window.addEventListener("auth:expired", handleAuthExpired);
    return () => window.removeEventListener("auth:expired", handleAuthExpired);
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    setUser(null);
    setSelectedWorkflow(null);
    setShowWorkflowEditor(false);
  };


  // -----------------------------
  // Workflow Editor
  // -----------------------------

  if (user && showWorkflowEditor) {
    return (
      <WorkflowEditor
        workflow={selectedWorkflow}
        onBack={() => {
          setShowWorkflowEditor(false);
          setSelectedWorkflow(null);
        }}
      />
    );
  }


  // -----------------------------
  // Dashboard
  // -----------------------------

  if (user) {
    return (
      <Dashboard
        user={user}
        onLogout={handleLogout}
        onCreateWorkflow={() => {
          setSelectedWorkflow(null);
          setShowWorkflowEditor(true);
        }}
        onOpenWorkflow={(workflow) => {
          setSelectedWorkflow(workflow);
          setShowWorkflowEditor(true);
        }}
      />
    );
  }


  // -----------------------------
  // Register
  // -----------------------------

  if (showRegister) {
    return (
      <div>
        <Register
          onRegister={handleLogin}
        />

        <div className="switch-auth">
          <span>Already have an account?</span>
          <button onClick={() => setShowRegister(false)}>
            Login
          </button>
        </div>
      </div>
    );
  }


  // -----------------------------
  // Login
  // -----------------------------

  return (
    <div>
      <Login
        onLogin={handleLogin}
      />

      <div className="switch-auth">
        <span>Don't have an account?</span>
        <button
          onClick={() => setShowRegister(true)}
        >
          Create account
        </button>
      </div>
    </div>
  );
}

export default App;
