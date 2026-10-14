
import express from "express";
import cors from "cors";

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

// Start the backend server.
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
