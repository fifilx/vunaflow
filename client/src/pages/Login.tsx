import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AxiosError } from "axios";
import PublicLayout from "../components/PublicLayout";
import PasswordInput from "../components/PasswordInput";
import { Button, Card, Field, TextInput } from "../components/ui";
import { api, type User } from "../lib/api";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const errMsg = (e: unknown) => {
    const code = (e as AxiosError<{ error: string }>)?.response?.data?.error;
    if (code === "invalid_credentials") return t("auth.errors.invalid");
    if (code === "missing_fields") return t("auth.errors.missing");
    return t("auth.errors.generic");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!identifier || !password) return setError(t("auth.errors.missing"));
    setBusy(true);
    try {
      const { data } = await api.post<{ user: User; token: string }>("/auth/login", { identifier, password, remember });
      login(data.user, data.token);
      navigate("/app");
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <PublicLayout>
      <div className="mx-auto flex max-w-md flex-col px-4 py-12">
        <Card className="p-7">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{t("auth.loginTitle")}</h1>
          <p className="mt-1 text-sm text-slate-500">{t("auth.loginSubtitle")}</p>

          {error && <div className="mt-4 rounded-lg bg-red-50 dark:bg-red-900/30 px-4 py-2.5 text-sm text-red-600 dark:text-red-300">{error}</div>}

          <form onSubmit={submit} className="mt-5 space-y-4">
            <Field label={t("auth.identifier")}>
              <TextInput value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="name@email.com" autoComplete="username" />
            </Field>
            <Field label={t("auth.password")}>
              <PasswordInput value={password} onChange={setPassword} autoComplete="current-password" placeholder="••••••••" />
            </Field>
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="h-4 w-4 rounded accent-green-600" />
                {t("auth.rememberMe")}
              </label>
              <Link to="/forgot-password" className="font-medium text-green-700 dark:text-green-400 hover:underline">{t("auth.forgotPassword")}</Link>
            </div>
            <Button type="submit" className="w-full" disabled={busy}>{t("nav.login")}</Button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            {t("auth.noAccount")} <Link to="/signup" className="font-semibold text-green-700 dark:text-green-400 hover:underline">{t("nav.signup")}</Link>
          </p>
        </Card>
      </div>
    </PublicLayout>
  );
}
