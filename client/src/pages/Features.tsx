import { useState } from "react";
import { useNavigate, type NavigateFunction } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { Bot, Calculator, Upload, LayoutDashboard, Activity, Lock } from "lucide-react";
import PublicLayout from "../components/PublicLayout";
import ChatPanel from "../components/ChatPanel";
import { Button, Card, Field, TextInput, Select, Badge } from "../components/ui";
import ProgressTracker from "../components/ProgressTracker";
import { api, type EligibilityResult } from "../lib/api";

type Tab = "chatbot" | "eligibility" | "upload" | "dashboard" | "tracking";

function LockedCta({ t, navigate }: { t: TFunction; navigate: NavigateFunction }) {
  return (
    <Card className="mt-4 border-dashed p-5 text-center">
      <Lock className="mx-auto text-green-600" />
      <h4 className="mt-2 font-bold text-slate-800 dark:text-slate-100">{t("preview.lockedTitle")}</h4>
      <p className="mt-1 text-sm text-slate-500">{t("preview.lockedDesc")}</p>
      <div className="mt-3 flex justify-center gap-2">
        <Button onClick={() => navigate("/signup")}>{t("nav.signup")}</Button>
        <Button variant="outline" onClick={() => navigate("/login")}>{t("nav.login")}</Button>
      </div>
    </Card>
  );
}

