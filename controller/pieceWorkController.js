const PieceWork = require("../model/PieceWork");
const path = require("path");
const fs = require("fs");

// Get all Piece Works
exports.getAllPieceWorks = async (req, res) => {
  try {
    const { siteId } = req.query;
    const query = {};
    if (siteId) {
      query.siteId = siteId;
    }
    
    const pieceWorks = await PieceWork.find(query)
      .populate("siteId", "siteName siteCode")
      .populate("subcontractorId", "name companyName contactNumber email bankDetails panNumber")
      .sort({ createdAt: -1 });

    const protocol = req.protocol || "http";
    const host = req.get("host") || `localhost:${process.env.PORT || 5000}`;
    const baseUrl = `${protocol}://${host}`;

    const transformedWorks = pieceWorks.map((work) => {
      const workObj = work.toObject();
      return {
        ...workObj,
        site: work.siteId,
        subcontractor: work.subcontractorId,
        pdfUrl: workObj.pdfUrl ? `${baseUrl}${workObj.pdfUrl}` : null,
      };
    });

    res.status(200).json({
      success: true,
      data: transformedWorks,
    });
  } catch (error) {
    console.error("Error fetching Piece Works:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch Piece Works",
      error: error.message,
    });
  }
};

// Create Piece Work
exports.createPieceWork = async (req, res) => {
  try {
    const {
      siteId,
      workNumber,
      workType,
      description,
      quantity,
      unit,
      ratePerUnit,
      subcontractorId,
      startDate,
      completionDate,
      holdAmountPercentage,
      holdRemarks,
      withMaterials,
      materials,
    } = req.body;

    if (!siteId || !workNumber || !workType || !quantity || !unit || !ratePerUnit) {
      return res.status(400).json({
        success: false,
        message: "Site, work number, work type, quantity, unit, and rate are required",
      });
    }

    // Handle file uploads
    let pdfUrl = null;

    if (req.files) {
      if (req.files.pieceWorkPdf && req.files.pieceWorkPdf[0]) {
        pdfUrl = `/uploads/piece-works/${req.files.pieceWorkPdf[0].filename}`;
      }
    }

    let materialsArray = [];
    if (withMaterials === "true" && materials) {
      try {
        materialsArray = typeof materials === "string" ? JSON.parse(materials) : materials;
        // Ensure materials have required fields
        materialsArray = materialsArray.map(mat => ({
          name: mat.name || "",
          quantity: parseFloat(mat.quantity) || 0,
          unit: mat.unit || "",
          addedAt: new Date(),
        }));
      } catch (err) {
        console.error("Error parsing materials:", err);
        materialsArray = [];
      }
    }

    // Calculate totalAmount before creating the document
    const quantityValue = parseFloat(quantity);
    const ratePerUnitValue = parseFloat(ratePerUnit);
    const totalAmount = quantityValue * ratePerUnitValue;

    // Get TDS percentage from subcontractor if subcontractorId is provided
    let tdsPercentage = 0;
    if (subcontractorId) {
      const Subcontractor = require("../model/Subcontractor");
      const subcontractor = await Subcontractor.findById(subcontractorId);
      if (subcontractor && subcontractor.tdsPercentage) {
        tdsPercentage = subcontractor.tdsPercentage;
      }
    }

    const pieceWork = new PieceWork({
      siteId,
      workNumber,
      workType,
      description: description || "",
      quantity: quantityValue,
      unit,
      ratePerUnit: ratePerUnitValue,
      totalAmount: totalAmount, // Explicitly set totalAmount
      subcontractorId: subcontractorId || null,
      startDate: startDate || null,
      completionDate: completionDate || null,
      holdAmountPercentage: holdAmountPercentage ? parseFloat(holdAmountPercentage) : 0,
      holdRemarks: holdRemarks || "",
      tdsPercentage: tdsPercentage, // Set TDS percentage from subcontractor
      withMaterials: withMaterials === "true",
      materials: materialsArray,
      pdfUrl,
    });

    await pieceWork.save();

    res.status(201).json({
      success: true,
      message: "Piece Work created successfully",
      data: pieceWork,
    });
  } catch (error) {
    console.error("Error creating Piece Work:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create Piece Work",
      error: error.message,
    });
  }
};

