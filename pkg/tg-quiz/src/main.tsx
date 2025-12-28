import '@telegram-apps/telegram-ui/dist/styles.css';
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initTelegramSdk } from "./init-telegram-sdk.tsx";


initTelegramSdk()
createRoot(document.getElementById("root")!).render(<App />);
