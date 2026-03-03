import axios from "axios";

const baseURL = import.meta.env.VITE_API_BASE || "http://localhost:4000";
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

export const api = axios.create({
  baseURL,
  timeout: 20000,
});

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
    if (!original || original.__isRetry) throw error;

    const status = error.response?.status;
    if (status !== 401) throw error;

    const st = getStored();
    if (!st?.refresh_token) throw error;

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
      const resp = await axios.post(`${baseURL}/api/auth/refresh`, { refresh_token: st.refresh_token });
      const newAccess = resp.data.access_token;
      setStored({ access_token: newAccess });
      await runQueue(null, newAccess);
      original.__isRetry = true;
      original.headers.Authorization = `Bearer ${newAccess}`;
      return api(original);
    } catch (e) {
      await runQueue(e, null);
      setStored({ user: null, access_token: null, refresh_token: null });
      throw e;
    } finally {
      refreshing = false;
    }
  }
);
