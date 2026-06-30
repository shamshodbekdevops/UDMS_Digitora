import { createBrowserRouter, Navigate } from "react-router-dom";
import { useAuthStore } from "@/store/auth";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Dashboard from "@/pages/Dashboard";
import DriverDetail from "@/pages/DriverDetail";
import History from "@/pages/History";
import Reports from "@/pages/Reports";
import Drivers from "@/pages/Drivers";
import DashboardLayout from "@/layouts/DashboardLayout";

function RequireAuth({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function GuestOnly({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <>{children}</>;
}

export const router = createBrowserRouter([
  { path: "/", element: <Navigate to="/dashboard" replace /> },
  {
    path: "/login",
    element: <GuestOnly><Login /></GuestOnly>,
  },
  {
    path: "/register",
    element: <GuestOnly><Register /></GuestOnly>,
  },
  {
    path: "/",
    element: <RequireAuth><DashboardLayout /></RequireAuth>,
    children: [
      { path: "dashboard", element: <Dashboard /> },
      { path: "driver/:deviceId", element: <DriverDetail /> },
      { path: "history", element: <History /> },
      { path: "reports", element: <Reports /> },
      { path: "drivers", element: <Drivers /> },
      { path: "drivers/:deviceId", element: <DriverDetail /> },
    ],
  },
]);
