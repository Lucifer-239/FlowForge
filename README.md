# FlowForge ⚡
> Advanced Visual Workflow Automation Platform

FlowForge is a full-stack, production-grade visual workflow automation platform. It empowers users to visually design, configure, execute, monitor, and schedule complex automated workflows on an interactive drag-and-drop canvas with background asynchronous job processing and live node-level execution tracking.

---

## 🌟 Key Features

### 🎨 Visual Workflow Canvas
- **Interactive Drag-and-Drop Editor**: Powered by React Flow with custom designed `Trigger`, `Action`, and `Condition` nodes.
- **Dynamic Branching**: Supports conditional decision logic (`==`, `!=`, `>`, `<`, `contains`, `exists`) navigating distinct `true` and `false` execution paths.
- **Node-Level Configuration**: Side panel to configure HTTP request endpoints, headers, JSON body templates (`{{trigger.data}}`), wait times, and error handling policies.
- **Live Visual Execution States**: Glowing animations and color-coded statuses directly on canvas nodes (`running`, `completed`, `failed`) and animated flow paths along active edges.
- **Canvas Keyboard Shortcuts**: Quickly select nodes and hit `Delete` or `Backspace` to remove nodes and connected edges.

### ⚙️ Asynchronous Execution Engine & Resilient Queues
- **DAG Traversal Engine**: Analyzes directed acyclic graphs, evaluates conditions, and runs actions sequentially or branched.
- **Asynchronous Background Processing (BullMQ & Redis)**: Offloads workflow execution from the main HTTP loop to dedicated workers.
- **Zero-Crash Fallback**: Automatically operates in asynchronous in-memory background dispatch when local Redis is offline, allowing seamless instant development.
- **Configurable Failure Policies**: Node-by-node error handling policies:
  - 🛑 `Stop`: Immediately aborts execution upon failure.
  - ↻ `Auto-Retry`: Automatically retries failing nodes up to 2 times with exponential backoff.
  - ⏭ `Continue`: Captures the error payload and allows downstream nodes to proceed.

### ⏰ Scheduling & External Webhooks
- **Automated Cron Jobs**: Built-in scheduling powered by `node-cron`. Supports standard expressions (e.g., `*/15 * * * *`, `0 * * * *`).
- **External Webhooks**: Public webhook URL (`POST /api/webhooks/:workflowId`) to trigger workflows from third-party applications (GitHub, Stripe, custom webhooks) with payload injection.
- **Active / Inactive Status**: One-click toggling to activate or deactivate schedules and webhook receivers.

### 📜 Execution History & Node-by-Node Audit
- **Slide-out History Drawer**: Detailed audit log of all previous executions.
- **Step-by-step Log Inspector**: Expand any run to view per-node inputs, outputs, timestamps, runtime durations, and stack traces.
- **One-Click Retry**: Re-queue failed or cancelled runs immediately from the history view.
- **Canvas Replay**: Click past runs to project that specific execution path and status onto the visual canvas.

### 📊 Real-Time Metrics & Security Hardening
- **Analytics Overview**: Live dashboard counters for total workflows, active automations, scheduled runs, success rate %, average latency (ms), and recent activity feed.
- **Security**: Hardened with `helmet` HTTP headers, payload constraints, and `express-rate-limit` protection across auth and API endpoints.
- **Toast Notifications**: Clean, non-blocking notification alerts replacing default browser modals.

---

## 🏗️ Architecture

```
                       ┌────────────────────────┐
                       │   React + Vite Client  │
                       │ (React Flow + Zustand) │
                       └───────────┬────────────┘
                                   │ HTTP / REST
                                   ▼
                       ┌────────────────────────┐
                       │  Express.js API Server │
                       │ (Helmet + Rate Limiter)│
                       └─────┬────────────┬─────┘
                             │            │
            Enqueues Jobs    │            │ Persists Workflows,
                             ▼            │ Users, and Executions
        ┌─────────────────────────┐       │
        │   BullMQ / Redis Queue  │       ▼
        │ (or Async Task Runner)  │  ┌──────────────┐
        └────────────┬────────────┘  │   MongoDB    │
                     │ Dispatches    │   Database   │
                     ▼               └──────────────┘
        ┌─────────────────────────┐
        │   Background Worker     │
        │           &             │
        │ Workflow DAG Engine     │
        └─────────────────────────┘
```

