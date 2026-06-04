import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { TonConnectUIProvider } from "@tonconnect/ui-react";
import "./index.css";
import App from "./App";

const manifestUrl = `${window.location.origin}/tonconnect-manifest.json`;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <TonConnectUIProvider
      manifestUrl={manifestUrl}
      actionsConfiguration={{
        // Return to the Mini App after wallet connection
        twaReturnUrl: 'https://t.me/TonCipher_bot',
      }}
      walletsListConfiguration={{
        // Ensure Telegram's built-in Wallet is always first and properly configured
        includeWallets: [
          {
            appName: "telegram-wallet",
            name: "Wallet",
            imageUrl: "https://wallet.tg/images/logo-288.png",
            aboutUrl: "https://wallet.tg/",
            universalLink: "https://t.me/wallet",
            bridgeUrl: "https://bridge.tonapi.io/bridge",
            platforms: ["ios", "android", "macos", "windows", "linux"],
          },
        ],
      }}
    >
      <App />
    </TonConnectUIProvider>
  </StrictMode>
);
