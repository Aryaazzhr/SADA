import { useApp } from "../context/AppContext";
import { Github, Activity } from "lucide-react";

export const Footer = () => {
  const { t, lang } = useApp();
  const year = new Date().getFullYear();

  return (
    <footer className="relative z-10 mt-24 border-t border-white/5 px-6 py-10">
      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
        <div>
          <p className="font-heading text-base font-semibold">{t.nav.brand}</p>
          <p className="text-xs text-zinc-500 mt-1">
            {lang === "id"
              ? "Sistem Auditori Deteksi AI · © " + year
              : "Auditory AI Detection System · © " + year}
          </p>
        </div>
        <div className="flex items-center gap-5 text-xs text-zinc-500">
          <span className="inline-flex items-center gap-2">
            <Activity className="h-3.5 w-3.5 text-emerald-400" />
            {lang === "id" ? "Sistem aktif" : "System online"}
          </span>
          <a
            href="https://github.com/Aryaazzhr/sada-backend"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 hover:text-white transition-colors"
          >
            <Github className="h-3.5 w-3.5" />
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
};
