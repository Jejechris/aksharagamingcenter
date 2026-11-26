import fs from "fs";
import path from "path";
import os from "os";
import { getKV, setKV } from "@/lib/db";

export type AlertCategory =
  | "PRICE_SPIKE"
  | "DISCOUNT_ENDED"
  | "STOCK_OUT"
  | "AUTO_PAUSED"
  | "TECH_INCIDENT";

export type AlertSeverity = "critical" | "warning" | "info";

export interface SystemAlertItem {
  id: string;
  category: AlertCategory;
  severity: AlertSeverity;
  title: string;
  message: string;
  game_id?: string;
  game_title?: string;
  old_cogs_idr?: number;
  new_cogs_idr?: number;
  current_selling_price_idr?: number;
  recommended_selling_price_idr?: number;
  current_margin_pct?: number;
  auto_paused?: boolean;
  resolved: boolean;
  created_at: string;
  resolved_at?: string;
  source?: string;
}

const KV_KEY = "system_alerts";
const MAX_ALERTS = 100;
const DEDUPE_WINDOW_MS = 6 * 60 * 60 * 1000;

function getFallbackFilePath(): string {
  return path.resolve(os.tmpdir(), "akshara_system_alerts.json");
}

export async function readAlerts(): Promise<SystemAlertItem[]> {
  try {
    const kv = await getKV(KV_KEY);
    if (Array.isArray(kv)) return kv;
  } catch {}
  try {
    const p = getFallbackFilePath();
    if (fs.existsSync(p)) {
      const parsed = JSON.parse(fs.readFileSync(p, "utf-8"));
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

export async function writeAlerts(alerts: SystemAlertItem[]): Promise<void> {
  const trimmed = alerts.slice(0, MAX_ALERTS);
  await setKV(KV_KEY, trimmed).catch(() => {});
  try {
    fs.writeFileSync(getFallbackFilePath(), JSON.stringify(trimmed, null, 2), "utf-8");
  } catch {}
}

export async function recordAlert(
  input: Omit<SystemAlertItem, "id" | "resolved" | "created_at">
): Promise<SystemAlertItem> {
  const alerts = await readAlerts();
  const nowIso = new Date().toISOString();
  const dedupeKey = `${input.category}::${input.game_id || input.title}`;

  const existingIdx = alerts.findIndex((a) => {
    if (a.resolved) return false;
    const key = `${a.category}::${a.game_id || a.title}`;
    if (key !== dedupeKey) return false;
    const age = Date.now() - new Date(a.created_at).getTime();
    return age < DEDUPE_WINDOW_MS;
  });

  if (existingIdx !== -1) {
    const updated: SystemAlertItem = {
      ...alerts[existingIdx],
      ...input,
      created_at: nowIso,
    };
    alerts[existingIdx] = updated;
    await writeAlerts(alerts);
    return updated;
  }

  const created: SystemAlertItem = {
    ...input,
    id: `alert-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    resolved: false,
    created_at: nowIso,
  };

  alerts.unshift(created);
  await writeAlerts(alerts);
  return created;
}

export async function resolveAlert(id: string): Promise<boolean> {
  const alerts = await readAlerts();
  const idx = alerts.findIndex((a) => a.id === id);
  if (idx === -1) return false;
  alerts[idx] = {
    ...alerts[idx],
    resolved: true,
    resolved_at: new Date().toISOString(),
  };
  await writeAlerts(alerts);
  return true;
}

export async function resolveAlertsForGame(gameId: string): Promise<number> {
  const alerts = await readAlerts();
  const nowIso = new Date().toISOString();
  let count = 0;
  const next = alerts.map((a) => {
    if (!a.resolved && a.game_id === gameId) {
      count += 1;
      return { ...a, resolved: true, resolved_at: nowIso };
    }
    return a;
  });
  if (count > 0) await writeAlerts(next);
  return count;
}

export async function resolveAllAlerts(): Promise<number> {
  const alerts = await readAlerts();
  const nowIso = new Date().toISOString();
  let count = 0;
  const next = alerts.map((a) => {
    if (!a.resolved) {
      count += 1;
      return { ...a, resolved: true, resolved_at: nowIso };
    }
    return a;
  });
  if (count > 0) await writeAlerts(next);
  return count;
}
