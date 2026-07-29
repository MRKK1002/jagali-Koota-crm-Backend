const Site = require("../model/Site");
const SiteAccess = require("../model/SiteAccess");
const Employee = require("../model/Employee");

// Generate unique site code
const generateSiteCode = async () => {
  const prefix = "SITE";
  const lastSite = await Site.findOne().sort({ createdAt: -1 });
  
  if (!lastSite || !lastSite.siteCode) {
    return `${prefix}-001`;
  }
  
  // Extract number from last site code
  const lastNumber = parseInt(lastSite.siteCode.split("-")[1]) || 0;
  const newNumber = lastNumber + 1;
  
  // Pad with zeros (e.g., 001, 002, 010, 100)
  return `${prefix}-${String(newNumber).padStart(3, "0")}`;
};

// Create new site
exports.createSite = async (req, res) => {
  try {
    const {
      siteName,
      location,
      projectManager,
      supervisors,
      workersRequired,
      budget,
      timeline,
      description,
      clientDetails,
      fixedAssets,
      temporaryAssets,
    } = req.body;

    // Validation
    if (!siteName || !location || !projectManager || !budget || !timeline) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields",
      });
    }

    // Auto-generate site code
    const siteCode = await generateSiteCode();

    // Check if project manager exists in either Employee or SubAdmin collection
    const SubAdmin = require("../model/SubAdmin");
    let pmExists = await Employee.findById(projectManager);
    if (!pmExists) {
      pmExists = await SubAdmin.findById(projectManager);
    }
    if (!pmExists) {
      return res.status(404).json({
        success: false,
        message: "Project Manager not found",
      });
    }

    // Handle file uploads
    let workOrderPdfUrl = null;
    let boqExcelUrl = null;
    
    if (req.files) {
      if (req.files.workOrderPdf && req.files.workOrderPdf[0]) {
        workOrderPdfUrl = `/uploads/site-documents/${req.files.workOrderPdf[0].filename}`;
      }
      if (req.files.boqExcel && req.files.boqExcel[0]) {
        boqExcelUrl = `/uploads/site-documents/${req.files.boqExcel[0].filename}`;
      }
    }

    // Parse assets if they come as JSON strings
    let parsedFixedAssets = [];
    let parsedTemporaryAssets = [];
    
    if (fixedAssets) {
      try {
        parsedFixedAssets = typeof fixedAssets === "string" ? JSON.parse(fixedAssets) : fixedAssets;
        // Handle invoice files for fixed assets
        if (req.files) {
          parsedFixedAssets = parsedFixedAssets.map((asset, index) => {
            const invoiceFile = req.files[`fixedAssetInvoice_${index}`];
            if (invoiceFile && invoiceFile[0]) {
              asset.invoiceUrl = `/uploads/site-documents/${invoiceFile[0].filename}`;
            }
            return asset;
          });
        }
      } catch (e) {
        console.error("Error parsing fixedAssets:", e);
      }
    }
    
    if (temporaryAssets) {
      try {
        parsedTemporaryAssets = typeof temporaryAssets === "string" ? JSON.parse(temporaryAssets) : temporaryAssets;
        // Handle invoice files for temporary assets
        if (req.files) {
          parsedTemporaryAssets = parsedTemporaryAssets.map((asset, index) => {
            const invoiceFile = req.files[`temporaryAssetInvoice_${index}`];
            if (invoiceFile && invoiceFile[0]) {
              asset.invoiceUrl = `/uploads/site-documents/${invoiceFile[0].filename}`;
            }
            return asset;
          });
        }
      } catch (e) {
        console.error("Error parsing temporaryAssets:", e);
      }
    }

    // Create site
    const site = new Site({
      siteName,
      siteCode,
      location,
      projectManager,
      supervisors: supervisors || [],
      workersRequired: workersRequired || 0,
      budget,
      timeline,
      description,
      clientDetails,
      fixedAssets: parsedFixedAssets,
      temporaryAssets: parsedTemporaryAssets,
      workOrderPdf: workOrderPdfUrl,
      boqExcel: boqExcelUrl,
    });

    console.log("Creating site with workersRequired:", workersRequired);
    await site.save();
    console.log("Site created successfully:", site.siteCode, "Workers Required:", site.workersRequired);

    // Create site access for project manager
    const siteAccess = new SiteAccess({
      siteId: site._id,
      employeeId: projectManager,
      role: "Project Manager",
      permissions: {
        canCreateTasks: true,
        canAssignTasks: true,
        canUploadReports: true,
        canMarkAttendance: false,
        canRequestResources: true,
        canRaiseAlerts: true,
        canViewReports: true,
        canEditSite: false,
      },
    });

    await siteAccess.save();

    res.status(201).json({
      success: true,
      message: "Site created successfully",
      data: site,
    });
  } catch (error) {
    console.error("Error creating site:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create site",
      error: error.message,
    });
  }
};

