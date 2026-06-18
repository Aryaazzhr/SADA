import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useApp } from "../context/AppContext";
import { Loader2, Waves, Eye, EyeOff, ArrowLeft, Mail, RefreshCw } from "lucide-react";

export default function Login() {
  const { lang } = useApp();
  const { login, register, verify, resend, forgotPassword, resetPassword } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/detector";

  const [tab, setTab] = useState("login"); // login | register | forgot
  const [step, setStep] = useState("form"); // form | verify | reset_verify
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Form state
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPw, setConfirmPw] = useState("");

  // Verification code state (6 separate inputs)
  const [codeDigits, setCodeDigits] = useState(["", "", "", "", "", ""]);
  const codeRefs = useRef([]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const resetForm = () => {
    setEmail("");
    setUsername("");
    setPassword("");
    setConfirmPw("");
    setError("");
    setStep("form");
    setCodeDigits(["", "", "", "", "", ""]);
  };

  const switchTab = (t) => {
    setTab(t);
    resetForm();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email) {
      setError(lang === "id" ? "Email wajib diisi." : "Email is required.");
      return;
    }

    if (tab === "forgot") {
      setBusy(true);
      try {
        await forgotPassword({ email });
        setStep("reset_verify");
        setCodeDigits(["", "", "", "", "", ""]);
        setTimeout(() => codeRefs.current[0]?.focus(), 100);
      } catch (err) {
        const detail = err.response?.data?.detail;
        setError(detail || (lang === "id" ? "Email tidak ditemukan." : "Email not found."));
      } finally {
        setBusy(false);
      }
      return;
    }

    if (!password) {
      setError(lang === "id" ? "Email dan password wajib diisi." : "Email and password are required.");
      return;
    }

    if (tab === "register") {
      if (!username) {
        setError(lang === "id" ? "Username wajib diisi." : "Username is required.");
        return;
      }
      if (password.length < 6) {
        setError(lang === "id" ? "Password minimal 6 karakter." : "Password must be at least 6 characters.");
        return;
      }
      if (password !== confirmPw) {
        setError(lang === "id" ? "Konfirmasi password tidak cocok." : "Passwords do not match.");
        return;
      }
    }

    setBusy(true);
    try {
      if (tab === "login") {
        await login({ email, password });
        navigate(from, { replace: true });
      } else {
        await register({ email, username, password });
        // Move to verification step
        setStep("verify");
        setResendCooldown(60);
        setCodeDigits(["", "", "", "", "", ""]);
        // Focus first code input
        setTimeout(() => codeRefs.current[0]?.focus(), 100);
      }
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(detail || (lang === "id" ? "Terjadi kesalahan." : "Something went wrong."));
    } finally {
      setBusy(false);
    }
  };

  // Handle individual digit input
  const handleCodeChange = (index, value) => {
    if (!/^\d*$/.test(value)) return; // digits only
    const newDigits = [...codeDigits];
    newDigits[index] = value.slice(-1); // single digit
    setCodeDigits(newDigits);

    // Auto-focus next input
    if (value && index < 5) {
      codeRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits filled
    if (value && index === 5) {
      const fullCode = newDigits.join("");
      if (fullCode.length === 6) {
        if (step === "verify") {
          handleVerify(fullCode);
        } else if (step === "reset_verify" && password.length >= 6) {
          handleResetVerify(fullCode);
        }
      }
    }
  };

  const handleCodeKeyDown = (index, e) => {
    if (e.key === "Backspace" && !codeDigits[index] && index > 0) {
      codeRefs.current[index - 1]?.focus();
    }
  };

  const handleCodePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const newDigits = [...codeDigits];
    for (let i = 0; i < 6; i++) {
      newDigits[i] = pasted[i] || "";
    }
    setCodeDigits(newDigits);
    if (pasted.length === 6) {
      if (step === "verify") {
        handleVerify(pasted);
      } else if (step === "reset_verify" && password.length >= 6) {
        handleResetVerify(pasted);
      }
    } else {
      codeRefs.current[pasted.length]?.focus();
    }
  };

  const handleVerify = async (code) => {
    setError("");
    setBusy(true);
    try {
      await verify({ email, code });
      navigate(from, { replace: true });
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(detail || (lang === "id" ? "Kode tidak valid." : "Invalid code."));
      setCodeDigits(["", "", "", "", "", ""]);
      codeRefs.current[0]?.focus();
    } finally {
      setBusy(false);
    }
  };

  const handleResetVerify = async (code) => {
    setError("");
    if (password.length < 6) {
      setError(lang === "id" ? "Password baru minimal 6 karakter." : "New password must be at least 6 characters.");
      return;
    }
    setBusy(true);
    try {
      await resetPassword({ email, code, new_password: password });
      setTab("login");
      setStep("form");
      setPassword("");
      setError(lang === "id" ? "Password berhasil direset. Silakan masuk." : "Password reset successful. Please sign in.");
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(detail || (lang === "id" ? "Kode tidak valid atau kadaluarsa." : "Invalid or expired code."));
      setCodeDigits(["", "", "", "", "", ""]);
      codeRefs.current[0]?.focus();
    } finally {
      setBusy(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setError("");
    setBusy(true);
    try {
      await resend({ email });
      setResendCooldown(60);
      setCodeDigits(["", "", "", "", "", ""]);
      codeRefs.current[0]?.focus();
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(detail || (lang === "id" ? "Gagal mengirim ulang." : "Failed to resend."));
    } finally {
      setBusy(false);
    }
  };

  const i = lang === "id"
    ? {
        login_title: "Masuk ke SADA",
        login_subtitle: "Masukkan kredensial Anda untuk melanjutkan.",
        register_title: "Buat Akun Baru",
        register_subtitle: "Daftar untuk mulai mendeteksi suara AI.",
        tab_login: "Masuk",
        tab_register: "Daftar",
        email_label: "Email",
        username: "Username",
        password: "Password",
        confirm_pw: "Konfirmasi Password",
        submit_login: "Masuk",
        submit_register: "Daftar",
        or_login: "Sudah punya akun?",
        or_register: "Belum punya akun?",
        switch_login: "Masuk di sini",
        switch_register: "Daftar di sini",
        verify_title: "Verifikasi Email",
        verify_subtitle: "Masukkan kode 6 digit yang dikirim ke",
        verify_btn: "Verifikasi",
        resend: "Kirim ulang kode",
        resend_cooldown: "Kirim ulang dalam",
        back: "Kembali",
        forgot_title: "Lupa Password",
        forgot_subtitle: "Masukkan email Anda untuk menerima kode reset.",
        reset_title: "Reset Password",
        reset_subtitle: "Masukkan kode 6 digit dari email dan password baru Anda.",
        forgot_link: "Lupa Password?",
        submit_forgot: "Kirim Kode Reset",
        submit_reset: "Simpan Password Baru",
        new_password: "Password Baru",
      }
    : {
        login_title: "Sign in to SADA",
        login_subtitle: "Enter your credentials to continue.",
        register_title: "Create Account",
        register_subtitle: "Sign up to start detecting AI voices.",
        tab_login: "Sign In",
        tab_register: "Sign Up",
        email_label: "Email",
        username: "Username",
        password: "Password",
        confirm_pw: "Confirm Password",
        submit_login: "Sign In",
        submit_register: "Sign Up",
        or_login: "Already have an account?",
        or_register: "Don't have an account?",
        switch_login: "Sign in here",
        switch_register: "Sign up here",
        verify_title: "Verify Your Email",
        verify_subtitle: "Enter the 6-digit code sent to",
        verify_btn: "Verify",
        resend: "Resend code",
        resend_cooldown: "Resend in",
        back: "Back",
        forgot_title: "Forgot Password",
        forgot_subtitle: "Enter your email to receive a reset code.",
        reset_title: "Reset Password",
        reset_subtitle: "Enter the 6-digit code and your new password.",
        forgot_link: "Forgot Password?",
        submit_forgot: "Send Reset Code",
        submit_reset: "Save New Password",
        new_password: "New Password",
      };

  // ── Verification code screen ────────────────────────────────────────
  if (step === "verify" || step === "reset_verify") {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-12rem)] px-4">
        <div className="w-full max-w-md animate-fade-up">
          {/* Brand */}
          <div className="flex flex-col items-center mb-8">
            <div className="relative inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500/20 to-rose-700/10 border border-rose-400/20 mb-6">
              <Mail className="h-7 w-7 text-rose-300" />
              <span className="absolute inset-0 rounded-2xl bg-rose-500/20 blur-xl opacity-60" />
            </div>
            <h1 className="font-heading text-2xl sm:text-3xl font-light tracking-tight text-center">
              {step === "verify" ? i.verify_title : i.reset_title}
            </h1>
            <p className="text-sm text-zinc-400 mt-2 text-center max-w-xs">
              {step === "verify" ? i.verify_subtitle : i.reset_subtitle}
            </p>
            {step === "verify" && <p className="text-sm text-white font-medium mt-1">{email}</p>}
          </div>

          {/* Code Card */}
          <div className="glass-strong rounded-3xl p-6 sm:p-8">
            {/* 6-digit code input */}
            <div className="flex justify-center gap-2 sm:gap-3 mb-6">
              {codeDigits.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => (codeRefs.current[idx] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleCodeChange(idx, e.target.value)}
                  onKeyDown={(e) => handleCodeKeyDown(idx, e)}
                  onPaste={idx === 0 ? handleCodePaste : undefined}
                  data-testid={`verify-digit-${idx}`}
                  className={`w-12 h-14 sm:w-14 sm:h-16 text-center text-2xl font-mono font-bold rounded-xl border bg-white/[0.04] text-white focus:outline-none transition-all duration-200 ${
                    digit
                      ? "border-rose-400/50 shadow-[0_0_12px_rgba(244,63,94,0.15)]"
                      : "border-white/10 focus:border-rose-400/50 focus:ring-1 focus:ring-rose-400/30"
                  }`}
                  disabled={busy}
                />
              ))}
            </div>

            {/* New Password input (only for reset_verify) */}
            {step === "reset_verify" && (
              <div className="mb-6">
                <label className="block text-xs uppercase tracking-wider text-zinc-400 mb-1.5 font-medium text-center">
                  {i.new_password}
                </label>
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 pr-11 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-rose-400/50 focus:ring-1 focus:ring-rose-400/30 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
                  >
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300 mb-4 text-center" data-testid="verify-error">
                {error}
              </div>
            )}

            {/* Verify button */}
            <button
              type="button"
              onClick={() => step === "verify" ? handleVerify(codeDigits.join("")) : handleResetVerify(codeDigits.join(""))}
              disabled={busy || codeDigits.join("").length < 6 || (step === "reset_verify" && password.length < 6)}
              data-testid="verify-submit"
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-white text-black px-5 py-3 text-sm font-semibold tracking-wide hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {step === "verify" ? i.verify_btn : i.submit_reset}
            </button>

            {/* Resend + Back */}
            <div className="mt-5 flex items-center justify-between">
              <button
                type="button"
                onClick={() => { resetForm(); setTab("register"); }}
                className="text-sm text-zinc-400 hover:text-white flex items-center gap-1.5 transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                {i.back}
              </button>

              <button
                type="button"
                onClick={handleResend}
                disabled={resendCooldown > 0 || busy}
                data-testid="verify-resend"
                className="text-sm text-zinc-400 hover:text-white flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${busy ? "animate-spin" : ""}`} />
                {resendCooldown > 0
                  ? `${i.resend_cooldown} ${resendCooldown}s`
                  : i.resend}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Login / Register form ───────────────────────────────────────────
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-12rem)] px-4">
      <div className="w-full max-w-md animate-fade-up">
        {/* Brand */}
        <div className="flex flex-col items-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2.5 group mb-6">
            <span className="relative inline-flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-rose-500/30 to-rose-700/10 border border-rose-400/30">
              <Waves className="h-5 w-5 text-rose-300 group-hover:text-white transition-colors" />
              <span className="absolute inset-0 rounded-full bg-rose-500/30 blur-md opacity-50" />
            </span>
            <p className="font-heading text-2xl font-semibold tracking-tight">SADA</p>
          </Link>
          <h1 className="font-heading text-2xl sm:text-3xl font-light tracking-tight text-center">
            {tab === "login" ? i.login_title : tab === "register" ? i.register_title : i.forgot_title}
          </h1>
          <p className="text-sm text-zinc-400 mt-2 text-center">
            {tab === "login" ? i.login_subtitle : tab === "register" ? i.register_subtitle : i.forgot_subtitle}
          </p>
        </div>

        {/* Card */}
        <div className="glass-strong rounded-3xl p-6 sm:p-8">
          {/* Tab Switcher */}
          {tab !== "forgot" && (
            <div className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] p-1 w-full mb-6">
              <button
                type="button"
                onClick={() => switchTab("login")}
                data-testid="auth-tab-login"
                className={`flex-1 text-xs uppercase tracking-wider px-4 py-2.5 rounded-full transition-colors font-medium ${
                  tab === "login"
                    ? "bg-white/10 text-white border border-white/15"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                {i.tab_login}
              </button>
              <button
                type="button"
                onClick={() => switchTab("register")}
                data-testid="auth-tab-register"
                className={`flex-1 text-xs uppercase tracking-wider px-4 py-2.5 rounded-full transition-colors font-medium ${
                  tab === "register"
                    ? "bg-white/10 text-white border border-white/15"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                {i.tab_register}
              </button>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label htmlFor="auth-email" className="block text-xs uppercase tracking-wider text-zinc-400 mb-1.5 font-medium">
                {i.email_label}
              </label>
              <input
                id="auth-email"
                data-testid="auth-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                placeholder="you@example.com"
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-rose-400/50 focus:ring-1 focus:ring-rose-400/30 transition-colors"
              />
            </div>

            {/* Username — register only */}
            {tab === "register" && (
              <div>
                <label htmlFor="auth-username" className="block text-xs uppercase tracking-wider text-zinc-400 mb-1.5 font-medium">
                  {i.username}
                </label>
                <input
                  id="auth-username"
                  data-testid="auth-username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  placeholder="johndoe"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-rose-400/50 focus:ring-1 focus:ring-rose-400/30 transition-colors"
                />
              </div>
            )}

            {/* Password */}
            {tab !== "forgot" && (
              <div>
                <label htmlFor="auth-password" className="block text-xs uppercase tracking-wider text-zinc-400 mb-1.5 font-medium">
                  {i.password}
                </label>
                <div className="relative">
                  <input
                    id="auth-password"
                    data-testid="auth-password"
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete={tab === "register" ? "new-password" : "current-password"}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 pr-11 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-rose-400/50 focus:ring-1 focus:ring-rose-400/30 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
                    aria-label="Toggle password visibility"
                    tabIndex={-1}
                  >
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {tab === "login" && (
                  <div className="mt-2 text-right">
                    <button
                      type="button"
                      onClick={() => switchTab("forgot")}
                      className="text-xs text-rose-300 hover:text-white transition-colors"
                    >
                      {i.forgot_link}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Confirm Password — register only */}
            {tab === "register" && (
              <div>
                <label htmlFor="auth-confirm-pw" className="block text-xs uppercase tracking-wider text-zinc-400 mb-1.5 font-medium">
                  {i.confirm_pw}
                </label>
                <input
                  id="auth-confirm-pw"
                  data-testid="auth-confirm-pw"
                  type={showPw ? "text" : "password"}
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-rose-400/50 focus:ring-1 focus:ring-rose-400/30 transition-colors"
                />
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300" data-testid="auth-error">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={busy}
              data-testid="auth-submit"
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-white text-black px-5 py-3 text-sm font-semibold tracking-wide hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {tab === "login" ? i.submit_login : tab === "register" ? i.submit_register : i.submit_forgot}
            </button>
          </form>

          {/* Switch link */}
          <p className="mt-5 text-center text-sm text-zinc-400">
            {tab === "login" ? i.or_register : tab === "register" ? i.or_login : ""}
            {tab === "forgot" ? (
              <button
                type="button"
                onClick={() => switchTab("login")}
                className="text-zinc-400 hover:text-white transition-colors font-medium flex items-center gap-1 mx-auto"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                {i.back}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => switchTab(tab === "login" ? "register" : "login")}
                className="text-rose-300 hover:text-white transition-colors font-medium ml-1"
              >
                {tab === "login" ? i.switch_register : i.switch_login}
              </button>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
