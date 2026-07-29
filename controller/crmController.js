const FollowUp = require("../model/FollowUp");
const Ticket = require("../model/Ticket");
const Contract = require("../model/Contract");
const Communication = require("../model/Communication");

// ============= FOLLOW-UPS =============

exports.createFollowUp = async (req, res) => {
  try {
    const followUp = new FollowUp(req.body);
    await followUp.save();
    res.status(201).json({ success: true, data: followUp });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

exports.getFollowUps = async (req, res) => {
  try {
    const { customerId, status, priority, assignedTo } = req.query;
    const filter = {};
    
    if (customerId) filter.customerId = customerId;
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (assignedTo) filter.assignedTo = assignedTo;

    const followUps = await FollowUp.find(filter).sort({ date: -1 });
    res.status(200).json({ success: true, count: followUps.length, data: followUps });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getFollowUpById = async (req, res) => {
  try {
    const followUp = await FollowUp.findById(req.params.id);
    if (!followUp) {
      return res.status(404).json({ success: false, message: "Follow-up not found" });
    }
    res.status(200).json({ success: true, data: followUp });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.updateFollowUp = async (req, res) => {
  try {
    // If marking as completed, set completedAt
    if (req.body.status === "Completed" && !req.body.completedAt) {
      req.body.completedAt = new Date();
    }
    
    const followUp = await FollowUp.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    
    if (!followUp) {
      return res.status(404).json({ success: false, message: "Follow-up not found" });
    }
    res.status(200).json({ success: true, data: followUp });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

exports.deleteFollowUp = async (req, res) => {
  try {
    const followUp = await FollowUp.findByIdAndDelete(req.params.id);
    if (!followUp) {
      return res.status(404).json({ success: false, message: "Follow-up not found" });
    }
    res.status(200).json({ success: true, message: "Follow-up deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ============= TICKETS =============

exports.createTicket = async (req, res) => {
  try {
    const ticket = new Ticket(req.body);
    await ticket.save();
    res.status(201).json({ success: true, data: ticket });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

exports.getTickets = async (req, res) => {
  try {
    const { customerId, status, priority, category, assignedTo } = req.query;
    const filter = {};
    
    if (customerId) filter.customerId = customerId;
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (category) filter.category = category;
    if (assignedTo) filter.assignedTo = assignedTo;

    const tickets = await Ticket.find(filter).sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: tickets.length, data: tickets });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getTicketById = async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ success: false, message: "Ticket not found" });
    }
    res.status(200).json({ success: true, data: ticket });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.updateTicket = async (req, res) => {
  try {
    // If marking as resolved, set resolvedAt
    if (req.body.status === "Resolved" && !req.body.resolvedAt) {
      req.body.resolvedAt = new Date();
    }
    
    // If marking as closed, set closedAt
    if (req.body.status === "Closed" && !req.body.closedAt) {
      req.body.closedAt = new Date();
    }
    
    const ticket = await Ticket.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    
    if (!ticket) {
      return res.status(404).json({ success: false, message: "Ticket not found" });
    }
    res.status(200).json({ success: true, data: ticket });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

exports.deleteTicket = async (req, res) => {
  try {
    const ticket = await Ticket.findByIdAndDelete(req.params.id);
    if (!ticket) {
      return res.status(404).json({ success: false, message: "Ticket not found" });
    }
    res.status(200).json({ success: true, message: "Ticket deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Add comment to ticket
exports.addTicketComment = async (req, res) => {
  try {
    const { author, comment } = req.body;
    
    const ticket = await Ticket.findByIdAndUpdate(
      req.params.id,
      {
        $push: {
          comments: { author, comment, createdAt: new Date() },
        },
      },
      { new: true }
    );
    
    if (!ticket) {
      return res.status(404).json({ success: false, message: "Ticket not found" });
    }
    res.status(200).json({ success: true, data: ticket });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// ============= CONTRACTS =============

exports.createContract = async (req, res) => {
  try {
    const contract = new Contract(req.body);
    await contract.save();
    res.status(201).json({ success: true, data: contract });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

exports.getContracts = async (req, res) => {
  try {
    const { customerId, status, type } = req.query;
    const filter = {};
    
    if (customerId) filter.customerId = customerId;
    if (status) filter.status = status;
    if (type) filter.type = type;

    const contracts = await Contract.find(filter).sort({ startDate: -1 });
    res.status(200).json({ success: true, count: contracts.length, data: contracts });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getContractById = async (req, res) => {
  try {
    const contract = await Contract.findById(req.params.id).populate("renewedFrom");
    if (!contract) {
      return res.status(404).json({ success: false, message: "Contract not found" });
    }
    res.status(200).json({ success: true, data: contract });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.updateContract = async (req, res) => {
  try {
    const contract = await Contract.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    
    if (!contract) {
      return res.status(404).json({ success: false, message: "Contract not found" });
    }
    res.status(200).json({ success: true, data: contract });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

exports.deleteContract = async (req, res) => {
  try {
    const contract = await Contract.findByIdAndDelete(req.params.id);
    if (!contract) {
      return res.status(404).json({ success: false, message: "Contract not found" });
    }
    res.status(200).json({ success: true, message: "Contract deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Renew contract
exports.renewContract = async (req, res) => {
  try {
    const oldContract = await Contract.findById(req.params.id);
    
    if (!oldContract) {
      return res.status(404).json({ success: false, message: "Contract not found" });
    }
    
    // Create new contract based on old one
    const newContract = new Contract({
      customerId: oldContract.customerId,
      type: oldContract.type,
      startDate: req.body.startDate || new Date(),
      endDate: req.body.endDate,
      value: req.body.value || oldContract.value,
      slaTerms: oldContract.slaTerms,
      termsAndConditions: oldContract.termsAndConditions,
      autoRenewal: oldContract.autoRenewal,
      renewalNoticePeriod: oldContract.renewalNoticePeriod,
      paymentTerms: oldContract.paymentTerms,
      billingCycle: oldContract.billingCycle,
      status: "Active",
      renewedFrom: oldContract._id,
    });
    
    await newContract.save();
    
    // Update old contract status
    await Contract.findByIdAndUpdate(req.params.id, { status: "Renewed" });
    
    res.status(201).json({ success: true, data: newContract });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// ============= COMMUNICATIONS =============

exports.createCommunication = async (req, res) => {
  try {
    const communication = new Communication(req.body);
    
    // If sending immediately, set sentAt
    if (req.body.status === "Sent" && !req.body.sentAt) {
      communication.sentAt = new Date();
    }
    
    await communication.save();
    res.status(201).json({ success: true, data: communication });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

exports.getCommunications = async (req, res) => {
  try {
    const { customerId, type, status, direction } = req.query;
    const filter = {};
    
    if (customerId) filter.customerId = customerId;
    if (type) filter.type = type;
    if (status) filter.status = status;
    if (direction) filter.direction = direction;

    const communications = await Communication.find(filter).sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: communications.length, data: communications });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getCommunicationById = async (req, res) => {
  try {
    const communication = await Communication.findById(req.params.id);
    if (!communication) {
      return res.status(404).json({ success: false, message: "Communication not found" });
    }
    
    // Mark as read if it was delivered
    if (communication.status === "Delivered" && !communication.readAt) {
      communication.readAt = new Date();
      communication.status = "Read";
      await communication.save();
    }
    
    res.status(200).json({ success: true, data: communication });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.updateCommunication = async (req, res) => {
  try {
    const communication = await Communication.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    
    if (!communication) {
      return res.status(404).json({ success: false, message: "Communication not found" });
    }
    res.status(200).json({ success: true, data: communication });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

exports.deleteCommunication = async (req, res) => {
  try {
    const communication = await Communication.findByIdAndDelete(req.params.id);
    if (!communication) {
      return res.status(404).json({ success: false, message: "Communication not found" });
    }
    res.status(200).json({ success: true, message: "Communication deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};


