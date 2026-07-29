const express = require("express");
const router = express.Router();
const indentController = require("../controller/indentController");

// Indent CRUD operations
router.post("/", indentController.createIndent);
router.get("/", indentController.getAllIndents);

// Workflow operations (MUST come BEFORE generic :id routes)
router.put("/:id/approve-reject", indentController.approveRejectIndent);
router.put("/:id/check-inventory", indentController.checkInventoryAndProcess);
router.put("/:id/issue-material", indentController.issueMaterialToSite);

// Test route to verify routing works
router.get("/test-route", (req, res) => {
  res.json({ success: true, message: "Routes are working!" });
});

// Generic CRUD operations (MUST come AFTER specific routes)
router.get("/:id", indentController.getIndentById);
router.put("/:id", indentController.updateIndent);
router.delete("/:id", indentController.deleteIndent);

module.exports = router;
