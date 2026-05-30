const express = require("express");
const router = express.Router();
const eventController = require("../controllers/eventController");

router.post("/", eventController.createEvent);
router.get("/", eventController.listEvents);
router.get("/:id", eventController.getEvent);
router.delete("/:id", eventController.deleteEvent);

module.exports = router;
