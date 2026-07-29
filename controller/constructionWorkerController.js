const ConstructionWorker = require("../model/ConstructionWorker");
const ConstructionWorkerAttendance = require("../model/ConstructionWorkerAttendance");
const mongoose = require("mongoose");

// Get all workers
const getWorkers = async (req, res) => {
  try {
    const { siteId, status, trade } = req.query;

    let filter = {};
    if (siteId) filter.siteId = siteId;
    if (status) filter.status = status;
    if (trade) filter.trade = trade;

    const workers = await ConstructionWorker.find(filter)
      .populate("siteId", "name location")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: workers,
      count: workers.length,
    });
  } catch (error) {
    console.error("Error fetching workers:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch workers",
      error: error.message,
    });
  }
};

// Get worker by ID
const getWorkerById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid worker ID",
      });
    }

    const worker = await ConstructionWorker.findById(id).populate(
      "siteId",
      "name location"
    );

    if (!worker) {
      return res.status(404).json({
        success: false,
        message: "Worker not found",
      });
    }

    res.status(200).json({
      success: true,
      data: worker,
    });
  } catch (error) {
    console.error("Error fetching worker:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch worker",
      error: error.message,
    });
  }
};

// Create new worker
const createWorker = async (req, res) => {
  try {
    const {
      name,
      phone,
      trade,
      dailyWage,
      address,
      emergencyContact,
      joiningDate,
      status,
      siteId,
      registeredBy,
      aadharNumber,
      bankDetails,
      skills,
      experience,
    } = req.body;

    // Validate required fields
    if (!name || !phone || !trade || !dailyWage || !siteId) {
      return res.status(400).json({
        success: false,
        message: "Name, phone, trade, daily wage, and site ID are required",
      });
    }

    // Check if worker with same phone already exists
    const existingWorker = await ConstructionWorker.findOne({ phone });
    if (existingWorker) {
      return res.status(400).json({
        success: false,
        message: "Worker with this phone number already exists",
      });
    }

    const worker = new ConstructionWorker({
      name,
      phone,
      trade,
      dailyWage,
      address,
      emergencyContact,
      joiningDate: joiningDate || new Date(),
      status: status || "Active",
      siteId,
      registeredBy: registeredBy || "Site Supervisor",
      aadharNumber,
      bankDetails,
      skills,
      experience,
    });

    const savedWorker = await worker.save();
    await savedWorker.populate("siteId", "name location");

    res.status(201).json({
      success: true,
      message: "Worker registered successfully",
      data: savedWorker,
    });
  } catch (error) {
    console.error("Error creating worker:", error);

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Worker with this phone number already exists",
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to register worker",
      error: error.message,
    });
  }
};

// Update worker
const updateWorker = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid worker ID",
      });
    }

    // Remove fields that shouldn't be updated directly
    delete updateData._id;
    delete updateData.createdAt;
    delete updateData.updatedAt;

    const worker = await ConstructionWorker.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).populate("siteId", "name location");

    if (!worker) {
      return res.status(404).json({
        success: false,
        message: "Worker not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Worker updated successfully",
      data: worker,
    });
  } catch (error) {
    console.error("Error updating worker:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update worker",
      error: error.message,
    });
  }
};

// Delete worker
const deleteWorker = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid worker ID",
      });
    }

    const worker = await ConstructionWorker.findByIdAndDelete(id);

    if (!worker) {
      return res.status(404).json({
        success: false,
        message: "Worker not found",
      });
    }

    // Also delete all attendance records for this worker
    await ConstructionWorkerAttendance.deleteMany({ workerId: id });

    res.status(200).json({
      success: true,
      message: "Worker deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting worker:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete worker",
      error: error.message,
    });
  }
};

// Get worker statistics
const getWorkerStats = async (req, res) => {
  try {
    const { siteId } = req.query;

    let matchFilter = {};
    if (siteId) matchFilter.siteId = new mongoose.Types.ObjectId(siteId);

    const stats = await ConstructionWorker.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: null,
          totalWorkers: { $sum: 1 },
          activeWorkers: {
            $sum: { $cond: [{ $eq: ["$status", "Active"] }, 1, 0] },
          },
          inactiveWorkers: {
            $sum: { $cond: [{ $eq: ["$status", "Inactive"] }, 1, 0] },
          },
          tradeBreakdown: {
            $push: "$trade",
          },
          avgDailyWage: { $avg: "$dailyWage" },
          totalDailyWages: { $sum: "$dailyWage" },
        },
      },
    ]);

    // Get trade breakdown
    const tradeStats = await ConstructionWorker.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: "$trade",
          count: { $sum: 1 },
          avgWage: { $avg: "$dailyWage" },
        },
      },
      { $sort: { count: -1 } },
    ]);

    res.status(200).json({
      success: true,
      data: {
        overview: stats[0] || {
          totalWorkers: 0,
          activeWorkers: 0,
          inactiveWorkers: 0,
          avgDailyWage: 0,
          totalDailyWages: 0,
        },
        tradeBreakdown: tradeStats,
      },
    });
  } catch (error) {
    console.error("Error fetching worker stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch worker statistics",
      error: error.message,
    });
  }
};

module.exports = {
  getWorkers,
  getWorkerById,
  createWorker,
  updateWorker,
  deleteWorker,
  getWorkerStats,
};
