import { api } from "./http.js";
import { endpoints } from "./endpoints.js";

export const settingsService = {
  getOrg() {
    return api.get(endpoints.settingsOrg).then((r) => r.data);
  },
  putOrg(payload) {
    return api.put(endpoints.settingsOrg, payload).then((r) => r.data);
  },
  getBranding() {
    return api.get(endpoints.settingsBranding).then((r) => r.data);
  },
  putBranding(payload) {
    return api.put(endpoints.settingsBranding, payload).then((r) => r.data);
  },
  getModules() {
    return api.get(endpoints.settingsModules).then((r) => r.data);
  },
  putModules(payload) {
    return api.put(endpoints.settingsModules, payload).then((r) => r.data);
  },
  getNumberSeries() {
    return api.get(endpoints.settingsNumberSeries).then((r) => r.data);
  },
  putNumberSeries(payload) {
    return api.put(endpoints.settingsNumberSeries, payload).then((r) => r.data);
  },
};
