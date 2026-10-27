const mongoose = require("mongoose");

const nodeLogSchema = new mongoose.Schema(
  {
    nodeId: {
      type: String,
      required: true,
    },
    nodeType: {
      type: String,
      required: true,
    },
    label: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["pending", "running", "completed", "failed", "skipped"],
      default: "pending",
    },
    input: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    output: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    error: {
      type: String,
      default: null,
    },
    startedAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
    durationMs: {
      type: Number,
      default: 0,
    },
  },
  { _id: false }
);

const executionSchema = new mongoose.Schema(
  {
    workflow: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workflow",
      required: true,
      index: true,
    },
    triggeredBy: {
      type: String,
      enum: ["manual", "schedule", "webhook"],
      default: "manual",
    },
    status: {
      type: String,
      enum: ["pending", "running", "completed", "failed", "cancelled"],
      default: "pending",
      index: true,
    },
    triggerData: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    context: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    nodeLogs: [nodeLogSchema],
    error: {
      type: String,
      default: null,
    },
    startedAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
    durationMs: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Execution", executionSchema);
