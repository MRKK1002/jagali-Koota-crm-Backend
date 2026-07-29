const WorkOrder = require("../model/WorkOrder");
const Project = require("../model/Project");

// Generate work order number
const generateWorkOrderNumber = async () => {
  const count = await WorkOrder.countDocuments();
  return `WO-${String(count + 1).padStart(4, "0")}`;
};

// Get all work orders with project details
exports.getAllWorkOrders = async (req, res) => {
  try {
    const workOrders = await WorkOrder.find()
      .populate("projectId")
      .sort({ createdAt: -1 });
    res.json(workOrders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get work order by ID
exports.getWorkOrderById = async (req, res) => {
  try {
    const workOrder = await WorkOrder.findById(req.params.id).populate(
      "projectId"
    );
    if (!workOrder) {
      return res.status(404).json({ message: "Work order not found" });
    }
    res.json(workOrder);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create new work order
exports.createWorkOrder = async (req, res) => {
  try {
    const workOrderNumber = await generateWorkOrderNumber();
    const workOrderData = {
      ...req.body,
      workOrderNumber,
    };

    const workOrder = new WorkOrder(workOrderData);
    const savedWorkOrder = await workOrder.save();
    await savedWorkOrder.populate("projectId");

    res.status(201).json(savedWorkOrder);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Update work order status
exports.updateWorkOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const updateData = { status };

    if (status === "completed") {
      updateData.completedDate = new Date();
    }

    const workOrder = await WorkOrder.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate("projectId");

    if (!workOrder) {
      return res.status(404).json({ message: "Work order not found" });
    }

    res.json(workOrder);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Update work order billing status
exports.updateWorkOrderBilling = async (req, res) => {
  try {
    const workOrder = await WorkOrder.findByIdAndUpdate(
      req.params.id,
      { status: "billed" },
      { new: true, runValidators: true }
    ).populate("projectId");

    if (!workOrder) {
      return res.status(404).json({ message: "Work order not found" });
    }

    res.json(workOrder);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Get work order statistics
exports.getWorkOrderStats = async (req, res) => {
  try {
    const stats = await WorkOrder.aggregate([
      {
        $group: {
          _id: "$status",
          totalHours: { $sum: "$estimatedHours" },
          count: { $sum: 1 },
        },
      },
    ]);

    // Format stats
    const formattedStats = {
      byStatus: {},
      completedThisWeek: 0,
      totalWorkOrders: await WorkOrder.countDocuments(),
    };

    stats.forEach((stat) => {
      formattedStats.byStatus[stat._id] = {
        totalHours: stat.totalHours,
        count: stat.count,
      };
    });

    // Calculate completed this week
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    formattedStats.completedThisWeek = await WorkOrder.countDocuments({
      status: "completed",
      completedDate: { $gte: oneWeekAgo },
    });

    res.json(formattedStats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
