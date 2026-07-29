const RABill = require("../model/RABill");
const path = require("path");
const fs = require("fs");

// Get all RA Bills
exports.getAllRABills = async (req, res) => {
  try {
    const { siteId } = req.query;
    const query = {};
    if (siteId) {
      query.siteId = siteId;
    }
    
    const raBills = await RABill.find(query)
      .populate("siteId", "siteName siteCode")
      .sort({ createdAt: -1 });

    // Use request host to build URL (works for both localhost and network access)
    const protocol = req.protocol || "http";
    const host = req.get("host") || `localhost:${process.env.PORT || 5000}`;
    const baseUrl = `${protocol}://${host}`;

    const transformedBills = raBills.map((bill) => {
      const billObj = bill.toObject();
      return {
        ...billObj,
        site: bill.siteId,
        pdfUrl: billObj.pdfUrl ? `${baseUrl}${billObj.pdfUrl}` : null,
      };
    });

    res.status(200).json({
      success: true,
      data: transformedBills,
    });
  } catch (error) {
    console.error("Error fetching RA Bills:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch RA Bills",
      error: error.message,
    });
  }
};

// Upload RA Bill
exports.uploadRABill = async (req, res) => {
  try {
    const { siteId, billNumber, billDate, amount, description } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "PDF file is required",
      });
    }

    if (!siteId || !billNumber || !amount) {
      return res.status(400).json({
        success: false,
        message: "Site, bill number, and amount are required",
      });
    }

    const pdfUrl = `/uploads/ra-bills/${req.file.filename}`;

    const raBill = new RABill({
      siteId,
      billNumber,
      billDate: billDate || null,
      amount: parseFloat(amount),
      description: description || "",
      pdfUrl,
      isBilled: null, // Will be set after upload via update endpoint
    });

    await raBill.save();

    res.status(201).json({
      success: true,
      message: "RA Bill uploaded successfully",
      data: raBill,
    });
  } catch (error) {
    console.error("Error uploading RA Bill:", error);
    res.status(500).json({
      success: false,
      message: "Failed to upload RA Bill",
      error: error.message,
    });
  }
};

// Update RA Bill billing status
exports.updateRABillBillingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isBilled, notBilledRemark } = req.body;

    const raBill = await RABill.findById(id);
    if (!raBill) {
      return res.status(404).json({
        success: false,
        message: "RA Bill not found",
      });
    }

    // Validate: if not billed, remark is required
    if (isBilled === false && (!notBilledRemark || notBilledRemark.trim() === "")) {
      return res.status(400).json({
        success: false,
        message: "Remark is required when bill is not billed",
      });
    }

    raBill.isBilled = isBilled === true;
    raBill.notBilledRemark = isBilled === false ? (notBilledRemark || "") : "";

    await raBill.save();

    res.status(200).json({
      success: true,
      message: "RA Bill billing status updated successfully",
      data: raBill,
    });
  } catch (error) {
    console.error("Error updating RA Bill billing status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update RA Bill billing status",
      error: error.message,
    });
  }
};

// Delete RA Bill
exports.deleteRABill = async (req, res) => {
  try {
    const { id } = req.params;

    const raBill = await RABill.findById(id);
    if (!raBill) {
      return res.status(404).json({
        success: false,
        message: "RA Bill not found",
      });
    }

    // Delete the PDF file if it exists
    if (raBill.pdfUrl) {
      const filePath = path.join(__dirname, "..", raBill.pdfUrl);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await RABill.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "RA Bill deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting RA Bill:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete RA Bill",
      error: error.message,
    });
  }
};

// Get RA Bill by ID
exports.getRABillById = async (req, res) => {
  try {
    const { id } = req.params;
    const raBill = await RABill.findById(id).populate("siteId", "siteName siteCode");

    if (!raBill) {
      return res.status(404).json({
        success: false,
        message: "RA Bill not found",
      });
    }

    res.status(200).json({
      success: true,
      data: raBill,
    });
  } catch (error) {
    console.error("Error fetching RA Bill:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch RA Bill",
      error: error.message,
    });
  }
};
