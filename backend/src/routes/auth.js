const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const Organization = require("../models/Organization");
const TeamMember = require("../models/TeamMember");
const { protect } = require("../middleware/auth");

const generateToken = (id) => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured");
  }
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });
};

const sendTokenResponse = (member, statusCode, req, res) => {
  const token = generateToken(member._id);

  const isLocalhost = req.headers.host && (req.headers.host.includes("localhost") || req.headers.host.includes("127.0.0.1"));
  const options = {
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" && !isLocalhost,
    sameSite: process.env.NODE_ENV === "production" && !isLocalhost ? "none" : "lax",
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
      workspaceId: member.workspaceId || null,
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

    // Create Default Workspace (Indian College Demo Workspace)
    const Workspace = require("../models/Workspace");
    const Template = require("../models/Template");
    const Event = require("../models/Event");

    const workspaceSlug = orgName.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "main";
    let finalSlug = workspaceSlug;
    let slugExists = await Workspace.findOne({ slug: finalSlug });
    while (slugExists) {
      finalSlug = `${workspaceSlug}-${Math.floor(1000 + Math.random() * 9000)}`;
      slugExists = await Workspace.findOne({ slug: finalSlug });
    }

    const workspace = await Workspace.create({
      name: "Demo Symposium",
      organizationId: organization._id,
      slug: finalSlug,
      createdBy: member._id,
    });

    member.workspaceId = workspace._id;
    await member.save();

    // Auto-seed a sample template & event under this workspace
    const starterTemplate = await Template.findOne({ name: "Elegant Gold", isStarter: true }) || await Template.findOne({ isStarter: true });
    let seededTemplateId = null;
    if (starterTemplate) {
      const workspaceTemplate = await Template.create({
        name: "Elegant Gold (Sample)",
        backgroundType: starterTemplate.backgroundType,
        backgroundUrl: starterTemplate.backgroundUrl,
        width: starterTemplate.width,
        height: starterTemplate.height,
        textLayers: starterTemplate.textLayers,
        qrCode: starterTemplate.qrCode,
        isStarter: false,
        organizationId: organization._id,
        workspaceId: workspace._id,
      });
      seededTemplateId = workspaceTemplate._id;
    }

    await Event.create({
      name: "National Level Tech Fest 2026",
      date: new Date(),
      organizerName: "Student Activity Centre",
      organizationId: organization._id,
      workspaceId: workspace._id,
      templateId: seededTemplateId || "modern",
      duration: "2 Days",
    });

    sendTokenResponse(member, 201, req, res);
  } catch (error) {
    next(error);
  }
});

