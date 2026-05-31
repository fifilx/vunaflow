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

  const googleLogin = async () => {
    setError("");
    setBusy(true);
    try {
      // Demo Google login: simulate an account from a Google email.
      const email = `google.user@gmail.com`;
      const { data } = await api.post<{ user: User; token: string }>("/auth/google", { email, name: "Google User" });
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

          <div className="my-5 flex items-center gap-3 text-xs text-slate-400">
            <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" /> {t("auth.orContinue")} <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
          </div>
          <Button variant="outline" className="w-full" onClick={googleLogin} disabled={busy}>
            <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38z"/></svg>
            {t("auth.google")}
          </Button>

          <p className="mt-6 text-center text-sm text-slate-500">
            {t("auth.noAccount")} <Link to="/signup" className="font-semibold text-green-700 dark:text-green-400 hover:underline">{t("nav.signup")}</Link>
          </p>
        </Card>
      </div>
    </PublicLayout>
  );
}
