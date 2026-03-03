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

export function AuthProvider({ children }) {
  const [state, setState] = useState(() => (
    loadStored() || { user: null, access_token: null, refresh_token: null, modules: [] }
  ));

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

useEffect(() => {
  const handler = (e) => {
    const next = e.detail;
    if (!next) return;
    setState((s) => ({
      user: next.user ?? s.user,
      access_token: next.access_token ?? s.access_token,
      refresh_token: next.refresh_token ?? s.refresh_token,
      modules: next.modules ?? s.modules ?? [],
    }));
  };
  window.addEventListener("vx_auth_update", handler);
  return () => window.removeEventListener("vx_auth_update", handler);
}, []);

  useEffect(() => {
    let mounted = true;
    async function hydrateAuth() {
      if (!state.access_token) return;
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
        setState((s) => ({ ...s, modules: modulesResp.data || [] }));
      } catch {}
    }
    hydrateAuth();
    return () => { mounted = false; };
  }, [state.access_token]);

  const value = useMemo(() => ({
    user: state.user,
    access_token: state.access_token,
    refresh_token: state.refresh_token,
    isAuthed: !!state.access_token,
    async login(email, password) {
      const res = await api.post("/api/auth/login", { email, password });
      setState({
        user: res.data.user,
        access_token: res.data.access_token,
        refresh_token: res.data.refresh_token,
        modules: [],
      });
      return res.data.user;
    },
    async logout() {
      try {
        if (state.refresh_token) {
          await api.post("/api/auth/logout", { refresh_token: state.refresh_token });
        }
      } catch {}
      setState({ user: null, access_token: null, refresh_token: null, modules: [] });
    },
    setTokens({ access_token, refresh_token }) {
      setState((s) => ({ ...s, access_token: access_token ?? s.access_token, refresh_token: refresh_token ?? s.refresh_token }));
    },
    can(perm) {
      return !!state.user?.perms?.includes(perm);
    },
    canAny(perms = []) {
      return perms.some((p) => state.user?.perms?.includes(p));
    },
    isModuleEnabled(moduleKey) {
      const m = (state.modules || []).find((x) => x.module_key === moduleKey);
      if (!m) return true;
      return Number(m.enabled) === 1;
    },
    async refreshModules() {
      const modulesResp = await api.get(endpoints.settingsModules);
      setState((s) => ({ ...s, modules: modulesResp.data || [] }));
      return modulesResp.data || [];
    },
  }), [state.user, state.access_token, state.refresh_token, state.modules]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
