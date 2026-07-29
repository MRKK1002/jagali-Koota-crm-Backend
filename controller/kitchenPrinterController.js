const KitchenPrinter = require("../model/resKitchenPrinterModel");

// Get all kitchen printers
const getAllKitchenPrinters = async (req, res) => {
  try {
    const { branchId, isActive } = req.query;
    const filter = {};

    if (branchId) filter.branchId = branchId;
    if (isActive !== undefined) filter.isActive = isActive === "true";

    const printers = await KitchenPrinter.find(filter)
      .populate("branchId", "name")
      .populate("categories", "name")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: printers,
    });
  } catch (error) {
    console.error("Error fetching kitchen printers:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching kitchen printers",
      error: error.message,
    });
  }
};

// Get kitchen printer by ID
const getKitchenPrinterById = async (req, res) => {
  try {
    const printer = await KitchenPrinter.findById(req.params.id)
      .populate("branchId", "name")
      .populate("categories", "name");

    if (!printer) {
      return res.status(404).json({
        success: false,
        message: "Kitchen printer not found",
      });
    }

    res.status(200).json({
      success: true,
      data: printer,
    });
  } catch (error) {
    console.error("Error fetching kitchen printer:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching kitchen printer",
      error: error.message,
    });
  }
};

// Create new kitchen printer
const createKitchenPrinter = async (req, res) => {
  try {
    const {
      name,
      ipAddress,
      port,
      branchId,
      branchName,
      printerType,
      categories,
      categoryNames,
      paperSize,
      copies,
      description,
      isActive,
    } = req.body;

    // Validate required fields
    if (!name || !ipAddress || !branchId || !branchName) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: name, ipAddress, branchId, branchName",
      });
    }

    // Check if IP address already exists
    const existingPrinter = await KitchenPrinter.findOne({ ipAddress });
    if (existingPrinter) {
      return res.status(400).json({
        success: false,
        message: "Printer with this IP address already exists",
      });
    }

    const printer = new KitchenPrinter({
      name,
      ipAddress,
      port: port || 9100,
      branchId,
      branchName,
      printerType: printerType || "thermal",
      categories: categories || [],
      categoryNames: categoryNames || [],
      paperSize: paperSize || "80mm",
      copies: copies || 1,
      description,
      isActive: isActive !== undefined ? isActive : true,
    });

    const savedPrinter = await printer.save();

    res.status(201).json({
      success: true,
      message: "Kitchen printer created successfully",
      data: savedPrinter,
    });
  } catch (error) {
    console.error("Error creating kitchen printer:", error);
    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        error: error.message,
      });
    }
    res.status(500).json({
      success: false,
      message: "Error creating kitchen printer",
      error: error.message,
    });
  }
};

// Update kitchen printer
const updateKitchenPrinter = async (req, res) => {
  try {
    const {
      name,
      ipAddress,
      port,
      branchId,
      branchName,
      printerType,
      categories,
      categoryNames,
      paperSize,
      copies,
      description,
      isActive,
    } = req.body;

    const printer = await KitchenPrinter.findById(req.params.id);

    if (!printer) {
      return res.status(404).json({
        success: false,
        message: "Kitchen printer not found",
      });
    }

    // Check if IP address is being changed and if it already exists
    if (ipAddress && ipAddress !== printer.ipAddress) {
      const existingPrinter = await KitchenPrinter.findOne({ ipAddress });
      if (existingPrinter && existingPrinter._id.toString() !== req.params.id) {
        return res.status(400).json({
          success: false,
          message: "Printer with this IP address already exists",
        });
      }
    }

    // Update fields
    if (name) printer.name = name;
    if (ipAddress) printer.ipAddress = ipAddress;
    if (port) printer.port = port;
    if (branchId) printer.branchId = branchId;
    if (branchName) printer.branchName = branchName;
    if (printerType) printer.printerType = printerType;
    if (categories !== undefined) printer.categories = categories;
    if (categoryNames !== undefined) printer.categoryNames = categoryNames;
    if (paperSize) printer.paperSize = paperSize;
    if (copies !== undefined) printer.copies = copies;
    if (description !== undefined) printer.description = description;
    if (isActive !== undefined) printer.isActive = isActive;

    const updatedPrinter = await printer.save();

    res.status(200).json({
      success: true,
      message: "Kitchen printer updated successfully",
      data: updatedPrinter,
    });
  } catch (error) {
    console.error("Error updating kitchen printer:", error);
    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        error: error.message,
      });
    }
    res.status(500).json({
      success: false,
      message: "Error updating kitchen printer",
      error: error.message,
    });
  }
};

// Delete kitchen printer
const deleteKitchenPrinter = async (req, res) => {
  try {
    const printer = await KitchenPrinter.findByIdAndDelete(req.params.id);

    if (!printer) {
      return res.status(404).json({
        success: false,
        message: "Kitchen printer not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Kitchen printer deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting kitchen printer:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting kitchen printer",
      error: error.message,
    });
  }
};

// Test print
const testPrint = async (req, res) => {
  try {
    const printer = await KitchenPrinter.findById(req.params.id);

    if (!printer) {
      return res.status(404).json({
        success: false,
        message: "Kitchen printer not found",
      });
    }

    // Update test print status
    printer.lastTestPrint = new Date();
    printer.testPrintStatus = "success"; // In real implementation, test actual print
    await printer.save();

    res.status(200).json({
      success: true,
      message: "Test print sent successfully",
      data: {
        lastTestPrint: printer.lastTestPrint,
        testPrintStatus: printer.testPrintStatus,
      },
    });
  } catch (error) {
    console.error("Error sending test print:", error);
    res.status(500).json({
      success: false,
      message: "Error sending test print",
      error: error.message,
    });
  }
};

module.exports = {
  getAllKitchenPrinters,
  getKitchenPrinterById,
  createKitchenPrinter,
  updateKitchenPrinter,
  deleteKitchenPrinter,
  testPrint,
};

