import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

const client = axios.create({
  baseURL: "https://aryaazhar-backend.hf.space/api",
  timeout: 30000,
});

// ── Attach JWT token to every request ────────────────────────────────────
client.interceptors.request.use((config) => {
  const token = localStorage.getItem("sada_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Auto-logout on 401 ──────────────────────────────────────────────────
client.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("sada_token");
      localStorage.removeItem("sada_user");
      // Redirect to login if not already there
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  }
);

// ── Auth API ─────────────────────────────────────────────────────────────
export const registerUser = async ({ email, username, password }) => {
  const { data } = await client.post("/auth/register", { email, username, password });
  return data;
};

export const loginUser = async ({ email, password }) => {
  const { data } = await client.post("/auth/login", { email, password });
  return data;
};

export const getMe = async () => {
  const { data } = await client.get("/auth/me");
  return data;
};

export const verifyCode = async ({ email, code }) => {
  const { data } = await client.post("/auth/verify", { email, code });
  return data;
};

export const resendCode = async ({ email }) => {
  const { data } = await client.post("/auth/resend", { email });
  return data;
};

export const forgotPasswordApi = async ({ email }) => {
  const { data } = await client.post("/auth/forgot-password", { email });
  return data;
};

export const resetPasswordApi = async ({ email, code, new_password }) => {
  const { data } = await client.post("/auth/reset-password", { email, code, new_password });
  return data;
};

// ── Detection API ────────────────────────────────────────────────────────
export const detectAudio = async ({ file, filename, durationSeconds, source, sizeBytes, mimeType }) => {
  const form = new FormData();
  form.append("file", file, filename || file.name);
  if (durationSeconds) form.append("duration_seconds", String(durationSeconds));
  if (source) form.append("source", source);
  const { data } = await client.post("/detect", form, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 120000,
  });
  return data;
};

export const getHistory = async (limit = 50, label) => {
  const params = { limit };
  if (label) params.label = label;
  const { data } = await client.get("/history", { params });
  return data;
};

export const getDetection = async (id) => {
  const { data } = await client.get(`/history/${id}`);
  return data;
};

export const deleteDetection = async (id) => {
  const { data } = await client.delete(`/history/${id}`);
  return data;
};

export const clearHistory = async () => {
  const { data } = await client.delete("/history");
  return data;
};

export const getStats = async () => {
  const { data } = await client.get("/stats");
  return data;
};

export default client;
