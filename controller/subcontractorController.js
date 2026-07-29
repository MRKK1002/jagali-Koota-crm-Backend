const Subcontractor = require("../model/Subcontractor");
const path = require("path");
const fs = require("fs");

// Get all Subcontractors
exports.getAllSubcontractors = async (req, res) => {
  try {
    const subcontractors = await Subcontractor.find()
      .populate("assignedSites", "siteName siteCode")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: subcontractors,
    });
  } catch (error) {
    console.error("Error fetching Subcontractors:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch Subcontractors",
      error: error.message,
    });
  }
};

// Create Subcontractor
exports.createSubcontractor = async (req, res) => {
  try {
    const {
      name,
      contactNumber,
      email,
      street,
      city,
      state,
      pincode,
      specialization,
      panNumber,
      bankName,
      accountNumber,
      ifscCode,
      accountHolderName,
      tdsPercentage,
    } = req.body;

    if (!name || !contactNumber) {
      return res.status(400).json({
        success: false,
        message: "Name and contact number are required",
      });
    }

    // Handle document uploads (general documents array)
    const documents = [];
    if (req.files && req.files.documents && req.files.documents.length > 0) {
      req.files.documents.forEach((file) => {
        documents.push({
          name: file.originalname,
          url: `/uploads/subcontractors/${file.filename}`,
        });
      });
    }

    // Handle specific document uploads
    let agreementDocument = null;
    let aadharCardDocument = null;
    let panCardDocument = null;
    let passbookDocument = null;

    if (req.files) {
      // Check for agreement document
      if (req.files.agreementDocument && req.files.agreementDocument.length > 0) {
        const agreementFile = req.files.agreementDocument[0];
        agreementDocument = {
          name: agreementFile.originalname,
          url: `/uploads/subcontractors/${agreementFile.filename}`,
          uploadedAt: new Date(),
        };
      }

      // Check for Aadhar card document
      if (req.files.aadharCardDocument && req.files.aadharCardDocument.length > 0) {
        const aadharFile = req.files.aadharCardDocument[0];
        aadharCardDocument = {
          name: aadharFile.originalname,
          url: `/uploads/subcontractors/${aadharFile.filename}`,
          uploadedAt: new Date(),
        };
      }

      // Check for PAN card document
      if (req.files.panCardDocument && req.files.panCardDocument.length > 0) {
        const panFile = req.files.panCardDocument[0];
        panCardDocument = {
          name: panFile.originalname,
          url: `/uploads/subcontractors/${panFile.filename}`,
          uploadedAt: new Date(),
        };
      }

      // Check for passbook document
      if (req.files.passbookDocument && req.files.passbookDocument.length > 0) {
        const passbookFile = req.files.passbookDocument[0];
        passbookDocument = {
          name: passbookFile.originalname,
          url: `/uploads/subcontractors/${passbookFile.filename}`,
          uploadedAt: new Date(),
        };
      }
    }

    const subcontractor = new Subcontractor({
      name,
      contactNumber,
      email: email || "",
      address: {
        street: street || "",
        city: city || "",
        state: state || "",
        pincode: pincode || "",
      },
      specialization: specialization ? (typeof specialization === 'string' ? JSON.parse(specialization) : specialization) : [],
      panNumber: panNumber || "",
      bankDetails: {
        bankName: bankName || "",
        accountNumber: accountNumber || "",
        ifscCode: ifscCode || "",
        accountHolderName: accountHolderName || "",
      },
      documents,
      agreementDocument,
      aadharCardDocument,
      panCardDocument,
      passbookDocument,
      tdsPercentage: tdsPercentage ? parseFloat(tdsPercentage) : 0,
    });

    await subcontractor.save();

    res.status(201).json({
      success: true,
      message: "Subcontractor created successfully",
      data: subcontractor,
    });
  } catch (error) {
    console.error("Error creating Subcontractor:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create Subcontractor",
      error: error.message,
    });
  }
};

