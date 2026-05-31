import { useTranslation } from "react-i18next";

export default function LanguageToggle({ compact = false }: { compact?: boolean }) {
  const { i18n } = useTranslation();
  const current = i18n.resolvedLanguage === "sw" ? "sw" : "en";

  const set = (lng: "en" | "sw") => i18n.changeLanguage(lng);

  return (
    <div
      className={`inline-flex items-center rounded-full border border-green-200 dark:border-green-800 bg-white dark:bg-slate-800 p-0.5 ${
        compact ? "text-xs" : "text-sm"
      }`}
      role="group"
      aria-label="Language"
    >
      <button
        onClick={() => set("en")}
        className={`px-3 py-1 rounded-full font-semibold transition ${
          current === "en" ? "bg-green-600 text-white" : "text-slate-600 dark:text-slate-300"
        }`}
        aria-pressed={current === "en"}
      >
        EN
      </button>
      <button
        onClick={() => set("sw")}
        className={`px-3 py-1 rounded-full font-semibold transition ${
          current === "sw" ? "bg-green-600 text-white" : "text-slate-600 dark:text-slate-300"
        }`}
        aria-pressed={current === "sw"}
      >
        SW
      </button>
    </div>
  );
}
