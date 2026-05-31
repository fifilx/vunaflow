import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AxiosError } from "axios";
import PublicLayout from "../components/PublicLayout";
import PasswordInput from "../components/PasswordInput";
import { Button, Card, Field, TextInput } from "../components/ui";
import { api, type User } from "../lib/api";
import { useAuth } from "../context/AuthContext";

export default function Signup() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.name || !form.password || (!form.email && !form.phone)) return setError(t("auth.errors.missing"));
    if (form.password.length < 6) return setError(t("auth.errors.weakPassword"));
    if (form.password !== form.confirm) return setError(t("auth.errors.mismatch"));
    setBusy(true);
    try {
      const { data } = await api.post<{ user: User; token: string }>("/auth/signup", {
        name: form.name, email: form.email || undefined, phone: form.phone || undefined,
        password: form.password, language: i18n.resolvedLanguage,
      });
      // First-time signup: account is saved server-side so the user can log in later.
      login(data.user, data.token);
      navigate("/app");
    } catch (err) {
      const code = (err as AxiosError<{ error: string }>)?.response?.data?.error;
      if (code === "user_exists") setError(t("auth.errors.exists"));
      else if (code === "weak_password") setError(t("auth.errors.weakPassword"));
      else setError(t("auth.errors.generic"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <PublicLayout>
      <div className="mx-auto flex max-w-md flex-col px-4 py-12">
        <Card className="p-7">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{t("auth.signupTitle")}</h1>
          <p className="mt-1 text-sm text-slate-500">{t("auth.signupSubtitle")}</p>

          {error && <div className="mt-4 rounded-lg bg-red-50 dark:bg-red-900/30 px-4 py-2.5 text-sm text-red-600 dark:text-red-300">{error}</div>}

          <form onSubmit={submit} className="mt-5 space-y-4">
            <Field label={t("auth.name")}>
              <TextInput value={form.name} onChange={set("name")} placeholder="Jane Mwangi" autoComplete="name" />
            </Field>
            <Field label={t("auth.email")} hint={t("common.optional")}>
              <TextInput type="email" value={form.email} onChange={set("email")} placeholder="name@email.com" autoComplete="email" />
            </Field>
            <Field label={t("auth.phone")} hint={t("common.optional")}>
              <TextInput value={form.phone} onChange={set("phone")} placeholder="+254 7..." autoComplete="tel" />
            </Field>
            <Field label={t("auth.password")}>
              <PasswordInput value={form.password} onChange={(v) => setForm({ ...form, password: v })} autoComplete="new-password" placeholder="••••••••" />
            </Field>
            <Field label={t("auth.confirmPassword")}>
              <PasswordInput value={form.confirm} onChange={(v) => setForm({ ...form, confirm: v })} autoComplete="new-password" placeholder="••••••••" />
            </Field>
            <Button type="submit" className="w-full" disabled={busy}>{t("nav.signup")}</Button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            {t("auth.haveAccount")} <Link to="/login" className="font-semibold text-green-700 dark:text-green-400 hover:underline">{t("nav.login")}</Link>
          </p>
        </Card>
      </div>
    </PublicLayout>
  );
}
