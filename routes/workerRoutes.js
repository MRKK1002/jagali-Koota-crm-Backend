const express = require("express");
const router = express.Router();
const workerController = require("../controller/workerController");

// Worker CRUD operations
router.post("/", workerController.registerWorker);
router.get("/", workerController.getAllWorkers);
router.get("/:id", workerController.getWorkerById);
router.put("/:id", workerController.updateWorker);
router.delete("/:id", workerController.deleteWorker);

// Worker-Site assignment
router.post("/assign-to-site", workerController.assignWorkerToSite);
router.post("/remove-from-site", workerController.removeWorkerFromSite);
router.get("/site/:siteId", workerController.getWorkersBySite);

module.exports = router;
