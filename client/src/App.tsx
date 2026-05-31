import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { type ReactNode } from "react";
import { useAuth } from "./context/AuthContext";
import Landing from "./pages/Landing";
import Features from "./pages/Features";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import Dashboard from "./pages/app/Dashboard";
import Apply from "./pages/app/Apply";
import Tracking from "./pages/app/Tracking";
import Chat from "./pages/app/Chat";
import Documents from "./pages/app/Documents";
import Notifications from "./pages/app/Notifications";
import Settings from "./pages/app/Settings";
import StaffApplications from "./pages/app/StaffApplications";
import AnalyticsPage from "./pages/app/Analytics";
import AdminUsers from "./pages/app/AdminUsers";

function Protected({ children, roles }: { children: ReactNode; roles?: string[] }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center text-slate-400">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/app" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/features" element={<Features />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        <Route path="/app" element={<Protected><Dashboard /></Protected>} />
        <Route path="/app/apply" element={<Protected roles={["customer", "admin"]}><Apply /></Protected>} />
        <Route path="/app/tracking" element={<Protected roles={["customer", "admin"]}><Tracking /></Protected>} />
        <Route path="/app/chat" element={<Protected><Chat /></Protected>} />
        <Route path="/app/documents" element={<Protected roles={["customer", "admin"]}><Documents /></Protected>} />
        <Route path="/app/notifications" element={<Protected><Notifications /></Protected>} />
        <Route path="/app/settings" element={<Protected><Settings /></Protected>} />
        <Route path="/app/applications" element={<Protected roles={["staff", "admin"]}><StaffApplications /></Protected>} />
        <Route path="/app/analytics" element={<Protected roles={["staff", "admin"]}><AnalyticsPage /></Protected>} />
        <Route path="/app/users" element={<Protected roles={["admin"]}><AdminUsers /></Protected>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
