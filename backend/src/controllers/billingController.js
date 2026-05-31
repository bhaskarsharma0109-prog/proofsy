const Transaction = require("../models/Transaction");
const Workspace = require("../models/Workspace");
const crypto = require("crypto");
const { v4: uuidv4 } = require("uuid");

const PHONEPE_MERCHANT_ID = process.env.PHONEPE_MERCHANT_ID || "MERCHANTUAT";
const PHONEPE_SALT_KEY = process.env.PHONEPE_SALT_KEY || "099eb0cd-02cf-4e2a-8aca-3e6c6aff0399";
const PHONEPE_SALT_INDEX = process.env.PHONEPE_SALT_INDEX || "1";
const PHONEPE_API_URL = process.env.PHONEPE_API_URL || "https://api-preprod.phonepe.com/apis/pg-sandbox/pg/v1/pay";

// Plan details
const PLANS = {
  "fest-pass": { price: 599, credits: 1000 },
  "mega-pass": { price: 1499, credits: 3000 },
  "annual-pass": { price: 3999, credits: 1000000 }, // 1 million as representation of unlimited
};

// POST /api/billing/pay — Initiate payment with PhonePe
exports.initiatePayment = async (req, res) => {
  try {
    const { plan } = req.body;

    if (!plan || !PLANS[plan]) {
      return res.status(400).json({ success: false, error: "Invalid pricing plan selected" });
    }

    const selectedPlan = PLANS[plan];
    const merchantTransactionId = `TXN-${uuidv4().substring(0, 18).toUpperCase()}`;
    const priceInPaise = selectedPlan.price * 100; // PhonePe expects amount in paise

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const backendUrl = process.env.BACKEND_PUBLIC_URL || process.env.BACKEND_URL || "http://localhost:5000";

    const payload = {
      merchantId: PHONEPE_MERCHANT_ID,
      merchantTransactionId: merchantTransactionId,
      merchantUserId: req.member._id.toString(),
      amount: priceInPaise,
      redirectUrl: `${frontendUrl}/billing/success?txnId=${merchantTransactionId}`,
      redirectMode: "REDIRECT",
      callbackUrl: `${backendUrl}/api/billing/callback`,
      paymentInstrument: {
        type: "PAY_PAGE"
      }
    };

    const base64Payload = Buffer.from(JSON.stringify(payload)).toString("base64");
    const stringToSign = base64Payload + "/pg/v1/pay" + PHONEPE_SALT_KEY;
    const hmac = crypto.createHash("sha256").update(stringToSign).digest("hex");
    const checksum = hmac + "###" + PHONEPE_SALT_INDEX;

    // Create a transaction record in database
    await Transaction.create({
      workspaceId: req.workspaceId,
      merchantTransactionId: merchantTransactionId,
      amount: selectedPlan.price,
      plan: plan,
      creditsAdded: selectedPlan.credits,
      status: "created",
    });

    let redirectUrl = "";
    const isSandboxOrUAT = process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test" || PHONEPE_MERCHANT_ID === "MERCHANTUAT" || process.env.ALLOW_MOCK_PAYMENTS === "true";

    if (isSandboxOrUAT) {
      // Try calling PhonePe preprod sandbox API, fallback to mock simulator redirect if offline/fails
      try {
        const response = await fetch(PHONEPE_API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-VERIFY": checksum
          },
          body: JSON.stringify({ request: base64Payload })
        });
        const resJson = await response.json();
        if (resJson.success && resJson.data?.instrumentResponse?.redirectInfo?.url) {
          redirectUrl = resJson.data.instrumentResponse.redirectInfo.url;
        } else {
          throw new Error(resJson.message || "PhonePe API response error");
        }
      } catch (err) {
        console.warn("[PhonePe] Sandbox connection failed. Falling back to mock checkout:", err.message);
        redirectUrl = `${frontendUrl}/billing/success?txnId=${merchantTransactionId}&mock=true`;
      }
    } else {
      // Production flow
      const response = await fetch(PHONEPE_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-VERIFY": checksum
        },
        body: JSON.stringify({ request: base64Payload })
      });
      const resJson = await response.json();
      if (!resJson.success || !resJson.data?.instrumentResponse?.redirectInfo?.url) {
        return res.status(400).json({ success: false, error: resJson.message || "Failed to contact PhonePe PG server" });
      }
      redirectUrl = resJson.data.instrumentResponse.redirectInfo.url;
    }

    return res.json({
      success: true,
      data: {
        redirectUrl
      }
    });
  } catch (err) {
    console.error("initiatePayment error:", err);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
};