// Get all sites
exports.getAllSites = async (req, res) => {
  try {
    const { status, search } = req.query;
    const SubAdmin = require("../model/SubAdmin");
    
    let query = {};
    
    if (status) {
      query.status = status;
    }
    
    if (search) {
      query.$or = [
        { siteName: { $regex: search, $options: "i" } },
        { siteCode: { $regex: search, $options: "i" } },
        { "location.city": { $regex: search, $options: "i" } },
      ];
    }

    const siteDocs = await Site.find(query)
      .populate("workers", "name employeeId")
      .sort({ createdAt: -1 });

    // Convert to plain objects and manually populate projectManager and supervisors from both collections
    const sites = [];
    for (let siteDoc of siteDocs) {
      const site = siteDoc.toObject();
      
      // Populate project manager
      if (site.projectManager) {
        let pm = await Employee.findById(site.projectManager).select("name employeeId email phone designation");
        if (!pm) {
          // Try SubAdmin collection
          pm = await SubAdmin.findById(site.projectManager).select("name username email role");
          if (pm) {
            // Map SubAdmin fields to match Employee structure
            pm = {
              _id: pm._id,
              name: pm.name || pm.username,
              employeeId: pm.email, // Use email as identifier for SubAdmins
              email: pm.email,
              designation: pm.role
            };
          }
        }
        site.projectManager = pm;
      }

      // Populate supervisors
      if (site.supervisors && site.supervisors.length > 0) {
        const populatedSupervisors = [];
        for (let supervisorId of site.supervisors) {
          let supervisor = await Employee.findById(supervisorId).select("name employeeId email");
          if (!supervisor) {
            supervisor = await SubAdmin.findById(supervisorId).select("name username email role");
            if (supervisor) {
              supervisor = {
                _id: supervisor._id,
                name: supervisor.name || supervisor.username,
                employeeId: supervisor.email,
                email: supervisor.email
              };
            }
          }
          if (supervisor) {
            populatedSupervisors.push(supervisor);
          }
        }
        site.supervisors = populatedSupervisors;
      }
      
      sites.push(site);
    }

    res.status(200).json({
      success: true,
      count: sites.length,
      data: sites,
    });
  } catch (error) {
    console.error("Error fetching sites:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch sites",
      error: error.message,
    });
  }
};

// Get site by ID
exports.getSiteById = async (req, res) => {
  try {
    const site = await Site.findById(req.params.id)
      .populate("projectManager", "name employeeId email phone designation")
      .populate("supervisors", "name employeeId email phone")
      .populate("workers", "name employeeId email");

    if (!site) {
      return res.status(404).json({
        success: false,
        message: "Site not found",
      });
    }

    res.status(200).json({
      success: true,
      data: site,
    });
  } catch (error) {
    console.error("Error fetching site:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch site",
      error: error.message,
    });
  }
};

