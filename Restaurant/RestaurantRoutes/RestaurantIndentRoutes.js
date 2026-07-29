const express = require("express");
const router = express.Router();

try {
  const indentController = require("../RestaurantController/RestaurantIndentController");

  console.log("Restaurant Indent Controller loaded:", {
    createIndent: typeof indentController.createIndent,
    getAllIndents: typeof indentController.getAllIndents,
    getIndentById: typeof indentController.getIndentById,
    hodApproveIndent: typeof indentController.hodApproveIndent,
    storeApproveAndIssue: typeof indentController.storeApproveAndIssue,
    cancelIndent: typeof indentController.cancelIndent,
    getIndentsByDepartment: typeof indentController.getIndentsByDepartment,
    getPendingForHOD: typeof indentController.getPendingForHOD,
    getPendingForStore: typeof indentController.getPendingForStore,
  });

  // Create a new indent
  router.post("/", indentController.createIndent);

  // Get all indents (with optional filters via query params)
  router.get("/", indentController.getAllIndents);

  // Get pending indents for HOD dashboard
  router.get("/pending/hod", indentController.getPendingForHOD);

  // Get pending indents for Store Manager dashboard
  router.get("/pending/store", indentController.getPendingForStore);

  // Get indents by department
  router.get("/department/:department", indentController.getIndentsByDepartment);

  // Get single indent by ID
  router.get("/:id", indentController.getIndentById);

  // HOD approve/partially approve/reject indent
  router.put("/:id/hod-approve", indentController.hodApproveIndent);

  // Store approve and issue material
  router.put("/:id/store-issue", indentController.storeApproveAndIssue);

  // Cancel indent
  router.put("/:id/cancel", indentController.cancelIndent);

  console.log("✓ Restaurant Indent routes registered successfully");
} catch (error) {
  console.error("❌ Error loading Restaurant Indent controller:", error);
  console.error("Error stack:", error.stack);
}

module.exports = router;
