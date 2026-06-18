import { Link } from "react-router-dom";
import { ArrowRight, Sparkles, ShieldCheck, Activity, Cpu, Waves } from "lucide-react";
import { useApp } from "../context/AppContext";

export default function Home() {
  const { t, lang } = useApp();

  return (
    <div className="px-4 sm:px-6">
      {/* Hero */}
      <section className="mx-auto max-w-7xl pt-16 sm:pt-24 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          <div className="lg:col-span-7 animate-fade-up">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5">
              <Sparkles className="h-3.5 w-3.5 text-rose-300" />
              <span className="text-[11px] uppercase tracking-[0.22em] text-zinc-300">
                {t.hero.eyebrow}
              </span>
            </div>
            <h1 className="mt-6 font-heading text-4xl sm:text-5xl lg:text-6xl tracking-tight font-light leading-[1.05]">
              {t.hero.title_1}{" "}
              <span className="relative inline-block">
                <span className="bg-gradient-to-br from-emerald-200 to-emerald-500 bg-clip-text text-transparent font-medium">
                  {t.hero.title_human}
                </span>
              </span>{" "}
              <span className="text-zinc-400">{t.hero.title_or}</span>{" "}
              <span className="bg-gradient-to-br from-rose-300 to-rose-600 bg-clip-text text-transparent font-medium">
                {t.hero.title_ai}
              </span>
              <br />
              <span className="text-zinc-300">{t.hero.title_2}</span>
            </h1>
            <p className="mt-5 max-w-xl text-base sm:text-lg text-zinc-400 leading-relaxed">
              {t.hero.desc}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                to="/detector"
                data-testid="hero-cta-detect"
                className="group inline-flex items-center gap-2 rounded-full bg-white text-black px-5 py-3 text-sm font-semibold tracking-wide hover:bg-zinc-200 transition-colors"
              >
                {t.hero.cta_primary}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                to="/dashboard"
                data-testid="hero-cta-dashboard"
                className="inline-flex items-center gap-2 rounded-full border border-white/10 px-5 py-3 text-sm font-medium hover:bg-white/[0.04] transition-colors"
              >
                {t.hero.cta_secondary}
              </Link>
            </div>

            {/* Tiny stats row */}
            <div className="mt-10 grid grid-cols-3 gap-4 max-w-md">
              {[
                { v: "98.2%", l: lang === "id" ? "Akurasi simulasi" : "Sim. accuracy" },
                { v: "<2s", l: lang === "id" ? "Latensi rata-rata" : "Avg latency" },
                { v: "25MB", l: lang === "id" ? "Berkas maksimum" : "File limit" },
              ].map((s) => (
                <div key={s.l} className="glass rounded-xl px-4 py-3">
                  <p className="font-heading text-xl text-white">{s.v}</p>
                  <p className="text-[10px] uppercase tracking-wider text-zinc-500 mt-0.5">
                    {s.l}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-5 animate-fade-up [animation-delay:200ms]">
            <HeroVisual />
          </div>
        </div>
      </section>

      {/* Feature triad */}
      <section className="mx-auto max-w-7xl pb-24">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <FeatureCard
            icon={<Cpu className="h-4 w-4 text-rose-300" />}
            title={lang === "id" ? "Pemrosesan Akurat" : "Accurate Processing"}
            desc={
              lang === "id"
                ? "Pemrosesan audio dan inferensi ML menggunakan model Wav2Vec2 Base yang responsif dan akurat."
                : "Audio processing and ML inference using a highly responsive and accurate Wav2Vec2 Base model."
            }
          />
          <FeatureCard
            icon={<ShieldCheck className="h-4 w-4 text-emerald-300" />}
            title={lang === "id" ? "Aman & Privat" : "Secure & Private"}
            desc={
              lang === "id"
                ? "Dilengkapi sistem autentikasi dan enkripsi JWT. Riwayat deteksi audio Anda tersimpan aman dan privat."
                : "Secured with authentication and JWT encryption. Your audio detection history is kept private and secure."
            }
          />
          <FeatureCard
            icon={<Activity className="h-4 w-4 text-blue-300" />}
            title={lang === "id" ? "Statistik Komprehensif" : "Comprehensive Stats"}
            desc={
              lang === "id"
                ? "Pantau distribusi AI vs Manusia, riwayat deteksi, dan tren penggunaan pada satu dasbor interaktif."
                : "Monitor AI vs Human distribution, detection history, and usage trends on an interactive dashboard."
            }
          />
        </div>
      </section>
    </div>
  );
}

const FeatureCard = ({ icon, title, desc }) => (
  <div className="glass rounded-2xl p-6 glass-hover">
    <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.05] border border-white/10">
      {icon}
    </span>
    <h3 className="mt-4 font-heading text-lg font-medium">{title}</h3>
    <p className="mt-2 text-sm text-zinc-400 leading-relaxed">{desc}</p>
  </div>
);

const HeroVisual = () => (
  <div className="relative">
    <div className="absolute -inset-6 rounded-[2rem] bg-gradient-to-br from-rose-500/10 via-transparent to-blue-500/10 blur-2xl" />
    <div className="relative glass-strong rounded-3xl p-6 overflow-hidden">
      {/* Top label row */}
      <div className="flex items-center justify-between">
        <div className="inline-flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
          <span className="text-[11px] uppercase tracking-[0.22em] text-zinc-400">
            Live Analysis
          </span>
        </div>
        <Waves className="h-4 w-4 text-zinc-500" />
      </div>

      {/* Faux waveform */}
      <div className="mt-6 flex items-end justify-between gap-1 h-40 sm:h-48">
        {Array.from({ length: 56 }).map((_, i) => {
          const h = 20 + Math.abs(Math.sin(i * 0.45) * 70) + ((i * 13) % 18);
          const isAi = i % 3 === 0 && i > 18 && i < 38;
          return (
            <span
              key={i}
              className={`flex-1 rounded-full ${
                isAi ? "bg-rose-500/80" : "bg-white/30"
              }`}
              style={{ height: `${h}%` }}
            />
          );
        })}
      </div>

      {/* Bottom verdict */}
      <div className="mt-6 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2.5">
          <p className="text-[10px] uppercase tracking-[0.18em] text-rose-200/80">AI</p>
          <p className="font-heading text-2xl text-white mt-0.5">87.4%</p>
        </div>
        <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2.5">
          <p className="text-[10px] uppercase tracking-[0.18em] text-emerald-200/80">
            Human
          </p>
          <p className="font-heading text-2xl text-white mt-0.5">11.6%</p>
        </div>
      </div>
    </div>
  </div>
);
