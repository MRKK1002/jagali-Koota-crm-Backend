const express = require("express");
const router = express.Router();
const controller = require("../controller/ticketController");

router.post("/", controller.createTicket);           // Create ticket
router.get("/", controller.getTickets);              // Get all tickets
router.get("/:id", controller.getTicketById);        // Get one ticket
router.put("/:id", controller.updateTicket);         // Update ticket
router.delete("/:id", controller.deleteTicket);      // Delete ticket

module.exports = router;
