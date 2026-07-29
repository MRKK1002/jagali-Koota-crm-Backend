const Worker = require("../model/Worker");
const Site = require("../model/Site");

// Generate unique worker code
const generateWorkerCode = async () => {
  const prefix = "WKR";
  const lastWorker = await Worker.findOne().sort({ createdAt: -1 });
  
  if (!lastWorker || !lastWorker.workerCode) {
    return `${prefix}-001`;
  }
  
  const lastNumber = parseInt(lastWorker.workerCode.split("-")[1]) || 0;
  const newNumber = lastNumber + 1;
  
  return `${prefix}-${String(newNumber).padStart(3, "0")}`;
};

// Register new worker
exports.registerWorker = async (req, res) => {
  try {
    const {
      name,
      phone,
      alternatePhone,
      address,
      city,
      state,
      pincode,
      workerType,
      skillLevel,
      dailyWage,
      aadharNumber,
      emergencyContact,
    } = req.body;

    if (!name || !phone || !workerType || !dailyWage) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields",
      });
    }

    // Auto-generate worker code
    const workerCode = await generateWorkerCode();

    const worker = new Worker({
      workerCode,
      name,
      phone,
      alternatePhone,
      address,
      city,
      state,
      pincode,
      workerType,
      skillLevel,
      dailyWage,
      aadharNumber,
      emergencyContact,
    });

    await worker.save();

    res.status(201).json({
      success: true,
      message: "Worker registered successfully",
      data: worker,
    });
  } catch (error) {
    console.error("Error registering worker:", error);
    res.status(500).json({
      success: false,
      message: "Failed to register worker",
      error: error.message,
    });
  }
};

// Get all workers
exports.getAllWorkers = async (req, res) => {
  try {
    const { status, workerType, siteId } = req.query;
    
    let query = {};
    
    if (status) {
      query.status = status;
    }
    
    if (workerType) {
      query.workerType = workerType;
    }
    
    if (siteId) {
      query.currentSite = siteId;
    }

    const workers = await Worker.find(query)
      .populate("currentSite", "siteName siteCode")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: workers.length,
      data: workers,
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
exports.getWorkerById = async (req, res) => {
  try {
    const worker = await Worker.findById(req.params.id)
      .populate("currentSite", "siteName siteCode")
      .populate("assignedSites.siteId", "siteName siteCode");

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

// Update worker
exports.updateWorker = async (req, res) => {
  try {
    const worker = await Worker.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

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
exports.deleteWorker = async (req, res) => {
  try {
    const worker = await Worker.findByIdAndDelete(req.params.id);

    if (!worker) {
      return res.status(404).json({
        success: false,
        message: "Worker not found",
      });
    }

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

// Assign worker to site
exports.assignWorkerToSite = async (req, res) => {
  try {
    const { workerId, siteId } = req.body;

    if (!workerId || !siteId) {
      return res.status(400).json({
        success: false,
        message: "Please provide worker ID and site ID",
      });
    }

    const worker = await Worker.findById(workerId);
    if (!worker) {
      return res.status(404).json({
        success: false,
        message: "Worker not found",
      });
    }

    const site = await Site.findById(siteId).populate("workers");
    if (!site) {
      return res.status(404).json({
        success: false,
        message: "Site not found",
      });
    }

    // Check if site has reached worker limit
    const currentWorkerCount = site.workers ? site.workers.length : 0;
    const workersRequired = site.workersRequired || 0;

    // Check if worker is already assigned to this site
    const isWorkerInSite = site.workers.some(
      (w) => w.toString() === workerId
    );

    if (!isWorkerInSite && currentWorkerCount >= workersRequired) {
      return res.status(400).json({
        success: false,
        message: `Site has reached maximum worker capacity (${workersRequired} workers). Cannot assign more workers.`,
      });
    }

    // Update worker's current site
    worker.currentSite = siteId;

    // Add to assigned sites if not already there
    const alreadyInAssignedSites = worker.assignedSites.some(
      (assignment) => assignment.siteId.toString() === siteId
    );

    if (!alreadyInAssignedSites) {
      worker.assignedSites.push({
        siteId,
        assignedDate: new Date(),
        isActive: true,
      });
    }

    await worker.save();

    // Add worker to site's workers array
    if (!site.workers.includes(workerId)) {
      site.workers.push(workerId);
      await site.save();
    }

    res.status(200).json({
      success: true,
      message: "Worker assigned to site successfully",
      data: worker,
    });
  } catch (error) {
    console.error("Error assigning worker to site:", error);
    res.status(500).json({
      success: false,
      message: "Failed to assign worker to site",
      error: error.message,
    });
  }
};

// Remove worker from site
exports.removeWorkerFromSite = async (req, res) => {
  try {
    const { workerId, siteId } = req.body;

    const worker = await Worker.findById(workerId);
    if (!worker) {
      return res.status(404).json({
        success: false,
        message: "Worker not found",
      });
    }

    // Remove from current site if it matches
    if (worker.currentSite && worker.currentSite.toString() === siteId) {
      worker.currentSite = null;
    }

    // Mark assignment as inactive
    worker.assignedSites = worker.assignedSites.map((assignment) => {
      if (assignment.siteId.toString() === siteId) {
        assignment.isActive = false;
      }
      return assignment;
    });

    await worker.save();

    // Remove from site's workers array
    const site = await Site.findById(siteId);
    if (site) {
      site.workers = site.workers.filter(
        (id) => id.toString() !== workerId
      );
      await site.save();
    }

    res.status(200).json({
      success: true,
      message: "Worker removed from site successfully",
      data: worker,
    });
  } catch (error) {
    console.error("Error removing worker from site:", error);
    res.status(500).json({
      success: false,
      message: "Failed to remove worker from site",
      error: error.message,
    });
  }
};

// Get workers by site
exports.getWorkersBySite = async (req, res) => {
  try {
    const { siteId } = req.params;

    const workers = await Worker.find({
      currentSite: siteId,
      status: "Active",
    });

    res.status(200).json({
      success: true,
      count: workers.length,
      data: workers,
    });
  } catch (error) {
    console.error("Error fetching workers by site:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch workers",
      error: error.message,
    });
  }
};
