
import express from "express";
import cors from "cors";
import prisma from "./lib/prisma.js";
import cookieParser from "cookie-parser";
import { requireAdmin } from "./middleware/requireAdmin.js";
import adminAuthRoutes from "./routes/adminAuth.js";
import adminVenueRoutes from "./routes/adminVenues.js";

const app = express();
const PORT = 5000;

// Allow our React frontend to communicate with this server.
app.use(cors({
  origin: "http://localhost:5173",
  credentials: true
}));

// Allow the server to read JSON request bodies.
app.use(express.json());
app.use(cookieParser());

// Our first API endpoint.
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Scholarship Slot System API is running!"
  });
});
  
app.get("/api/db-check", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    res.json({
      success: true,
      message: "PostgreSQL connected through Prisma!"
    });
  } catch (error) {
    console.error("Database connection failed:", error);

    res.status(500).json({
      success: false,
      message: "Database connection failed."
    });
  }
});


app.post("/api/students", async (req, res) => {
  try {
    const { admissionNo, fullName, email } = req.body;

    // Validate required fields
    if (
      typeof admissionNo !== "string" ||
      !admissionNo.trim() ||
      typeof fullName !== "string" ||
      !fullName.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Admission number and full name are required."
      });
    }

    // Create the student in PostgreSQL
    const student = await prisma.student.create({
      data: {
        admissionNo: admissionNo.trim(),
        fullName: fullName.trim(),
        ...(typeof email === "string" && email.trim()
          ? { email: email.trim() }
          : {})
      }
    });

    // Return the newly created student
    return res.status(201).json({
      success: true,
      message: "Student created successfully.",
      student
    });
  } catch (error) {
    // Handle duplicate admission number or email
    if (error?.code === "P2002") {
      return res.status(409).json({
        success: false,
        message: "Admission number or email already exists."
      });
    }

    console.error("Failed to create student:", error);

    return res.status(500).json({
      success: false,
      message: "Could not create student."
    });
  }
});


app.get("/api/students", async (req, res) => {
  try {
    const students = await prisma.student.findMany({
      orderBy: {
        id: "asc"
      }
    });

    return res.json({
      success: true,
      count: students.length,
      students
    });
  } catch (error) {
    console.error("Failed to fetch students:", error);

    return res.status(500).json({
      success: false,
      message: "Could not retrieve students."
    });
  }
});


app.get("/api/students/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    // Validate the ID
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid student ID."
      });
    }

    // Find one student by primary key
    const student = await prisma.student.findUnique({
      where: {
        id: id
      }
    });

    // Handle a student that does not exist
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found."
      });
    }

    return res.json({
      success: true,
      student
    });
  } catch (error) {
    console.error("Failed to fetch student:", error);

    return res.status(500).json({
      success: false,
      message: "Could not retrieve student."
    });
  }
});


 // GET all slots with venue and faculty details
app.get("/api/slots", async (req, res) => {
  try {
    const slots = await prisma.slot.findMany({
      include: {
        venue: true,
        faculty: true
      },
      orderBy: {
        startAt: "asc"
      }
    });

    return res.json({
      success: true,
      count: slots.length,
      slots
    });
  } catch (error) {
    console.error("Failed to fetch slots:", error);

    return res.status(500).json({
      success: false,
      message: "Could not retrieve slots."
    });
  }
});


 // GET one slot by ID
app.get("/api/slots/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid slot ID."
      });
    }

    const slot = await prisma.slot.findUnique({
      where: { id },
      include: {
        venue: true,
        faculty: true
      }
    });

    if (!slot) {
      return res.status(404).json({
        success: false,
        message: "Slot not found."
      });
    }

    return res.json({
      success: true,
      slot
    });
  } catch (error) {
    console.error("Failed to fetch slot:", error);

    return res.status(500).json({
      success: false,
      message: "Could not retrieve slot."
    });
  }
});