// Update site
exports.updateSite = async (req, res) => {
  try {
    const SubAdmin = require("../model/SubAdmin");
    
    // Parse assets if they come as JSON strings
    const updateData = { ...req.body };
    
    // Handle file uploads
    if (req.files) {
      if (req.files.workOrderPdf && req.files.workOrderPdf[0]) {
        updateData.workOrderPdf = `/uploads/site-documents/${req.files.workOrderPdf[0].filename}`;
      }
      if (req.files.boqExcel && req.files.boqExcel[0]) {
        updateData.boqExcel = `/uploads/site-documents/${req.files.boqExcel[0].filename}`;
      }
    }
    
    if (updateData.fixedAssets) {
      try {
        updateData.fixedAssets = typeof updateData.fixedAssets === "string" 
          ? JSON.parse(updateData.fixedAssets) 
          : updateData.fixedAssets;
        // Handle invoice files for fixed assets
        if (req.files) {
          updateData.fixedAssets = updateData.fixedAssets.map((asset, index) => {
            const invoiceFile = req.files[`fixedAssetInvoice_${index}`];
            if (invoiceFile && invoiceFile[0]) {
              asset.invoiceUrl = `/uploads/site-documents/${invoiceFile[0].filename}`;
            }
            return asset;
          });
        }
      } catch (e) {
        console.error("Error parsing fixedAssets:", e);
      }
    }
    
    if (updateData.temporaryAssets) {
      try {
        updateData.temporaryAssets = typeof updateData.temporaryAssets === "string" 
          ? JSON.parse(updateData.temporaryAssets) 
          : updateData.temporaryAssets;
        // Handle invoice files for temporary assets
        if (req.files) {
          updateData.temporaryAssets = updateData.temporaryAssets.map((asset, index) => {
            const invoiceFile = req.files[`temporaryAssetInvoice_${index}`];
            if (invoiceFile && invoiceFile[0]) {
              asset.invoiceUrl = `/uploads/site-documents/${invoiceFile[0].filename}`;
            }
            return asset;
          });
        }
      } catch (e) {
        console.error("Error parsing temporaryAssets:", e);
      }
    }
    
    const site = await Site.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!site) {
      return res.status(404).json({
        success: false,
        message: "Site not found",
      });
    }

    // Convert to plain object so we can modify it
    const siteObj = site.toObject();

    // Manually populate projectManager from both collections
    if (siteObj.projectManager) {
      let pm = await Employee.findById(siteObj.projectManager).select("name employeeId email phone designation");
      if (!pm) {
        pm = await SubAdmin.findById(siteObj.projectManager).select("name username email role");
        if (pm) {
          pm = {
            _id: pm._id,
            name: pm.name || pm.username,
            employeeId: pm.email,
            email: pm.email,
            designation: pm.role
          };
        }
      }
      siteObj.projectManager = pm;
    }

    // Manually populate supervisors
    if (siteObj.supervisors && siteObj.supervisors.length > 0) {
      const populatedSupervisors = [];
      for (let supervisorId of siteObj.supervisors) {
        let supervisor = await Employee.findById(supervisorId).select("name employeeId email");
        if (!supervisor) {
          supervisor = await SubAdmin.findById(supervisorId).select("name username email role");
          if (supervisor) {
            supervisor = {
              _id: supervisor._id,
              name: supervisor.name || supervisor.username,
              employeeId: supervisor.email,
              email: supervisor.email
            };
          }
        }
        if (supervisor) {
          populatedSupervisors.push(supervisor);
        }
      }
      siteObj.supervisors = populatedSupervisors;
    }

    res.status(200).json({
      success: true,
      message: "Site updated successfully",
      data: siteObj,
    });
  } catch (error) {
    console.error("Error updating site:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update site",
      error: error.message,
    });
  }
};

// Delete site
exports.deleteSite = async (req, res) => {
  try {
    const site = await Site.findByIdAndDelete(req.params.id);

    if (!site) {
      return res.status(404).json({
        success: false,
        message: "Site not found",
      });
    }

    // Delete all site access records
    await SiteAccess.deleteMany({ siteId: req.params.id });

    res.status(200).json({
      success: true,
      message: "Site deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting site:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete site",
      error: error.message,
    });
  }
};

