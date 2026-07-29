const express = require("express")
const router = express.Router()
const {
  getAllTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  getTaskStats,
} = require("../controller/taskController")

// Routes
router.get("/", getAllTasks)
router.get("/stats", getTaskStats)
router.get("/:id", getTaskById)
router.post("/", createTask)
router.patch("/:id", updateTask)
router.put("/:id", updateTask)
router.delete("/:id", deleteTask)

module.exports = router
