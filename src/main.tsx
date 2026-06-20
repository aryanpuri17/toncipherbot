import { Buffer } from 'buffer';
if (typeof globalThis.Buffer === 'undefined') {
  (globalThis as Record<string, unknown>).Buffer = Buffer;
}

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { TonConnectUIProvider } from "@tonconnect/ui-react";
import "./index.css";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <TonConnectUIProvider
      manifestUrl="https://toncipherbot.onrender.com/tonconnect-manifest.json"
      actionsConfiguration={{
        twaReturnUrl: 'https://t.me/TonCipher_bot',
      }}
    >
      <App />
    </TonConnectUIProvider>
  </StrictMode>
);
