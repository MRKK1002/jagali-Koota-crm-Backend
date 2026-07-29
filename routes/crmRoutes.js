const express = require("express");
const router = express.Router();
const crmController = require("../controller/crmController");

// Follow-Up Routes
router.post("/followUp", crmController.createFollowUp);
router.get("/followUp", crmController.getFollowUps);
router.get("/followUp/:id", crmController.getFollowUpById);
router.put("/followUp/:id", crmController.updateFollowUp);
router.delete("/followUp/:id", crmController.deleteFollowUp);

// Ticket Routes
router.post("/ticket", crmController.createTicket);
router.get("/ticket", crmController.getTickets);
router.get("/ticket/:id", crmController.getTicketById);
router.put("/ticket/:id", crmController.updateTicket);
router.delete("/ticket/:id", crmController.deleteTicket);
router.post("/ticket/:id/comment", crmController.addTicketComment);

// Contract Routes
router.post("/contract", crmController.createContract);
router.get("/contract", crmController.getContracts);
router.get("/contract/:id", crmController.getContractById);
router.put("/contract/:id", crmController.updateContract);
router.delete("/contract/:id", crmController.deleteContract);
router.post("/contract/:id/renew", crmController.renewContract);

// Communication Routes
router.post("/communication", crmController.createCommunication);
router.get("/communication", crmController.getCommunications);
router.get("/communication/:id", crmController.getCommunicationById);
router.put("/communication/:id", crmController.updateCommunication);
router.delete("/communication/:id", crmController.deleteCommunication);

module.exports = router;


