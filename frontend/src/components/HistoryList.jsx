import { useState } from "react";
import { Bot, User, Trash2, ChevronRight, FileAudio, Mic } from "lucide-react";
import { useApp } from "../context/AppContext";
import { deleteDetection, clearHistory } from "../lib/api";

const formatRelative = (iso, lang) => {
  const d = new Date(iso);
  const now = Date.now();
  const diff = Math.max(0, now - d.getTime());
  const m = Math.floor(diff / 60000);
  if (m < 1) return lang === "id" ? "Baru saja" : "Just now";
  if (m < 60) return `${m} ${lang === "id" ? "mnt" : "m"}`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ${lang === "id" ? "jam" : "h"}`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days} ${lang === "id" ? "hari" : "d"}`;
  return d.toLocaleDateString(lang === "id" ? "id-ID" : "en-US");
};

export const HistoryList = ({ items, onChange }) => {
  const { t, lang } = useApp();
  const [filter, setFilter] = useState("all");
  const [busy, setBusy] = useState(false);

  const filtered = items.filter((it) => filter === "all" ? true : it.label === filter);

  const remove = async (id) => {
    setBusy(true);
    try {
      await deleteDetection(id);
      onChange?.();
    } finally {
      setBusy(false);
    }
  };

  const clearAll = async () => {
    if (!items.length) return;
    setBusy(true);
    try {
      await clearHistory();
      onChange?.();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div data-testid="history-list" className="glass rounded-2xl p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h3 className="font-heading text-lg font-medium">{t.history.title}</h3>
          <p className="text-xs text-zinc-500 mt-0.5">{t.history.subtitle}</p>
        </div>
        <div className="flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] p-1">
          {[
            { k: "all", label: t.history.filter_all },
            { k: "ai", label: t.history.filter_ai },
            { k: "human", label: t.history.filter_human },
          ].map((opt) => (
            <button
              key={opt.k}
              data-testid={`history-filter-${opt.k}`}
              onClick={() => setFilter(opt.k)}
              className={`text-[11px] uppercase tracking-wider px-3 py-1.5 rounded-full transition-colors ${
                filter === opt.k
                  ? "bg-white/10 text-white border border-white/15"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="py-10 text-center">
          <p className="text-sm text-zinc-500" data-testid="history-empty">
            {t.history.empty}
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-white/5">
          {filtered.map((item) => (
            <li
              key={item.id}
              data-testid={`history-item-${item.id}`}
              className="group flex items-center justify-between gap-4 py-3.5 px-2 -mx-2 rounded-xl hover:bg-white/[0.03] transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className={`h-9 w-9 rounded-xl flex items-center justify-center border ${
                    item.label === "ai"
                      ? "bg-rose-500/10 border-rose-400/20 text-rose-300"
                      : "bg-emerald-500/10 border-emerald-400/20 text-emerald-300"
                  }`}
                >
                  {item.label === "ai" ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
                </span>
                <div className="min-w-0">
                  <p className="text-sm text-white truncate max-w-[18rem] flex items-center gap-2">
                    {item.source === "record" ? (
                      <Mic className="h-3 w-3 text-zinc-500" />
                    ) : (
                      <FileAudio className="h-3 w-3 text-zinc-500" />
                    )}
                    {item.filename}
                  </p>
                  <p className="text-[11px] text-zinc-500 mt-0.5 font-mono">
                    {formatRelative(item.created_at, lang)} ·{" "}
                    {(item.duration_seconds || 0).toFixed(1)}s · {item.confidence.toFixed(1)}%
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                    item.label === "ai"
                      ? "border-rose-400/30 bg-rose-500/10 text-rose-200"
                      : "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
                  }`}
                >
                  {item.label === "ai" ? t.result.label_ai : t.result.label_human}
                </span>
                <button
                  data-testid={`history-delete-${item.id}`}
                  onClick={() => remove(item.id)}
                  disabled={busy}
                  type="button"
                  className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 rounded-full border border-white/10 hover:bg-rose-500/20 hover:border-rose-400/40 flex items-center justify-center text-zinc-400 hover:text-rose-200"
                  aria-label="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
                <ChevronRight className="h-4 w-4 text-zinc-600 group-hover:text-zinc-300 transition-colors" />
              </div>
            </li>
          ))}
        </ul>
      )}

      {items.length > 0 && (
        <div className="mt-5 pt-4 border-t border-white/5 flex justify-end">
          <button
            data-testid="history-clear-btn"
            onClick={clearAll}
            disabled={busy}
            type="button"
            className="text-[11px] uppercase tracking-wider text-zinc-400 hover:text-rose-300 transition-colors"
          >
            {t.history.clear_all}
          </button>
        </div>
      )}
    </div>
  );
};
