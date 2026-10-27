const axios = require("axios");

/**
 * Resolves templated variables in strings, e.g. {{trigger.body.userId}}
 */
function resolveTemplate(str, context) {
  if (typeof str !== "string") return str;
  return str.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
    const keys = path.trim().split(".");
    let val = context;
    for (const key of keys) {
      if (val === undefined || val === null) return "";
      val = val[key];
    }
    return val !== undefined ? String(val) : "";
  });
}

/**
 * Execute HTTP Request node
 */
async function executeHttpRequest(node, context) {
  const config = node.data?.config || {};
  const method = (config.method || "GET").toUpperCase();
  const url = resolveTemplate(config.url || "https://httpbin.org/get", context);

  let headers = {};
  if (config.headers) {
    if (typeof config.headers === "object") {
      headers = config.headers;
    } else if (typeof config.headers === "string" && config.headers.trim()) {
      try {
        headers = JSON.parse(config.headers.trim());
      } catch (err) {
        throw new Error(`Invalid JSON in Request Headers: ${err.message}`);
      }
    }
  }

  // Ensure Content-Type is json for POST/PUT/PATCH if body exists
  if (["POST", "PUT", "PATCH"].includes(method) && !headers["Content-Type"] && !headers["content-type"]) {
    headers["Content-Type"] = "application/json";
  }

  let body = config.body;
  if (body && typeof body === "string" && body.trim()) {
    try {
      body = JSON.parse(resolveTemplate(body.trim(), context));
    } catch {
      body = resolveTemplate(body, context);
    }
  }

  try {
    const response = await axios({
      method,
      url,
      headers,
      data: ["POST", "PUT", "PATCH"].includes(method) ? body : undefined,
      timeout: 15000,
    });

    return {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      data: response.data,
    };
  } catch (axiosError) {
    // If remote API returned error response (like Resend 403), extract its exact error message
    if (axiosError.response) {
      const remoteMsg =
        axiosError.response.data?.message ||
        JSON.stringify(axiosError.response.data) ||
        axiosError.response.statusText;
      throw new Error(`API returned HTTP ${axiosError.response.status}: ${remoteMsg}`);
    }
    throw axiosError;
  }
}

/**
 * Execute Condition node
 * Returns { result: boolean, valueEvaluated, condition }
 */
async function executeCondition(node, context) {
  const config = node.data?.config || {};
  const fieldPath = config.field || "";
  const operator = config.operator || "equals";
  const expectedValue = config.value !== undefined ? String(config.value) : "";

  // Extract field from context using dot notation
  const keys = fieldPath.trim().split(".");
  let actualValue = context;
  for (const k of keys) {
    if (actualValue === undefined || actualValue === null) {
      actualValue = undefined;
      break;
    }
    actualValue = actualValue[k];
  }

  let actualStr = actualValue !== undefined && actualValue !== null ? String(actualValue) : "";
  let matches = false;

  switch (operator) {
    case "equals":
    case "==":
      matches = actualStr === expectedValue;
      break;
    case "notEquals":
    case "!=":
      matches = actualStr !== expectedValue;
      break;
    case "contains":
      matches = actualStr.toLowerCase().includes(expectedValue.toLowerCase());
      break;
    case "greaterThan":
    case ">":
      matches = Number(actualValue) > Number(expectedValue);
      break;
    case "lessThan":
    case "<":
      matches = Number(actualValue) < Number(expectedValue);
      break;
    case "exists":
      matches = actualValue !== undefined && actualValue !== null && actualValue !== "";
      break;
    default:
      matches = Boolean(actualValue);
  }

  return {
    result: matches,
    field: fieldPath,
    actualValue,
    expectedValue,
    operator,
  };
}

/**
 * Execute Delay node
 */
async function executeDelay(node) {
  const config = node.data?.config || {};
  const ms = Math.min(Number(config.ms || 1000), 30000); // capped at 30 seconds for now
  await new Promise((resolve) => setTimeout(resolve, ms));
  return { delayedMs: ms };
}

module.exports = {
  executeHttpRequest,
  executeCondition,
  executeDelay,
};