// Assign Project Manager
exports.assignProjectManager = async (req, res) => {
  try {
    const { siteId, employeeId } = req.body;

    const site = await Site.findById(siteId);
    if (!site) {
      return res.status(404).json({
        success: false,
        message: "Site not found",
      });
    }

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    // Update site
    site.projectManager = employeeId;
    await site.save();

    // Create or update site access
    let siteAccess = await SiteAccess.findOne({ siteId, employeeId });
    
    if (siteAccess) {
      siteAccess.role = "Project Manager";
      siteAccess.permissions = {
        canCreateTasks: true,
        canAssignTasks: true,
        canUploadReports: true,
        canMarkAttendance: false,
        canRequestResources: true,
        canRaiseAlerts: true,
        canViewReports: true,
        canEditSite: false,
      };
    } else {
      siteAccess = new SiteAccess({
        siteId,
        employeeId,
        role: "Project Manager",
        permissions: {
          canCreateTasks: true,
          canAssignTasks: true,
          canUploadReports: true,
          canMarkAttendance: false,
          canRequestResources: true,
          canRaiseAlerts: true,
          canViewReports: true,
          canEditSite: false,
        },
      });
    }

    await siteAccess.save();

    res.status(200).json({
      success: true,
      message: "Project Manager assigned successfully",
      data: site,
    });
  } catch (error) {
    console.error("Error assigning project manager:", error);
    res.status(500).json({
      success: false,
      message: "Failed to assign project manager",
      error: error.message,
    });
  }
};

// Get site access for an employee
exports.getSiteAccessByEmployee = async (req, res) => {
  try {
    const { employeeId } = req.params;

    const siteAccess = await SiteAccess.find({ employeeId, isActive: true })
      .populate("siteId")
      .populate("employeeId", "name employeeId email");

    res.status(200).json({
      success: true,
      data: siteAccess,
    });
  } catch (error) {
    console.error("Error fetching site access:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch site access",
      error: error.message,
    });
  }
};


// ==================== FIXED ASSETS MANAGEMENT ====================

// Helper function to calculate depreciation
const calculateDepreciation = (asset) => {
  const purchaseDate = new Date(asset.dateOfPurchase);
  const now = new Date();
  const yearsOwned = (now - purchaseDate) / (1000 * 60 * 60 * 24 * 365);

  const totalValue = asset.quantity * asset.value;
  const annualDepreciation = (totalValue * asset.depreciationPercentage) / 100;
  const accumulatedDepreciation = Math.min(annualDepreciation * yearsOwned, totalValue);
  const currentValue = Math.max(totalValue - accumulatedDepreciation, 0);

  return {
    totalValue,
    annualDepreciation,
    accumulatedDepreciation,
    currentValue,
    yearsOwned: Math.floor(yearsOwned),
  };
};

// Add fixed asset to site
exports.addFixedAsset = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      type,
      quantity,
      value,
      dateOfPurchase,
      depreciationPercentage,
      invoiceNumber,
      vendor,
      description,
    } = req.body;

    // Validation
    if (!name || !type || !quantity || !value || !dateOfPurchase || !depreciationPercentage) {
      return res.status(400).json({
        success: false,
        message: "Please provide name, type, quantity, value, dateOfPurchase, and depreciationPercentage",
      });
    }

    const site = await Site.findById(id);
    if (!site) {
      return res.status(404).json({
        success: false,
        message: "Site not found",
      });
    }

    // Handle invoice file upload
    let invoiceUrl = null;
    if (req.file) {
      invoiceUrl = `/uploads/fixed-assets/${req.file.filename}`;
    }

    // Calculate values
    const totalValue = parseInt(quantity) * parseFloat(value);
    const depreciation = calculateDepreciation({
      dateOfPurchase: new Date(dateOfPurchase),
      quantity: parseInt(quantity),
      value: parseFloat(value),
      depreciationPercentage: parseFloat(depreciationPercentage),
    });

    // Create new fixed asset
    const newAsset = {
      name,
      type,
      quantity: parseInt(quantity),
      value: parseFloat(value),
      totalValue,
      dateOfPurchase: new Date(dateOfPurchase),
      invoiceUrl,
      invoiceNumber,
      depreciationPercentage: parseFloat(depreciationPercentage),
      currentValue: depreciation.currentValue,
      accumulatedDepreciation: depreciation.accumulatedDepreciation,
      vendor,
      description,
      status: "Active",
    };

    site.fixedAssets.push(newAsset);
    await site.save();

    res.status(201).json({
      success: true,
      message: "Fixed asset added successfully",
      data: {
        asset: newAsset,
        depreciation,
      },
    });
  } catch (error) {
    console.error("Error adding fixed asset:", error);
    res.status(500).json({
      success: false,
      message: "Failed to add fixed asset",
      error: error.message,
    });
  }
};

