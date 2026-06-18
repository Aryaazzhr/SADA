import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { dictionary } from "../lib/i18n";

const AppContext = createContext(null);

export const AppProvider = ({ children }) => {
  const [lang, setLang] = useState(() => {
    if (typeof window === "undefined") return "id";
    return localStorage.getItem("sada_lang") || "id";
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("sada_lang", lang);
    }
  }, [lang]);

  const t = useMemo(() => dictionary[lang] || dictionary.id, [lang]);

  const value = useMemo(
    () => ({
      lang,
      setLang,
      toggleLang: () => setLang((p) => (p === "id" ? "en" : "id")),
      t,
    }),
    [lang, t]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside <AppProvider/>");
  return ctx;
};
