import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initTelegramSdk } from "./init-telegram-sdk.tsx";


if (!import.meta.env.DEV) {
  initTelegramSdk()
}
createRoot(document.getElementById("root")!).render(<App />);
