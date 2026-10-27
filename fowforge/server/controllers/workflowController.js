const Workflow = require("../models/Workflow");

// =====================================
// CREATE WORKFLOW
// =====================================

const createWorkflow = async (req, res) => {
  try {
    const {
      name,
      description,
      nodes,
      edges,
      status,
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Workflow name is required",
      });
    }

    const workflow = await Workflow.create({
      name: name.trim(),
      description: description || "",
      nodes: nodes || [],
      edges: edges || [],
      status: status || "draft",
      owner: req.user.id,
    });

    res.status(201).json({
      success: true,
      message: "Workflow created successfully",
      workflow,
    });
  } catch (error) {
    console.error("Create workflow error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create workflow",
    });
  }
};


// =====================================
// GET ALL USER WORKFLOWS
// =====================================

const getWorkflows = async (req, res) => {
  try {
    const workflows = await Workflow.find({
      owner: req.user.id,
    }).sort({
      updatedAt: -1,
    });

    res.json({
      success: true,
      count: workflows.length,
      workflows,
    });
  } catch (error) {
    console.error("Get workflows error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch workflows",
    });
  }
};


// =====================================
// GET SINGLE WORKFLOW
// =====================================

const getWorkflow = async (req, res) => {
  try {
    const workflow = await Workflow.findOne({
      _id: req.params.id,
      owner: req.user.id,
    });

    if (!workflow) {
      return res.status(404).json({
        success: false,
        message: "Workflow not found",
      });
    }

    res.json({
      success: true,
      workflow,
    });
  } catch (error) {
    console.error("Get workflow error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch workflow",
    });
  }
};


const {
  scheduleWorkflow,
  unscheduleWorkflow,
} = require("../services/schedulerService");

// =====================================
// UPDATE WORKFLOW
// =====================================

const updateWorkflow = async (req, res) => {
  try {
    const {
      name,
      description,
      nodes,
      edges,
      status,
      schedule,
    } = req.body;

    const workflow = await Workflow.findOne({
      _id: req.params.id,
      owner: req.user.id,
    });

    if (!workflow) {
      return res.status(404).json({
        success: false,
        message: "Workflow not found",
      });
    }

    if (name !== undefined) {
      workflow.name = name.trim();
    }

    if (description !== undefined) {
      workflow.description = description;
    }

    if (nodes !== undefined) {
      workflow.nodes = nodes;
    }

    if (edges !== undefined) {
      workflow.edges = edges;
    }

    if (status !== undefined) {
      workflow.status = status;
    }

    if (schedule !== undefined) {
      workflow.schedule = {
        ...workflow.schedule,
        ...schedule,
      };
    }

    await workflow.save();

    // Sync background scheduler with new state
    scheduleWorkflow(workflow);

    res.json({
      success: true,
      message: "Workflow updated successfully",
      workflow,
    });
  } catch (error) {
    console.error("Update workflow error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update workflow",
    });
  }
};



// =====================================
// DELETE WORKFLOW
// =====================================

const deleteWorkflow = async (req, res) => {
  try {
    const workflow = await Workflow.findOneAndDelete({
      _id: req.params.id,
      owner: req.user.id,
    });

    if (!workflow) {
      return res.status(404).json({
        success: false,
        message: "Workflow not found",
      });
    }

    unscheduleWorkflow(workflow._id);

    res.json({
      success: true,
      message: "Workflow deleted successfully",
    });
  } catch (error) {
    console.error("Delete workflow error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete workflow",
    });
  }
};

// =====================================
// TOGGLE WORKFLOW STATUS (ACTIVE / INACTIVE)
// =====================================

const toggleWorkflowStatus = async (req, res) => {
  try {
    const workflow = await Workflow.findOne({
      _id: req.params.id,
      owner: req.user.id,
    });

    if (!workflow) {
      return res.status(404).json({
        success: false,
        message: "Workflow not found",
      });
    }

    workflow.status = workflow.status === "active" ? "inactive" : "active";
    await workflow.save();

    // Sync schedule based on new active status
    scheduleWorkflow(workflow);

    res.json({
      success: true,
      message: `Workflow marked as ${workflow.status}`,
      status: workflow.status,
      workflow,
    });
  } catch (error) {
    console.error("Toggle status error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to toggle workflow status",
    });
  }
};

module.exports = {
  createWorkflow,
  getWorkflows,
  getWorkflow,
  updateWorkflow,
  deleteWorkflow,
  toggleWorkflowStatus,
};