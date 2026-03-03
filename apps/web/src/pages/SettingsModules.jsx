import React, { useEffect, useState } from "react";
import { settingsService } from "../api/settings.service.js";
import { Card, CardBody, CardHeader } from "../components/ui/Card.jsx";
import Button from "../components/ui/Button.jsx";
import { useToast } from "../components/ui/ToastProvider.jsx";
import { useAuth } from "../auth/AuthProvider.jsx";

export default function SettingsModules() {
  const toast = useToast();
  const auth = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modules, setModules] = useState([]);

  async function load() {
    setLoading(true);
    try {
      const rows = await settingsService.getModules();
      setModules(rows || []);
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to load modules");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function toggle(module_key) {
    setModules((rows) => rows.map((m) => (
      m.module_key === module_key ? { ...m, enabled: Number(m.enabled) ? 0 : 1 } : m
    )));
  }

  async function save() {
    setSaving(true);
    try {
      await settingsService.putModules({
        modules: modules.map((m) => ({ module_key: m.module_key, enabled: Number(m.enabled) ? 1 : 0 })),
      });
      await auth.refreshModules();
      toast.success("Modules updated");
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to update modules");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title="Module Configuration" right={<Button onClick={save} disabled={saving}>{saving ? "Saving..." : "Save Changes"}</Button>} />
        <CardBody>
          {loading ? (
            <div className="text-sm text-slate-500">Loading...</div>
          ) : (
            <div className="space-y-3">
              {modules.map((m) => (
                <label key={m.module_key} className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
                  <div>
                    <div className="font-medium text-slate-900">{m.name || m.module_key}</div>
                    <div className="text-xs text-slate-500">{m.module_key} {Number(m.is_core) ? "• Core" : ""}</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={!!Number(m.enabled)}
                    disabled={!!Number(m.is_core)}
                    onChange={() => toggle(m.module_key)}
                  />
                </label>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
