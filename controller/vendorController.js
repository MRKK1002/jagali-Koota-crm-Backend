const Vendor = require("../model/Vendor");

// Generate vendor code
const generateVendorCode = async () => {
  const prefix = "VEN";
  const count = await Vendor.countDocuments();
  return `${prefix}-${String(count + 1).padStart(4, "0")}`;
};

// Create vendor
exports.createVendor = async (req, res) => {
  try {
    const {
      vendorName,
      contactPerson,
      email,
      phone,
      address,
      gstNumber,
      panNumber,
      bankDetails,
      materialSupplied,
      paymentTerms,
      creditLimit,
    } = req.body;

    // Validation
    if (!vendorName || !contactPerson || !email || !phone) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields",
      });
    }

    // Check if vendor already exists
    const existingVendor = await Vendor.findOne({
      $or: [{ email }, { phone }],
    });

    if (existingVendor) {
      return res.status(400).json({
        success: false,
        message: "Vendor with this email or phone already exists",
      });
    }

    // Generate vendor code
    const vendorCode = await generateVendorCode();

    // Create vendor
    const vendor = new Vendor({
      vendorCode,
      vendorName,
      contactPerson,
      email,
      phone,
      address,
      gstNumber,
      panNumber,
      bankDetails,
      materialSupplied,
      paymentTerms: paymentTerms || "Net 30",
      creditLimit: creditLimit || 0,
      status: "Active",
    });

    await vendor.save();

    res.status(201).json({
      success: true,
      message: "Vendor created successfully",
      data: vendor,
    });
  } catch (error) {
    console.error("Error creating vendor:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create vendor",
      error: error.message,
    });
  }
};

// Get all vendors
exports.getAllVendors = async (req, res) => {
  try {
    const { status, search, material } = req.query;

    let query = {};

    if (status) query.status = status;

    if (search) {
      query.$or = [
        { vendorName: { $regex: search, $options: "i" } },
        { vendorCode: { $regex: search, $options: "i" } },
        { contactPerson: { $regex: search, $options: "i" } },
      ];
    }

    if (material) {
      query.materialSupplied = { $in: [material] };
    }

    const vendors = await Vendor.find(query).sort({ vendorName: 1 });

    res.status(200).json({
      success: true,
      count: vendors.length,
      data: vendors,
    });
  } catch (error) {
    console.error("Error fetching vendors:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch vendors",
      error: error.message,
    });
  }
};

// Get vendor by ID
exports.getVendorById = async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id);

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    res.status(200).json({
      success: true,
      data: vendor,
    });
  } catch (error) {
    console.error("Error fetching vendor:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch vendor",
      error: error.message,
    });
  }
};

// Update vendor
exports.updateVendor = async (req, res) => {
  try {
    const vendor = await Vendor.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Vendor updated successfully",
      data: vendor,
    });
  } catch (error) {
    console.error("Error updating vendor:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update vendor",
      error: error.message,
    });
  }
};

// Delete vendor
exports.deleteVendor = async (req, res) => {
  try {
    const vendor = await Vendor.findByIdAndDelete(req.params.id);

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Vendor deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting vendor:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete vendor",
      error: error.message,
    });
  }
};

// Update vendor status
exports.updateVendorStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!["Active", "Inactive", "Blacklisted"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status",
      });
    }

    const vendor = await Vendor.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Vendor status updated successfully",
      data: vendor,
    });
  } catch (error) {
    console.error("Error updating vendor status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update vendor status",
      error: error.message,
    });
  }
};
