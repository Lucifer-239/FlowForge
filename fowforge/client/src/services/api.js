import axios from "axios";

const API_URL = "http://localhost:5001/api";

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Automatic request interceptor: attach token from localStorage
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Automatic response interceptor: if 401 Unauthorized (expired/invalid token), clear storage and redirect
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const msg = error.response.data?.message || "";
      if (
        msg.toLowerCase().includes("token") ||
        msg.toLowerCase().includes("not authorized") ||
        msg.toLowerCase().includes("expired")
      ) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        // Dispatch storage event so App can instantly sync back to login screen
        window.dispatchEvent(new Event("auth:expired"));
      }
    }
    return Promise.reject(error);
  }
);

export const registerUser = async (userData) => {
  const response = await api.post("/auth/register", userData);
  return response.data;
};

export const loginUser = async (userData) => {
  const response = await api.post("/auth/login", userData);
  return response.data;
};

export const getProfile = async (token) => {
  const response = await api.get("/auth/profile", {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  return response.data;
};

export default api;


// =====================================
// WORKFLOW API
// =====================================

export const createWorkflow = async (workflowData, token) => {
  const response = await api.post(
    "/workflows",
    workflowData,
    token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
  );

  return response.data;
};


export const getWorkflows = async (token) => {
  const response = await api.get(
    "/workflows",
    token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
  );

  return response.data;
};


export const getWorkflow = async (workflowId, token) => {
  const response = await api.get(
    `/workflows/${workflowId}`,
    token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
  );

  return response.data;
};


export const updateWorkflow = async (workflowId, workflowData, token) => {
  const response = await api.put(
    `/workflows/${workflowId}`,
    workflowData,
    token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
  );

  return response.data;
};


export const deleteWorkflow = async (workflowId, token) => {
  const response = await api.delete(
    `/workflows/${workflowId}`,
    token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
  );

  return response.data;
};


// =====================================
// EXECUTION API
// =====================================

export const executeWorkflow = async (workflowId, triggerData = {}, token) => {
  const response = await api.post(
    `/workflows/${workflowId}/execute`,
    { triggerData },
    token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
  );

  return response.data;
};

export const getWorkflowExecutions = async (workflowId, token) => {
  const response = await api.get(
    `/workflows/${workflowId}/executions`,
    token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
  );

  return response.data;
};

export const getExecutionDetails = async (executionId, token) => {
  const response = await api.get(
    `/executions/${executionId}`,
    token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
  );

  return response.data;
};

export const retryExecution = async (executionId, token) => {
  const response = await api.post(
    `/executions/${executionId}/retry`,
    {},
    token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
  );

  return response.data;
};

export const toggleWorkflowStatus = async (workflowId, token) => {
  const response = await api.patch(
    `/workflows/${workflowId}/toggle-status`,
    {},
    token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
  );

  return response.data;
};

export const getSystemAnalytics = async (token) => {
  const response = await api.get(
    "/executions/analytics/overview",
    token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
  );

  return response.data;
};
