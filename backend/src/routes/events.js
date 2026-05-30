const express = require("express");
const router = express.Router();
const eventController = require("../controllers/eventController");
const { protect } = require("../middleware/auth");

router.post("/", protect, eventController.createEvent);
router.get("/", protect, eventController.listEvents);
router.get("/:id", protect, eventController.getEvent);
router.delete("/:id", protect, eventController.deleteEvent);

module.exports = router;
