import { useEffect, useState } from "react";
import { useApp } from "../context/AppContext";
import { UploadZone } from "../components/UploadZone";
import { RecordButton } from "../components/RecordButton";
import { ResultCard } from "../components/ResultCard";
import { detectAudio, getHistory } from "../lib/api";
import { Loader2, Bot, User, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

export default function Detector() {
  const { t, lang } = useApp();
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState("upload");
  const [result, setResult] = useState(null);
  const [recent, setRecent] = useState([]);
  const [error, setError] = useState("");

  const loadRecent = async () => {
    try {
      const data = await getHistory(5);
      setRecent(data);
    } catch (e) {
      // no-op
    }
  };

  useEffect(() => {
    loadRecent();
  }, []);

  const handleSubmit = async (payload) => {
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const r = await detectAudio(payload);
      setResult(r);
      loadRecent();
    } catch (e) {
      setError(t.common.error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="px-4 sm:px-6 pt-10 pb-20">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 animate-fade-up">
          <p className="label-eyebrow">{t.nav.detector}</p>
          <h1 className="mt-2 font-heading text-3xl sm:text-4xl lg:text-5xl tracking-tight font-light">
            {lang === "id"
              ? "Analisis sinyal akustik secara langsung."
              : "Analyze acoustic signal in real time."}
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main: upload + record */}
          <div className="lg:col-span-8 space-y-6 animate-fade-up [animation-delay:100ms]">
            {/* Tab switcher */}
            <div className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] p-1">
              <TabBtn active={tab === "upload"} onClick={() => setTab("upload")} testid="tab-upload">
                {t.upload.title}
              </TabBtn>
              <TabBtn active={tab === "record"} onClick={() => setTab("record")} testid="tab-record">
                {t.record.title}
              </TabBtn>
            </div>

            <div className="glass-strong rounded-3xl p-2 sm:p-3">
              {tab === "upload" ? (
                <div className="p-3 sm:p-5">
                  <UploadZone onSubmit={handleSubmit} busy={busy} />
                </div>
              ) : (
                <div className="p-6 sm:p-10">
                  <RecordButton onSubmit={handleSubmit} busy={busy} />
                </div>
              )}
            </div>

            {/* Result / busy area */}
            {busy && (
              <div className="glass rounded-2xl p-5 flex items-center gap-3 text-sm text-zinc-300">
                <Loader2 className="h-4 w-4 animate-spin text-rose-300" />
                {t.upload.analyzing}
              </div>
            )}

            {error && (
              <div className="glass rounded-2xl p-5 text-sm text-rose-300 border border-rose-400/30">
                {error}
              </div>
            )}

            {result && !busy && (
              <ResultCard result={result} onReset={() => setResult(null)} />
            )}

            {!result && !busy && !error && (
              <div className="glass rounded-2xl p-6">
                <p className="label-eyebrow flex items-center gap-2">
                  <Sparkles className="h-3 w-3" /> {t.result.title}
                </p>
                <p className="mt-3 text-sm text-zinc-400">{t.result.empty}</p>
              </div>
            )}
          </div>

          {/* Side: tips + recent */}
          <aside className="lg:col-span-4 space-y-6 animate-fade-up [animation-delay:200ms]">
            <div className="glass rounded-2xl p-5">
              <p className="label-eyebrow">
                {lang === "id" ? "Tips" : "Tips"}
              </p>
              <ul className="mt-4 space-y-3 text-sm text-zinc-300">
                <li className="flex gap-3">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-rose-400" />
                  {lang === "id"
                    ? "Gunakan klip 5–30 detik untuk hasil terbaik."
                    : "Use clips 5–30 seconds long for best results."}
                </li>
                <li className="flex gap-3">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  {lang === "id"
                    ? "Hindari musik latar yang mendominasi."
                    : "Avoid dominant background music."}
                </li>
                <li className="flex gap-3">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-blue-400" />
                  {lang === "id"
                    ? "Mikrofon tunggal lebih akurat dibanding rekaman jauh."
                    : "Close-mic recordings outperform distant ones."}
                </li>
              </ul>
            </div>

            <div className="glass rounded-2xl p-5" data-testid="recent-detections">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-heading text-base font-medium">
                  {lang === "id" ? "Terbaru" : "Recent"}
                </h3>
                <Link
                  to="/dashboard"
                  className="text-[11px] uppercase tracking-wider text-zinc-400 hover:text-white"
                >
                  {lang === "id" ? "Semua" : "All"}
                </Link>
              </div>
              {recent.length === 0 ? (
                <p className="text-sm text-zinc-500">{t.history.empty}</p>
              ) : (
                <ul className="space-y-2">
                  {recent.map((r) => (
                    <li
                      key={r.id}
                      className="flex items-center justify-between gap-3 rounded-xl px-3 py-2 hover:bg-white/[0.03]"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {r.label === "ai" ? (
                          <Bot className="h-3.5 w-3.5 text-rose-300 shrink-0" />
                        ) : (
                          <User className="h-3.5 w-3.5 text-emerald-300 shrink-0" />
                        )}
                        <span className="text-xs text-white truncate max-w-[10rem]">
                          {r.filename}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-zinc-400 shrink-0">
                        {r.confidence.toFixed(1)}%
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

const TabBtn = ({ active, onClick, children, testid }) => (
  <button
    type="button"
    data-testid={testid}
    onClick={onClick}
    className={`text-xs uppercase tracking-wider px-4 py-2 rounded-full transition-colors ${
      active ? "bg-white/10 text-white border border-white/15" : "text-zinc-400 hover:text-white"
    }`}
  >
    {children}
  </button>
);
