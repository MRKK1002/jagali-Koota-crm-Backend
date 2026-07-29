const express = require("express");
const router = express.Router();
const controller = require("../controller/communicationController");

router.post("/", controller.createCommunication);     
router.get("/", controller.getCommunications);         
router.get("/:id", controller.getCommunicationById);     
router.put("/:id", controller.updateCommunication);      
router.delete("/:id", controller.deleteCommunication);   

module.exports = router;
