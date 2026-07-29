const express = require("express");
const router = express.Router();
const journalController = require("../controller/journalController");

// Journal Entry routes
router.post("/journal-entries", journalController.createJournalEntry);
router.get("/journal-entries", journalController.getAllJournalEntries);
router.get("/journal-entries/:id", journalController.getJournalEntryById);
router.put("/journal-entries/:id", journalController.updateJournalEntry);
router.delete("/journal-entries/:id", journalController.deleteJournalEntry);

// Post and reverse journal entries
router.post("/journal-entries/:id/post", journalController.postJournalEntry);
router.post("/journal-entries/:id/reverse", journalController.reverseJournalEntry);

// Get journal entries by date range
router.get("/journal-entries/date-range/:businessType", journalController.getJournalEntriesByDateRange);

module.exports = router;

