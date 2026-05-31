const Certificate = require("../models/Certificate");
const Workspace = require("../models/Workspace");
const { verifyCertificateSignature, getPublicKeyPem } = require("../services/signatureService");

const defaultBranding = {
  logo: "",
  primaryColor: "#2563EB",
  accentColor: "#16A34A",
  customDomain: "",
  brandingEnabled: false,
  verificationPageTitle: "",
  footerText: "",
};

function normalizeBranding(workspace) {
  const rawBranding = workspace?.branding;
  const plainBranding = rawBranding && typeof rawBranding.toObject === "function" ? rawBranding.toObject() : rawBranding;
  const branding = {
    ...defaultBranding,
    ...(plainBranding || {}),
  };

  return {
    workspaceId: workspace?._id || null,
    workspaceName: workspace?.name || "Proofsy",
    ...branding,
  };
}

function serializeCertificate(certificate, isSignatureValid = false) {
  return {
    recipientName: certificate.userId?.name || "Unknown",
    recipientEmail: certificate.userId?.email || "",
    eventName: certificate.eventId?.name || "Unknown Event",
    eventDate: certificate.eventId?.date?.toISOString() || null,
    organizerName: certificate.eventId?.organizerName || "",
    issuedAt: certificate.createdAt.toISOString(),
    expiresAt: certificate.expiresAt ? certificate.expiresAt.toISOString() : null,
    revokedAt: certificate.revokedAt ? certificate.revokedAt.toISOString() : null,
    revocationReason: certificate.revocationReason || "",
    suspendedAt: certificate.suspendedAt ? certificate.suspendedAt.toISOString() : null,
    status: certificate.status,
    pdfUrl: certificate.pdfUrl,
    pngUrl: certificate.pngUrl || null,
    svgUrl: certificate.svgUrl || null,
    cryptographicSignature: certificate.cryptographicSignature || null,
    isCryptographicallyVerified: isSignatureValid,
  };
}

function invalidVerificationResponse(res, reason, certificate, branding) {
  return res.json({
    success: true,
    data: {
      isValid: false,
      reason,
      branding,
      certificate: serializeCertificate(certificate),
    },
  });
}

