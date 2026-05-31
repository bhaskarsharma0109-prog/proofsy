const express = require("express");
const router = express.Router();
const billingController = require("../controllers/billingController");
const { protect } = require("../middleware/auth");
const { tenantProtect } = require("../middleware/tenantProtect");

router.post("/pay", protect, tenantProtect, billingController.initiatePayment);
router.get("/status/:txnId", protect, billingController.getTransactionStatus);
router.post("/callback", billingController.paymentCallback);

module.exports = router;
