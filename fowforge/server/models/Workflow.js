const mongoose = require("mongoose");

const workflowSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
    },

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    nodes: {
      type: Array,
      default: [],
    },

    edges: {
      type: Array,
      default: [],
    },

    status: {
      type: String,
      enum: ["draft", "active", "inactive"],
      default: "draft",
    },

    schedule: {
      isEnabled: {
        type: Boolean,
        default: false,
      },
      cronExpression: {
        type: String,
        default: "", // e.g. "*/15 * * * *"
      },
      lastRunAt: {
        type: Date,
      },
      nextRunAt: {
        type: Date,
      },
    },

    webhookToken: {
      type: String,
      default: () => require("crypto").randomBytes(16).toString("hex"),
    },

  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Workflow", workflowSchema);