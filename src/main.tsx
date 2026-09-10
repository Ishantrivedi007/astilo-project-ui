import React from "react";
import ReactDOM from "react-dom/client";
import { HeroUIProvider } from "@heroui/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, useHref, useNavigate } from "react-router-dom";
import { Toaster } from "sonner";
import App from "./App";
import { queryClient } from "./lib/queryClient";
import { ThemeProvider } from "./theme/ThemeProvider";
import "./styles/index.scss";

function Providers({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  return (
    <HeroUIProvider navigate={navigate} useHref={useHref}>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          {children}
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: "rgb(var(--surface-rgb))",
                color: "rgb(var(--ink-rgb))",
                border: "1px solid rgb(var(--hair-rgb) / 0.2)",
              },
            }}
          />
        </QueryClientProvider>
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
