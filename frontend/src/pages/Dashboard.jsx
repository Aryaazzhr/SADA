import { useCallback, useEffect, useState } from "react";
import { useApp } from "../context/AppContext";
import { StatCards } from "../components/StatCards";
import { HistoryList } from "../components/HistoryList";
import { ActivityChart } from "../components/ActivityChart";
import { getHistory, getStats } from "../lib/api";

export default function Dashboard() {
  const { t } = useApp();
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [s, h] = await Promise.all([getStats(), getHistory(100)]);
      setStats(s);
      setHistory(h);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <div className="px-4 sm:px-6 pt-10 pb-20">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="animate-fade-up">
          <p className="label-eyebrow">{t.stats.title}</p>
          <h1 className="mt-2 font-heading text-3xl sm:text-4xl lg:text-5xl tracking-tight font-light">
            {t.stats.subtitle}
          </h1>
        </div>

        <StatCards stats={stats} />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 animate-fade-up [animation-delay:200ms]">
            <ActivityChart data={stats?.last_7_days || []} />
          </div>
          <div className="lg:col-span-5 animate-fade-up [animation-delay:300ms]">
            <RatioCard stats={stats} />
          </div>
        </div>

        <div className="animate-fade-up [animation-delay:400ms]">
          <HistoryList items={history} onChange={refresh} />
        </div>

        {loading && history.length === 0 && (
          <p className="text-xs text-zinc-500" data-testid="dashboard-loading">
            {t.common.loading}
          </p>
        )}
      </div>
    </div>
  );
}

const RatioCard = ({ stats }) => {
  const { t, lang } = useApp();
  const ai = stats?.ai_ratio ?? 0;
  const human = stats?.human_ratio ?? 0;

  return (
    <div className="glass rounded-2xl p-6 h-full" data-testid="ratio-card">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-heading text-lg font-medium">{t.stats.ratio}</h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            {lang === "id" ? "Distribusi total deteksi" : "Total detection split"}
          </p>
        </div>
      </div>

      <div className="mt-8 flex items-center justify-center">
        <div className="relative h-44 w-44">
          <svg viewBox="0 0 36 36" className="h-44 w-44 -rotate-90">
            <circle
              cx="18"
              cy="18"
              r="15.9"
              fill="none"
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="3.5"
            />
            <circle
              cx="18"
              cy="18"
              r="15.9"
              fill="none"
              stroke="#F43F5E"
              strokeWidth="3.5"
              strokeDasharray={`${ai} ${100 - ai}`}
              strokeLinecap="round"
            />
            <circle
              cx="18"
              cy="18"
              r="15.9"
              fill="none"
              stroke="#10B981"
              strokeWidth="3.5"
              strokeDasharray={`${human} ${100 - human}`}
              strokeDashoffset={-ai}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">
              {t.stats.total}
            </p>
            <p className="font-heading text-3xl font-light mt-1">{stats?.total ?? 0}</p>
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2.5">
          <p className="text-[10px] uppercase tracking-[0.18em] text-rose-200/80">
            {t.result.ai}
          </p>
          <p className="font-heading text-xl text-white mt-0.5">
            {ai.toFixed(1)}%
          </p>
        </div>
        <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2.5">
          <p className="text-[10px] uppercase tracking-[0.18em] text-emerald-200/80">
            {t.result.human}
          </p>
          <p className="font-heading text-xl text-white mt-0.5">
            {human.toFixed(1)}%
          </p>
        </div>
      </div>
    </div>
  );
};
