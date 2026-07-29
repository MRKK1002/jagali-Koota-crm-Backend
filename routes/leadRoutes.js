const express = require("express");
const router = express.Router();
const leadsController = require("../controller/leadController");

router.post("/", leadsController.createLead);

router.get("/", leadsController.getLeads);

router.get("/:id", leadsController.getLeadById);

router.put("/:id", leadsController.updateLead);

router.delete("/:id", leadsController.deleteLead);

module.exports = router;
