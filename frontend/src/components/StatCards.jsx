import { Activity, Bot, User, Gauge } from "lucide-react";
import { useApp } from "../context/AppContext";

export const StatCards = ({ stats }) => {
  const { t } = useApp();

  const items = [
    {
      key: "total",
      label: t.stats.total,
      value: stats?.total ?? 0,
      icon: <Activity className="h-4 w-4 text-zinc-300" />,
      accent: "from-white/10 to-white/0",
      testid: "stat-total",
    },
    {
      key: "ai",
      label: t.stats.ai_detected,
      value: stats?.ai_count ?? 0,
      icon: <Bot className="h-4 w-4 text-rose-300" />,
      accent: "from-rose-500/30 to-rose-500/0",
      testid: "stat-ai",
      sub: stats?.total ? `${stats.ai_ratio.toFixed(1)}%` : null,
    },
    {
      key: "human",
      label: t.stats.human_detected,
      value: stats?.human_count ?? 0,
      icon: <User className="h-4 w-4 text-emerald-300" />,
      accent: "from-emerald-500/30 to-emerald-500/0",
      testid: "stat-human",
      sub: stats?.total ? `${stats.human_ratio.toFixed(1)}%` : null,
    },
    {
      key: "avg",
      label: t.stats.avg_conf,
      value: `${(stats?.avg_confidence ?? 0).toFixed(1)}%`,
      icon: <Gauge className="h-4 w-4 text-blue-300" />,
      accent: "from-blue-500/30 to-blue-500/0",
      testid: "stat-avg",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
      {items.map((it, idx) => (
        <div
          key={it.key}
          data-testid={it.testid}
          className="relative overflow-hidden glass rounded-2xl p-5 sm:p-6 animate-fade-up glass-hover"
          style={{ animationDelay: `${idx * 80}ms` }}
        >
          <div
            className={`pointer-events-none absolute -top-10 -right-10 h-32 w-32 rounded-full blur-2xl bg-gradient-to-br ${it.accent}`}
            aria-hidden="true"
          />
          <div className="flex items-center justify-between relative">
            <p className="label-eyebrow">{it.label}</p>
            <span className="h-8 w-8 rounded-full bg-white/[0.04] border border-white/10 flex items-center justify-center">
              {it.icon}
            </span>
          </div>
          <div className="mt-6 flex items-baseline gap-2 relative">
            <span className="font-heading text-4xl sm:text-5xl font-light tracking-tight text-white">
              {it.value}
            </span>
            {it.sub && (
              <span className="text-xs text-zinc-400 font-mono">{it.sub}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