// @desc    Register a new Organization, Owner, and auto-seed a Sandbox Workspace
// @route   POST /api/auth/demo
router.post("/demo", async (req, res, next) => {
  try {
    const rand = Math.floor(1000 + Math.random() * 9000);
    const orgName = `Demo Eng College ${rand}`;
    const name = `Demo Student Coordinator`;
    const email = `demo-${rand}@proofsy.in`;
    const password = Math.random().toString(36).substring(2, 15);

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

    // Create Default Workspace
    const Workspace = require("../models/Workspace");
    const Template = require("../models/Template");
    const Event = require("../models/Event");

    const workspaceSlug = `demo-symposium-${rand}`;
    const workspace = await Workspace.create({
      name: "Demo Symposium",
      organizationId: organization._id,
      slug: workspaceSlug,
      createdBy: member._id,
      credits: 250, // Default testing credits
    });

    member.workspaceId = workspace._id;
    await member.save();

    // Auto-seed a sample template & event under this workspace
    const starterTemplate = await Template.findOne({ name: "Elegant Gold", isStarter: true }) || await Template.findOne({ isStarter: true });
    let seededTemplateId = null;
    if (starterTemplate) {
      const workspaceTemplate = await Template.create({
        name: "Elegant Gold (Sample)",
        backgroundType: starterTemplate.backgroundType,
        backgroundUrl: starterTemplate.backgroundUrl,
        width: starterTemplate.width,
        height: starterTemplate.height,
        textLayers: starterTemplate.textLayers,
        qrCode: starterTemplate.qrCode,
        isStarter: false,
        organizationId: organization._id,
        workspaceId: workspace._id,
      });
      seededTemplateId = workspaceTemplate._id;
    }

    await Event.create({
      name: "National Level Tech Fest 2026",
      date: new Date(),
      organizerName: "Student Activity Centre",
      organizationId: organization._id,
      workspaceId: workspace._id,
      templateId: seededTemplateId || "modern",
      duration: "2 Days",
    });

    sendTokenResponse(member, 201, req, res);
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

    sendTokenResponse(member, 200, req, res);
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
// --- RECIPIENT AUTHENTICATION (OTP) ---
const crypto = require("crypto");
const User = require("../models/User");
const { protectRecipient } = require("../middleware/auth");
const { sendRecipientOTPEmail } = require("../services/emailService");

// @desc    Register a new recipient User
// @route   POST /api/auth/recipient/register
router.post("/recipient/register", async (req, res, next) => {
  try {
    const { name, email } = req.body;

    if (!name || !email) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: name, email",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    let user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      user = await User.create({
        name: name.trim(),
        email: normalizedEmail,
      });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "30d",
    });

    const isLocalhost = req.headers.host && (req.headers.host.includes("localhost") || req.headers.host.includes("127.0.0.1"));
    const options = {
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      httpOnly: true,
      secure: process.env.NODE_ENV === "production" && !isLocalhost,
      sameSite: process.env.NODE_ENV === "production" && !isLocalhost ? "none" : "lax",
    };

    res.status(201).cookie("recipientToken", token, options).json({
      success: true,
      token,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Request OTP for recipient login
// @route   POST /api/auth/recipient/login
router.post("/recipient/login", async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: "Please provide an email" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      // Return success even if user not found to prevent email enumeration,
      // but in this context the frontend already tells them if they have certs,
      // so we can be explicit or just return success.
      return res.status(404).json({ success: false, error: "No certificates found for this email." });
    }

    // Generate 6 digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Hash OTP for DB (basic security)
    const salt = crypto.randomBytes(8).toString("hex");
    const hashedOtp = crypto.createHash("sha256").update(otp + salt).digest("hex");
    const storedCode = `${salt}:${hashedOtp}`;

    user.loginCode = storedCode;
    user.loginCodeExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save();

    console.log("\n==================================================");
    console.log(`[AUTH] RECIPIENT LOGIN OTP FOR ${user.email} IS: ${otp}`);
    console.log("==================================================\n");

    try {
      await sendRecipientOTPEmail(user.email, user.name, otp);
    } catch (err) {
      console.error("[Email] Failed to send OTP:", err);
      console.log("[Email] Falling back to console-only OTP delivery to ensure system usability.");
    }

    const isProd = process.env.NODE_ENV === "production";
    res.status(200).json({ 
      success: true, 
      message: "OTP sent to email", 
      ...(!isProd && { debugOtp: otp }) 
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Verify OTP for recipient login
// @route   POST /api/auth/recipient/verify
router.post("/recipient/verify", async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ success: false, error: "Please provide email and OTP" });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() }).select("+loginCode +loginCodeExpires");

    if (!user || !user.loginCode || !user.loginCodeExpires || user.loginCodeExpires < Date.now()) {
      return res.status(401).json({ success: false, error: "Invalid or expired OTP" });
    }

    const [salt, hash] = user.loginCode.split(":");
    const verifyHash = crypto.createHash("sha256").update(otp + salt).digest("hex");

    if (verifyHash !== hash) {
      return res.status(401).json({ success: false, error: "Invalid OTP" });
    }

    // Clear OTP
    user.loginCode = undefined;
    user.loginCodeExpires = undefined;
    await user.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "30d",
    });

    const isLocalhost = req.headers.host && (req.headers.host.includes("localhost") || req.headers.host.includes("127.0.0.1"));
    const options = {
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      httpOnly: true,
      secure: process.env.NODE_ENV === "production" && !isLocalhost,
      sameSite: process.env.NODE_ENV === "production" && !isLocalhost ? "none" : "lax",
    };

    res.status(200).cookie("recipientToken", token, options).json({
      success: true,
      token,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get current logged in recipient
// @route   GET /api/auth/recipient/me
router.get("/recipient/me", protectRecipient, async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      data: req.user,
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get certificates for the logged-in recipient
// @route   GET /api/auth/recipient/certificates
router.get("/recipient/certificates", protectRecipient, async (req, res, next) => {
  try {
    const Certificate = require("../models/Certificate");
    const certificates = await Certificate.find({ userId: req.user._id })
      .populate("eventId")
      .sort({ createdAt: -1 });

    const uniqueEvents = new Set(certificates.map((c) => c.eventId?._id?.toString()));
    const frontendUrl = process.env.FRONTEND_URL || process.env.FRONTEND_BASE_URL || "http://localhost:3000";
    const { generateLinkedInAddUrl } = require("../utils/linkedinBadge");

    res.status(200).json({
      success: true,
      data: {
        user: {
          name: req.user.name,
          email: req.user.email,
          bio: req.user.bio || "",
          profilePhoto: req.user.profilePhoto || "",
          linkedinUrl: req.user.linkedinUrl || "",
          twitterHandle: req.user.twitterHandle || "",
          portfolioTitle: req.user.portfolioTitle || "",
          isPublicProfile: req.user.isPublicProfile,
        },
        totalEventsAttended: uniqueEvents.size,
        certificates: certificates.map((c) => ({
          id: c._id,
          eventId: c.eventId?._id,
          eventName: c.eventId?.name || "Unknown Event",
          eventDate: c.eventId?.date?.toISOString() || null,
          verificationCode: c.verificationCode,
          pdfUrl: c.pdfUrl,
          status: c.status,
          expiresAt: c.expiresAt ? c.expiresAt.toISOString() : null,
          revokedAt: c.revokedAt ? c.revokedAt.toISOString() : null,
          revocationReason: c.revocationReason || "",
          suspendedAt: c.suspendedAt ? c.suspendedAt.toISOString() : null,
          issuedAt: c.createdAt.toISOString(),
          linkedInAddUrl: generateLinkedInAddUrl({
            certName: c.eventId?.name || "Certificate",
            orgName: c.eventId?.organizerName || "Proofsy",
            issueDate: c.createdAt,
            expirationDate: c.expiresAt,
            certUrl: `${frontendUrl}/verify?code=${c.verificationCode}`,
            certId: c.verificationCode,
          }),
        })),
      },
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Logout recipient
// @route   POST /api/auth/recipient/logout
router.post("/recipient/logout", (req, res) => {
  res.cookie("recipientToken", "none", {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });

  res.status(200).json({ success: true, data: {} });
});

// @desc    Update recipient profile
// @route   PUT /api/auth/recipient/profile
router.put("/recipient/profile", protectRecipient, async (req, res, next) => {
  try {
    const { name, bio, profilePhoto, linkedinUrl, twitterHandle, portfolioTitle, isPublicProfile } = req.body;
    
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, error: "Recipient not found" });
    }

    if (name !== undefined) user.name = name.trim();
    if (bio !== undefined) user.bio = bio.trim();
    if (profilePhoto !== undefined) user.profilePhoto = profilePhoto.trim();
    if (linkedinUrl !== undefined) user.linkedinUrl = linkedinUrl.trim();
    if (twitterHandle !== undefined) user.twitterHandle = twitterHandle.trim();
    if (portfolioTitle !== undefined) user.portfolioTitle = portfolioTitle.trim();
    if (isPublicProfile !== undefined) user.isPublicProfile = !!isPublicProfile;

    await user.save();

    res.status(200).json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        bio: user.bio,
        profilePhoto: user.profilePhoto,
        linkedinUrl: user.linkedinUrl,
        twitterHandle: user.twitterHandle,
        portfolioTitle: user.portfolioTitle,
        isPublicProfile: user.isPublicProfile,
      },
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get public profile data by email
// @route   GET /api/auth/recipient/public/:email
router.get("/recipient/public/:email", async (req, res, next) => {
  try {
    const email = req.params.email.toLowerCase().trim();
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ success: false, error: "Recipient profile not found" });
    }

    if (!user.isPublicProfile) {
      return res.status(403).json({ success: false, error: "This profile is private." });
    }

    const Certificate = require("../models/Certificate");
    const certificates = await Certificate.find({ userId: user._id })
      .populate("eventId")
      .sort({ createdAt: -1 });

    const uniqueEvents = new Set(certificates.map((c) => c.eventId?._id?.toString()));
    const frontendUrl = process.env.FRONTEND_URL || process.env.FRONTEND_BASE_URL || "http://localhost:3000";
    const { generateLinkedInAddUrl } = require("../utils/linkedinBadge");

    const certsWithLinkedIn = certificates.map((c) => ({
      id: c._id,
      eventId: c.eventId?._id,
      eventName: c.eventId?.name || "Unknown Event",
      eventDate: c.eventId?.date?.toISOString() || null,
      organizerName: c.eventId?.organizerName || "",
      verificationCode: c.verificationCode,
      pdfUrl: c.pdfUrl,
      status: c.status,
      expiresAt: c.expiresAt ? c.expiresAt.toISOString() : null,
      revokedAt: c.revokedAt ? c.revokedAt.toISOString() : null,
      revocationReason: c.revocationReason || "",
      suspendedAt: c.suspendedAt ? c.suspendedAt.toISOString() : null,
      issuedAt: c.createdAt.toISOString(),
      linkedInAddUrl: generateLinkedInAddUrl({
        certName: c.eventId?.name || "Certificate",
        orgName: c.eventId?.organizerName || "Proofsy",
        issueDate: c.createdAt,
        expirationDate: c.expiresAt,
        certUrl: `${frontendUrl}/verify?code=${c.verificationCode}`,
        certId: c.verificationCode,
      }),
    }));

    res.status(200).json({
      success: true,
      data: {
        user: {
          name: user.name,
          email: user.email,
          bio: user.bio || "",
          profilePhoto: user.profilePhoto || "",
          linkedinUrl: user.linkedinUrl || "",
          twitterHandle: user.twitterHandle || "",
          portfolioTitle: user.portfolioTitle || "",
        },
        totalEventsAttended: uniqueEvents.size,
        certificates: certsWithLinkedIn,
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
