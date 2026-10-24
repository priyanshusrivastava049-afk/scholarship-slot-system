
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import prisma from "../lib/prisma.js";
import { requireAdmin } from "../middleware/requireAdmin.js";

const router = express.Router();

function safeSecretEquals(provided, expected) {
  if (typeof provided !== "string" || typeof expected !== "string") {
    return false;
  }

  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);

  return (
    providedBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(providedBuffer, expectedBuffer)
  );
}

// Create the first admin account.
// This endpoint is available only while no admin account exists.
router.post("/setup", async (req, res) => {
  try {
    const setupKey = req.get("x-admin-setup-key");
    const expectedKey = process.env.ADMIN_SETUP_KEY;

    if (!expectedKey || !safeSecretEquals(setupKey, expectedKey)) {
      return res.status(403).json({
        success: false,
        message: "Invalid or missing admin setup key.",
      });
    }

    const existingAdmin = await prisma.admin.findFirst();

    if (existingAdmin) {
      return res.status(409).json({
        success: false,
        message: "Admin setup has already been completed.",
      });
    }

    const { fullName, email, password } = req.body;

    if (
      typeof fullName !== "string" ||
      fullName.trim().length < 2 ||
      fullName.trim().length > 100 ||
      typeof email !== "string" ||
      email.trim().length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
      typeof password !== "string" ||
      password.length < 12 ||
      Buffer.byteLength(password, "utf8") > 72
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Provide a valid name and email, and a password of 12–72 bytes.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const passwordHash = await bcrypt.hash(password, 12);

    const admin = await prisma.admin.create({
      data: {
        fullName: fullName.trim(),
        email: normalizedEmail,
        passwordHash,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Admin account created successfully.",
      admin,
    });
  } catch (error) {
    if (error?.code === "P2002") {
      return res.status(409).json({
        success: false,
        message: "An account with that email already exists.",
      });
    }

    console.error("Admin setup error:", error);

    return res.status(500).json({
      success: false,
      message: "Could not create the admin account.",
    });
  }
});

// Admin login.
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      email.length > 254 ||
      password.length > 72
    ) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid email and password.",
      });
    }

    const admin = await prisma.admin.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    const passwordMatches = admin
      ? await bcrypt.compare(password, admin.passwordHash)
      : false;

    if (!admin || !admin.isActive || !passwordMatches) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      console.error("JWT_SECRET is not configured.");
      return res.status(500).json({
        success: false,
        message: "Authentication is not configured.",
      });
    }

    const token = jwt.sign({}, jwtSecret, {
      subject: String(admin.id),
      expiresIn: "2h",
    });

    res.cookie("adminToken", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 2 * 60 * 60 * 1000,
      path: "/",
    });

    return res.json({
      success: true,
      message: "Login successful.",
      admin: {
        id: admin.id,
        fullName: admin.fullName,
        email: admin.email,
      },
    });
  } catch (error) {
    console.error("Admin login error:", error);

    return res.status(500).json({
      success: false,
      message: "Could not log in.",
    });
  }
});

// Admin logout.
router.post("/logout", (req, res) => {
  res.clearCookie("adminToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });

  return res.json({
    success: true,
    message: "Logged out successfully.",
  });
});

router.get("/me", requireAdmin, (req, res) => {
  return res.json({
    success: true,
    admin: req.admin,
  });
});

export default router;
