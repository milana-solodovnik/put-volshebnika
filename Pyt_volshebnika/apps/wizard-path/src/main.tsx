import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { installDemoApi } from "./demo/demo-fetch";

if (import.meta.env.VITE_DEMO_MODE === "1") {
  installDemoApi();
}

createRoot(document.getElementById("root")!).render(<App />);
