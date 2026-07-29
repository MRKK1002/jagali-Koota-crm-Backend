const Claim = require("../model/Claim");
const Settings = require("../model/Settings");
const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");

// Add new claim (with file upload)
const addClaim = async (req, res) => {
  try {
    const { type, amount, person, branchId, branchName, branchAddress } = req.body;
    const documentName = req.file.originalname;
    const filePath = `/uploads/${req.file.filename}`;
    const date = new Date();

    // Validate required fields
    if (!type || !amount || !person || !branchId || !branchName || !branchAddress) {
      return res.status(400).json({
        message: "All fields are required: type, amount, person, branchId, branchName, branchAddress",
      });
    }

    // Validate type
    const settings = await Settings.findOne();
    if (!settings.claimTypes.includes(type)) {
      return res.status(400).json({ message: "Invalid claim type" });
    }

    const newClaim = new Claim({
      date,
      type,
      amount: parseFloat(amount),
      person,
      documentName,
      filePath,
      branch: {
        id: branchId,
        name: branchName,
        address: branchAddress
      }
    });

    await newClaim.save();
    res.status(201).json(newClaim);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all claims
const getClaims = async (req, res) => {
  try {
    const claims = await Claim.find().sort({ date: -1 });
    res.json(claims);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Approve/reject/reduce claim
const approveClaim = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, amount, remarks } = req.body;

    const claim = await Claim.findById(id);
    if (!claim) return res.status(404).json({ message: "Claim not found" });

    let approvedAmount = claim.amount;
    let status = "approved";

    if (action === "reject") {
      approvedAmount = 0;
      status = "rejected";
    } else if (action === "reduce") {
      approvedAmount = parseFloat(amount);
      status = "partially_approved";
    }

    claim.status = status;
    claim.approvedAmount = approvedAmount;
    claim.remarks = remarks;
    claim.approvedBy = "Super Admin";
    claim.approvalDate = new Date();

    await claim.save();
    res.json(claim);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Process payment
const payClaim = async (req, res) => {
  try {
    const { id } = req.params;
    const { transactionNo, paymentRemarks } = req.body;

    const claim = await Claim.findById(id);
    if (!claim) return res.status(404).json({ message: "Claim not found" });

    if (claim.status === "pending" || claim.status === "rejected") {
      return res
        .status(400)
        .json({ message: "Cannot pay unapproved or rejected claim" });
    }

    claim.paymentStatus = "paid";
    claim.transactionNo = transactionNo;
    claim.paymentRemarks = paymentRemarks;
    claim.paymentDate = new Date();

    await claim.save();
    res.json(claim);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Download claim document
const downloadClaimDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const claim = await Claim.findById(id);
    
    if (!claim) {
      return res.status(404).json({ message: "Claim not found" });
    }

    const filePath = path.join(__dirname, "..", claim.filePath);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "File not found" });
    }

    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(claim.documentName)}"`);
    
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update claim (only if not approved or paid)
const updateClaim = async (req, res) => {
  try {
    const { id } = req.params;
    const { type, amount, person, branchId, branchName, branchAddress } = req.body;

    const claim = await Claim.findById(id);
    if (!claim) {
      return res.status(404).json({ message: "Claim not found" });
    }

    // Prevent editing if approved or paid
    if (claim.status === "approved" || claim.status === "partially_approved" || claim.paymentStatus === "paid") {
      return res.status(400).json({ 
        message: "Cannot edit claim that is already approved or paid" 
      });
    }

    // Validate type exists in settings
    if (type) {
      const settings = await Settings.findOne();
      if (!settings.claimTypes.includes(type)) {
        return res.status(400).json({ message: "Invalid claim type" });
      }
    }

    // Update fields
    if (type) claim.type = type;
    if (amount !== undefined) claim.amount = parseFloat(amount);
    if (person) claim.person = person;
    if (branchId) {
      claim.branch = {
        id: branchId,
        name: branchName || claim.branch.name,
        address: branchAddress || claim.branch.address
      };
    }

    // Handle file upload if provided
    if (req.file) {
      // Delete old file if exists
      if (claim.filePath) {
        const oldFilePath = path.join(__dirname, "..", claim.filePath);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }
      claim.documentName = req.file.originalname;
      claim.filePath = `/uploads/${req.file.filename}`;
    }

    await claim.save();
    res.json(claim);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete claim (only if not approved or paid)
const deleteClaim = async (req, res) => {
  try {
    const { id } = req.params;
    const claim = await Claim.findById(id);
    
    if (!claim) {
      return res.status(404).json({ message: "Claim not found" });
    }

    // Prevent deletion if approved or paid
    if (claim.status === "approved" || claim.status === "partially_approved" || claim.paymentStatus === "paid") {
      return res.status(400).json({ 
        message: "Cannot delete claim that is already approved or paid" 
      });
    }

    // Delete associated file if exists
    if (claim.filePath) {
      const filePath = path.join(__dirname, "..", claim.filePath);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await Claim.findByIdAndDelete(id);
    res.json({ message: "Claim deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { addClaim, getClaims, approveClaim, payClaim, downloadClaimDocument, updateClaim, deleteClaim };