// GET /api/verify/:code
exports.verifyCertificate = async (req, res) => {
  try {
    const { code } = req.params;

    const certificate = await Certificate.findOne({
      verificationCode: code.toUpperCase(),
    })
      .populate("userId")
      .populate("eventId");

    if (!certificate) {
      return res.status(404).json({
        success: false,
        error: "Invalid verification code or certificate not found.",
      });
    }

    const workspace = await Workspace.findById(certificate.workspaceId).select("name branding").lean();
    const branding = normalizeBranding(workspace);

    const now = new Date();
    if (certificate.status === "revoked") {
      return invalidVerificationResponse(
        res,
        certificate.revocationReason || "Certificate has been revoked",
        certificate,
        branding
      );
    }
    if (certificate.status === "suspended") {
      return invalidVerificationResponse(res, "Certificate is currently suspended", certificate, branding);
    }
    if (certificate.status === "expired" || (certificate.expiresAt && certificate.expiresAt < now)) {
      if (certificate.status === "generated") {
        certificate.status = "expired";
        await certificate.save();
      }
      return invalidVerificationResponse(res, "Certificate has expired", certificate, branding);
    }

    // On-demand PNG & SVG retrofit for legacy certificates
    if (certificate.status === "generated" && (!certificate.pngUrl || !certificate.svgUrl)) {
      try {
        const Template = require("../models/Template");
        const { generatePremiumPNG, generatePremiumSVG } = require("../workers/certificateWorker");

        const event = certificate.eventId;
        let template;
        if (typeof event.templateId === "string" && !event.templateId.match(/^[0-9a-fA-F]{24}$/)) {
          template = await Template.findOne({ name: { $regex: new RegExp(event.templateId, "i") }, isStarter: true });
          if (!template) {
            template = await Template.findOne();
          }
        } else {
          template = await Template.findById(event.templateId);
        }

        if (template) {
          let themeColor = "#2563eb";
          if (template.textLayers && template.textLayers.length > 0) {
            const accentLayer = template.textLayers.find(l => l.variable === "recipient_name") || template.textLayers[0];
            if (accentLayer && accentLayer.color) {
              themeColor = accentLayer.color;
            }
          }

          if (!certificate.pngUrl) {
            certificate.pngUrl = await generatePremiumPNG(template, certificate.userId, event, certificate, themeColor);
          }
          if (!certificate.svgUrl) {
            certificate.svgUrl = await generatePremiumSVG(template, certificate.userId, event, certificate, themeColor);
          }
          await certificate.save();
        }
      } catch (genErr) {
        console.error("[API] Failed to dynamically generate missing PNG/SVG for legacy certificate:", genErr);
      }
    }

    // Construct deterministic validation payload
    const payload = {
      verificationCode: certificate.verificationCode,
      recipientName: certificate.userId?.name || "Unknown",
      recipientEmail: certificate.userId?.email || "",
      eventName: certificate.eventId?.name || "Unknown Event",
      issuedAt: certificate.createdAt.toISOString()
    };

    const isSignatureValid = verifyCertificateSignature(payload, certificate.cryptographicSignature);

    // Record Verification Audit Event asynchronously
    (async () => {
      try {
        const VerificationAudit = require("../models/VerificationAudit");
        
        // Parse referral source
        const referer = req.headers.referer || req.headers.referrer || "";
        const queryRef = req.query.ref || "";
        let referralSource = "direct";
        
        if (queryRef === "linkedin" || referer.includes("linkedin.com")) {
          referralSource = "linkedin";
        } else if (queryRef === "twitter" || queryRef === "x" || referer.includes("twitter.com") || referer.includes("x.com") || referer.includes("t.co")) {
          referralSource = "twitter";
        } else if (queryRef === "qr") {
          referralSource = "qr";
        } else if (queryRef === "offline") {
          referralSource = "offline";
        }
        
        // Parse User-Agent
        const ua = req.headers["user-agent"] || "";
        let deviceType = "desktop";
        let browser = "Other";
        let os = "Other";
        
        if (/mobi|android|iphone|ipad|ipod/i.test(ua)) {
          deviceType = /ipad/i.test(ua) ? "tablet" : "mobile";
        }
        
        if (/chrome|crios/i.test(ua) && !/edge|edg/i.test(ua) && !/opr/i.test(ua)) {
          browser = "Chrome";
        } else if (/safari/i.test(ua) && !/chrome|crios/i.test(ua)) {
          browser = "Safari";
        } else if (/firefox|fxios/i.test(ua)) {
          browser = "Firefox";
        } else if (/edge|edg/i.test(ua)) {
          browser = "Edge";
        } else if (/opr/i.test(ua)) {
          browser = "Opera";
        }
        
        if (/windows/i.test(ua)) {
          os = "Windows";
        } else if (/macintosh|mac os x/i.test(ua) && !/iphone|ipad|ipod/i.test(ua)) {
          os = "macOS";
        } else if (/iphone|ipad|ipod/i.test(ua)) {
          os = "iOS";
        } else if (/android/i.test(ua)) {
          os = "Android";
        } else if (/linux/i.test(ua)) {
          os = "Linux";
        }
        
        await VerificationAudit.create({
          certificateId: certificate._id,
          workspaceId: certificate.workspaceId,
          eventId: certificate.eventId?._id || certificate.eventId,
          referralSource,
          deviceType,
          browser,
          os,
          country: "Unknown"
        });
      } catch (auditErr) {
        console.error("[API] Failed to record verification audit:", auditErr);
      }
    })();

    return res.json({
      success: true,
      data: {
        isValid: true,
        branding,
        certificate: serializeCertificate(certificate, isSignatureValid),
      },
    });
  } catch (err) {
    console.error("verifyCertificate error:", err);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
};

// GET /api/verify/public-key
exports.getPublicKey = async (req, res) => {
  try {
    const publicKey = getPublicKeyPem();
    return res.json({
      success: true,
      data: {
        publicKey,
      },
    });
  } catch (err) {
    console.error("getPublicKey error:", err);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
};
