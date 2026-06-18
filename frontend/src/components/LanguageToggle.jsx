import { useApp } from "../context/AppContext";

export const LanguageToggle = () => {
  const { lang, setLang } = useApp();
  const isEn = lang === "en";

  return (
    <div
      data-testid="lang-toggle"
      className="relative inline-flex items-center rounded-full glass p-1"
      role="group"
      aria-label="Language"
    >
      <span
        className="absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-full bg-white/10 border border-white/15 transition-all duration-300"
        style={{ left: isEn ? "calc(50% + 0px)" : "4px" }}
      />
      <button
        type="button"
        data-testid="lang-id-btn"
        onClick={() => setLang("id")}
        className={`relative z-10 px-4 py-1.5 text-xs font-semibold tracking-wider uppercase transition-colors ${
          !isEn ? "text-white" : "text-zinc-500 hover:text-zinc-300"
        }`}
      >
        ID
      </button>
      <button
        type="button"
        data-testid="lang-en-btn"
        onClick={() => setLang("en")}
        className={`relative z-10 px-4 py-1.5 text-xs font-semibold tracking-wider uppercase transition-colors ${
          isEn ? "text-white" : "text-zinc-500 hover:text-zinc-300"
        }`}
      >
        EN
      </button>
    </div>
  );
};
