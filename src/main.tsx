import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { TonConnectUIProvider } from "@tonconnect/ui-react";
import "./index.css";
import App from "./App";

// Always use the deployed origin for the manifest (works in Telegram WebView too)
const manifestUrl = `${window.location.origin}/tonconnect-manifest.json`;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <TonConnectUIProvider
      manifestUrl={manifestUrl}
      actionsConfiguration={{
        twaReturnUrl: 'back',
      }}
    >
      <App />
    </TonConnectUIProvider>
  </StrictMode>
);
