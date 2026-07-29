const Lead = require("../model/Lead");
const Opportunity = require("../model/Opportunity");
const SalesOrder = require("../model/SalesOrder");
const Delivery = require("../model/Delivery");
const Invoice = require("../model/Invoice");
const Payment = require("../model/Payment");
const Client = require("../model/Client");
const Customer = require("../model/customerModel");
const Vendor = require("../model/Vendor");
const Project = require("../model/Project");

// Helper function to clean empty ObjectId fields
const cleanObjectIdFields = (data) => {
  const cleaned = { ...data };
  Object.keys(cleaned).forEach(key => {
    if (cleaned[key] === "" || cleaned[key] === null || cleaned[key] === undefined) {
      delete cleaned[key];
    }
  });
  return cleaned;
};

// ============= LEADS =============

exports.createLead = async (req, res) => {
  try {
    const cleanData = cleanObjectIdFields(req.body);
    const lead = new Lead(cleanData);
    await lead.save();
    res.status(201).json({ success: true, data: lead });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

exports.getLeads = async (req, res) => {
  try {
    const { businessType, status, assignedTo } = req.query;
    const filter = {};

    if (businessType) filter.businessType = businessType;
    if (status) filter.status = status;
    if (assignedTo) filter.assignedTo = assignedTo;

    const leads = await Lead.find(filter).sort({ createdAt: -1 }).populate("assignedTo", "name email");
    res.status(200).json({ success: true, count: leads.length, data: leads });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getLeadById = async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id).populate("assignedTo", "name email");
    if (!lead) {
      return res.status(404).json({ success: false, message: "Lead not found" });
    }
    res.status(200).json({ success: true, data: lead });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.updateLead = async (req, res) => {
  try {
    const cleanData = cleanObjectIdFields(req.body);
    const lead = await Lead.findByIdAndUpdate(req.params.id, cleanData, {
      new: true,
      runValidators: true,
    });
    if (!lead) {
      return res.status(404).json({ success: false, message: "Lead not found" });
    }
    res.status(200).json({ success: true, data: lead });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

exports.deleteLead = async (req, res) => {
  try {
    const lead = await Lead.findByIdAndDelete(req.params.id);
    if (!lead) {
      return res.status(404).json({ success: false, message: "Lead not found" });
    }
    res.status(200).json({ success: true, message: "Lead deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ============= OPPORTUNITIES =============

exports.createOpportunity = async (req, res) => {
  try {
    const cleanData = cleanObjectIdFields(req.body);
    const opportunity = new Opportunity(cleanData);
    await opportunity.save();

    // If created from a lead, update the lead
    if (cleanData.leadId) {
      await Lead.findByIdAndUpdate(cleanData.leadId, {
        convertedToOpportunity: true,
        opportunityId: opportunity._id,
      });
    }

    res.status(201).json({ success: true, data: opportunity });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

exports.getOpportunities = async (req, res) => {
  try {
    const { businessType, stage, assignedTo } = req.query;
    const filter = {};

    if (businessType) filter.businessType = businessType;
    if (stage) filter.stage = stage;
    if (assignedTo) filter.assignedTo = assignedTo;

    const opportunities = await Opportunity.find(filter)
      .sort({ expectedCloseDate: 1 })
      .populate("assignedTo", "name email")
      .populate("leadId", "name phone email");

    res.status(200).json({ success: true, count: opportunities.length, data: opportunities });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getOpportunityById = async (req, res) => {
  try {
    const opportunity = await Opportunity.findById(req.params.id)
      .populate("assignedTo", "name email")
      .populate("leadId", "name phone email");

    if (!opportunity) {
      return res.status(404).json({ success: false, message: "Opportunity not found" });
    }
    res.status(200).json({ success: true, data: opportunity });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.updateOpportunity = async (req, res) => {
  try {
    const cleanData = cleanObjectIdFields(req.body);
    const opportunity = await Opportunity.findByIdAndUpdate(req.params.id, cleanData, {
      new: true,
      runValidators: true,
    });
    if (!opportunity) {
      return res.status(404).json({ success: false, message: "Opportunity not found" });
    }
    res.status(200).json({ success: true, data: opportunity });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

exports.deleteOpportunity = async (req, res) => {
  try {
    const opportunity = await Opportunity.findByIdAndDelete(req.params.id);
    if (!opportunity) {
      return res.status(404).json({ success: false, message: "Opportunity not found" });
    }
    res.status(200).json({ success: true, message: "Opportunity deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ============= QUOTATIONS =============

exports.createQuotation = async (req, res) => {
  try {
    const Quotation = require("../model/Quotation");
    const cleanData = cleanObjectIdFields(req.body);
    const quotation = new Quotation(cleanData);
    await quotation.save();

    const populated = await Quotation.findById(quotation._id)
      .populate('vendorId', 'vendorName contactInfo')
      .populate('customerId', 'name email company');

    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

exports.getQuotations = async (req, res) => {
  try {
    const Quotation = require("../model/Quotation");
    const { businessType, status } = req.query;
    const filter = {};

    if (businessType) filter.businessType = businessType;
    if (status) filter.status = status;

    const quotations = await Quotation.find(filter)
      .sort({ createdAt: -1 })
      .populate('vendorId', 'vendorName contactInfo')
      .populate('customerId', 'name email company');

    res.status(200).json({ success: true, count: quotations.length, data: quotations });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getQuotationById = async (req, res) => {
  try {
    const Quotation = require("../model/Quotation");
    const quotation = await Quotation.findById(req.params.id)
      .populate('vendorId', 'vendorName contactInfo')
      .populate('customerId', 'name email company');

    if (!quotation) {
      return res.status(404).json({ success: false, message: "Quotation not found" });
    }
    res.status(200).json({ success: true, data: quotation });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.updateQuotation = async (req, res) => {
  try {
    const Quotation = require("../model/Quotation");
    const cleanData = cleanObjectIdFields(req.body);
    const quotation = await Quotation.findByIdAndUpdate(req.params.id, cleanData, {
      new: true,
      runValidators: true,
    })
      .populate('vendorId', 'vendorName contactInfo')
      .populate('customerId', 'name email company');

    if (!quotation) {
      return res.status(404).json({ success: false, message: "Quotation not found" });
    }
    res.status(200).json({ success: true, data: quotation });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

exports.deleteQuotation = async (req, res) => {
  try {
    const Quotation = require("../model/Quotation");
    const quotation = await Quotation.findByIdAndDelete(req.params.id);
    if (!quotation) {
      return res.status(404).json({ success: false, message: "Quotation not found" });
    }
    res.status(200).json({ success: true, message: "Quotation deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ============= SALES ORDERS =============

exports.createSalesOrder = async (req, res) => {
  try {
    // Generate order number if not provided
    if (!req.body.orderNumber) {
      const count = await SalesOrder.countDocuments();
      req.body.orderNumber = `SO-${Date.now()}-${count + 1}`;
    }

    const salesOrder = new SalesOrder(req.body);
    await salesOrder.save();
    res.status(201).json({ success: true, data: salesOrder });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

exports.getSalesOrders = async (req, res) => {
  try {
    const { businessType, status, customer } = req.query;
    const filter = {};

    if (businessType) filter.businessType = businessType;
    if (status) filter.status = status;
    if (customer) filter.customer = new RegExp(customer, "i");

    const salesOrders = await SalesOrder.find(filter).sort({ orderDate: -1 });
    res.status(200).json({ success: true, count: salesOrders.length, data: salesOrders });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getSalesOrderById = async (req, res) => {
  try {
    const salesOrder = await SalesOrder.findById(req.params.id);
    if (!salesOrder) {
      return res.status(404).json({ success: false, message: "Sales order not found" });
    }
    res.status(200).json({ success: true, data: salesOrder });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.updateSalesOrder = async (req, res) => {
  try {
    const salesOrder = await SalesOrder.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!salesOrder) {
      return res.status(404).json({ success: false, message: "Sales order not found" });
    }
    res.status(200).json({ success: true, data: salesOrder });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

exports.deleteSalesOrder = async (req, res) => {
  try {
    const salesOrder = await SalesOrder.findByIdAndDelete(req.params.id);
    if (!salesOrder) {
      return res.status(404).json({ success: false, message: "Sales order not found" });
    }
    res.status(200).json({ success: true, message: "Sales order deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ============= DELIVERIES =============

exports.createDelivery = async (req, res) => {
  try {
    // Generate delivery number if not provided
    if (!req.body.deliveryNumber) {
      const count = await Delivery.countDocuments();
      req.body.deliveryNumber = `DN-${Date.now()}-${count + 1}`;
    }

    const delivery = new Delivery(req.body);
    await delivery.save();

    // Update sales order
    if (req.body.salesOrderId) {
      await SalesOrder.findByIdAndUpdate(req.body.salesOrderId, {
        convertedToDelivery: true,
        deliveryId: delivery._id,
      });
    }

    res.status(201).json({ success: true, data: delivery });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

exports.getDeliveries = async (req, res) => {
  try {
    const { businessType, status, customer } = req.query;
    const filter = {};

    if (businessType) filter.businessType = businessType;
    if (status) filter.status = status;
    if (customer) filter.customer = new RegExp(customer, "i");

    const deliveries = await Delivery.find(filter).sort({ deliveryDate: -1 });
    res.status(200).json({ success: true, count: deliveries.length, data: deliveries });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getDeliveryById = async (req, res) => {
  try {
    const delivery = await Delivery.findById(req.params.id);
    if (!delivery) {
      return res.status(404).json({ success: false, message: "Delivery not found" });
    }
    res.status(200).json({ success: true, data: delivery });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.updateDelivery = async (req, res) => {
  try {
    const delivery = await Delivery.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!delivery) {
      return res.status(404).json({ success: false, message: "Delivery not found" });
    }
    res.status(200).json({ success: true, data: delivery });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

exports.deleteDelivery = async (req, res) => {
  try {
    const delivery = await Delivery.findByIdAndDelete(req.params.id);
    if (!delivery) {
      return res.status(404).json({ success: false, message: "Delivery not found" });
    }
    res.status(200).json({ success: true, message: "Delivery deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ============= INVOICES =============

exports.createInvoice = async (req, res) => {
  try {
    // Generate invoice number if not provided
    if (!req.body.invoiceNumber) {
      const count = await Invoice.countDocuments();
      req.body.invoiceNumber = `INV-${Date.now()}-${count + 1}`;
    }

    // Calculate balance amount
    req.body.balanceAmount = req.body.totalAmount - (req.body.paidAmount || 0);

    const invoice = new Invoice(req.body);
    await invoice.save();

    // Update delivery
    if (req.body.deliveryId) {
      await Delivery.findByIdAndUpdate(req.body.deliveryId, {
        convertedToInvoice: true,
        invoiceId: invoice._id,
      });
    }

    res.status(201).json({ success: true, data: invoice });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

exports.getInvoices = async (req, res) => {
  try {
    const { businessType, status, customer, paymentStatus } = req.query;
    const filter = {};

    if (businessType) filter.businessType = businessType;
    if (status) filter.status = status;
    if (customer) filter.customer = new RegExp(customer, "i");
    if (paymentStatus) filter.paymentStatus = paymentStatus;

    const invoices = await Invoice.find(filter).sort({ invoiceDate: -1 });
    res.status(200).json({ success: true, count: invoices.length, data: invoices });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getInvoiceById = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ success: false, message: "Invoice not found" });
    }
    res.status(200).json({ success: true, data: invoice });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.updateInvoice = async (req, res) => {
  try {
    // Recalculate balance amount if payment amount changed
    if (req.body.paidAmount !== undefined) {
      const invoice = await Invoice.findById(req.params.id);
      if (invoice) {
        req.body.balanceAmount = invoice.totalAmount - req.body.paidAmount;

        // Update payment status
        if (req.body.paidAmount === 0) {
          req.body.paymentStatus = "Unpaid";
        } else if (req.body.paidAmount >= invoice.totalAmount) {
          req.body.paymentStatus = "Paid";
          req.body.paidDate = new Date();
        } else {
          req.body.paymentStatus = "Partial";
        }
      }
    }

    const invoice = await Invoice.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!invoice) {
      return res.status(404).json({ success: false, message: "Invoice not found" });
    }
    res.status(200).json({ success: true, data: invoice });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

exports.deleteInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findByIdAndDelete(req.params.id);
    if (!invoice) {
      return res.status(404).json({ success: false, message: "Invoice not found" });
    }
    res.status(200).json({ success: true, message: "Invoice deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ============= DROPDOWN DATA ENDPOINTS =============

// Get Customers for dropdown
exports.getCustomers = async (req, res) => {
  try {
    const { businessType } = req.query;
    console.log("🔍 getCustomers called with businessType:", businessType);
    const filter = {};

    if (businessType) filter.businessType = businessType;

    // For construction, use Client model; for restaurant, use Customer model
    let customers = [];
    if (businessType === "construction") {
      const clients = await Client.find(filter).select("clientName email phone contactPerson billingAddress");
      // Map to consistent format for frontend
      customers = clients.map(client => ({
        _id: client._id,
        name: client.clientName,
        clientName: client.clientName,
        email: client.email,
        phone: client.phone,
        contactPerson: client.contactPerson,
        address: client.billingAddress
      }));
    } else {
      customers = await Customer.find(filter).select("name email phone company address");
    }

    console.log("✅ Returning customers:", customers.length);
    res.status(200).json({ success: true, count: customers.length, data: customers });
  } catch (error) {
    console.error("❌ Error in getCustomers:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get Vendors for dropdown
exports.getVendors = async (req, res) => {
  try {
    const { businessType } = req.query;
    console.log("🔍 getVendors called with businessType:", businessType);
    const filter = {};

    if (businessType) filter.businessType = businessType;

    const vendors = await Vendor.find(filter).select("vendorName contactInfo businessType");
    
    // Map to consistent format for frontend
    const mappedVendors = vendors.map(vendor => ({
      _id: vendor._id,
      name: vendor.vendorName,
      vendorName: vendor.vendorName,
      email: vendor.contactInfo?.email || '',
      phone: vendor.contactInfo?.phone || '',
      contactPerson: vendor.contactInfo?.contactPerson || ''
    }));

    console.log("✅ Returning vendors:", mappedVendors.length);
    res.status(200).json({ success: true, count: mappedVendors.length, data: mappedVendors });
  } catch (error) {
    console.error("❌ Error in getVendors:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get Projects for dropdown
exports.getProjects = async (req, res) => {
  try {
    const { businessType } = req.query;
    const filter = {};

    if (businessType) filter.businessType = businessType;

    const projects = await Project.find(filter).select("projectName projectCode clientId location status");

    res.status(200).json({ success: true, count: projects.length, data: projects });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get Materials for dropdown
exports.getMaterials = async (req, res) => {
  try {
    const { businessType } = req.query;
    const filter = {};

    if (businessType) filter.businessType = businessType;

    // Both construction and restaurant use the same Material model (ResRawMaterial)
    const Material = require("../model/ResRawMaterial");
    const materials = await Material.find(filter).select("name category unit price");

    res.status(200).json({ success: true, count: materials.length, data: materials });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ============= PAYMENTS =============

exports.createPayment = async (req, res) => {
  try {
    // Generate payment number if not provided
    if (!req.body.paymentNumber) {
      const count = await Payment.countDocuments();
      req.body.paymentNumber = `PAY-${Date.now()}-${count + 1}`;
    }

    const payment = new Payment(req.body);
    await payment.save();

    // Update invoice payment status
    if (req.body.invoiceId) {
      const invoice = await Invoice.findById(req.body.invoiceId);
      if (invoice) {
        const newPaidAmount = (invoice.paidAmount || 0) + req.body.amount;
        const newBalanceAmount = invoice.totalAmount - newPaidAmount;

        let paymentStatus = "Unpaid";
        if (newPaidAmount >= invoice.totalAmount) {
          paymentStatus = "Paid";
        } else if (newPaidAmount > 0) {
          paymentStatus = "Partial";
        }

        await Invoice.findByIdAndUpdate(req.body.invoiceId, {
          paidAmount: newPaidAmount,
          balanceAmount: newBalanceAmount,
          paymentStatus: paymentStatus,
          paidDate: paymentStatus === "Paid" ? new Date() : invoice.paidDate,
        });
      }
    }

    res.status(201).json({ success: true, data: payment });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

exports.getPayments = async (req, res) => {
  try {
    const { businessType, status, customer, invoiceNumber } = req.query;
    const filter = {};

    if (businessType) filter.businessType = businessType;
    if (status) filter.status = status;
    if (customer) filter.customer = new RegExp(customer, "i");
    if (invoiceNumber) filter.invoiceNumber = invoiceNumber;

    const payments = await Payment.find(filter)
      .sort({ paymentDate: -1 })
      .populate("invoiceId", "invoiceNumber totalAmount");

    res.status(200).json({ success: true, count: payments.length, data: payments });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getPaymentById = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id).populate("invoiceId", "invoiceNumber totalAmount");
    if (!payment) {
      return res.status(404).json({ success: false, message: "Payment not found" });
    }
    res.status(200).json({ success: true, data: payment });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.updatePayment = async (req, res) => {
  try {
    const payment = await Payment.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!payment) {
      return res.status(404).json({ success: false, message: "Payment not found" });
    }
    res.status(200).json({ success: true, data: payment });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

exports.deletePayment = async (req, res) => {
  try {
    const payment = await Payment.findByIdAndDelete(req.params.id);
    if (!payment) {
      return res.status(404).json({ success: false, message: "Payment not found" });
    }

    // Update invoice to reduce paid amount
    if (payment.invoiceId) {
      const invoice = await Invoice.findById(payment.invoiceId);
      if (invoice) {
        const newPaidAmount = Math.max(0, (invoice.paidAmount || 0) - payment.amount);
        const newBalanceAmount = invoice.totalAmount - newPaidAmount;

        let paymentStatus = "Unpaid";
        if (newPaidAmount >= invoice.totalAmount) {
          paymentStatus = "Paid";
        } else if (newPaidAmount > 0) {
          paymentStatus = "Partial";
        }

        await Invoice.findByIdAndUpdate(payment.invoiceId, {
          paidAmount: newPaidAmount,
          balanceAmount: newBalanceAmount,
          paymentStatus: paymentStatus,
        });
      }
    }

    res.status(200).json({ success: true, message: "Payment deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};


