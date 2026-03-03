import React, { useEffect, useState } from "react";
import { settingsService } from "../api/settings.service.js";
import { Card, CardBody, CardHeader } from "../components/ui/Card.jsx";
import Input from "../components/ui/Input.jsx";
import Button from "../components/ui/Button.jsx";
import { useToast } from "../components/ui/ToastProvider.jsx";

export default function SettingsBranding() {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    app_name: "",
    logo_url: "",
    primary_color: "",
    secondary_color: "",
    login_bg_url: "",
    support_phone: "",
    terms_url: "",
  });

  async function load() {
    setLoading(true);
    try {
      const d = (await settingsService.getBranding()) || {};
      setForm({
        app_name: d.app_name || "",
        logo_url: d.logo_url || "",
        primary_color: d.primary_color || "",
        secondary_color: d.secondary_color || "",
        login_bg_url: d.login_bg_url || "",
        support_phone: d.support_phone || "",
        terms_url: d.terms_url || "",
      });
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to load branding");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function save() {
    setSaving(true);
    try {
      await settingsService.putBranding({
        app_name: form.app_name,
        logo_url: form.logo_url || null,
        primary_color: form.primary_color || null,
        secondary_color: form.secondary_color || null,
        login_bg_url: form.login_bg_url || null,
        support_phone: form.support_phone || null,
        terms_url: form.terms_url || null,
      });
      toast.success("Branding updated");
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to update branding");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title="Branding" right={<Button onClick={save} disabled={saving}>{saving ? "Saving..." : "Save Branding"}</Button>} />
        <CardBody>
          {loading ? <div className="text-sm text-slate-500">Loading...</div> : (
            <div className="grid gap-3 md:grid-cols-2">
              <Input label="App Name" value={form.app_name} onChange={(e) => setForm((f) => ({ ...f, app_name: e.target.value }))} />
              <Input label="Logo URL" value={form.logo_url} onChange={(e) => setForm((f) => ({ ...f, logo_url: e.target.value }))} />
              <Input label="Primary Color" placeholder="#0f172a" value={form.primary_color} onChange={(e) => setForm((f) => ({ ...f, primary_color: e.target.value }))} />
              <Input label="Secondary Color" placeholder="#334155" value={form.secondary_color} onChange={(e) => setForm((f) => ({ ...f, secondary_color: e.target.value }))} />
              <Input label="Login Background URL" value={form.login_bg_url} onChange={(e) => setForm((f) => ({ ...f, login_bg_url: e.target.value }))} />
              <Input label="Support Phone" value={form.support_phone} onChange={(e) => setForm((f) => ({ ...f, support_phone: e.target.value }))} />
              <div className="md:col-span-2">
                <Input label="Terms URL" value={form.terms_url} onChange={(e) => setForm((f) => ({ ...f, terms_url: e.target.value }))} />
              </div>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