// Get all fixed assets for a site
exports.getFixedAssets = async (req, res) => {
  try {
    const { id } = req.params;
    const { type, status, search } = req.query;

    const site = await Site.findById(id);
    if (!site) {
      return res.status(404).json({
        success: false,
        message: "Site not found",
      });
    }

    let assets = site.fixedAssets || [];

    // Apply filters
    if (type) {
      assets = assets.filter((a) => a.type && a.type.toLowerCase().includes(type.toLowerCase()));
    }
    if (status) {
      assets = assets.filter((a) => a.status === status);
    }
    if (search) {
      assets = assets.filter(
        (a) =>
          (a.name && a.name.toLowerCase().includes(search.toLowerCase())) ||
          (a.type && a.type.toLowerCase().includes(search.toLowerCase()))
      );
    }

    // Calculate current depreciation for each asset
    const assetsWithDepreciation = assets.map((asset, index) => {
      const depreciation = calculateDepreciation(asset);
      return {
        ...asset.toObject ? asset.toObject() : asset,
        index,
        depreciation,
      };
    });

    res.status(200).json({
      success: true,
      count: assetsWithDepreciation.length,
      data: assetsWithDepreciation,
    });
  } catch (error) {
    console.error("Error fetching fixed assets:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch fixed assets",
      error: error.message,
    });
  }
};

// Update fixed asset
exports.updateFixedAsset = async (req, res) => {
  try {
    const { id, assetIndex } = req.params;
    const {
      name,
      type,
      quantity,
      value,
      dateOfPurchase,
      depreciationPercentage,
      invoiceNumber,
      vendor,
      description,
      status,
    } = req.body;

    const site = await Site.findById(id);
    if (!site) {
      return res.status(404).json({
        success: false,
        message: "Site not found",
      });
    }

    const index = parseInt(assetIndex);
    if (index < 0 || index >= site.fixedAssets.length) {
      return res.status(404).json({
        success: false,
        message: "Fixed asset not found",
      });
    }

    const asset = site.fixedAssets[index];

    // Update fields
    if (name) asset.name = name;
    if (type) asset.type = type;
    if (quantity) asset.quantity = parseInt(quantity);
    if (value) asset.value = parseFloat(value);
    if (dateOfPurchase) asset.dateOfPurchase = new Date(dateOfPurchase);
    if (depreciationPercentage) asset.depreciationPercentage = parseFloat(depreciationPercentage);
    if (invoiceNumber) asset.invoiceNumber = invoiceNumber;
    if (vendor) asset.vendor = vendor;
    if (description !== undefined) asset.description = description;
    if (status) asset.status = status;

    // Handle invoice file upload
    if (req.file) {
      // Delete old invoice file if exists
      if (asset.invoiceUrl) {
        const fs = require("fs");
        const path = require("path");
        const oldFilePath = path.join(__dirname, "..", asset.invoiceUrl);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }
      asset.invoiceUrl = `/uploads/fixed-assets/${req.file.filename}`;
    }

    // Recalculate values
    asset.totalValue = asset.quantity * asset.value;
    const depreciation = calculateDepreciation(asset);
    asset.currentValue = depreciation.currentValue;
    asset.accumulatedDepreciation = depreciation.accumulatedDepreciation;

    await site.save();

    res.status(200).json({
      success: true,
      message: "Fixed asset updated successfully",
      data: {
        asset,
        depreciation,
      },
    });
  } catch (error) {
    console.error("Error updating fixed asset:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update fixed asset",
      error: error.message,
    });
  }
};

