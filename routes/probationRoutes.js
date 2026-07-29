const express = require("express")
const router = express.Router()
const probationController = require("../controller/probationController")

router.get("/", probationController.getAllProbationRecords)
router.get("/:id", probationController.getProbationRecordById)
router.post("/", probationController.createProbationRecord)
router.put("/:id", probationController.updateProbationRecord)
router.delete("/:id", probationController.deleteProbationRecord)

module.exports = router
