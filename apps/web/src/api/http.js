import axios from "axios";

const baseURL = import.meta.env.VITE_API_BASE || "";
const STORAGE_KEY = "vx_medical_auth";

function getStored() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"); } catch { return null; }
}

function setStored(patch) {
  const cur = getStored() || {};
  const next = { ...cur, ...patch };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent("vx_auth_update", { detail: next }));
}

function clearStoredAndRedirect() {
  setStored({ user: null, access_token: null, refresh_token: null, modules: [] });
  if (typeof window !== "undefined" && window.location.pathname !== "/login") {
    window.location.assign("/login");
  }
}

export const api = axios.create({
  baseURL,
  timeout: 20000,
});

const API_ERROR_DEDUP_MS = 2000;
const recentApiErrors = new Map();

function normalizeUrl(config = {}) {
  const raw = config.url || "";
  const base = config.baseURL || baseURL;
  try {
    return new URL(raw, base).pathname;
  } catch {
    return raw;
  }
}

function markAndCheckDuplicate(config = {}, status = "ERR") {
  const method = String(config.method || "GET").toUpperCase();
  if (method === "OPTIONS") return true;
  const key = `${method}:${normalizeUrl(config)}:${status}`;
  const now = Date.now();
  const prev = recentApiErrors.get(key) || 0;
  recentApiErrors.set(key, now);
  return now - prev < API_ERROR_DEDUP_MS;
}

export function getApiErrorMessage(error, fallback = "Request failed") {
  if (!error) return fallback;
  if (error.__suppressToast) return null;
  return error.response?.data?.message || error.message || fallback;
}

api.interceptors.request.use((config) => {
  const st = getStored();
  if (st?.access_token) {
    config.headers.Authorization = `Bearer ${st.access_token}`;
  }
  return config;
});

let refreshing = false;
let refreshQueue = [];

async function runQueue(err, token) {
  refreshQueue.forEach(({ resolve, reject }) => {
    if (err) reject(err);
    else resolve(token);
  });
  refreshQueue = [];
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;
    const path = normalizeUrl(original || {});
    const isDuplicate = markAndCheckDuplicate(original, status ?? "ERR");
    error.__suppressToast = !!isDuplicate;
    if (status === 404 && path.startsWith("/api/reports/")) {
      error.__suppressToast = true;
    }
    if (!original || original.__isRetry) throw error;
    if (original.__skipAuthRefresh) throw error;

    if (status !== 401) throw error;

    const authPath = normalizeUrl(original);
    if (authPath.startsWith("/api/auth/login") || authPath.startsWith("/api/auth/refresh") || authPath.startsWith("/api/auth/logout")) {
      throw error;
    }

    const st = getStored();
    if (!st?.refresh_token) {
      clearStoredAndRedirect();
      throw error;
    }

    if (refreshing) {
      return new Promise((resolve, reject) => {
        refreshQueue.push({ resolve, reject });
      }).then((token) => {
        original.__isRetry = true;
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      });
    }

    refreshing = true;
    try {
      const resp = await axios.post(`${baseURL}/api/auth/refresh`, { refresh_token: st.refresh_token }, { __skipAuthRefresh: true });
      const newAccess = resp.data.access_token;
      setStored({ access_token: newAccess });
      await runQueue(null, newAccess);
      original.__isRetry = true;
      original.headers.Authorization = `Bearer ${newAccess}`;
      return api(original);
    } catch (e) {
      await runQueue(e, null);
      clearStoredAndRedirect();
      throw e;
    } finally {
      refreshing = false;
    }
  }
);
