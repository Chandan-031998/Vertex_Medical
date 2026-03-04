import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../api/http.js";
import { endpoints } from "../api/endpoints.js";

const AuthContext = createContext(null);

const STORAGE_KEY = "vx_medical_auth";

function loadStored() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
  } catch {
    return null;
  }
}

function writeStored(next) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {}
}

function normalizeModules(input) {
  if (Array.isArray(input)) {
    return input
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        if (item.module_key) {
          return { module_key: String(item.module_key), enabled: Number(item.enabled ?? 1) };
        }
        const entries = Object.entries(item);
        if (entries.length === 1) {
          const [moduleKey, enabled] = entries[0];
          return { module_key: String(moduleKey), enabled: Number(enabled ?? 1) };
        }
        return null;
      })
      .filter(Boolean);
  }

  if (input && typeof input === "object") {
    return Object.entries(input).map(([moduleKey, value]) => {
      if (value && typeof value === "object") {
        return { module_key: String(moduleKey), enabled: Number(value.enabled ?? 1) };
      }
      return { module_key: String(moduleKey), enabled: Number(value ?? 1) };
    });
  }

  return [];
}

export function AuthProvider({ children }) {
  const [state, setState] = useState(() => {
    const stored = loadStored() || { user: null, access_token: null, refresh_token: null, modules: [] };
    return { ...stored, modules: normalizeModules(stored.modules) };
  });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    writeStored(state);
  }, [state]);

  useEffect(() => {
    const handler = (e) => {
      const next = e.detail;
      if (!next) return;
      setState((s) => ({
        user: next.user ?? s.user,
        access_token: next.access_token ?? s.access_token,
        refresh_token: next.refresh_token ?? s.refresh_token,
        modules: normalizeModules(next.modules ?? s.modules ?? []),
      }));
    };
    window.addEventListener("vx_auth_update", handler);
    return () => window.removeEventListener("vx_auth_update", handler);
  }, []);

  useEffect(() => {
    let mounted = true;
    async function hydrateAuth() {
      if (!state.access_token) {
        if (mounted) setReady(true);
        return;
      }
      if (mounted) setReady(false);
      try {
        const meResp = await api.get(endpoints.authMe);
        if (!mounted) return;
        const me = meResp.data || {};
        setState((s) => ({
          ...s,
          user: {
            ...(s.user || {}),
            ...(me.user || {}),
            perms: me.perms || s.user?.perms || [],
            role_key: me.role_key || s.user?.role_key,
          },
        }));
      } catch {}

      try {
        const modulesResp = await api.get(endpoints.settingsModules);
        if (!mounted) return;
        setState((s) => ({ ...s, modules: normalizeModules(modulesResp.data || []) }));
      } catch {}
      if (mounted) setReady(true);
    }
    hydrateAuth();
    return () => { mounted = false; };
  }, [state.access_token]);

  const normalizedModules = useMemo(() => normalizeModules(state.modules), [state.modules]);

  const value = useMemo(() => ({
    ready,
    user: state.user,
    access_token: state.access_token,
    refresh_token: state.refresh_token,
    modules: normalizedModules,
    isAuthed: !!state.access_token,
    async login(email, password) {
      const res = await api.post("/api/auth/login", { email, password });
      const next = {
        user: res.data.user,
        access_token: res.data.access_token,
        refresh_token: res.data.refresh_token,
        modules: normalizeModules(res.data.modules || []),
      };
      writeStored(next);
      setState(next);
      return res.data.user;
    },
    async logout() {
      try {
        if (state.refresh_token) {
          await api.post("/api/auth/logout", { refresh_token: state.refresh_token });
        }
      } catch {}
      const next = { user: null, access_token: null, refresh_token: null, modules: [] };
      writeStored(next);
      setState(next);
    },
    setTokens({ access_token, refresh_token }) {
      setState((s) => {
        const next = { ...s, access_token: access_token ?? s.access_token, refresh_token: refresh_token ?? s.refresh_token };
        writeStored(next);
        return next;
      });
    },
    can(perm) {
      return !!state.user?.perms?.includes(perm);
    },
    canAny(perms = []) {
      return perms.some((p) => state.user?.perms?.includes(p));
    },
    isModuleEnabled(moduleKey) {
      if (!moduleKey) return true;
      const list = Array.isArray(normalizedModules) ? normalizedModules : [];
      const m = list.find((x) => x?.module_key === moduleKey);
      if (!m) return true;
      return Number(m.enabled) === 1;
    },
    async refreshModules() {
      const modulesResp = await api.get(endpoints.settingsModules);
      const normalized = normalizeModules(modulesResp.data || []);
      setState((s) => ({ ...s, modules: normalized }));
      return normalized;
    },
  }), [ready, state.user, state.access_token, state.refresh_token, normalizedModules]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
