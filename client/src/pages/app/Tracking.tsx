import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import AppLayout from "../../components/AppLayout";
import { Card, Badge } from "../../components/ui";
import ProgressTracker from "../../components/ProgressTracker";
import { api, type Application } from "../../lib/api";
import { statusColor } from "../../lib/status";

export default function Tracking() {
  const { t, i18n } = useTranslation();
  const lang = i18n.resolvedLanguage === "sw" ? "sw" : "en";
  const [apps, setApps] = useState<Application[]>([]);

  useEffect(() => { api.get<Application[]>("/applications").then(({ data }) => setApps(data)).catch(() => {}); }, []);

  const tracked = apps.filter((a) => a.status !== "draft");

  return (
    <AppLayout>
      <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{t("tracking.title")}</h1>

      {tracked.length === 0 ? (
        <Card className="mt-5 p-8 text-center text-slate-400">{t("tracking.noActive")}</Card>
      ) : (
        <div className="mt-5 space-y-4">
          {tracked.map((a) => (
            <Card key={a.id} className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="font-bold text-slate-800 dark:text-slate-100">
                    {lang === "sw" ? a.product_name_sw : a.product_name_en || `${t("tracking.applicationId")} #${a.id}`}
                  </div>
                  <div className="text-sm text-slate-500">
                    {t("tracking.applicationId")} #{a.id} · {t("tracking.amount")}: KES {(a.amount || 0).toLocaleString()}
                  </div>
                </div>
                <Badge color={statusColor(a.status)}>{t(`tracking.stages.${a.status}`)}</Badge>
              </div>
              <div className="mt-6"><ProgressTracker status={a.status} /></div>
              <div className="mt-4 text-xs text-slate-400">
                {t("tracking.lastUpdated")}: {new Date(a.updated_at).toLocaleString()}
              </div>
            </Card>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
