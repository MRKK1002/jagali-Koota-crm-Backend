const express = require("express")
const router = express.Router()
const subAdminController = require("../controller/subAdminController")

// User Management Routes
router.post("/", subAdminController.createSubAdmin)
router.get("/", subAdminController.getSubAdmins)
router.get("/:id", subAdminController.getSubAdminById)
router.put("/:id", subAdminController.updateSubAdmin)
router.patch("/:id/permissions", subAdminController.updatePermissions)
router.delete("/:id", subAdminController.deleteSubAdmin)

module.exports = router
