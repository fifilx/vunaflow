import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FileText, MessageSquare, Upload, ArrowRight, Lightbulb, ClipboardList, BarChart3, Users } from "lucide-react";
import AppLayout from "../../components/AppLayout";
import { Button, Card, Badge } from "../../components/ui";
import ProgressTracker from "../../components/ProgressTracker";
import { api, type Application, type Notification } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { statusColor } from "../../lib/status";

export default function Dashboard() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const lang = i18n.resolvedLanguage === "sw" ? "sw" : "en";
  const [apps, setApps] = useState<Application[]>([]);
  const [notifs, setNotifs] = useState<Notification[]>([]);

  useEffect(() => {
    if (user?.role === "customer") {
      api.get<Application[]>("/applications").then(({ data }) => setApps(data)).catch(() => {});
    }
    api.get<Notification[]>("/notifications").then(({ data }) => setNotifs(data)).catch(() => {});
  }, [user]);

  const active = apps.filter((a) => ["submitted", "under_review", "verification", "approved", "disbursed"].includes(a.status));
  const pending = apps.filter((a) => a.status === "draft");
  const unread = notifs.filter((n) => !n.read).length;

  const isStaff = user?.role === "staff" || user?.role === "admin";

  return (
    <AppLayout>
      <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{t("dashboard.welcome", { name: user?.name })}</h1>
      <p className="mt-1 text-slate-500">{t("dashboard.subtitle")}</p>

      {/* Stats */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Card className="p-5">
          <div className="text-3xl font-extrabold text-green-700 dark:text-green-300">{active.length}</div>
          <div className="text-sm text-slate-500">{t("dashboard.activeLoans")}</div>
        </Card>
        <Card className="p-5">
          <div className="text-3xl font-extrabold text-amber-600">{pending.length}</div>
          <div className="text-sm text-slate-500">{t("dashboard.pending")}</div>
        </Card>
        <Card className="p-5">
          <div className="text-3xl font-extrabold text-blue-600">{unread}</div>
          <div className="text-sm text-slate-500">{t("dashboard.unread")}</div>
        </Card>
      </div>

      {/* Quick actions */}
      <h2 className="mt-8 text-lg font-bold text-slate-800 dark:text-slate-100">{t("dashboard.quickActions")}</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        {isStaff ? (
          <>
            <QuickAction to="/app/applications" icon={<ClipboardList />} label={t("nav.applications")} />
            <QuickAction to="/app/analytics" icon={<BarChart3 />} label={t("nav.analytics")} />
            {user?.role === "admin" && <QuickAction to="/app/users" icon={<Users />} label={t("nav.users")} />}
            <QuickAction to="/app/chat" icon={<MessageSquare />} label={t("dashboard.askAi")} />
          </>
        ) : (
          <>
            <QuickAction to="/app/apply" icon={<FileText />} label={t("dashboard.applyNow")} />
            <QuickAction to="/app/chat" icon={<MessageSquare />} label={t("dashboard.askAi")} />
            <QuickAction to="/app/documents" icon={<Upload />} label={t("dashboard.uploadDocs")} />
          </>
        )}
      </div>

      {!isStaff && (
        <>
          {/* Recent applications */}
          <div className="mt-8 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">{t("dashboard.recentApplications")}</h2>
            <Link to="/app/tracking" className="text-sm font-medium text-green-700 dark:text-green-400 hover:underline">{t("dashboard.viewAll")}</Link>
          </div>
          {apps.length === 0 ? (
            <Card className="mt-3 p-8 text-center text-slate-400">
              {t("dashboard.noApplications")}
              <div className="mt-3"><Link to="/app/apply"><Button>{t("dashboard.applyNow")} <ArrowRight size={16} /></Button></Link></div>
            </Card>
          ) : (
            <div className="mt-3 space-y-3">
              {apps.slice(0, 3).map((a) => (
                <Card key={a.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-slate-800 dark:text-slate-100">
                        {lang === "sw" ? a.product_name_sw : a.product_name_en || t("tracking.applicationId") + " #" + a.id}
                      </div>
                      <div className="text-sm text-slate-500">KES {(a.amount || 0).toLocaleString()}</div>
                    </div>
                    <Badge color={statusColor(a.status)}>{t(`tracking.stages.${a.status}`)}</Badge>
                  </div>
                  {a.status !== "draft" && <div className="mt-4"><ProgressTracker status={a.status} /></div>}
                </Card>
              ))}
            </div>
          )}

          {/* AI recommendations */}
          <h2 className="mt-8 text-lg font-bold text-slate-800 dark:text-slate-100">{t("dashboard.recommendations")}</h2>
          <Card className="mt-3 p-5">
            <div className="flex gap-3">
              <Lightbulb className="shrink-0 text-amber-500" />
              <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                <li>{lang === "sw" ? "Pakia Kitambulisho chako cha Taifa ili kuharakisha uthibitishaji." : "Upload your National ID to speed up verification."}</li>
                <li>{lang === "sw" ? "Mkopo wa Msimu wa Mazao unafaa kwa mahitaji ya msimu mmoja." : "The Seasonal Crop Loan suits single-season input needs."}</li>
                <li>{lang === "sw" ? "Weka kipato chako sahihi ili kupata makadirio bora ya ustahiki." : "Enter accurate income for a better eligibility estimate."}</li>
              </ul>
            </div>
          </Card>
        </>
      )}
    </AppLayout>
  );
}

function QuickAction({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <Link to={to}>
      <Card className="flex items-center gap-3 p-5 hover:border-green-400 hover:shadow-md transition">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300">{icon}</div>
        <span className="font-semibold text-slate-700 dark:text-slate-200">{label}</span>
      </Card>
    </Link>
  );
}
