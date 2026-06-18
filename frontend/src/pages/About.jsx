import { useApp } from "../context/AppContext";
import { Cpu, Database, Mic, BarChart3, ArrowRight, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";

export default function About() {
  const { t } = useApp();

  return (
    <div className="px-4 sm:px-6 pt-10 pb-20">
      <div className="mx-auto max-w-5xl space-y-10">
        <div className="animate-fade-up">
          <p className="label-eyebrow">{t.nav.about}</p>
          <h1 className="mt-3 font-heading text-3xl sm:text-4xl lg:text-5xl tracking-tight font-light">
            {t.about.title}
          </h1>
          <p className="mt-5 text-base sm:text-lg text-zinc-400 leading-relaxed max-w-3xl">
            {t.about.desc}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-fade-up [animation-delay:150ms]">
          <div className="glass rounded-2xl p-6">
            <h3 className="font-heading text-xl font-medium">{t.about.how_title}</h3>
            <ol className="mt-5 space-y-4">
              {t.about.how_steps.map((s, i) => (
                <li key={i} className="flex gap-3 text-sm text-zinc-300">
                  <span className="mt-0.5 h-6 w-6 shrink-0 rounded-full border border-white/10 bg-white/[0.04] flex items-center justify-center font-mono text-[11px] text-zinc-300">
                    {i + 1}
                  </span>
                  {s}
                </li>
              ))}
            </ol>
          </div>

          <div className="glass rounded-2xl p-6">
            <h3 className="font-heading text-xl font-medium">{t.about.tech_title}</h3>
            <ul className="mt-5 space-y-3">
              {t.about.tech_items.map((it, idx) => (
                <li key={idx} className="flex items-center gap-3 text-sm text-zinc-300">
                  <CheckCircle2 className="h-4 w-4 text-emerald-300 shrink-0" />
                  {it}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 animate-fade-up [animation-delay:300ms]">
          <Pillar icon={<Mic className="h-4 w-4 text-rose-300" />} label="Capture" />
          <Pillar icon={<Cpu className="h-4 w-4 text-blue-300" />} label="Inference" />
          <Pillar icon={<Database className="h-4 w-4 text-emerald-300" />} label="Persist" />
          <Pillar icon={<BarChart3 className="h-4 w-4 text-amber-300" />} label="Analyze" />
        </div>

        <div className="flex justify-start animate-fade-up [animation-delay:400ms]">
          <Link
            to="/detector"
            className="group inline-flex items-center gap-2 rounded-full bg-white text-black px-5 py-3 text-sm font-semibold tracking-wide hover:bg-zinc-200 transition-colors"
          >
            {t.hero.cta_primary}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

const Pillar = ({ icon, label }) => (
  <div className="glass rounded-xl p-4 flex items-center gap-3">
    <span className="h-9 w-9 rounded-lg border border-white/10 bg-white/[0.04] flex items-center justify-center">
      {icon}
    </span>
    <span className="text-sm text-zinc-200">{label}</span>
  </div>
);
