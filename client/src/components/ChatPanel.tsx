import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Send, Bot, User as UserIcon, Mic } from "lucide-react";
import { api } from "../lib/api";
import { Button } from "./ui";

interface Msg { role: "user" | "assistant"; content: string }

// Minimal typing for the Web Speech API (not in default TS lib DOM types).
type SpeechRecognitionResultLike = { 0: { transcript: string } };
interface SpeechRecognitionEventLike { results: { 0: SpeechRecognitionResultLike } }
interface SpeechRecognitionLike {
  lang: string; interimResults: boolean; continuous: boolean;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void; stop: () => void;
}

export default function ChatPanel({ authed }: { authed: boolean }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.resolvedLanguage === "sw" ? "sw" : "en";
  const [messages, setMessages] = useState<Msg[]>([{ role: "assistant", content: t("chat.greeting") }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authed) return;
    api.get("/chat/history").then(({ data }) => {
      if (data.messages?.length) {
        setMessages(data.messages.map((m: { role: string; content: string }) => ({ role: m.role, content: m.content })));
      }
    }).catch(() => {});
  }, [authed]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const speak = (text: string) => {
    if (!("speechSynthesis" in window)) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang === "sw" ? "sw-KE" : "en-US";
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  };

  const send = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || busy) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content }]);
    setBusy(true);
    try {
      const endpoint = authed ? "/chat" : "/chat/demo";
      const { data } = await api.post(endpoint, { message: content, lang });
      const reply = authed ? data.reply : data.content;
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
      speak(reply);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: t("auth.errors.generic") }]);
    } finally {
      setBusy(false);
    }
  };

  const startVoice = () => {
    const w = window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = lang === "sw" ? "sw-KE" : "en-US";
    rec.interimResults = false;
    rec.continuous = false;
    rec.onresult = (e) => { setInput(e.results[0][0].transcript); };
    rec.onend = () => setListening(false);
    setListening(true);
    rec.start();
  };

  const suggestions = [
    t("chat.suggestions.apply"),
    t("chat.suggestions.docs"),
    t("chat.suggestions.eligible"),
    t("chat.suggestions.rates"),
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${m.role === "user" ? "bg-green-600 text-white" : "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300"}`}>
              {m.role === "user" ? <UserIcon size={18} /> : <Bot size={18} />}
            </div>
            <div className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${m.role === "user" ? "bg-green-600 text-white rounded-tr-sm" : "bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-tl-sm"}`}>
              {m.content}
            </div>
          </div>
        ))}
        {busy && <div className="text-xs text-slate-400 pl-12">…</div>}
        <div ref={endRef} />
      </div>

      <div className="px-4 pb-2 flex flex-wrap gap-2">
        {suggestions.map((s) => (
          <button key={s} onClick={() => send(s)} className="rounded-full border border-green-200 dark:border-green-800 px-3 py-1 text-xs text-green-700 dark:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/30">
            {s}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 border-t border-slate-200 dark:border-slate-700 p-3">
        <button
          onClick={startVoice}
          title={listening ? t("chat.voiceStop") : t("chat.voiceStart")}
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${listening ? "bg-red-500 text-white border-red-500 animate-pulse" : "border-slate-300 dark:border-slate-600 text-slate-500 hover:text-green-600"}`}
        >
          <Mic size={20} />
        </button>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder={t("chat.placeholder")}
          className="flex-1 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-3 text-sm outline-none focus:border-green-500"
        />
        <Button onClick={() => send()} disabled={busy} className="px-4">
          <Send size={18} />
        </Button>
      </div>
    </div>
  );
}