app.post("/api/bookings", async (req, res) => {
  const studentId = Number(req.body.studentId);

  if (!Number.isInteger(studentId) || studentId <= 0) {
    return res.status(400).json({
      success: false,
      message: "A valid student ID is required."
    });
  }

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const result = await prisma.$transaction(async (tx) => {
        // 1. Verify that the student exists.
        const student = await tx.student.findUnique({
          where: { id: studentId }
        });

        if (!student) {
          return {
            status: 404,
            body: {
              success: false,
              message: "Student not found."
            }
          };
        }

        // 2. Lock all currently eligible slot rows in a
        // consistent order before checking booking capacity.
        const now = new Date();

        const slots = await tx.$queryRaw`
          SELECT "id"
          FROM "Slot"
          WHERE "isOpen" = true
            AND "startAt" > ${now}
          ORDER BY "startAt" ASC, "id" ASC
          FOR UPDATE
        `;

        // 3. Check for an existing active booking AFTER
        // acquiring the locks.
        const existingBooking = await tx.booking.findFirst({
          where: {
            studentId,
            status: "CONFIRMED"
          }
        });

        if (existingBooking) {
          return {
            status: 409,
            body: {
              success: false,
              message: "You already have an active booking."
            }
          };
        }

        // 4. Check each locked slot in chronological order.
        for (const lockedSlot of slots) {
          const slot = await tx.slot.findUnique({
            where: { id: lockedSlot.id },
            include: {
              venue: true,
              faculty: true
            }
          });

          if (!slot || !slot.isOpen || slot.startAt <= now) {
            continue;
          }

          const confirmedBookings = await tx.booking.count({
            where: {
              slotId: slot.id,
              status: "CONFIRMED"
            }
          });

          // Skip full slots and try the next earliest slot.
          if (confirmedBookings >= slot.capacity) {
            continue;
          }

          // 5. Allocate the seat while the slot locks are held.
          const booking = await tx.booking.create({
            data: {
              studentId,
              slotId: slot.id
            },
            include: {
              student: {
                select: {
                  id: true,
                  admissionNo: true,
                  fullName: true
                }
              },
              slot: {
                include: {
                  venue: true,
                  faculty: true
                }
              }
            }
          });

          return {
            status: 201,
            body: {
              success: true,
              message: "Slot allocated successfully.",
              booking
            }
          };
        }

        return {
          status: 409,
          body: {
            success: false,
            message: "No available verification slots."
          }
        };
      }, {
        // Each statement gets a fresh committed-data snapshot.
        // The row locks coordinate competing booking requests.
        isolationLevel: "ReadCommitted"
      });

      return res.status(result.status).json(result.body);
    } catch (error) {
      // Retry a transaction conflict.
      if (error?.code === "P2034" && attempt < 3) {
        continue;
      }

      if (error?.code === "P2002") {
        return res.status(409).json({
          success: false,
          message:
            "A conflicting booking exists. Please try again."
        });
      }

      console.error("Booking allocation failed:", error);

      return res.status(500).json({
        success: false,
        message: "Could not allocate a slot. Please try again."
      });
    }
  }

  return res.status(503).json({
    success: false,
    message:
      "The system is busy. Please try booking again shortly."
  });
});

app.get("/api/bookings/student/:studentId", async (req, res) => {
  const studentId = Number(req.params.studentId);

  if (!Number.isInteger(studentId) || studentId <= 0) {
    return res.status(400).json({
      success: false,
      message: "Invalid student ID."
    });
  }

  try {
    const booking = await prisma.booking.findFirst({
      where: {
        studentId,
        status: "CONFIRMED"
      },
      include: {
        student: {
          select: {
            id: true,
            admissionNo: true,
            fullName: true
          }
        },
        slot: {
          include: {
            venue: true,
            faculty: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "No active booking found for this student."
      });
    }

    return res.status(200).json({
      success: true,
      booking
    });
  } catch (error) {
    console.error("Fetch booking failed:", error);

    return res.status(500).json({
      success: false,
      message: "Could not retrieve booking details."
    });
  }
});

app.use("/api/admin", adminAuthRoutes);
app.use("/api/admin/venues", adminVenueRoutes);

// Start the backend server.
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