// Update Subcontractor
exports.updateSubcontractor = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      contactNumber,
      email,
      street,
      city,
      state,
      pincode,
      specialization,
      panNumber,
      bankName,
      accountNumber,
      ifscCode,
      accountHolderName,
      status,
      rating,
      tdsPercentage,
    } = req.body;

    const subcontractor = await Subcontractor.findById(id);
    if (!subcontractor) {
      return res.status(404).json({
        success: false,
        message: "Subcontractor not found",
      });
    }

    // Handle new document uploads (general documents array)
    if (req.files && req.files.documents && req.files.documents.length > 0) {
      req.files.documents.forEach((file) => {
        subcontractor.documents.push({
          name: file.originalname,
          url: `/uploads/subcontractors/${file.filename}`,
        });
      });
    }

    // Handle specific document uploads
    if (req.files) {
      // Handle agreement document
      if (req.files.agreementDocument && req.files.agreementDocument.length > 0) {
        const agreementFile = req.files.agreementDocument[0];
        // Delete old agreement document if exists
        if (subcontractor.agreementDocument && subcontractor.agreementDocument.url) {
          const oldFilePath = path.join(__dirname, "..", subcontractor.agreementDocument.url);
          if (fs.existsSync(oldFilePath)) {
            fs.unlinkSync(oldFilePath);
          }
        }
        subcontractor.agreementDocument = {
          name: agreementFile.originalname,
          url: `/uploads/subcontractors/${agreementFile.filename}`,
          uploadedAt: new Date(),
        };
      }

      // Handle Aadhar card document
      if (req.files.aadharCardDocument && req.files.aadharCardDocument.length > 0) {
        const aadharFile = req.files.aadharCardDocument[0];
        // Delete old Aadhar card document if exists
        if (subcontractor.aadharCardDocument && subcontractor.aadharCardDocument.url) {
          const oldFilePath = path.join(__dirname, "..", subcontractor.aadharCardDocument.url);
          if (fs.existsSync(oldFilePath)) {
            fs.unlinkSync(oldFilePath);
          }
        }
        subcontractor.aadharCardDocument = {
          name: aadharFile.originalname,
          url: `/uploads/subcontractors/${aadharFile.filename}`,
          uploadedAt: new Date(),
        };
      }

      // Handle PAN card document
      if (req.files.panCardDocument && req.files.panCardDocument.length > 0) {
        const panFile = req.files.panCardDocument[0];
        // Delete old PAN card document if exists
        if (subcontractor.panCardDocument && subcontractor.panCardDocument.url) {
          const oldFilePath = path.join(__dirname, "..", subcontractor.panCardDocument.url);
          if (fs.existsSync(oldFilePath)) {
            fs.unlinkSync(oldFilePath);
          }
        }
        subcontractor.panCardDocument = {
          name: panFile.originalname,
          url: `/uploads/subcontractors/${panFile.filename}`,
          uploadedAt: new Date(),
        };
      }
    }

    // Update fields
    if (name) subcontractor.name = name;
    if (contactNumber) subcontractor.contactNumber = contactNumber;
    if (email !== undefined) subcontractor.email = email;
    if (street !== undefined) subcontractor.address.street = street;
    if (city !== undefined) subcontractor.address.city = city;
    if (state !== undefined) subcontractor.address.state = state;
    if (pincode !== undefined) subcontractor.address.pincode = pincode;
    if (specialization) subcontractor.specialization = JSON.parse(specialization);
    if (panNumber !== undefined) subcontractor.panNumber = panNumber;
    if (bankName !== undefined) subcontractor.bankDetails.bankName = bankName;
    if (accountNumber !== undefined) subcontractor.bankDetails.accountNumber = accountNumber;
    if (ifscCode !== undefined) subcontractor.bankDetails.ifscCode = ifscCode;
    if (accountHolderName !== undefined) subcontractor.bankDetails.accountHolderName = accountHolderName;
    if (status) subcontractor.status = status;
    if (rating) subcontractor.rating = rating;
    if (tdsPercentage !== undefined) subcontractor.tdsPercentage = parseFloat(tdsPercentage);

    await subcontractor.save();

    res.status(200).json({
      success: true,
      message: "Subcontractor updated successfully",
      data: subcontractor,
    });
  } catch (error) {
    console.error("Error updating Subcontractor:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update Subcontractor",
      error: error.message,
    });
  }
};

// Delete Subcontractor
exports.deleteSubcontractor = async (req, res) => {
  try {
    const { id } = req.params;

    const subcontractor = await Subcontractor.findById(id);
    if (!subcontractor) {
      return res.status(404).json({
        success: false,
        message: "Subcontractor not found",
      });
    }

    // Delete associated documents
    if (subcontractor.documents && subcontractor.documents.length > 0) {
      subcontractor.documents.forEach((doc) => {
        const filePath = path.join(__dirname, "..", doc.url);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      });
    }

    // Delete specific documents
    if (subcontractor.agreementDocument && subcontractor.agreementDocument.url) {
      const filePath = path.join(__dirname, "..", subcontractor.agreementDocument.url);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    if (subcontractor.aadharCardDocument && subcontractor.aadharCardDocument.url) {
      const filePath = path.join(__dirname, "..", subcontractor.aadharCardDocument.url);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    if (subcontractor.panCardDocument && subcontractor.panCardDocument.url) {
      const filePath = path.join(__dirname, "..", subcontractor.panCardDocument.url);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await Subcontractor.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Subcontractor deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting Subcontractor:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete Subcontractor",
      error: error.message,
    });
  }
};

// Get Subcontractor by ID
exports.getSubcontractorById = async (req, res) => {
  try {
    const { id } = req.params;
    const subcontractor = await Subcontractor.findById(id).populate(
      "assignedSites",
      "siteName siteCode"
    );

    if (!subcontractor) {
      return res.status(404).json({
        success: false,
        message: "Subcontractor not found",
      });
    }

    res.status(200).json({
      success: true,
      data: subcontractor,
    });
  } catch (error) {
    console.error("Error fetching Subcontractor:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch Subcontractor",
      error: error.message,
    });
  }
};

// Assign site to subcontractor
exports.assignSite = async (req, res) => {
  try {
    const { id } = req.params;
    const { siteId } = req.body;

    const subcontractor = await Subcontractor.findById(id);
    if (!subcontractor) {
      return res.status(404).json({
        success: false,
        message: "Subcontractor not found",
      });
    }

    if (!subcontractor.assignedSites.includes(siteId)) {
      subcontractor.assignedSites.push(siteId);
      await subcontractor.save();
    }

    res.status(200).json({
      success: true,
      message: "Site assigned successfully",
      data: subcontractor,
    });
  } catch (error) {
    console.error("Error assigning site:", error);
    res.status(500).json({
      success: false,
      message: "Failed to assign site",
      error: error.message,
    });
  }
};

// Remove site assignment
exports.removeSiteAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    const { siteId } = req.body;

    const subcontractor = await Subcontractor.findById(id);
    if (!subcontractor) {
      return res.status(404).json({
        success: false,
        message: "Subcontractor not found",
      });
    }

    subcontractor.assignedSites = subcontractor.assignedSites.filter(
      (site) => site.toString() !== siteId
    );
    await subcontractor.save();

    res.status(200).json({
      success: true,
      message: "Site removed successfully",
      data: subcontractor,
    });
  } catch (error) {
    console.error("Error removing site:", error);
    res.status(500).json({
      success: false,
      message: "Failed to remove site",
      error: error.message,
    });
  }
};
