import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { useApp } from "../context/AppContext";

const tickFmt = (d, lang) => {
  try {
    const dt = new Date(d);
    return dt.toLocaleDateString(lang === "id" ? "id-ID" : "en-US", {
      day: "numeric",
      month: "short",
    });
  } catch {
    return d;
  }
};

export const ActivityChart = ({ data }) => {
  const { t, lang } = useApp();

  const empty = !data || data.every((d) => d.ai === 0 && d.human === 0);

  return (
    <div data-testid="activity-chart" className="glass rounded-2xl p-5 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-heading text-lg font-medium">{t.stats.last_7}</h3>
          <p className="text-xs text-zinc-500 mt-0.5">{t.stats.ratio}</p>
        </div>
      </div>
      {empty ? (
        <div className="h-[260px] flex items-center justify-center text-sm text-zinc-500">
          {t.stats.empty}
        </div>
      ) : (
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
              <defs>
                <linearGradient id="aiFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F43F5E" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#F43F5E" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="humanFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="date"
                stroke="rgba(255,255,255,0.4)"
                fontSize={11}
                tickFormatter={(d) => tickFmt(d, lang)}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="rgba(255,255,255,0.4)"
                fontSize={11}
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: "rgba(15,15,20,0.95)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 12,
                  color: "#fff",
                  fontSize: 12,
                }}
                labelFormatter={(d) => tickFmt(d, lang)}
              />
              <Legend
                verticalAlign="top"
                align="right"
                iconType="circle"
                wrapperStyle={{ fontSize: 11, color: "#a1a1aa" }}
              />
              <Area
                type="monotone"
                dataKey="ai"
                name={t.result.ai}
                stroke="#F43F5E"
                fill="url(#aiFill)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="human"
                name={t.result.human}
                stroke="#10B981"
                fill="url(#humanFill)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};
