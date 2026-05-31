import { Sprout } from "lucide-react";

export default function Logo({ light = false }: { light?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-600 text-white shadow-sm">
        <Sprout size={20} />
      </div>
      <div className="leading-tight">
        <div className={`text-lg font-extrabold tracking-tight ${light ? "text-white" : "text-green-800 dark:text-green-300"}`}>
          Vuna<span className="text-green-500">Flow</span>
        </div>
      </div>
    </div>
  );
}
