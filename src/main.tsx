import { createRoot } from "react-dom/client";
import { ProgressProvider } from "./contexts/ProgressContext";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <ProgressProvider>
    <App />
  </ProgressProvider>
);
