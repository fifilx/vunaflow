import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Moon, Type, Wifi, Volume2 } from "lucide-react";
import AppLayout from "../../components/AppLayout";
import { Button, Card, Field, TextInput } from "../../components/ui";
import LanguageToggle from "../../components/LanguageToggle";
import { useAuth } from "../../context/AuthContext";
import { usePrefs } from "../../context/PrefsContext";
import { api, type User } from "../../lib/api";

function Toggle({ on, onClick, icon, label }: { on: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button onClick={onClick} className="flex w-full items-center justify-between rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-3 hover:border-green-400 transition">
      <span className="flex items-center gap-3 text-slate-700 dark:text-slate-200">{icon} {label}</span>
      <span className={`relative h-6 w-11 rounded-full transition ${on ? "bg-green-600" : "bg-slate-300 dark:bg-slate-600"}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${on ? "left-5" : "left-0.5"}`} />
      </span>
    </button>
  );
}

export default function Settings() {
  const { t, i18n } = useTranslation();
  const { user, setUser } = useAuth();
  const prefs = usePrefs();
  const [name, setName] = useState(user?.name || "");
  const [voiceNav, setVoiceNav] = useState(localStorage.getItem("vuna_voicenav") === "1");
  const [saved, setSaved] = useState(false);

  const saveProfile = async () => {
    const { data } = await api.patch<{ user: User }>("/auth/me", { name, language: i18n.resolvedLanguage });
    setUser(data.user);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <AppLayout>
      <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{t("settings.title")}</h1>

      <Card className="mt-5 p-6">
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">{t("settings.profile")}</h2>
        <div className="mt-4 space-y-4">
          <Field label={t("auth.name")}><TextInput value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("settings.account")}><TextInput value={user?.email || user?.phone || ""} disabled /></Field>
            <Field label={t("settings.role")}><TextInput value={t(`roles.${user?.role}`)} disabled /></Field>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={saveProfile}>{t("settings.saveProfile")}</Button>
            {saved && <span className="text-sm text-green-600">{t("settings.saved")}</span>}
          </div>
        </div>
      </Card>

      <Card className="mt-5 p-6">
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">{t("settings.language")}</h2>
        <div className="mt-3"><LanguageToggle /></div>
      </Card>

      <Card className="mt-5 p-6">
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">{t("settings.accessibility")}</h2>
        <div className="mt-4 space-y-3">
          <Toggle on={prefs.dark} onClick={() => prefs.toggle("dark")} icon={<Moon size={18} />} label={t("settings.darkMode")} />
          <Toggle on={prefs.largeText} onClick={() => prefs.toggle("largeText")} icon={<Type size={18} />} label={t("settings.largeText")} />
          <Toggle on={prefs.lowBandwidth} onClick={() => prefs.toggle("lowBandwidth")} icon={<Wifi size={18} />} label={t("settings.lowBandwidth")} />
          <Toggle on={voiceNav} onClick={() => { const v = !voiceNav; setVoiceNav(v); localStorage.setItem("vuna_voicenav", v ? "1" : "0"); }} icon={<Volume2 size={18} />} label={t("settings.voiceNav")} />
        </div>
      </Card>
    </AppLayout>
  );
}
