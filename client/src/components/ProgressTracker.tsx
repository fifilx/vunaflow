import { useTranslation } from "react-i18next";
import { Check, X } from "lucide-react";
import { STATUS_ORDER } from "../lib/status";

export default function ProgressTracker({ status }: { status: string }) {
  const { t } = useTranslation();
  const rejected = status === "rejected";
  const currentIdx = STATUS_ORDER.indexOf(status === "rejected" ? "verification" : status);

  return (
    <div className="flex items-center">
      {STATUS_ORDER.map((s, i) => {
        const done = i <= currentIdx && !rejected;
        const isCurrent = i === currentIdx;
        return (
          <div key={s} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition ${
                  done
                    ? "bg-green-600 text-white"
                    : isCurrent && rejected
                    ? "bg-red-500 text-white"
                    : "bg-slate-200 dark:bg-slate-700 text-slate-500"
                }`}
              >
                {done ? <Check size={16} /> : isCurrent && rejected ? <X size={16} /> : i + 1}
              </div>
              <span className="mt-1 hidden text-[10px] font-medium text-slate-500 sm:block whitespace-nowrap">
                {t(`tracking.stages.${s}`)}
              </span>
            </div>
            {i < STATUS_ORDER.length - 1 && (
              <div className={`mx-1 h-1 flex-1 rounded ${i < currentIdx && !rejected ? "bg-green-600" : "bg-slate-200 dark:bg-slate-700"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
