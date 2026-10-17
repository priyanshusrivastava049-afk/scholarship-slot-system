
import express from "express";
import cors from "cors";
import prisma from "./lib/prisma.js";

const app = express();
const PORT = 5000;

// Allow our React frontend to communicate with this server.
app.use(cors({
  origin: "http://localhost:5173"
}));

// Allow the server to read JSON request bodies.
app.use(express.json());

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

// Start the backend server.
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
