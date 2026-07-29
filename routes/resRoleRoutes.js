const express = require("express");
const router = express.Router();
const resRoleController = require("../controller/resRoleController");

router.get("/", resRoleController.getAllRoles);
router.post("/", resRoleController.createRole);
router.put("/:id", resRoleController.updateRole);
router.delete("/:id", resRoleController.deleteRole);

module.exports = router;
