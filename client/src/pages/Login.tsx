import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AxiosError } from "axios";
import { Phone, Mail } from "lucide-react";
import PublicLayout from "../components/PublicLayout";
import PasswordInput from "../components/PasswordInput";
import { Button, Card, Field, TextInput } from "../components/ui";
import { api, type User } from "../lib/api";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [mode, setMode] = useState<"email" | "phone">("email");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // phone OTP
  const [phone, setPhone] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");

  const errMsg = (e: unknown) => {
    const code = (e as AxiosError<{ error: string }>)?.response?.data?.error;
    if (code === "invalid_credentials") return t("auth.errors.invalid");
    if (code === "missing_fields") return t("auth.errors.missing");
    if (code === "invalid_code") return t("auth.errors.invalidOtp");
    return t("auth.errors.generic");
  };

  const submitEmail = async (e: React.FormEvent) => {
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

  const requestOtp = async () => {
    setError("");
    if (!phone) return setError(t("auth.errors.missing"));
    setBusy(true);
    try {
      await api.post("/auth/otp/request", { phone });
      setOtpSent(true);
    } catch (e) { setError(errMsg(e)); } finally { setBusy(false); }
  };

  const verifyOtp = async () => {
    setError("");
    setBusy(true);
    try {
      const { data } = await api.post<{ user: User; token: string }>("/auth/otp/verify", { phone, code: otp });
      login(data.user, data.token);
      navigate("/app");
    } catch (e) { setError(errMsg(e)); } finally { setBusy(false); }
  };


  return (
    <PublicLayout>
      <div className="mx-auto flex max-w-md flex-col px-4 py-12">
        <Card className="p-7">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{t("auth.loginTitle")}</h1>
          <p className="mt-1 text-sm text-slate-500">{t("auth.loginSubtitle")}</p>

          <div className="mt-5 flex rounded-xl bg-slate-100 dark:bg-slate-700 p-1 text-sm">
            <button onClick={() => setMode("email")} className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 font-medium ${mode === "email" ? "bg-white dark:bg-slate-800 shadow-sm text-green-700 dark:text-green-300" : "text-slate-500"}`}>
              <Mail size={16} /> {t("auth.emailLogin")}
            </button>
            <button onClick={() => setMode("phone")} className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 font-medium ${mode === "phone" ? "bg-white dark:bg-slate-800 shadow-sm text-green-700 dark:text-green-300" : "text-slate-500"}`}>
              <Phone size={16} /> {t("auth.phoneLogin")}
            </button>
          </div>

          {error && <div className="mt-4 rounded-lg bg-red-50 dark:bg-red-900/30 px-4 py-2.5 text-sm text-red-600 dark:text-red-300">{error}</div>}

          {mode === "email" ? (
            <form onSubmit={submitEmail} className="mt-5 space-y-4">
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
          ) : (
            <div className="mt-5 space-y-4">
              <Field label={t("auth.phone")}>
                <TextInput value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+254 7..." disabled={otpSent} />
              </Field>
              {!otpSent ? (
                <Button className="w-full" onClick={requestOtp} disabled={busy}>{t("auth.sendOtp")}</Button>
              ) : (
                <>
                  <div className="rounded-lg bg-amber-50 dark:bg-amber-900/30 px-4 py-2.5 text-sm text-amber-700 dark:text-amber-300">{t("auth.otpSent")}</div>
                  <Field label={t("auth.otpCode")}>
                    <TextInput value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="123456" />
                  </Field>
                  <Button className="w-full" onClick={verifyOtp} disabled={busy}>{t("auth.verifyOtp")}</Button>
                </>
              )}
            </div>
          )}

          <p className="mt-6 text-center text-sm text-slate-500">
            {t("auth.noAccount")} <Link to="/signup" className="font-semibold text-green-700 dark:text-green-400 hover:underline">{t("nav.signup")}</Link>
          </p>
        </Card>
      </div>
    </PublicLayout>
  );
}
