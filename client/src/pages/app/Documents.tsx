import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Upload, FileCheck2, AlertTriangle, FileClock } from "lucide-react";
import AppLayout from "../../components/AppLayout";
import { Button, Card, Field, Select, Badge } from "../../components/ui";
import { api, type Document } from "../../lib/api";

export default function Documents() {
  const { t } = useTranslation();
  const [docs, setDocs] = useState<Document[]>([]);
  const [docType, setDocType] = useState("national_id");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = () => api.get<Document[]>("/documents").then(({ data }) => setDocs(data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("docType", docType);
      await api.post("/documents", fd, { headers: { "Content-Type": "multipart/form-data" } });
      await load();
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const statusIcon = (s: string) =>
    s === "verified" ? <FileCheck2 className="text-green-600" /> : s === "needs_review" ? <AlertTriangle className="text-amber-500" /> : <FileClock className="text-slate-400" />;
  const statusColor = (s: string) => (s === "verified" ? "green" : s === "needs_review" ? "amber" : "slate");

  return (
    <AppLayout>
      <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{t("documents.title")}</h1>
      <p className="mt-1 text-slate-500">{t("documents.subtitle")}</p>

      <Card className="mt-5 p-6">
        <div className="grid gap-4 sm:grid-cols-2 sm:items-end">
          <Field label={t("documents.docType")}>
            <Select value={docType} onChange={(e) => setDocType(e.target.value)}>
              {["national_id", "business_certificate", "farm_document", "financial"].map((k) => (
                <option key={k} value={k}>{t(`documents.types.${k}`)}</option>
              ))}
            </Select>
          </Field>
          <div>
            <input ref={fileRef} type="file" className="hidden" onChange={onFile} accept="image/*,.pdf" />
            <Button className="w-full" onClick={() => fileRef.current?.click()} disabled={busy}>
              <Upload size={18} /> {busy ? t("documents.verifying") : t("documents.upload")}
            </Button>
          </div>
        </div>
      </Card>

      <h2 className="mt-6 text-lg font-bold text-slate-800 dark:text-slate-100">{t("documents.title")}</h2>
      {docs.length === 0 ? (
        <Card className="mt-3 p-8 text-center text-slate-400">{t("documents.noDocuments")}</Card>
      ) : (
        <div className="mt-3 space-y-3">
          {docs.map((d) => (
            <Card key={d.id} className="p-4">
              <div className="flex items-start gap-3">
                {statusIcon(d.status)}
                <div className="flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-semibold text-slate-800 dark:text-slate-100">{t(`documents.types.${d.doc_type}`)}</div>
                    <Badge color={statusColor(d.status)}>{t(`documents.status.${d.status}`)}</Badge>
                  </div>
                  <div className="text-xs text-slate-400">{d.filename}</div>
                  {d.ocr_text && (
                    <div className="mt-2 rounded-lg bg-slate-50 dark:bg-slate-700/40 p-3">
                      <div className="text-xs font-semibold text-slate-500">{t("documents.extracted")}</div>
                      <pre className="mt-1 whitespace-pre-wrap text-xs text-slate-500">{d.ocr_text}</pre>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
