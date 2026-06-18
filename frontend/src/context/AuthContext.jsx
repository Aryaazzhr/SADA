import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { loginUser, registerUser, getMe, verifyCode as verifyCodeApi, resendCode as resendCodeApi, forgotPasswordApi, resetPasswordApi } from "../lib/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem("sada_token") || null);
  const [loading, setLoading] = useState(true); // true while checking stored token

  // On mount — verify stored token
  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    getMe()
      .then((u) => {
        setUser(u);
      })
      .catch(() => {
        // Token expired / invalid
        localStorage.removeItem("sada_token");
        localStorage.removeItem("sada_user");
        setToken(null);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const login = useCallback(async ({ email, password }) => {
    const data = await loginUser({ email, password });
    localStorage.setItem("sada_token", data.access_token);
    localStorage.setItem("sada_user", JSON.stringify(data.user));
    setToken(data.access_token);
    setUser(data.user);
    return data;
  }, []);

  const register = useCallback(async ({ email, username, password }) => {
    // Now returns { message, email } — no token yet (pending verification)
    const data = await registerUser({ email, username, password });
    return data;
  }, []);

  const verify = useCallback(async ({ email, code }) => {
    // Returns token + user after successful verification
    const data = await verifyCodeApi({ email, code });
    localStorage.setItem("sada_token", data.access_token);
    localStorage.setItem("sada_user", JSON.stringify(data.user));
    setToken(data.access_token);
    setUser(data.user);
    return data;
  }, []);

  const resend = useCallback(async ({ email }) => {
    const data = await resendCodeApi({ email });
    return data;
  }, []);

  const forgotPassword = useCallback(async ({ email }) => {
    const data = await forgotPasswordApi({ email });
    return data;
  }, []);

  const resetPassword = useCallback(async ({ email, code, new_password }) => {
    const data = await resetPasswordApi({ email, code, new_password });
    return data;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("sada_token");
    localStorage.removeItem("sada_user");
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      token,
      isAuthenticated: !!user,
      loading,
      login,
      register,
      verify,
      resend,
      forgotPassword,
      resetPassword,
      logout,
    }),
    [user, token, loading, login, register, verify, resend, forgotPassword, resetPassword, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider/>");
  return ctx;
};
