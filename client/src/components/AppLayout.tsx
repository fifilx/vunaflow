import { useEffect, useState, type ReactNode } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  LayoutDashboard, FileText, Activity, MessageSquare, Upload, Bell, Settings,
  BarChart3, Users, ClipboardList, LogOut, Menu, X,
} from "lucide-react";
import Logo from "./Logo";
import LanguageToggle from "./LanguageToggle";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";

interface NavItem { to: string; label: string; icon: ReactNode; roles?: string[] }

export default function AppLayout({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    const load = () =>
      api.get("/notifications").then(({ data }) => {
        setUnread(data.filter((n: { read: number }) => !n.read).length);
      }).catch(() => {});
    load();
    const id = setInterval(load, 20000);
    return () => clearInterval(id);
  }, []);

  const items: NavItem[] = [
    { to: "/app", label: t("nav.dashboard"), icon: <LayoutDashboard size={20} /> },
    { to: "/app/apply", label: t("nav.apply"), icon: <FileText size={20} />, roles: ["customer", "admin"] },
    { to: "/app/tracking", label: t("nav.tracking"), icon: <Activity size={20} />, roles: ["customer", "admin"] },
    { to: "/app/chat", label: t("nav.chat"), icon: <MessageSquare size={20} /> },
    { to: "/app/documents", label: t("nav.documents"), icon: <Upload size={20} />, roles: ["customer", "admin"] },
    { to: "/app/applications", label: t("nav.applications"), icon: <ClipboardList size={20} />, roles: ["staff", "admin"] },
    { to: "/app/analytics", label: t("nav.analytics"), icon: <BarChart3 size={20} />, roles: ["staff", "admin"] },
    { to: "/app/users", label: t("nav.users"), icon: <Users size={20} />, roles: ["admin"] },
    { to: "/app/notifications", label: t("nav.notifications"), icon: <Bell size={20} /> },
    { to: "/app/settings", label: t("nav.settings"), icon: <Settings size={20} /> },
  ];
  const visible = items.filter((i) => !i.roles || (user && i.roles.includes(user.role)));

  const doLogout = () => { logout(); navigate("/"); };

  const SidebarInner = (
    <div className="flex h-full flex-col">
      <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800">
        <Link to="/app" onClick={() => setOpen(false)}><Logo /></Link>
      </div>
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {visible.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/app"}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              `flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                isActive
                  ? "bg-green-600 text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-300 hover:bg-green-50 dark:hover:bg-slate-800"
              }`
            }
          >
            <span className="flex items-center gap-3">{item.icon}{item.label}</span>
            {item.to === "/app/notifications" && unread > 0 && (
              <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">{unread}</span>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-slate-200 dark:border-slate-800 p-3">
        <div className="mb-2 px-3 text-xs text-slate-400">
          {user?.name} · {t(`roles.${user?.role}`)}
        </div>
        <button onClick={doLogout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
          <LogOut size={20} /> {t("nav.logout")}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 lg:block">
        {SidebarInner}
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 bg-white dark:bg-slate-900 shadow-xl">{SidebarInner}</aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 px-4 py-3 backdrop-blur">
          <button className="lg:hidden text-slate-600 dark:text-slate-300" onClick={() => setOpen((v) => !v)}>
            {open ? <X size={24} /> : <Menu size={24} />}
          </button>
          <div className="hidden lg:block" />
          <div className="flex items-center gap-3">
            <LanguageToggle />
            <Link to="/app/notifications" className="relative text-slate-500 hover:text-green-600">
              <Bell size={22} />
              {unread > 0 && <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">{unread}</span>}
            </Link>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-100 text-sm font-bold text-green-700 dark:bg-green-900/50 dark:text-green-300">
              {user?.name?.[0]?.toUpperCase()}
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-6xl p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
