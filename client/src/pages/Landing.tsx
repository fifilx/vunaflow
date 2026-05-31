import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Clock, Zap, Bot, ScanLine, Activity, Sprout, ArrowRight, CheckCircle2,
} from "lucide-react";
import PublicLayout from "../components/PublicLayout";
import { Button, Card } from "../components/ui";

export default function Landing() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const benefits = [
    { key: "time", icon: <Clock /> },
    { key: "fast", icon: <Zap /> },
    { key: "ai", icon: <Bot /> },
    { key: "ocr", icon: <ScanLine /> },
    { key: "track", icon: <Activity /> },
    { key: "guidance", icon: <Sprout /> },
  ];

  return (
    <PublicLayout>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-green-600 via-green-700 to-emerald-800 text-white">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 20% 30%, white 1px, transparent 1px)", backgroundSize: "28px 28px" }} />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 md:grid-cols-2 md:py-24">
          <div className="fade-up">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm font-medium">
              <Sprout size={16} /> {t("app.tagline")}
            </span>
            <h1 className="mt-4 text-4xl font-extrabold leading-tight md:text-5xl">{t("landing.heroTitle")}</h1>
            <p className="mt-4 max-w-lg text-lg text-green-50">{t("landing.heroSubtitle")}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button className="bg-white text-green-700 hover:bg-green-50" onClick={() => navigate("/signup")}>
                {t("landing.heroCta")} <ArrowRight size={18} />
              </Button>
              <Button variant="outline" className="border-white text-white hover:bg-white/10" onClick={() => navigate("/features")}>
                {t("landing.heroSecondary")}
              </Button>
            </div>
            <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-green-50">
              <span className="flex items-center gap-1.5"><CheckCircle2 size={16} /> EN / SW</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 size={16} /> 24/7 AI</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 size={16} /> No sign-up to explore</span>
            </div>
          </div>
          <div className="fade-up hidden md:block">
            <div className="rounded-3xl bg-white/10 p-4 backdrop-blur border border-white/20 shadow-2xl">
              <div className="rounded-2xl bg-white p-5 text-slate-800">
                <div className="flex items-center gap-2 text-green-700 font-bold"><Bot size={20} /> Vuna AI</div>
                <div className="mt-3 space-y-2 text-sm">
                  <div className="rounded-xl bg-green-50 px-3 py-2 ml-8 text-right">Nataka mkopo wa mbegu</div>
                  <div className="rounded-xl bg-slate-100 px-3 py-2 mr-8">Karibu! Naweza kukusaidia kuangalia ustahiki wako kwa Mkopo wa Msimu wa Mazao. 🌱</div>
                  <div className="rounded-xl bg-green-50 px-3 py-2 ml-8 text-right">Nahitaji hati gani?</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-center text-3xl font-bold text-slate-800 dark:text-slate-100">{t("landing.benefitsTitle")}</h2>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {benefits.map((b) => (
            <Card key={b.key} className="p-6 hover:shadow-md transition">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300">
                {b.icon}
              </div>
              <h3 className="mt-4 text-lg font-bold text-slate-800 dark:text-slate-100">{t(`landing.benefits.${b.key}.title`)}</h3>
              <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">{t(`landing.benefits.${b.key}.desc`)}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Preview CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-16">
        <Card className="overflow-hidden">
          <div className="grid items-center gap-6 p-8 md:grid-cols-2">
            <div>
              <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{t("landing.previewTitle")}</h2>
              <p className="mt-2 text-slate-500 dark:text-slate-400">{t("landing.previewSubtitle")}</p>
              <Link to="/features" className="mt-4 inline-flex">
                <Button>{t("common.explore")} <ArrowRight size={18} /></Button>
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {["chatbot", "eligibility", "upload", "tracking"].map((k) => (
                <Link key={k} to="/features" className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 hover:border-green-400 transition">
                  <div className="font-semibold text-green-700 dark:text-green-300">{t(`preview.${k}.title`)}</div>
                  <div className="mt-1 text-xs text-slate-500">{t(`preview.${k}.desc`)}</div>
                </Link>
              ))}
            </div>
          </div>
        </Card>
      </section>

      {/* Bottom banner */}
      <section className="bg-green-700 text-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 py-14 text-center">
          <h2 className="text-3xl font-bold">{t("landing.ctaBannerTitle")}</h2>
          <p className="max-w-xl text-green-50">{t("landing.ctaBannerSubtitle")}</p>
          <Button className="bg-white text-green-700 hover:bg-green-50" onClick={() => navigate("/signup")}>
            {t("landing.heroCta")} <ArrowRight size={18} />
          </Button>
        </div>
      </section>
    </PublicLayout>
  );
}
