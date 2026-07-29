// routes/claimRoutes.js
const express = require("express");
const router = express.Router();
const {
  addClaim,
  getClaims,
  approveClaim,
  payClaim,
  downloadClaimDocument,
  updateClaim,
  deleteClaim,
} = require("../controller/claimController");
const upload = require("multer")({ dest: "uploads/" });

router.post("/", upload.single("document"), addClaim);
router.get("/", getClaims);
router.put("/:id/approve", approveClaim);
router.put("/:id/pay", payClaim);
router.get("/:id/download", downloadClaimDocument);
router.put("/:id", upload.single("document"), updateClaim);
router.delete("/:id", deleteClaim);

module.exports = router;
