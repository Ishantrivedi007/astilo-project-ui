import React from "react";
import ReactDOM from "react-dom/client";
import { HeroUIProvider } from "@heroui/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, useHref, useNavigate } from "react-router-dom";
import { Toaster } from "sonner";
import App from "./App";
import { queryClient } from "./lib/queryClient";
import { ThemeProvider } from "./theme/ThemeProvider";
import { PreferencesProvider } from "./theme/PreferencesProvider";
import { AuthProvider } from "./auth/AuthProvider";
import { EqualizerProvider } from "./components/MusicPlayer/EqualizerContext";
import { PlayerProvider } from "./components/MusicPlayer/PlayerContext";
import { DownloadsProvider } from "./components/MusicPlayer/DownloadsContext";
import { ConfirmProvider } from "./components/shared/ConfirmDialog";
import { NimrosePromptProvider } from "./components/Nimrose/NimrosePromptDialog";
import "./styles/index.scss";

function Providers({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  return (
    <HeroUIProvider navigate={navigate} useHref={useHref} validationBehavior="aria">
      <ThemeProvider>
        <PreferencesProvider>
          <ConfirmProvider>
          <NimrosePromptProvider>
          <AuthProvider>
            <QueryClientProvider client={queryClient}>
              <EqualizerProvider>
                <DownloadsProvider>
                  <PlayerProvider>{children}</PlayerProvider>
                </DownloadsProvider>
              </EqualizerProvider>
              <Toaster
                position="top-right"
                closeButton
                icons={{
                  success: (
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-500 text-white">
                      <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                  ),
                  error: (
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-danger text-white">
                      <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </span>
                  ),
                }}
                toastOptions={{
                  style: {
                    background: "rgb(var(--surface-rgb))",
                    color: "rgb(var(--ink-rgb))",
                    border: "1px solid rgb(var(--hair-rgb) / 0.2)",
                  },
                  classNames: {
                    error: "!border-danger !bg-danger !text-white",
                    success: "!border-emerald-500/40",
                    closeButton:
                      "!bg-transparent !border-current !text-current hover:!opacity-70",
                  },
                }}
              />
            </QueryClientProvider>
          </AuthProvider>
          </NimrosePromptProvider>
          </ConfirmProvider>
        </PreferencesProvider>
      </ThemeProvider>
    </HeroUIProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <Providers>
        <App />
      </Providers>
    </BrowserRouter>
  </React.StrictMode>
);
