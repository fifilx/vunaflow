import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import AppLayout from "../../components/AppLayout";
import { Card, Badge, Select } from "../../components/ui";
import { api, type Application } from "../../lib/api";
import { statusColor } from "../../lib/status";

const STATUSES = ["submitted", "under_review", "verification", "approved", "rejected", "disbursed"];

export default function StaffApplications() {
  const { t, i18n } = useTranslation();
  const lang = i18n.resolvedLanguage === "sw" ? "sw" : "en";
  const [apps, setApps] = useState<Application[]>([]);
  const [filter, setFilter] = useState("all");

  const load = () => api.get<Application[]>("/staff/applications").then(({ data }) => setApps(data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const updateStatus = async (id: number, status: string) => {
    await api.post(`/staff/applications/${id}/status`, { status });
    load();
  };

  const shown = filter === "all" ? apps : apps.filter((a) => a.status === filter);

  return (
    <AppLayout>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{t("staff.applicationsTitle")}</h1>
        <div className="w-48">
          <Select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">{t("common.all")}</option>
            {STATUSES.map((s) => <option key={s} value={s}>{t(`tracking.stages.${s}`)}</option>)}
          </Select>
        </div>
      </div>

      {shown.length === 0 ? (
        <Card className="mt-5 p-8 text-center text-slate-400">{t("tracking.noActive")}</Card>
      ) : (
        <div className="mt-5 overflow-x-auto">
          <Card className="min-w-[640px]">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 dark:border-slate-700 text-left text-slate-500">
                <tr>
                  <th className="p-4">#</th>
                  <th className="p-4">{t("staff.applicant")}</th>
                  <th className="p-4">{t("staff.product")}</th>
                  <th className="p-4">{t("tracking.amount")}</th>
                  <th className="p-4">{t("staff.status")}</th>
                  <th className="p-4">{t("staff.updateStatus")}</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((a) => (
                  <tr key={a.id} className="border-b border-slate-100 dark:border-slate-700/50">
                    <td className="p-4 font-medium">{a.id}</td>
                    <td className="p-4">
                      <div className="font-medium text-slate-800 dark:text-slate-100">{a.applicant_name}</div>
                      <div className="text-xs text-slate-400">{a.applicant_email}</div>
                    </td>
                    <td className="p-4">{lang === "sw" ? a.product_name_sw : a.product_name_en}</td>
                    <td className="p-4">KES {(a.amount || 0).toLocaleString()}</td>
                    <td className="p-4"><Badge color={statusColor(a.status)}>{t(`tracking.stages.${a.status}`)}</Badge></td>
                    <td className="p-4">
                      <Select value={a.status} onChange={(e) => updateStatus(a.id, e.target.value)} className="py-2">
                        {STATUSES.map((s) => <option key={s} value={s}>{t(`tracking.stages.${s}`)}</option>)}
                      </Select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}
    </AppLayout>
  );
}