// POST /api/billing/callback — Public Webhook endpoint from PhonePe Server
exports.paymentCallback = async (req, res) => {
  try {
    const { response } = req.body;
    const xVerify = req.headers["x-verify"];

    if (!response || !xVerify) {
      return res.status(400).json({ success: false, error: "Missing callback response or headers" });
    }

    // Verify Callback Checksum
    const stringToSign = response + PHONEPE_SALT_KEY;
    const hmac = crypto.createHash("sha256").update(stringToSign).digest("hex");
    const calculatedChecksum = hmac + "###" + PHONEPE_SALT_INDEX;

    if (calculatedChecksum !== xVerify) {
      return res.status(401).json({ success: false, error: "Unauthorized callback signature verification failed" });
    }

    const payload = JSON.parse(Buffer.from(response, "base64").toString("utf-8"));
    const { success, code, data } = payload;
    const { merchantTransactionId, transactionId } = data;

    const transaction = await Transaction.findOne({ merchantTransactionId });
    if (!transaction) {
      return res.status(404).json({ success: false, error: "Transaction matching callback not found" });
    }

    // Only update pending transactions
    if (transaction.status === "created") {
      if (success && code === "PAYMENT_SUCCESS") {
        transaction.status = "paid";
        transaction.phonepeTransactionId = transactionId;
        await transaction.save();

        // Increment Workspace Credits
        const workspace = await Workspace.findById(transaction.workspaceId);
        if (workspace) {
          workspace.plan = transaction.plan;
          workspace.credits += transaction.creditsAdded;
          if (transaction.plan === "annual-pass") {
            workspace.planExpiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year expiry
          }
          await workspace.save();
          console.log(`[Billing] Workspace ${workspace.name} credits updated. Added ${transaction.creditsAdded}`);
        }
      } else {
        transaction.status = "failed";
        await transaction.save();
      }
    }

    return res.json({ success: true, message: "Callback processed successfully" });
  } catch (err) {
    console.error("paymentCallback error:", err);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
};

// GET /api/billing/status/:txnId — Verify status of a transaction
exports.getTransactionStatus = async (req, res) => {
  try {
    const { txnId } = req.params;
    const transaction = await Transaction.findOne({ merchantTransactionId: txnId });

    if (!transaction) {
      return res.status(404).json({ success: false, error: "Transaction not found" });
    }

    // Simulating successful callback in development/UAT environment if mock checkout is passed
    const isSandboxOrUAT = process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test" || PHONEPE_MERCHANT_ID === "MERCHANTUAT" || process.env.ALLOW_MOCK_PAYMENTS === "true";
    if (req.query.mock === "true" && transaction.status === "created" && isSandboxOrUAT) {
      console.log(`[Billing] Simulating mock successful payment for transaction ${txnId}`);
      transaction.status = "paid";
      transaction.phonepeTransactionId = `MOCK-${Date.now()}`;
      await transaction.save();

      const workspace = await Workspace.findById(transaction.workspaceId);
      if (workspace) {
        workspace.plan = transaction.plan;
        workspace.credits += transaction.creditsAdded;
        if (transaction.plan === "annual-pass") {
          workspace.planExpiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
        }
        await workspace.save();
      }
    }

    return res.json({
      success: true,
      data: {
        status: transaction.status,
        plan: transaction.plan,
        amount: transaction.amount,
      }
    });
  } catch (err) {
    console.error("getTransactionStatus error:", err);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
};
