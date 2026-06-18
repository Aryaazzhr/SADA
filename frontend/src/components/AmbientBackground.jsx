export const AmbientBackground = () => {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
      {/* Base */}
      <div className="absolute inset-0 bg-[#05050a]" />

      {/* Texture image overlay */}
      <div
        className="absolute inset-0 opacity-[0.12] mix-blend-screen"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1771873679764-4e5503b69040?crop=entropy&cs=srgb&fm=jpg&q=85')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "blur(0px) saturate(120%)",
        }}
      />

      {/* Ambient blobs */}
      <div className="absolute -top-32 -left-32 h-[42rem] w-[42rem] rounded-full bg-rose-600/25 blur-[140px] animate-float-slow" />
      <div className="absolute top-[20%] -right-40 h-[38rem] w-[38rem] rounded-full bg-blue-700/20 blur-[140px] animate-float-slow [animation-delay:-5s]" />
      <div className="absolute bottom-[-10%] left-[20%] h-[34rem] w-[34rem] rounded-full bg-emerald-600/15 blur-[160px] animate-float-slow [animation-delay:-2s]" />

      {/* Subtle grid */}
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          maskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)",
        }}
      />

      {/* Grain */}
      <div className="grain" />
    </div>
  );
};

