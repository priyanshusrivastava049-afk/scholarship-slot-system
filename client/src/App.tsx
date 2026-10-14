
import { useEffect, useState } from "react";
import "./App.css";

type ApiResponse = {
  success: boolean;
  message: string;
};

function App() {
  const [message, setMessage] = useState("Connecting to server...");
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    async function checkServer() {
      try {
        const response = await fetch(
          "http://localhost:5000/api/health"
        );

        if (!response.ok) {
          throw new Error("Server returned an error");
        }

        const data: ApiResponse = await response.json();

        setMessage(data.message);
        setIsConnected(data.success);
      } catch (error) {
        console.error("API request failed:", error);
        setMessage("Could not connect to the backend.");
        setIsConnected(false);
      }
    }

    checkServer();
  }, []);

  return (
    <main className="app">
      <h1>Scholarship Slot System</h1>
      <p>Student Verification and Slot Allocation Portal</p>

      <section className="status-card">
        <h2>Backend Connection</h2>

        <p>
          Status: {isConnected ? "Connected" : "Not connected"}
        </p>

        <p>{message}</p>
      </section>
    </main>
  );
}

export default App;
