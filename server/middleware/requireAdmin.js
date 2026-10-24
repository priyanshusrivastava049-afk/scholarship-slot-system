
import jwt from "jsonwebtoken";
import prisma from "../lib/prisma.js";

export async function requireAdmin(req, res, next) {
  try {
    const token = req.cookies?.adminToken;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication required. Please log in.",
      });
    }

    const secret = process.env.JWT_SECRET;

    if (!secret) {
      console.error("JWT_SECRET is not configured.");
      return res.status(500).json({
        success: false,
        message: "Authentication is not configured.",
      });
    }

    const payload = jwt.verify(token, secret);

    if (
      typeof payload === "string" ||
      typeof payload.sub !== "string" ||
      !/^[1-9]\d*$/.test(payload.sub)
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication token.",
      });
    }

    const admin = await prisma.admin.findUnique({
      where: { id: Number(payload.sub) },
      select: {
        id: true,
        fullName: true,
        email: true,
        isActive: true,
      },
    });

    if (!admin || !admin.isActive) {
      return res.status(401).json({
        success: false,
        message: "Admin account is unavailable. Please log in again.",
      });
    }

    req.admin = admin;
    next();
  } catch (error) {
    if (
      error?.name === "JsonWebTokenError" ||
      error?.name === "TokenExpiredError" ||
      error?.name === "NotBeforeError"
    ) {
      return res.status(401).json({
        success: false,
        message: "Your session is invalid or expired. Please log in again.",
      });
    }

    console.error("Admin authentication failed:", error);

    return res.status(500).json({
      success: false,
      message: "Could not verify admin authentication.",
    });
  }
}
