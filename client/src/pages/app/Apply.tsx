import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Check, ArrowRight, ArrowLeft } from "lucide-react";
import AppLayout from "../../components/AppLayout";
import { Button, Card, Field, TextInput, Select, Badge } from "../../components/ui";
import { api, type LoanProduct, type EligibilityResult } from "../../lib/api";

export default function Apply() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const lang = i18n.resolvedLanguage === "sw" ? "sw" : "en";
  const [products, setProducts] = useState<LoanProduct[]>([]);
  const [step, setStep] = useState(0);
  const [productId, setProductId] = useState<number | null>(null);
  const [form, setForm] = useState({ farmingType: "crop", farmSize: "", monthlyIncome: "", businessInfo: "", amount: "", termMonths: "12", purpose: "" });
  const [result, setResult] = useState<EligibilityResult | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { api.get<LoanProduct[]>("/products").then(({ data }) => setProducts(data)); }, []);

  const steps = [t("apply.chooseProduct"), t("apply.farmDetails"), t("apply.loanDetails"), t("apply.review")];

  const computeEligibility = async () => {
    const { data } = await api.post<EligibilityResult>("/eligibility", {
      farmingType: form.farmingType, monthlyIncome: +form.monthlyIncome || 0,
      farmSize: +form.farmSize || 0, amount: +form.amount || 0, termMonths: +form.termMonths || 12,
    });
    setResult(data);
  };

  const next = async () => {
    if (step === 2) await computeEligibility();
    setStep((s) => Math.min(s + 1, 3));
  };

  const save = async (status: "draft" | "submitted") => {
    setBusy(true);
    try {
      await api.post("/applications", {
        productId, farmingType: form.farmingType, farmSize: +form.farmSize || null,
        monthlyIncome: +form.monthlyIncome || null, businessInfo: form.businessInfo,
        amount: +form.amount || null, termMonths: +form.termMonths || null, purpose: form.purpose, status,
      });
      setMsg(status === "submitted" ? t("apply.submitted") : t("apply.draftSaved"));
      setTimeout(() => navigate(status === "submitted" ? "/app/tracking" : "/app"), 900);
    } finally { setBusy(false); }
  };

  const selectedProduct = products.find((p) => p.id === productId);

  return (
    <AppLayout>
      <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{t("apply.title")}</h1>

      {/* Stepper */}
      <div className="mt-5 flex items-center">
        {steps.map((label, i) => (
          <div key={i} className="flex flex-1 items-center last:flex-none">
            <div className="flex items-center gap-2">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${i <= step ? "bg-green-600 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-500"}`}>
                {i < step ? <Check size={16} /> : i + 1}
              </div>
              <span className={`hidden text-sm font-medium sm:block ${i <= step ? "text-slate-800 dark:text-slate-100" : "text-slate-400"}`}>{label}</span>
            </div>
            {i < steps.length - 1 && <div className={`mx-2 h-0.5 flex-1 ${i < step ? "bg-green-600" : "bg-slate-200 dark:bg-slate-700"}`} />}
          </div>
        ))}
      </div>

      {msg && <div className="mt-4 rounded-lg bg-green-50 dark:bg-green-900/30 px-4 py-3 text-sm font-medium text-green-700 dark:text-green-300">{msg}</div>}

      <Card className="mt-5 p-6">
        {step === 0 && (
          <div className="grid gap-3 sm:grid-cols-2">
            {products.map((p) => (
              <button key={p.id} onClick={() => setProductId(p.id)} className={`rounded-xl border p-4 text-left transition ${productId === p.id ? "border-green-600 ring-2 ring-green-200 dark:ring-green-900" : "border-slate-200 dark:border-slate-700 hover:border-green-400"}`}>
                <div className="font-bold text-slate-800 dark:text-slate-100">{lang === "sw" ? p.name_sw : p.name_en}</div>
                <div className="mt-1 text-xs text-slate-500">{lang === "sw" ? p.description_sw : p.description_en}</div>
                <div className="mt-2 text-xs text-green-700 dark:text-green-300">KES {p.min_amount.toLocaleString()} – {p.max_amount.toLocaleString()} · {p.interest_rate}%</div>
              </button>
            ))}
          </div>
        )}

        {step === 1 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("apply.farmingType")}>
              <Select value={form.farmingType} onChange={(e) => setForm({ ...form, farmingType: e.target.value })}>
                {["crop", "livestock", "dairy", "poultry", "horticulture", "mixed"].map((k) => <option key={k} value={k}>{t(`apply.types.${k}`)}</option>)}
              </Select>
            </Field>
            <Field label={t("apply.farmSize")}>
              <TextInput type="number" value={form.farmSize} onChange={(e) => setForm({ ...form, farmSize: e.target.value })} />
            </Field>
            <Field label={t("apply.monthlyIncome")}>
              <TextInput type="number" value={form.monthlyIncome} onChange={(e) => setForm({ ...form, monthlyIncome: e.target.value })} />
            </Field>
            <Field label={t("apply.businessInfo")}>
              <TextInput value={form.businessInfo} onChange={(e) => setForm({ ...form, businessInfo: e.target.value })} />
            </Field>
          </div>
        )}

        {step === 2 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("apply.amount")}>
              <TextInput type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </Field>
            <Field label={t("apply.term")}>
              <TextInput type="number" value={form.termMonths} onChange={(e) => setForm({ ...form, termMonths: e.target.value })} />
            </Field>
            <div className="sm:col-span-2">
              <Field label={t("apply.purpose")}>
                <TextInput value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} />
              </Field>
            </div>
          </div>
        )}

        {step === 3 && result && (
          <div>
            <div className="rounded-xl bg-green-50 dark:bg-green-900/20 p-5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{t("apply.probability")}</span>
                <span className="text-3xl font-extrabold text-green-700 dark:text-green-300">{result.score}%</span>
              </div>
              <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-white dark:bg-slate-800">
                <div className="h-full rounded-full bg-green-600" style={{ width: `${result.score}%` }} />
              </div>
              <div className="mt-3"><Badge color={result.decision === "likely" ? "green" : result.decision === "borderline" ? "amber" : "red"}>{t(`eligibility.${result.decision}`)}</Badge></div>
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{t("apply.monthlyRepayment")}: <b>KES {result.monthlyRepayment.toLocaleString()}</b></p>
              <p className="mt-3 text-sm font-medium text-slate-700 dark:text-slate-200">{t("apply.missingInfo")}</p>
              <ul className="mt-1 list-disc pl-5 text-sm text-slate-500 space-y-1">{result.reasons.map((r, i) => <li key={i}>{r[lang]}</li>)}</ul>
            </div>
            <div className="mt-4 rounded-xl border border-slate-200 dark:border-slate-700 p-4 text-sm text-slate-600 dark:text-slate-300">
              <div><b>{t("apply.chooseProduct")}:</b> {selectedProduct ? (lang === "sw" ? selectedProduct.name_sw : selectedProduct.name_en) : "-"}</div>
              <div><b>{t("apply.amount")}:</b> KES {(+form.amount || 0).toLocaleString()} · {form.termMonths} {t("apply.term").toLowerCase()}</div>
            </div>
          </div>
        )}

        <div className="mt-6 flex items-center justify-between">
          <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
            <ArrowLeft size={18} /> {t("common.back")}
          </Button>
          {step < 3 ? (
            <Button onClick={next} disabled={step === 0 && !productId}>{t("common.next")} <ArrowRight size={18} /></Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => save("draft")} disabled={busy}>{t("common.saveDraft")}</Button>
              <Button onClick={() => save("submitted")} disabled={busy}>{t("common.submit")}</Button>
            </div>
          )}
        </div>
      </Card>
    </AppLayout>
  );
}
