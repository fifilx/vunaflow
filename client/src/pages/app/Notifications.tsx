import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Bell, Check } from "lucide-react";
import AppLayout from "../../components/AppLayout";
import { Button, Card } from "../../components/ui";
import { api, type Notification } from "../../lib/api";

export default function Notifications() {
  const { t, i18n } = useTranslation();
  const lang = i18n.resolvedLanguage === "sw" ? "sw" : "en";
  const [notifs, setNotifs] = useState<Notification[]>([]);

  const load = () => api.get<Notification[]>("/notifications").then(({ data }) => setNotifs(data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const markAll = async () => { await api.post("/notifications/read-all"); load(); };
  const markOne = async (id: number) => { await api.post(`/notifications/${id}/read`); load(); };

  return (
    <AppLayout>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{t("notifications.title")}</h1>
        {notifs.some((n) => !n.read) && <Button variant="ghost" onClick={markAll}><Check size={16} /> {t("notifications.markAllRead")}</Button>}
      </div>

      {notifs.length === 0 ? (
        <Card className="mt-5 p-8 text-center text-slate-400">{t("notifications.empty")}</Card>
      ) : (
        <div className="mt-5 space-y-3">
          {notifs.map((n) => (
            <Card key={n.id} className={`p-4 ${!n.read ? "border-l-4 border-l-green-500" : ""}`}>
              <div className="flex items-start gap-3" onClick={() => !n.read && markOne(n.id)}>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300">
                  <Bell size={18} />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-slate-800 dark:text-slate-100">{lang === "sw" ? n.title_sw : n.title_en}</div>
                  <div className="text-sm text-slate-500">{lang === "sw" ? n.body_sw : n.body_en}</div>
                  <div className="mt-1 text-xs text-slate-400">{new Date(n.created_at + "Z").toLocaleString()}</div>
                </div>
                {!n.read && <span className="h-2.5 w-2.5 rounded-full bg-green-500" />}
              </div>
            </Card>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
