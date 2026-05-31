import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import PublicLayout from "../components/PublicLayout";
import PasswordInput from "../components/PasswordInput";
import { Button, Card, Field, TextInput } from "../components/ui";
import { api } from "../lib/api";

export default function ForgotPassword() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<"request" | "confirm" | "done">("request");
  const [resetToken, setResetToken] = useState("");
  const [password, setPassword] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);

  const request = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await api.post<{ demoResetToken?: string }>("/auth/reset/request", { email });
      setInfo(t("auth.resetSent"));
      if (data.demoResetToken) {
        setResetToken(data.demoResetToken);
        setStep("confirm");
      }
    } finally { setBusy(false); }
  };

  const confirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post("/auth/reset/confirm", { token: resetToken, password });
      setStep("done");
    } finally { setBusy(false); }
  };

  return (
    <PublicLayout>
      <div className="mx-auto flex max-w-md flex-col px-4 py-12">
        <Card className="p-7">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{t("auth.resetTitle")}</h1>
          <p className="mt-1 text-sm text-slate-500">{t("auth.resetSubtitle")}</p>

          {step === "request" && (
            <form onSubmit={request} className="mt-5 space-y-4">
              <Field label={t("auth.email")}>
                <TextInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@email.com" />
              </Field>
              {info && <div className="rounded-lg bg-green-50 dark:bg-green-900/30 px-4 py-2.5 text-sm text-green-700 dark:text-green-300">{info}</div>}
              <Button type="submit" className="w-full" disabled={busy}>{t("auth.sendReset")}</Button>
            </form>
          )}

          {step === "confirm" && (
            <form onSubmit={confirm} className="mt-5 space-y-4">
              <Field label={t("auth.newPassword")}>
                <PasswordInput value={password} onChange={setPassword} placeholder="••••••••" autoComplete="new-password" />
              </Field>
              <Button type="submit" className="w-full" disabled={busy}>{t("auth.sendReset")}</Button>
            </form>
          )}

          {step === "done" && (
            <div className="mt-5 rounded-lg bg-green-50 dark:bg-green-900/30 px-4 py-3 text-sm text-green-700 dark:text-green-300">
              {t("auth.resetDone")}
            </div>
          )}

          <p className="mt-6 text-center text-sm text-slate-500">
            <Link to="/login" className="font-semibold text-green-700 dark:text-green-400 hover:underline">{t("nav.login")}</Link>
          </p>
        </Card>
      </div>
    </PublicLayout>
  );
}
