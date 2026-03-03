import React, { useEffect, useState } from "react";
import { settingsService } from "../api/settings.service.js";
import { Card, CardBody, CardHeader } from "../components/ui/Card.jsx";
import Input from "../components/ui/Input.jsx";
import Button from "../components/ui/Button.jsx";
import { useToast } from "../components/ui/ToastProvider.jsx";

function rowToMap(rows = []) {
  const map = {};
  rows.forEach((r) => {
    map[r.setting_key] = r.setting_value_json;
  });
  return map;
}

export default function SettingsOrg() {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    expiry_alert_days: 60,
    reorder_rule: "AUTO",
    invoice_footer: "",
    payment_upi_enabled: 1,
    payment_card_enabled: 1,
    payment_cash_enabled: 1,
  });

  async function load() {
    setLoading(true);
    try {
      const rows = await settingsService.getOrg();
      const map = rowToMap(rows || []);
      setForm({
        expiry_alert_days: Number(map.expiry_alert_days ?? 60),
        reorder_rule: String(map.reorder_rule ?? "AUTO"),
        invoice_footer: String(map.invoice_footer ?? ""),
        payment_upi_enabled: Number(map.payment_upi_enabled ?? 1),
        payment_card_enabled: Number(map.payment_card_enabled ?? 1),
        payment_cash_enabled: Number(map.payment_cash_enabled ?? 1),
      });
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to load organization settings");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function save() {
    setSaving(true);
    try {
      await settingsService.putOrg({
        settings: [
          { setting_key: "expiry_alert_days", setting_value_json: Number(form.expiry_alert_days) },
          { setting_key: "reorder_rule", setting_value_json: form.reorder_rule },
          { setting_key: "invoice_footer", setting_value_json: form.invoice_footer },
          { setting_key: "payment_upi_enabled", setting_value_json: Number(form.payment_upi_enabled) },
          { setting_key: "payment_card_enabled", setting_value_json: Number(form.payment_card_enabled) },
          { setting_key: "payment_cash_enabled", setting_value_json: Number(form.payment_cash_enabled) },
        ],
      });
      toast.success("Organization settings updated");
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to update organization settings");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title="Organization Settings" right={<Button onClick={save} disabled={saving}>{saving ? "Saving..." : "Save Settings"}</Button>} />
        <CardBody>
          {loading ? <div className="text-sm text-slate-500">Loading...</div> : (
            <div className="grid gap-3 md:grid-cols-2">
              <Input label="Expiry Alert Days" type="number" value={form.expiry_alert_days} onChange={(e) => setForm((f) => ({ ...f, expiry_alert_days: e.target.value }))} />
              <Input label="Reorder Rule" value={form.reorder_rule} onChange={(e) => setForm((f) => ({ ...f, reorder_rule: e.target.value }))} />
              <div className="md:col-span-2">
                <Input label="Invoice Footer" value={form.invoice_footer} onChange={(e) => setForm((f) => ({ ...f, invoice_footer: e.target.value }))} />
              </div>
              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={!!Number(form.payment_upi_enabled)} onChange={(e) => setForm((f) => ({ ...f, payment_upi_enabled: e.target.checked ? 1 : 0 }))} />
                UPI Enabled
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={!!Number(form.payment_card_enabled)} onChange={(e) => setForm((f) => ({ ...f, payment_card_enabled: e.target.checked ? 1 : 0 }))} />
                Card Enabled
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={!!Number(form.payment_cash_enabled)} onChange={(e) => setForm((f) => ({ ...f, payment_cash_enabled: e.target.checked ? 1 : 0 }))} />
                Cash Enabled
              </label>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