---

## 🚀 Quick Start Guide

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- [MongoDB](https://www.mongodb.com/) (Local or Atlas connection string)
- *(Optional)* [Redis](https://redis.io/) or [Upstash](https://upstash.com/) for BullMQ production queueing (runs in in-memory async mode if offline).

### 1. Clone the repository
```bash
git clone https://github.com/your-username/FlowForge.git
cd FlowForge
```

### 2. Configure Backend
```bash
cd fowforge/server
npm install
```

Create a `.env` file in `fowforge/server/.env`:
```env
PORT=5001
MONGO_URI=mongodb://localhost:27017/flowforge
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRES_IN=7d

# Optional Redis configuration (falls back to async runner if omitted)
# REDIS_URL=redis://127.0.0.1:6379
```

Start the backend:
```bash
npm run dev
# or npm start
```

### 3. Configure Frontend
Open a new terminal window:
```bash
cd fowforge/client
npm install
npm run dev
```

Visit **`http://localhost:5173`** in your browser!

---

## 📡 API Reference

### Authentication (`/api/auth`)
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Register a new user |
| `POST` | `/api/auth/login` | Authenticate user & receive JWT token |
| `GET` | `/api/auth/profile` | Retrieve authenticated user profile |

### Workflows (`/api/workflows`)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/workflows` | List all workflows belonging to the user |
| `POST` | `/api/workflows` | Create a new workflow graph |
| `GET` | `/api/workflows/:id` | Fetch specific workflow details |
| `PUT` | `/api/workflows/:id` | Update workflow canvas, nodes, edges, or schedule |
| `DELETE` | `/api/workflows/:id` | Delete workflow and remove active cron schedules |
| `PATCH` | `/api/workflows/:id/toggle-status` | Toggle active / inactive status |

### Execution & Engine (`/api/executions` & `/api/workflows`)
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/workflows/:id/execute` | Asynchronously trigger workflow execution via queue |
| `GET` | `/api/workflows/:id/executions` | Fetch paginated execution history for a workflow |
| `GET` | `/api/executions/:executionId` | Fetch node-by-node execution logs and outputs |
| `POST` | `/api/executions/:executionId/retry` | Re-queue and retry an execution run |
| `GET` | `/api/executions/analytics/overview` | Fetch system metrics, success rate, and recent activity |

### Webhooks (`/api/webhooks`)
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/webhooks/:workflowId` | Trigger active workflow via external HTTP POST webhook |

---

## 🧪 15-Day Deliverable Checklist

- [x] Day 1-2: User Registration, Login & JWT Authentication
- [x] Day 3: Dashboard Architecture & Workflow CRUD
- [x] Day 4-5: Visual Workflow Canvas & React Flow Custom Nodes
- [x] Day 6: MongoDB Graph Schema & Edge/Node Persistence
- [x] Day 7: Workflow Execution Engine, Context Passing & Handlers
- [x] Day 8: Asynchronous BullMQ & Redis Queue with Resilient Fallback
- [x] Day 9: Execution History Drawer & Node-Level Logs API
- [x] Day 10: Canvas Visual Execution State (Live Glowing Animations)
- [x] Day 11: Workflow Scheduling (Cron Jobs) & Webhook Automations
- [x] Day 12: Failure Handling, Auto-Retries & Node Error Policies
- [x] Day 13: Admin Dashboard Metrics & Real-Time Analytics
- [x] Day 14: Security Hardening (Helmet, Rate Limiter) & UI Toast Polish
- [x] Day 15: Full Documentation, Architecture & Final Project Polish

---

## 📄 License
This project is licensed under the MIT License.
