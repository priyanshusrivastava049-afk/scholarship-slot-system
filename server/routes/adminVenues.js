
import express from "express";
import prisma from "../lib/prisma.js";
import { requireAdmin } from "../middleware/requireAdmin.js";

const router = express.Router();

// All venue-management endpoints require admin authentication.
router.use(requireAdmin);

// GET /api/admin/venues — list venues.
router.get("/", async (req, res) => {
  try {
    const venues = await prisma.venue.findMany({
      orderBy: { id: "asc" },
      include: {
        _count: {
          select: { slots: true },
        },
      },
    });

    return res.json({
      success: true,
      venues,
    });
  } catch (error) {
    console.error("List venues error:", error);
    return res.status(500).json({
      success: false,
      message: "Could not retrieve venues.",
    });
  }
});

// POST /api/admin/venues — create a venue.
router.post("/", async (req, res) => {
  try {
    const { name, building, capacity } = req.body;

    if (
      typeof name !== "string" ||
      name.trim().length < 2 ||
      name.trim().length > 100 ||
      typeof building !== "string" ||
      building.trim().length < 2 ||
      building.trim().length > 100 ||
      !Number.isSafeInteger(capacity) ||
      capacity < 1 ||
      capacity > 10000
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Enter a valid venue name, building, and capacity between 1 and 10000.",
      });
    }

    const venue = await prisma.venue.create({
      data: {
        name: name.trim(),
        building: building.trim(),
        capacity,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Venue created successfully.",
      venue,
    });
  } catch (error) {
    console.error("Create venue error:", error);
    return res.status(500).json({
      success: false,
      message: "Could not create venue.",
    });
  }
});

// PATCH /api/admin/venues/:id — update venue details.
router.patch("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isSafeInteger(id) || id < 1) {
      return res.status(400).json({
        success: false,
        message: "Invalid venue ID.",
      });
    }

    const { name, building, capacity } = req.body;
    const data = {};

    if (name !== undefined) {
      if (
        typeof name !== "string" ||
        name.trim().length < 2 ||
        name.trim().length > 100
      ) {
        return res.status(400).json({
          success: false,
          message: "Venue name must be between 2 and 100 characters.",
        });
      }
      data.name = name.trim();
    }

    if (building !== undefined) {
      if (
        typeof building !== "string" ||
        building.trim().length < 2 ||
        building.trim().length > 100
      ) {
        return res.status(400).json({
          success: false,
          message: "Building must be between 2 and 100 characters.",
        });
      }
      data.building = building.trim();
    }

    if (capacity !== undefined) {
      if (
        !Number.isSafeInteger(capacity) ||
        capacity < 1 ||
        capacity > 10000
      ) {
        return res.status(400).json({
          success: false,
          message: "Capacity must be between 1 and 10000.",
        });
      }
      data.capacity = capacity;
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Provide at least one field to update.",
      });
    }

    
const existing = await prisma.venue.findUnique({
  where: { id },
  include: {
    slots: {
      include: {
        bookings: {
          where: { status: "CONFIRMED" },
          select: { id: true },
        },
      },
    },
  },
});


    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Venue not found.",
      });
    }

    // Don't reduce venue capacity below confirmed bookings in any open slot.
    
if (data.capacity !== undefined) {
  const overCapacitySlot = existing.slots.find(
    (slot) =>
      slot.capacity > data.capacity ||
      (slot.isOpen && slot.bookings.length > data.capacity)
  );

  if (overCapacitySlot) {
    return res.status(409).json({
      success: false,
      message:
        "Capacity cannot be lower than an existing slot's capacity or its confirmed bookings.",
    });
  }
}


    const venue = await prisma.venue.update({
      where: { id },
      data,
    });

    return res.json({
      success: true,
      message: "Venue updated successfully.",
      venue,
    });
  } catch (error) {
    console.error("Update venue error:", error);
    return res.status(500).json({
      success: false,
      message: "Could not update venue.",
    });
  }
});

export default router;