export default function Features() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("chatbot");
  const lang = i18n.resolvedLanguage === "sw" ? "sw" : "en";

  const tabs: { key: Tab; icon: React.ReactNode }[] = [
    { key: "chatbot", icon: <Bot size={18} /> },
    { key: "eligibility", icon: <Calculator size={18} /> },
    { key: "upload", icon: <Upload size={18} /> },
    { key: "dashboard", icon: <LayoutDashboard size={18} /> },
    { key: "tracking", icon: <Activity size={18} /> },
  ];

  // Eligibility demo state
  const [form, setForm] = useState({ farmingType: "crop", monthlyIncome: "40000", farmSize: "2", amount: "200000", termMonths: "12" });
  const [result, setResult] = useState<EligibilityResult | null>(null);
  const [calc, setCalc] = useState(false);

  const runEligibility = async () => {
    setCalc(true);
    try {
      const { data } = await api.post<EligibilityResult>("/eligibility/preview", {
        farmingType: form.farmingType,
        monthlyIncome: +form.monthlyIncome,
        farmSize: +form.farmSize,
        amount: +form.amount,
        termMonths: +form.termMonths,
      });
      setResult(data);
    } finally {
      setCalc(false);
    }
  };

  return (
    <PublicLayout>
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">{t("landing.previewTitle")}</h1>
          <p className="mt-2 text-slate-500">{t("landing.previewSubtitle")}</p>
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-2">
          {tabs.map((tb) => (
            <button
              key={tb.key}
              onClick={() => setTab(tb.key)}
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                tab === tb.key ? "bg-green-600 text-white" : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
              }`}
            >
              {tb.icon} {t(`preview.${tb.key}.title`)}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {tab === "chatbot" && (
            <Card className="mx-auto h-[520px] max-w-2xl overflow-hidden">
              <ChatPanel authed={false} />
            </Card>
          )}

          {tab === "eligibility" && (
            <Card className="mx-auto max-w-2xl p-6">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">{t("eligibility.title")}</h3>
              <p className="text-sm text-slate-500">{t("eligibility.subtitle")}</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field label={t("apply.farmingType")}>
                  <Select value={form.farmingType} onChange={(e) => setForm({ ...form, farmingType: e.target.value })}>
                    {["crop", "livestock", "dairy", "poultry", "horticulture", "mixed"].map((k) => (
                      <option key={k} value={k}>{t(`apply.types.${k}`)}</option>
                    ))}
                  </Select>
                </Field>
                <Field label={t("apply.farmSize")}>
                  <TextInput type="number" value={form.farmSize} onChange={(e) => setForm({ ...form, farmSize: e.target.value })} />
                </Field>
                <Field label={t("apply.monthlyIncome")}>
                  <TextInput type="number" value={form.monthlyIncome} onChange={(e) => setForm({ ...form, monthlyIncome: e.target.value })} />
                </Field>
                <Field label={t("apply.amount")}>
                  <TextInput type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
                </Field>
                <Field label={t("apply.term")}>
                  <TextInput type="number" value={form.termMonths} onChange={(e) => setForm({ ...form, termMonths: e.target.value })} />
                </Field>
              </div>
              <Button className="mt-4 w-full" onClick={runEligibility} disabled={calc}>
                {t("eligibility.calculate")}
              </Button>
              {result && (
                <div className="mt-5 rounded-xl bg-green-50 dark:bg-green-900/20 p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{t("apply.probability")}</span>
                    <span className="text-2xl font-extrabold text-green-700 dark:text-green-300">{result.score}%</span>
                  </div>
                  <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-white dark:bg-slate-800">
                    <div className="h-full rounded-full bg-green-600" style={{ width: `${result.score}%` }} />
                  </div>
                  <div className="mt-3 text-sm">
                    <Badge color={result.decision === "likely" ? "green" : result.decision === "borderline" ? "amber" : "red"}>
                      {t(`eligibility.${result.decision}`)}
                    </Badge>
                  </div>
                  <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                    {t("apply.monthlyRepayment")}: <b>KES {result.monthlyRepayment.toLocaleString()}</b>
                  </p>
                  <ul className="mt-2 list-disc pl-5 text-sm text-slate-500 space-y-1">
                    {result.reasons.map((r, i) => <li key={i}>{r[lang]}</li>)}
                  </ul>
                </div>
              )}
            </Card>
          )}

          {tab === "upload" && (
            <Card className="mx-auto max-w-2xl p-6">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">{t("preview.upload.title")}</h3>
              <p className="text-sm text-slate-500">{t("preview.upload.desc")}</p>
              <div className="mt-4 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 p-8 text-center text-slate-400">
                <Upload className="mx-auto mb-2" />
                {t("documents.chooseFile")}
              </div>
              <div className="mt-4 rounded-xl bg-slate-50 dark:bg-slate-700/40 p-4 text-sm">
                <div className="font-semibold text-slate-700 dark:text-slate-200">{t("documents.extracted")} ({t("common.demo")})</div>
                <pre className="mt-2 whitespace-pre-wrap text-xs text-slate-500">REPUBLIC OF KENYA{"\n"}NATIONAL IDENTITY CARD{"\n"}NAME: J. MWANGI{"\n"}ID NO: 3****821</pre>
                <Badge color="green">{t("documents.status.verified")}</Badge>
              </div>
              <LockedCta t={t} navigate={navigate} />
            </Card>
          )}

          {tab === "dashboard" && (
            <Card className="mx-auto max-w-3xl p-6">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">{t("preview.dashboard.title")}</h3>
              <div className="mt-4 grid grid-cols-3 gap-3">
                {[{ n: 2, l: t("dashboard.activeLoans") }, { n: 1, l: t("dashboard.pending") }, { n: 3, l: t("dashboard.unread") }].map((s, i) => (
                  <div key={i} className="rounded-xl bg-green-50 dark:bg-green-900/20 p-4 text-center">
                    <div className="text-2xl font-extrabold text-green-700 dark:text-green-300">{s.n}</div>
                    <div className="text-xs text-slate-500">{s.l}</div>
                  </div>
                ))}
              </div>
              <LockedCta t={t} navigate={navigate} />
            </Card>
          )}

          {tab === "tracking" && (
            <Card className="mx-auto max-w-3xl p-6">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">{t("preview.tracking.title")}</h3>
              <div className="mt-6 space-y-6">
                <div>
                  <div className="mb-2 text-sm font-medium text-slate-600 dark:text-slate-300">Seasonal Crop Loan — KES 200,000</div>
                  <ProgressTracker status="under_review" />
                </div>
                <div>
                  <div className="mb-2 text-sm font-medium text-slate-600 dark:text-slate-300">Equipment Loan — KES 800,000</div>
                  <ProgressTracker status="approved" />
                </div>
              </div>
              <LockedCta t={t} navigate={navigate} />
            </Card>
          )}
        </div>
      </div>
    </PublicLayout>
  );
}
