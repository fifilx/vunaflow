import { type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Logo from "./Logo";
import LanguageToggle from "./LanguageToggle";
import { Button } from "./ui";

export default function PublicLayout({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/"><Logo /></Link>
          <nav className="flex items-center gap-2 sm:gap-3">
            <Link to="/features" className="hidden sm:block text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-green-700 px-2">
              {t("nav.features")}
            </Link>
            <LanguageToggle />
            <Button variant="ghost" className="py-2 px-3 text-sm" onClick={() => navigate("/login")}>
              {t("nav.login")}
            </Button>
            <Button className="py-2 px-4 text-sm" onClick={() => navigate("/signup")}>
              {t("nav.signup")}
            </Button>
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="mx-auto max-w-6xl px-4 py-6 text-center text-sm text-slate-500">
          © {new Date().getFullYear()} VunaFlow — {t("app.tagline")}
        </div>
      </footer>
    </div>
  );
}
