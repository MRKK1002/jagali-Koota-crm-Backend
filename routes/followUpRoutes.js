const express = require("express");
const router = express.Router();
const ctrl = require("../controller/followUpController");

router
  .route("/")
  .get(ctrl.getFollowUps)
  .post(ctrl.createFollowUp);

router
  .route("/:id")
  .get(ctrl.getFollowUpById)
  .put(ctrl.updateFollowUp)
  .delete(ctrl.deleteFollowUp);

module.exports = router;