// Update Piece Work
exports.updatePieceWork = async (req, res) => {
  try {
    const { id } = req.params;
    const { holdAmountPercentage, holdRemarks, materials, tdsPercentage } = req.body;

    const pieceWork = await PieceWork.findById(id);
    if (!pieceWork) {
      return res.status(404).json({
        success: false,
        message: "Piece Work not found",
      });
    }

    // Calculate hold amount based on percentage
    const holdPercent = holdAmountPercentage !== undefined ? parseFloat(holdAmountPercentage) : pieceWork.holdAmountPercentage || 0;
    const calculatedHoldAmount = (pieceWork.totalAmount * holdPercent) / 100;

    // Calculate TDS amount based on percentage
    const tdsPercent = tdsPercentage !== undefined ? parseFloat(tdsPercentage) : pieceWork.tdsPercentage || 0;
    const calculatedTdsAmount = (pieceWork.totalAmount * tdsPercent) / 100;

    // Update hold amount fields only if holdAmountPercentage is provided
    if (holdAmountPercentage !== undefined) {
      pieceWork.holdAmountPercentage = holdPercent;
      pieceWork.holdAmount = calculatedHoldAmount;
    }
    if (holdRemarks !== undefined) {
      pieceWork.holdRemarks = holdRemarks || "";
    }

    // Update TDS fields only if tdsPercentage is provided
    if (tdsPercentage !== undefined) {
      pieceWork.tdsPercentage = tdsPercent;
      pieceWork.tdsAmount = calculatedTdsAmount;
    }

    // Update materials if provided (add new materials to existing ones)
    if (materials) {
      try {
        const materialsArray = typeof materials === "string" ? JSON.parse(materials) : materials;
        const newMaterials = materialsArray.map(mat => ({
          name: mat.name || "",
          quantity: parseFloat(mat.quantity) || 0,
          unit: mat.unit || "",
          addedAt: mat.addedAt ? new Date(mat.addedAt) : new Date(),
        }));
        // Merge with existing materials
        const existingMaterials = pieceWork.materials || [];
        pieceWork.materials = [...existingMaterials, ...newMaterials];
      } catch (err) {
        console.error("Error parsing materials:", err);
      }
    }

    // Recalculate balance amount (pending - hold)
    const pendingAmount = pieceWork.totalAmount - (pieceWork.paidAmount || 0);
    pieceWork.pendingAmount = pendingAmount;
    pieceWork.balanceAmount = Math.max(0, pendingAmount - (pieceWork.holdAmount || 0));
    
    // Recalculate net payable amount (balance - TDS)
    pieceWork.netPayableAmount = Math.max(0, pieceWork.balanceAmount - (pieceWork.tdsAmount || 0));

    await pieceWork.save();

    res.status(200).json({
      success: true,
      message: "Piece Work updated successfully",
      data: pieceWork,
    });
  } catch (error) {
    console.error("Error updating Piece Work:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update Piece Work",
      error: error.message,
    });
  }
};

// Update Piece Work status
exports.updatePieceWorkStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const pieceWork = await PieceWork.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!pieceWork) {
      return res.status(404).json({
        success: false,
        message: "Piece Work not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Piece Work status updated",
      data: pieceWork,
    });
  } catch (error) {
    console.error("Error updating Piece Work:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update Piece Work",
      error: error.message,
    });
  }
};

// Delete Piece Work
exports.deletePieceWork = async (req, res) => {
  try {
    const { id } = req.params;

    const pieceWork = await PieceWork.findById(id);
    if (!pieceWork) {
      return res.status(404).json({
        success: false,
        message: "Piece Work not found",
      });
    }

    if (pieceWork.pdfUrl) {
      const filePath = path.join(__dirname, "..", pieceWork.pdfUrl);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await PieceWork.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Piece Work deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting Piece Work:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete Piece Work",
      error: error.message,
    });
  }
};

