const express = require("express")
const router = express.Router()
const transferController = require("../controller/transferController")

router.get("/", transferController.getAllTransfers)
router.get("/:id", transferController.getTransferById)
router.post("/", transferController.createTransfer)
router.put("/:id", transferController.updateTransfer)
router.delete("/:id", transferController.deleteTransfer)

module.exports = router
