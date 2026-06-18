import { useEffect, useState } from "react";
import { Bot, User, Sparkles, Clock, FileAudio, RefreshCcw, History } from "lucide-react";
import { useApp } from "../context/AppContext";
import { Link } from "react-router-dom";

const useCountUp = (value, duration = 900) => {
  const [n, setN] = useState(0);
  useEffect(() => {
    const start = performance.now();
    let raf;
    const step = (t) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Number((value * eased).toFixed(2)));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return n;
};

export const ResultCard = ({ result, onReset }) => {
  const { t } = useApp();
  const isAi = result.label === "ai";
  const conf = useCountUp(result.confidence);

  const accent = isAi ? "rose" : "emerald";
  const Icon = isAi ? Bot : User;

  return (
    <div
      data-testid="result-card"
      data-result={result.label}
      className="relative overflow-hidden glass-strong rounded-3xl p-6 sm:p-8 animate-fade-up"
    >
      {/* Ambient accent glow */}
      <div
        className={`absolute -top-24 -right-24 h-72 w-72 rounded-full blur-[120px] ${
          isAi ? "bg-rose-500/30" : "bg-emerald-500/30"
        }`}
        aria-hidden="true"
      />

      <div className="relative grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1 flex flex-col justify-between">
          <div>
            <p className="label-eyebrow flex items-center gap-2">
              <Sparkles className="h-3 w-3" /> {t.result.title}
            </p>
            <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">
              <Icon
                className={`h-4 w-4 ${
                  isAi ? "text-rose-300" : "text-emerald-300"
                }`}
              />
              <span
                className={`text-xs font-semibold uppercase tracking-wider ${
                  isAi ? "text-rose-200" : "text-emerald-200"
                }`}
                data-testid="result-label"
              >
                {isAi ? t.result.label_ai : t.result.label_human}
              </span>
            </div>

            <div className="mt-6">
              <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">
                {t.result.confidence}
              </p>
              <div className="mt-1 flex items-baseline gap-1">
                <span
                  className="font-heading text-6xl sm:text-7xl font-light tracking-tighter text-white"
                  data-testid="result-confidence"
                >
                  {conf.toFixed(1)}
                </span>
                <span className="text-2xl text-zinc-400">%</span>
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onReset}
              data-testid="result-reset-btn"
              className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider px-4 py-2 rounded-full bg-white text-black hover:bg-zinc-200 transition-colors"
            >
              <RefreshCcw className="h-3.5 w-3.5" />
              {t.result.run_again}
            </button>
            <Link
              to="/dashboard"
              data-testid="result-history-link"
              className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider px-4 py-2 rounded-full border border-white/10 hover:bg-white/[0.05] transition-colors"
            >
              <History className="h-3.5 w-3.5" />
              {t.result.view_history}
            </Link>
          </div>
        </div>

        <div className="md:col-span-2 space-y-5">
          <div>
            <p className="label-eyebrow">{t.result.breakdown}</p>
            <div className="mt-4 space-y-3">
              <Bar
                label={t.result.ai}
                value={result.breakdown.ai}
                color="bg-rose-500"
                testid="bar-ai"
              />
              <Bar
                label={t.result.human}
                value={result.breakdown.human}
                color="bg-emerald-500"
                testid="bar-human"
              />
              <Bar
                label={t.result.noise}
                value={result.breakdown.noise}
                color="bg-zinc-500"
                testid="bar-noise"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-white/5">
            <Meta
              icon={<FileAudio className="h-3.5 w-3.5" />}
              label={t.result.file}
              value={result.filename}
              truncate
            />
            <Meta
              icon={<Clock className="h-3.5 w-3.5" />}
              label={t.result.duration}
              value={`${(result.duration_seconds || 0).toFixed(1)}s`}
            />
            <Meta
              icon={<Sparkles className="h-3.5 w-3.5" />}
              label={t.result.model}
              value={result.model_used}
            />
            <Meta
              icon={<Clock className="h-3.5 w-3.5" />}
              label={t.result.detected_at}
              value={new Date(result.created_at).toLocaleTimeString()}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

const Bar = ({ label, value, color, testid }) => {
  const v = useCountUp(value);
  return (
    <div data-testid={testid}>
      <div className="flex items-center justify-between text-xs text-zinc-400 mb-1.5">
        <span className="uppercase tracking-wider">{label}</span>
        <span className="font-mono text-zinc-200">{v.toFixed(1)}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-white/5 overflow-hidden">
        <div
          className={`h-full ${color} transition-all duration-700`}
          style={{ width: `${Math.min(100, value)}%` }}
        />
      </div>
    </div>
  );
};

const Meta = ({ icon, label, value, truncate }) => (
  <div className="min-w-0">
    <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-zinc-500">
      {icon}
      {label}
    </p>
    <p
      className={`mt-1 text-sm text-white ${truncate ? "truncate" : ""}`}
      title={typeof value === "string" ? value : undefined}
    >
      {value}
    </p>
  </div>
);
