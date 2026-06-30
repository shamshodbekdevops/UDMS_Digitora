import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import "leaflet/dist/leaflet.css";
import "@/i18n";
import "@/styles/globals.css";
import { router } from "@/router";
import { useThemeStore } from "@/store/theme";
import { CosmicBg } from "@/components/CosmicBg";
import { GlobalControls } from "@/components/GlobalControls";

// Apply saved theme class before first render
useThemeStore.getState().apply();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <CosmicBg />
    <GlobalControls />
    <RouterProvider router={router} />
  </StrictMode>
);
