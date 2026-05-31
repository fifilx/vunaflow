import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid,
} from "recharts";
import AppLayout from "../../components/AppLayout";
import { Card } from "../../components/ui";
import { api } from "../../lib/api";

interface Analytics {
  totalApps: number; approved: number; rejected: number; drafts: number; customers: number; chatMessages: number;
  approvalRate: number; incompleteRate: number;
  byStatus: { status: string; count: number }[];
  monthly: { month: string; count: number }[];
}

const COLORS = ["#3b82f6", "#f59e0b", "#f59e0b", "#16a34a", "#ef4444", "#15803d"];

export default function AnalyticsPage() {
  const { t } = useTranslation();
  const [data, setData] = useState<Analytics | null>(null);

  useEffect(() => { api.get<Analytics>("/analytics").then(({ data }) => setData(data)).catch(() => {}); }, []);

  if (!data) return <AppLayout><div className="text-slate-400">{t("common.loading")}</div></AppLayout>;

  const stats = [
    { label: t("staff.totalApps"), value: data.totalApps, color: "text-green-700 dark:text-green-300" },
    { label: t("staff.approvalRate"), value: `${data.approvalRate}%`, color: "text-green-600" },
    { label: t("staff.incompleteRate"), value: `${data.incompleteRate}%`, color: "text-amber-600" },
    { label: t("staff.customers"), value: data.customers, color: "text-blue-600" },
    { label: t("staff.chatMessages"), value: data.chatMessages, color: "text-purple-600" },
  ];

  const statusData = data.byStatus.map((s) => ({ name: t(`tracking.stages.${s.status}`), value: s.count }));

  return (
    <AppLayout>
      <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{t("staff.analyticsTitle")}</h1>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((s) => (
          <Card key={s.label} className="p-4">
            <div className={`text-2xl font-extrabold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-slate-500">{s.label}</div>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="mb-3 font-bold text-slate-800 dark:text-slate-100">{t("staff.appsByStatus")}</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5">
          <h3 className="mb-3 font-bold text-slate-800 dark:text-slate-100">{t("staff.appsOverTime")}</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={data.monthly}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" fontSize={12} />
              <YAxis allowDecimals={false} fontSize={12} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#16a34a" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5 lg:col-span-2">
          <h3 className="mb-3 font-bold text-slate-800 dark:text-slate-100">{t("staff.appsByStatus")}</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={statusData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" fontSize={12} />
              <YAxis allowDecimals={false} fontSize={12} />
              <Tooltip />
              <Bar dataKey="value" fill="#16a34a" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </AppLayout>
  );
}
