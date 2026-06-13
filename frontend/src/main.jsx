//import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { ClerkProvider } from "@clerk/clerk-react";

// import publishable key from .env file
const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
if (!publishableKey) {
  console.error(
    "Publishable key is missing. Please set VITE_CLERK_PUBLISHABLE_KEY in your .env file.",
  );
}

createRoot(document.getElementById("root")).render(
  <ClerkProvider publishableKey={publishableKey}>
    <App />
  </ClerkProvider>,
);