// Delete fixed asset
exports.deleteFixedAsset = async (req, res) => {
  try {
    const { id, assetIndex } = req.params;

    const site = await Site.findById(id);
    if (!site) {
      return res.status(404).json({
        success: false,
        message: "Site not found",
      });
    }

    const index = parseInt(assetIndex);
    if (index < 0 || index >= site.fixedAssets.length) {
      return res.status(404).json({
        success: false,
        message: "Fixed asset not found",
      });
    }

    const asset = site.fixedAssets[index];

    // Delete invoice file if exists
    if (asset.invoiceUrl) {
      const fs = require("fs");
      const path = require("path");
      const filePath = path.join(__dirname, "..", asset.invoiceUrl);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    site.fixedAssets.splice(index, 1);
    await site.save();

    res.status(200).json({
      success: true,
      message: "Fixed asset deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting fixed asset:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete fixed asset",
      error: error.message,
    });
  }
};

// Get fixed assets summary for a site
exports.getFixedAssetsSummary = async (req, res) => {
  try {
    const { id } = req.params;

    const site = await Site.findById(id);
    if (!site) {
      return res.status(404).json({
        success: false,
        message: "Site not found",
      });
    }

    const assets = site.fixedAssets || [];

    // Group by type
    const byType = {};
    let totalAssets = 0;
    let totalQuantity = 0;
    let totalPurchaseValue = 0;
    let totalCurrentValue = 0;
    let totalDepreciation = 0;

    assets.forEach((asset) => {
      const depreciation = calculateDepreciation(asset);
      
      if (!byType[asset.type]) {
        byType[asset.type] = {
          count: 0,
          totalQuantity: 0,
          totalValue: 0,
          totalCurrentValue: 0,
          totalDepreciation: 0,
        };
      }

      byType[asset.type].count += 1;
      byType[asset.type].totalQuantity += asset.quantity;
      byType[asset.type].totalValue += depreciation.totalValue;
      byType[asset.type].totalCurrentValue += depreciation.currentValue;
      byType[asset.type].totalDepreciation += depreciation.accumulatedDepreciation;

      totalAssets += 1;
      totalQuantity += asset.quantity;
      totalPurchaseValue += depreciation.totalValue;
      totalCurrentValue += depreciation.currentValue;
      totalDepreciation += depreciation.accumulatedDepreciation;
    });

    // Convert byType to array
    const byTypeArray = Object.entries(byType).map(([type, data]) => ({
      _id: type,
      ...data,
    }));

    res.status(200).json({
      success: true,
      data: {
        siteName: site.siteName,
        siteCode: site.siteCode,
        byType: byTypeArray,
        totals: {
          totalAssets,
          totalQuantity,
          totalPurchaseValue,
          totalCurrentValue,
          totalDepreciation,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching fixed assets summary:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch fixed assets summary",
      error: error.message,
    });
  }
};


// Transfer fixed asset to another site
exports.transferFixedAsset = async (req, res) => {
  try {
    const { fromSiteId, toSiteId, assetIndex, transferQuantity } = req.body;

    // Validation
    if (!fromSiteId || !toSiteId || assetIndex === undefined) {
      return res.status(400).json({
        success: false,
        message: "Please provide fromSiteId, toSiteId, and assetIndex",
      });
    }

    if (fromSiteId === toSiteId) {
      return res.status(400).json({
        success: false,
        message: "Cannot transfer asset to the same site",
      });
    }

    // Get source site
    const fromSite = await Site.findById(fromSiteId);
    if (!fromSite) {
      return res.status(404).json({
        success: false,
        message: "Source site not found",
      });
    }

    // Get destination site
    const toSite = await Site.findById(toSiteId);
    if (!toSite) {
      return res.status(404).json({
        success: false,
        message: "Destination site not found",
      });
    }

    // Validate asset index
    const index = parseInt(assetIndex);
    if (index < 0 || index >= fromSite.fixedAssets.length) {
      return res.status(404).json({
        success: false,
        message: "Fixed asset not found in source site",
      });
    }

    const sourceAsset = fromSite.fixedAssets[index].toObject ? fromSite.fixedAssets[index].toObject() : fromSite.fixedAssets[index];
    const qtyToTransfer = parseInt(transferQuantity) || sourceAsset.quantity;

    // Validate transfer quantity
    if (qtyToTransfer <= 0 || qtyToTransfer > sourceAsset.quantity) {
      return res.status(400).json({
        success: false,
        message: `Invalid transfer quantity. Available: ${sourceAsset.quantity}`,
      });
    }

    // Create asset object for destination
    const transferredAsset = {
      name: sourceAsset.name,
      type: sourceAsset.type,
      quantity: qtyToTransfer,
      value: sourceAsset.value,
      totalValue: qtyToTransfer * sourceAsset.value,
      dateOfPurchase: sourceAsset.dateOfPurchase,
      invoiceUrl: sourceAsset.invoiceUrl,
      invoiceNumber: sourceAsset.invoiceNumber,
      depreciationPercentage: sourceAsset.depreciationPercentage || 10,
      currentValue: sourceAsset.currentValue ? (sourceAsset.currentValue / sourceAsset.quantity) * qtyToTransfer : 0,
      accumulatedDepreciation: sourceAsset.accumulatedDepreciation ? (sourceAsset.accumulatedDepreciation / sourceAsset.quantity) * qtyToTransfer : 0,
      vendor: sourceAsset.vendor,
      description: sourceAsset.description,
      status: sourceAsset.status || "Active",
    };

    // Check if same asset already exists in destination site (merge if same name and type)
    const existingAssetIndex = toSite.fixedAssets.findIndex(
      (a) => a.name === sourceAsset.name && a.type === sourceAsset.type && a.value === sourceAsset.value
    );

    // Update destination site using findByIdAndUpdate to avoid validation
    if (existingAssetIndex >= 0) {
      // Merge with existing asset - update quantity
      const newQty = toSite.fixedAssets[existingAssetIndex].quantity + qtyToTransfer;
      await Site.findByIdAndUpdate(
        toSiteId,
        { 
          $set: { 
            [`fixedAssets.${existingAssetIndex}.quantity`]: newQty,
            [`fixedAssets.${existingAssetIndex}.totalValue`]: newQty * toSite.fixedAssets[existingAssetIndex].value
          } 
        },
        { runValidators: false }
      );
    } else {
      // Add as new asset
      await Site.findByIdAndUpdate(
        toSiteId,
        { $push: { fixedAssets: transferredAsset } },
        { runValidators: false }
      );
    }

    // Update source site
    if (qtyToTransfer >= sourceAsset.quantity) {
      // Remove entire asset using $pull by matching the asset
      await Site.findByIdAndUpdate(
        fromSiteId,
        { $pull: { fixedAssets: { _id: fromSite.fixedAssets[index]._id } } },
        { runValidators: false }
      );
    } else {
      // Reduce quantity
      const newQty = sourceAsset.quantity - qtyToTransfer;
      await Site.findByIdAndUpdate(
        fromSiteId,
        { 
          $set: { 
            [`fixedAssets.${index}.quantity`]: newQty,
            [`fixedAssets.${index}.totalValue`]: newQty * sourceAsset.value
          } 
        },
        { runValidators: false }
      );
    }

    // Fetch updated sites
    const updatedFromSite = await Site.findById(fromSiteId);
    const updatedToSite = await Site.findById(toSiteId);

    res.status(200).json({
      success: true,
      message: `Successfully transferred ${qtyToTransfer} ${sourceAsset.name} from ${fromSite.siteName} to ${toSite.siteName}`,
      data: {
        fromSite: { _id: updatedFromSite._id, siteName: updatedFromSite.siteName, fixedAssets: updatedFromSite.fixedAssets },
        toSite: { _id: updatedToSite._id, siteName: updatedToSite.siteName, fixedAssets: updatedToSite.fixedAssets },
      },
    });
  } catch (error) {
    console.error("Error transferring fixed asset:", error);
    res.status(500).json({
      success: false,
      message: "Failed to transfer fixed asset",
      error: error.message,
    });
  }
};

// Transfer temporary asset to another site
exports.transferTemporaryAsset = async (req, res) => {
  try {
    const { fromSiteId, toSiteId, assetIndex, transferQuantity } = req.body;

    // Validation
    if (!fromSiteId || !toSiteId || assetIndex === undefined) {
      return res.status(400).json({
        success: false,
        message: "Please provide fromSiteId, toSiteId, and assetIndex",
      });
    }

    if (fromSiteId === toSiteId) {
      return res.status(400).json({
        success: false,
        message: "Cannot transfer asset to the same site",
      });
    }

    // Get source site
    const fromSite = await Site.findById(fromSiteId);
    if (!fromSite) {
      return res.status(404).json({
        success: false,
        message: "Source site not found",
      });
    }

    // Get destination site
    const toSite = await Site.findById(toSiteId);
    if (!toSite) {
      return res.status(404).json({
        success: false,
        message: "Destination site not found",
      });
    }

    // Validate asset index
    const index = parseInt(assetIndex);
    if (index < 0 || index >= fromSite.temporaryAssets.length) {
      return res.status(404).json({
        success: false,
        message: "Temporary asset not found in source site",
      });
    }

    const sourceAsset = fromSite.temporaryAssets[index].toObject ? fromSite.temporaryAssets[index].toObject() : fromSite.temporaryAssets[index];
    const qtyToTransfer = parseInt(transferQuantity) || sourceAsset.quantity;

    // Validate transfer quantity
    if (qtyToTransfer <= 0 || qtyToTransfer > sourceAsset.quantity) {
      return res.status(400).json({
        success: false,
        message: `Invalid transfer quantity. Available: ${sourceAsset.quantity}`,
      });
    }

    // Create asset object for destination
    const transferredAsset = {
      name: sourceAsset.name,
      type: sourceAsset.type,
      quantity: qtyToTransfer,
      value: sourceAsset.value,
      totalValue: qtyToTransfer * sourceAsset.value,
      dateOfPurchase: sourceAsset.dateOfPurchase,
      invoiceUrl: sourceAsset.invoiceUrl,
      invoiceNumber: sourceAsset.invoiceNumber,
      depreciationPercentage: sourceAsset.depreciationPercentage || 10,
      currentValue: sourceAsset.currentValue ? (sourceAsset.currentValue / sourceAsset.quantity) * qtyToTransfer : 0,
      accumulatedDepreciation: sourceAsset.accumulatedDepreciation ? (sourceAsset.accumulatedDepreciation / sourceAsset.quantity) * qtyToTransfer : 0,
      vendor: sourceAsset.vendor,
      description: sourceAsset.description,
      status: sourceAsset.status || "Active",
    };

    // Check if same asset already exists in destination site
    const existingAssetIndex = toSite.temporaryAssets.findIndex(
      (a) => a.name === sourceAsset.name && a.type === sourceAsset.type && a.value === sourceAsset.value
    );

    // Update destination site using findByIdAndUpdate to avoid validation
    if (existingAssetIndex >= 0) {
      // Merge with existing asset - update quantity
      const newQty = toSite.temporaryAssets[existingAssetIndex].quantity + qtyToTransfer;
      await Site.findByIdAndUpdate(
        toSiteId,
        { 
          $set: { 
            [`temporaryAssets.${existingAssetIndex}.quantity`]: newQty,
            [`temporaryAssets.${existingAssetIndex}.totalValue`]: newQty * toSite.temporaryAssets[existingAssetIndex].value
          } 
        },
        { runValidators: false }
      );
    } else {
      // Add as new asset
      await Site.findByIdAndUpdate(
        toSiteId,
        { $push: { temporaryAssets: transferredAsset } },
        { runValidators: false }
      );
    }

    // Update source site
    if (qtyToTransfer >= sourceAsset.quantity) {
      // Remove entire asset using $pull by matching the asset
      await Site.findByIdAndUpdate(
        fromSiteId,
        { $pull: { temporaryAssets: { _id: fromSite.temporaryAssets[index]._id } } },
        { runValidators: false }
      );
    } else {
      // Reduce quantity
      const newQty = sourceAsset.quantity - qtyToTransfer;
      await Site.findByIdAndUpdate(
        fromSiteId,
        { 
          $set: { 
            [`temporaryAssets.${index}.quantity`]: newQty,
            [`temporaryAssets.${index}.totalValue`]: newQty * sourceAsset.value
          } 
        },
        { runValidators: false }
      );
    }

    // Fetch updated sites
    const updatedFromSite = await Site.findById(fromSiteId);
    const updatedToSite = await Site.findById(toSiteId);

    res.status(200).json({
      success: true,
      message: `Successfully transferred ${qtyToTransfer} ${sourceAsset.name} from ${fromSite.siteName} to ${toSite.siteName}`,
      data: {
        fromSite: { _id: updatedFromSite._id, siteName: updatedFromSite.siteName, temporaryAssets: updatedFromSite.temporaryAssets },
        toSite: { _id: updatedToSite._id, siteName: updatedToSite.siteName, temporaryAssets: updatedToSite.temporaryAssets },
      },
    });
  } catch (error) {
    console.error("Error transferring temporary asset:", error);
    res.status(500).json({
      success: false,
      message: "Failed to transfer temporary asset",
      error: error.message,
    });
  }
};
