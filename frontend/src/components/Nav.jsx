import { useEffect, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { Waves, Menu, X, LogOut, User } from "lucide-react";
import { useApp } from "../context/AppContext";
import { useAuth } from "../context/AuthContext";
import { LanguageToggle } from "./LanguageToggle";

const linkBase =
  "text-sm font-medium tracking-wide transition-colors px-3 py-2 rounded-full";
const linkInactive = "text-zinc-400 hover:text-white";
const linkActive = "text-white bg-white/[0.06] border border-white/10";

export const Nav = () => {
  const { t, lang } = useApp();
  const { isAuthenticated, user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    setShowLogoutConfirm(false);
    logout();
    navigate("/");
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full px-4 sm:px-6 pt-4">
        <nav
          data-testid="main-nav"
          className="mx-auto flex max-w-7xl items-center justify-between glass rounded-full px-4 sm:px-6 py-2.5"
        >
          <Link
            to="/"
            data-testid="brand-link"
            className="flex items-center gap-2.5 group"
          >
            <span className="relative inline-flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-rose-500/30 to-rose-700/10 border border-rose-400/30">
              <Waves className="h-4 w-4 text-rose-300 group-hover:text-white transition-colors" />
              <span className="absolute inset-0 rounded-full bg-rose-500/30 blur-md opacity-50" />
            </span>
            <div className="leading-tight">
              <p className="font-heading text-lg font-semibold tracking-tight">
                {t.nav.brand}
              </p>
              <p className="hidden sm:block text-[10px] uppercase tracking-[0.22em] text-zinc-300">
                Auditory Detection
              </p>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            <NavLink
              to="/"
              end
              data-testid="nav-home"
              className={({ isActive }) =>
                `${linkBase} ${isActive ? linkActive : linkInactive}`
              }
            >
              {t.nav.home}
            </NavLink>
            <NavLink
              to="/detector"
              data-testid="nav-detector"
              className={({ isActive }) =>
                `${linkBase} ${isActive ? linkActive : linkInactive}`
              }
            >
              {t.nav.detector}
            </NavLink>
            <NavLink
              to="/dashboard"
              data-testid="nav-dashboard"
              className={({ isActive }) =>
                `${linkBase} ${isActive ? linkActive : linkInactive}`
              }
            >
              {t.nav.dashboard}
            </NavLink>
            <NavLink
              to="/about"
              data-testid="nav-about"
              className={({ isActive }) =>
                `${linkBase} ${isActive ? linkActive : linkInactive}`
              }
            >
              {t.nav.about}
            </NavLink>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <LanguageToggle />

            {/* Auth section */}
            {isAuthenticated ? (
              <div className="hidden md:flex items-center gap-2">
                <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">
                  <div className="h-6 w-6 rounded-full bg-gradient-to-br from-rose-500/40 to-rose-700/20 border border-rose-400/30 flex items-center justify-center">
                    <User className="h-3 w-3 text-rose-200" />
                  </div>
                  <span className="text-xs text-white font-medium max-w-[8rem] truncate">
                    {user?.username}
                  </span>
                </div>
                <button
                  type="button"
                  data-testid="nav-logout"
                  onClick={handleLogout}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-colors"
                  aria-label="Logout"
                  title={lang === "id" ? "Keluar" : "Logout"}
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                data-testid="nav-login"
                className="hidden md:inline-flex text-xs font-semibold uppercase tracking-wider px-4 py-2 rounded-full bg-white text-black hover:bg-zinc-200 transition-colors"
              >
                {lang === "id" ? "Masuk" : "Sign In"}
              </Link>
            )}

            <button
              type="button"
              data-testid="mobile-menu-toggle"
              onClick={() => setOpen((v) => !v)}
              className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-zinc-200 hover:text-white"
              aria-label="Open menu"
              aria-expanded={open}
            >
              {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </nav>

        {/* Mobile menu */}
        {open && (
          <div
            data-testid="mobile-menu"
            className="md:hidden mx-auto max-w-7xl mt-2 glass rounded-3xl p-3 animate-fade-up"
          >
            <div className="flex flex-col">
              {[
                { to: "/", label: t.nav.home, end: true, testid: "mobile-nav-home" },
                { to: "/detector", label: t.nav.detector, testid: "mobile-nav-detector" },
                { to: "/dashboard", label: t.nav.dashboard, testid: "mobile-nav-dashboard" },
                { to: "/about", label: t.nav.about, testid: "mobile-nav-about" },
              ].map((it) => (
                <NavLink
                  key={it.to}
                  to={it.to}
                  end={it.end}
                  data-testid={it.testid}
                  className={({ isActive }) =>
                    `px-4 py-3 rounded-2xl text-sm font-medium transition-colors ${isActive
                      ? "bg-white/[0.06] text-white border border-white/10"
                      : "text-zinc-300 hover:bg-white/[0.04] hover:text-white"
                    }`
                  }
                >
                  {it.label}
                </NavLink>
              ))}

              {/* Mobile auth */}
              <div className="mt-2 pt-2 border-t border-white/10">
                {isAuthenticated ? (
                  <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-gradient-to-br from-rose-500/40 to-rose-700/20 border border-rose-400/30 flex items-center justify-center">
                        <User className="h-3.5 w-3.5 text-rose-200" />
                      </div>
                      <span className="text-sm text-white font-medium">
                        {user?.username}
                      </span>
                    </div>
                    <button
                      type="button"
                      data-testid="mobile-logout"
                      onClick={handleLogout}
                      className="text-xs text-zinc-400 hover:text-white flex items-center gap-1.5 transition-colors"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      {lang === "id" ? "Keluar" : "Logout"}
                    </button>
                  </div>
                ) : (
                  <Link
                    to="/login"
                    data-testid="mobile-login"
                    className="flex items-center justify-center px-4 py-3 rounded-2xl text-sm font-semibold bg-white text-black hover:bg-zinc-200 transition-colors"
                  >
                    {lang === "id" ? "Masuk" : "Sign In"}
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Logout confirmation modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowLogoutConfirm(false)}
          />
          {/* Modal */}
          <div className="relative glass-strong rounded-2xl p-6 w-full max-w-sm animate-fade-up">
            <div className="flex flex-col items-center text-center">
              <div className="h-12 w-12 rounded-full bg-rose-500/10 border border-rose-400/20 flex items-center justify-center mb-4">
                <LogOut className="h-5 w-5 text-rose-300" />
              </div>
              <h3 className="font-heading text-lg font-medium text-white">
                {lang === "id" ? "Keluar dari SADA?" : "Sign out of SADA?"}
              </h3>
              <p className="text-sm text-zinc-400 mt-1.5">
                {lang === "id"
                  ? "Anda harus login kembali untuk mengakses fitur deteksi."
                  : "You'll need to sign in again to access detection features."}
              </p>
              <div className="flex gap-3 mt-6 w-full">
                <button
                  type="button"
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 text-sm font-medium px-4 py-2.5 rounded-xl border border-white/10 text-zinc-300 hover:text-white hover:bg-white/[0.04] transition-colors"
                >
                  {lang === "id" ? "Batal" : "Cancel"}
                </button>
                <button
                  type="button"
                  data-testid="confirm-logout"
                  onClick={confirmLogout}
                  className="flex-1 text-sm font-semibold px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white transition-colors"
                >
                  {lang === "id" ? "Ya, Keluar" : "Yes, Sign Out"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
