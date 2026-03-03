import { pool } from "../../db/pool.js";
import { withTx } from "../../db/tx.js";

export async function getOrgSettings(org_id) {
  const [rows] = await pool.execute(
    `SELECT setting_key, setting_value_json, updated_by, updated_at
     FROM org_settings
     WHERE org_id=?
     ORDER BY setting_key ASC`,
    [org_id]
  );
  return rows;
}

export async function putOrgSettings(org_id, user_id, settings) {
  return withTx(async (conn) => {
    for (const item of settings) {
      await conn.execute(
        `INSERT INTO org_settings (org_id, setting_key, setting_value_json, updated_by)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           setting_value_json=VALUES(setting_value_json),
           updated_by=VALUES(updated_by),
           updated_at=CURRENT_TIMESTAMP`,
        [org_id, item.setting_key, JSON.stringify(item.setting_value_json), user_id]
      );
    }
    return getOrgSettings(org_id);
  });
}

export async function getBranding(org_id) {
  const [rows] = await pool.execute(
    `SELECT org_id, app_name, logo_url, primary_color, secondary_color, login_bg_url, support_phone, terms_url, updated_at
     FROM org_branding
     WHERE org_id=?
     LIMIT 1`,
    [org_id]
  );
  return rows?.[0] || null;
}

export async function putBranding(org_id, input) {
  const existing = await getBranding(org_id);
  const payload = {
    app_name: input.app_name ?? existing?.app_name ?? "Vertex Medical Manager",
    logo_url: input.logo_url ?? existing?.logo_url ?? null,
    primary_color: input.primary_color ?? existing?.primary_color ?? null,
    secondary_color: input.secondary_color ?? existing?.secondary_color ?? null,
    login_bg_url: input.login_bg_url ?? existing?.login_bg_url ?? null,
    support_phone: input.support_phone ?? existing?.support_phone ?? null,
    terms_url: input.terms_url ?? existing?.terms_url ?? null,
  };

  await pool.execute(
    `INSERT INTO org_branding (org_id, app_name, logo_url, primary_color, secondary_color, login_bg_url, support_phone, terms_url)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       app_name=VALUES(app_name),
       logo_url=VALUES(logo_url),
       primary_color=VALUES(primary_color),
       secondary_color=VALUES(secondary_color),
       login_bg_url=VALUES(login_bg_url),
       support_phone=VALUES(support_phone),
       terms_url=VALUES(terms_url),
       updated_at=CURRENT_TIMESTAMP`,
    [
      org_id,
      payload.app_name,
      payload.logo_url,
      payload.primary_color,
      payload.secondary_color,
      payload.login_bg_url,
      payload.support_phone,
      payload.terms_url,
    ]
  );
  return getBranding(org_id);
}

export async function getOrgModules(org_id) {
  const [rows] = await pool.execute(
    `SELECT m.module_key, m.name, m.sort_order, m.is_core,
            COALESCE(om.enabled, m.is_core) AS enabled,
            om.updated_at
     FROM modules m
     LEFT JOIN org_modules om ON om.org_id=? AND om.module_key=m.module_key
     ORDER BY m.sort_order ASC, m.module_key ASC`,
    [org_id]
  );
  return rows;
}

export async function putOrgModules(org_id, modules) {
  return withTx(async (conn) => {
    for (const item of modules) {
      await conn.execute(
        `INSERT INTO org_modules (org_id, module_key, enabled)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE
           enabled=VALUES(enabled),
           updated_at=CURRENT_TIMESTAMP`,
        [org_id, item.module_key, item.enabled]
      );
    }
    return getOrgModules(org_id);
  });
}

export async function getNumberSeries(org_id) {
  const [rows] = await pool.execute(
    `SELECT org_id, series_key, prefix, next_no, padding, reset_rule, updated_at
     FROM number_series
     WHERE org_id=?
     ORDER BY series_key ASC`,
    [org_id]
  );
  return rows;
}

export async function putNumberSeries(org_id, series) {
  return withTx(async (conn) => {
    for (const item of series) {
      await conn.execute(
        `INSERT INTO number_series (org_id, series_key, prefix, next_no, padding, reset_rule)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           prefix=VALUES(prefix),
           next_no=VALUES(next_no),
           padding=VALUES(padding),
           reset_rule=VALUES(reset_rule),
           updated_at=CURRENT_TIMESTAMP`,
        [org_id, item.series_key, item.prefix, item.next_no, item.padding, item.reset_rule]
      );
    }
    return getNumberSeries(org_id);
  });
}
