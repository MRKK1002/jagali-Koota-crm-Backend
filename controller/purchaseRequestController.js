const PurchaseRequest = require("../model/PurchaseRequest");
const Indent = require("../model/Indent");

// Get all purchase requests
exports.getAllPurchaseRequests = async (req, res) => {
  try {
    const { status, siteId, priority, startDate, endDate } = req.query;

    let query = {};

    if (status) query.status = status;
    if (siteId) query.siteId = siteId;
    if (priority) query.priority = priority;

    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const purchaseRequests = await PurchaseRequest.find(query)
      .populate("indentId", "indentNumber")
      .populate("siteId", "siteName siteCode")
      .populate("createdBy", "name employeeId")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: purchaseRequests.length,
      data: purchaseRequests,
    });
  } catch (error) {
    console.error("Error fetching purchase requests:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch purchase requests",
      error: error.message,
    });
  }
};

// Get purchase request by ID
exports.getPurchaseRequestById = async (req, res) => {
  try {
    const purchaseRequest = await PurchaseRequest.findById(req.params.id)
      .populate("indentId")
      .populate("siteId")
      .populate("createdBy", "name employeeId email");

    if (!purchaseRequest) {
      return res.status(404).json({
        success: false,
        message: "Purchase request not found",
      });
    }

    res.status(200).json({
      success: true,
      data: purchaseRequest,
    });
  } catch (error) {
    console.error("Error fetching purchase request:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch purchase request",
      error: error.message,
    });
  }
};

// Update purchase request status
exports.updatePurchaseRequestStatus = async (req, res) => {
  try {
    const { status, remarks } = req.body;

    const purchaseRequest = await PurchaseRequest.findByIdAndUpdate(
      req.params.id,
      { status, remarks },
      { new: true, runValidators: true }
    );

    if (!purchaseRequest) {
      return res.status(404).json({
        success: false,
        message: "Purchase request not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Purchase request status updated successfully",
      data: purchaseRequest,
    });
  } catch (error) {
    console.error("Error updating purchase request:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update purchase request",
      error: error.message,
    });
  }
};

// Delete purchase request
exports.deletePurchaseRequest = async (req, res) => {
  try {
    const purchaseRequest = await PurchaseRequest.findByIdAndDelete(req.params.id);

    if (!purchaseRequest) {
      return res.status(404).json({
        success: false,
        message: "Purchase request not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Purchase request deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting purchase request:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete purchase request",
      error: error.message,
    });
  }
};
