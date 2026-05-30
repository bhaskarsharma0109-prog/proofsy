const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const Organization = require("../models/Organization");
const TeamMember = require("../models/TeamMember");
const { protect } = require("../middleware/auth");

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || "proofsy_secret_key", {
    expiresIn: "30d",
  });
};

const sendTokenResponse = (member, statusCode, res) => {
  const token = generateToken(member._id);

  const options = {
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  };

  res.status(statusCode).cookie("token", token, options).json({
    success: true,
    token,
    data: {
      id: member._id,
      name: member.name,
      email: member.email,
      role: member.role,
      organizationId: member.organizationId,
    },
  });
};

// @desc    Register a new Organization and Owner (Root login)
// @route   POST /api/auth/register
router.post("/register", async (req, res, next) => {
  try {
    const { orgName, name, email, password } = req.body;

    if (!orgName || !name || !email || !password) {
      return res.status(400).json({ success: false, error: "Please provide all fields" });
    }

    // Check if email is taken
    const existingMember = await TeamMember.findOne({ email });
    if (existingMember) {
      return res.status(400).json({ success: false, error: "Email already in use" });
    }

    // Create Organization
    const organization = await Organization.create({ name: orgName });

    // Create TeamMember (Owner)
    const member = await TeamMember.create({
      organizationId: organization._id,
      name,
      email,
      password,
      role: "owner",
    });

    sendTokenResponse(member, 201, res);
  } catch (error) {
    next(error);
  }
});

// @desc    Login a TeamMember
// @route   POST /api/auth/login
router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: "Please provide an email and password" });
    }

    const member = await TeamMember.findOne({ email }).select("+password");

    if (!member) {
      return res.status(401).json({ success: false, error: "Invalid credentials" });
    }

    const isMatch = await member.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({ success: false, error: "Invalid credentials" });
    }

    sendTokenResponse(member, 200, res);
  } catch (error) {
    next(error);
  }
});

// @desc    Logout user / clear cookie
// @route   POST /api/auth/logout
router.post("/logout", (req, res) => {
  res.cookie("token", "none", {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });

  res.status(200).json({ success: true, data: {} });
});

// @desc    Get current logged in member
// @route   GET /api/auth/me
router.get("/me", protect, async (req, res, next) => {
  try {
    const member = await TeamMember.findById(req.member.id).populate("organizationId");
    res.status(200).json({
      success: true,
      data: member,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
