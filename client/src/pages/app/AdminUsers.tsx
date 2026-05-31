import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import AppLayout from "../../components/AppLayout";
import { Card, Badge, Select } from "../../components/ui";
import { api } from "../../lib/api";

interface AdminUser { id: number; name: string; email: string | null; phone: string | null; role: string; created_at: string }
interface AuditLog { id: number; user_id: number | null; action: string; detail: string | null; created_at: string }

export default function AdminUsers() {
  const { t } = useTranslation();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);

  const load = () => {
    api.get<AdminUser[]>("/admin/users").then(({ data }) => setUsers(data)).catch(() => {});
    api.get<AuditLog[]>("/admin/audit").then(({ data }) => setLogs(data)).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  const changeRole = async (id: number, role: string) => {
    await api.post(`/admin/users/${id}/role`, { role });
    load();
  };

  const roleColor = (r: string) => (r === "admin" ? "red" : r === "staff" ? "blue" : "green");

  return (
    <AppLayout>
      <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{t("admin.usersTitle")}</h1>

      <div className="mt-5 overflow-x-auto">
        <Card className="min-w-[640px]">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 dark:border-slate-700 text-left text-slate-500">
              <tr>
                <th className="p-4">#</th>
                <th className="p-4">{t("auth.name")}</th>
                <th className="p-4">{t("settings.account")}</th>
                <th className="p-4">{t("settings.role")}</th>
                <th className="p-4">{t("admin.changeRole")}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-slate-100 dark:border-slate-700/50">
                  <td className="p-4 font-medium">{u.id}</td>
                  <td className="p-4 font-medium text-slate-800 dark:text-slate-100">{u.name}</td>
                  <td className="p-4 text-slate-500">{u.email || u.phone}</td>
                  <td className="p-4"><Badge color={roleColor(u.role)}>{t(`roles.${u.role}`)}</Badge></td>
                  <td className="p-4">
                    <Select value={u.role} onChange={(e) => changeRole(u.id, e.target.value)} className="py-2">
                      {["customer", "staff", "admin"].map((r) => <option key={r} value={r}>{t(`roles.${r}`)}</option>)}
                    </Select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      <h2 className="mt-8 text-lg font-bold text-slate-800 dark:text-slate-100">{t("admin.auditTitle")}</h2>
      <Card className="mt-3 divide-y divide-slate-100 dark:divide-slate-700/50">
        {logs.map((l) => (
          <div key={l.id} className="flex items-center justify-between p-3 text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-200">{l.action}</span>
            <span className="text-slate-400">{l.detail}</span>
            <span className="text-xs text-slate-400">{new Date(l.created_at + "Z").toLocaleString()}</span>
          </div>
        ))}
      </Card>
    </AppLayout>
  );
}
