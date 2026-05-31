import { useTranslation } from "react-i18next";
import AppLayout from "../../components/AppLayout";
import { Card } from "../../components/ui";
import ChatPanel from "../../components/ChatPanel";

export default function Chat() {
  const { t } = useTranslation();
  return (
    <AppLayout>
      <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{t("chat.title")}</h1>
      <p className="mt-1 text-slate-500">{t("chat.subtitle")}</p>
      <Card className="mt-5 h-[calc(100vh-15rem)] min-h-[460px] overflow-hidden">
        <ChatPanel authed={true} />
      </Card>
    </AppLayout>
  );
}