// Get Piece Work by ID
exports.getPieceWorkById = async (req, res) => {
  try {
    const { id } = req.params;
    const pieceWork = await PieceWork.findById(id).populate("siteId", "siteName siteCode");

    if (!pieceWork) {
      return res.status(404).json({
        success: false,
        message: "Piece Work not found",
      });
    }

    res.status(200).json({
      success: true,
      data: pieceWork,
    });
  } catch (error) {
    console.error("Error fetching Piece Work:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch Piece Work",
      error: error.message,
    });
  }
};


// Add payment to Piece Work
exports.addPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, remarks, receivedBy } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid payment amount",
      });
    }

    const pieceWork = await PieceWork.findById(id);
    if (!pieceWork) {
      return res.status(404).json({
        success: false,
        message: "Piece Work not found",
      });
    }

    const paymentAmount = parseFloat(amount);
    const newPaidAmount = (pieceWork.paidAmount || 0) + paymentAmount;

    // Add to payment history
    pieceWork.paymentHistory.push({
      amount: paymentAmount,
      date: new Date(),
      remarks: remarks || "",
      receivedBy: receivedBy || "",
    });

    // Update paid amount
    pieceWork.paidAmount = newPaidAmount;
    pieceWork.pendingAmount = pieceWork.totalAmount - newPaidAmount;

    // Recalculate balance amount considering hold amount
    const holdAmount = pieceWork.holdAmount || 0;
    pieceWork.balanceAmount = Math.max(0, pieceWork.pendingAmount - holdAmount);

    // Recalculate net payable amount considering TDS
    const tdsAmount = pieceWork.tdsAmount || 0;
    pieceWork.netPayableAmount = Math.max(0, pieceWork.balanceAmount - tdsAmount);

    // Update payment status
    if (newPaidAmount <= 0) {
      pieceWork.paymentStatus = "unpaid";
    } else if (newPaidAmount >= pieceWork.totalAmount) {
      pieceWork.paymentStatus = "paid";
      pieceWork.pendingAmount = 0;
      pieceWork.balanceAmount = 0;
      pieceWork.netPayableAmount = 0;
    } else {
      pieceWork.paymentStatus = "partial";
    }

    await pieceWork.save();

    res.status(200).json({
      success: true,
      message: `Payment of ₹${paymentAmount.toLocaleString()} added successfully`,
      data: pieceWork,
    });
  } catch (error) {
    console.error("Error adding payment:", error);
    res.status(500).json({
      success: false,
      message: "Failed to add payment",
      error: error.message,
    });
  }
};

// Get payment history for a Piece Work
exports.getPaymentHistory = async (req, res) => {
  try {
    const { id } = req.params;

    const pieceWork = await PieceWork.findById(id).select(
      "workNumber totalAmount paidAmount pendingAmount balanceAmount holdAmountPercentage holdAmount tdsPercentage tdsAmount netPayableAmount paymentStatus paymentHistory"
    );

    if (!pieceWork) {
      return res.status(404).json({
        success: false,
        message: "Piece Work not found",
      });
    }

    res.status(200).json({
      success: true,
      data: {
        workNumber: pieceWork.workNumber,
        totalAmount: pieceWork.totalAmount,
        paidAmount: pieceWork.paidAmount,
        pendingAmount: pieceWork.pendingAmount,
        balanceAmount: pieceWork.balanceAmount,
        holdAmountPercentage: pieceWork.holdAmountPercentage,
        holdAmount: pieceWork.holdAmount,
        tdsPercentage: pieceWork.tdsPercentage,
        tdsAmount: pieceWork.tdsAmount,
        netPayableAmount: pieceWork.netPayableAmount,
        paymentStatus: pieceWork.paymentStatus,
        paymentHistory: pieceWork.paymentHistory,
      },
    });
  } catch (error) {
    console.error("Error fetching payment history:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch payment history",
      error: error.message,
    });
  }
};
