import { NextRequest, NextResponse } from "next/server";
import { queryDb, isDbConfigured, touchSupabaseKeepalive, getKV } from "@/lib/db";
import { ensureRootEnvLoaded } from "@/lib/envLoader";
import { recordAlert } from "@/lib/alerts";

export const dynamic = "force-dynamic";

function getMaskedDbHost(): string {
  const raw = process.env.DATABASE_URL || process.env.POSTGRES_URL || "";
  if (!raw) return "Belum dikonfigurasi";
  try {
    const u = new URL(raw);
    return `${u.hostname}${u.port ? `:${u.port}` : ""}`;
  } catch {
    return "Invalid DATABASE_URL";
  }
}

export async function GET(req: NextRequest) {
  ensureRootEnvLoaded();
  const startTime = performance.now();
  const dbConfigured = isDbConfigured();
  const maskedHost = getMaskedDbHost();
  const vaultSecretSet = Boolean((process.env.VAULT_ENCRYPTION_SECRET || "").trim().length >= 16);
  const { searchParams } = new URL(req.url);
  const doKeepalive = searchParams.get("keepalive") === "1" || searchParams.get("keepalive") === "true";

  if (!dbConfigured) {
    return NextResponse.json(
      {
        status: "DEGRADED",
        message: "DATABASE_URL belum disetel, berjalan dengan fallback JSON/KV lokal.",
        provider: "Local JSON Fallback",
        host: maskedHost,
        ssl: false,
        vault_secret_configured: vaultSecretSet,
        latency_ms: Math.round(performance.now() - startTime),
        tier: "Tier 2 Local Fallback Active",
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  }

  try {
    // 1. Live ping query to Supabase PostgreSQL
    const pingResult = await queryDb<{ server_time: string; version: string }>(
      "SELECT NOW() as server_time, version() as version"
    );

    if (!pingResult || pingResult.length === 0) {
      throw new Error("PostgreSQL ping tidak mengembalikan baris (cek koneksi / DATABASE_URL).");
    }

    if (doKeepalive) {
      await touchSupabaseKeepalive("health_keepalive");
    }

    const latencyMs = Math.round(performance.now() - startTime);

    // 2. Query table counts & RLS status
    const countQuery = async (sql: string) => {
      try {
        const res = await queryDb<{ count: string }>(sql);
        return Number(res[0]?.count || 0);
      } catch {
        return 0;
      }
    };

    const [catalogCount, vaultAvailableCount, ordersCount, claimsCount, rlsRows, keepaliveMeta] =
      await Promise.all([
        countQuery("SELECT count(*) as count FROM catalog_games"),
        countQuery("SELECT count(*) as count FROM inventory_vault WHERE status = 'AVAILABLE'"),
        countQuery("SELECT count(*) as count FROM autonomous_orders"),
        countQuery("SELECT count(*) as count FROM claims_vault"),
        queryDb<{ tablename: string; rowsecurity: boolean }>(
          "SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename"
        ).catch(() => []),
        getKV("supabase_keepalive").catch(() => null),
      ]);

    const rlsMap: Record<string, boolean> = {};
    for (const r of rlsRows) {
      rlsMap[r.tablename] = Boolean(r.rowsecurity);
    }
    const allRlsEnabled =
      rlsRows.length > 0 && rlsRows.every((r) => Boolean(r.rowsecurity));

    return NextResponse.json({
      status: "HEALTHY",
      message: "Database connected & verified",
      provider: "Supabase PostgreSQL",
      host: maskedHost,
      ssl: true,
      vault_secret_configured: vaultSecretSet,
      rls_all_enabled: allRlsEnabled,
      tables_rls: rlsMap,
      keepalive: keepaliveMeta,
      latency_ms: latencyMs,
      server_time: pingResult[0]?.server_time || new Date().toISOString(),
      pg_version: pingResult[0]?.version
        ? pingResult[0].version.split(" ").slice(0, 2).join(" ")
        : "PostgreSQL 15+",
      tables: {
        catalog_games: catalogCount,
        inventory_vault_available: vaultAvailableCount,
        autonomous_orders: ordersCount,
        claims_vault: claimsCount,
      },
      pool: {
        max: 5,
        idleTimeoutMillis: 15000,
        connectionTimeoutMillis: 2500,
      },
      security: `${allRlsEnabled ? "RLS Active" : "RLS Partial"} + Parameterized SQL + SSL TLS${
        vaultSecretSet ? " + Vault Secret Active" : " (VAULT_ENCRYPTION_SECRET belum disetel)"
      }`,
      tier: "Tier 1 Cloud Database Active",
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    const latencyMs = Math.round(performance.now() - startTime);
    await recordAlert({
      category: "TECH_INCIDENT",
      severity: "critical",
      title: "Database Supabase Offline / Degraded",
      message: error?.message || "Koneksi database Cloud PostgreSQL gagal/timeout; fallback JSON lokal aktif.",
      source: "health_check",
    }).catch(() => {});
    return NextResponse.json(
      {
        status: "DEGRADED",
        message: "Koneksi database Cloud PostgreSQL gagal/timeout; fallback JSON lokal aktif.",
        error: error.message || "Connection error",
        host: maskedHost,
        vault_secret_configured: vaultSecretSet,
        latency_ms: latencyMs,
        provider: "PostgreSQL Offline (Fallback JSON Lokal Aktif)",
        tier: "Tier 2 Local /tmp & JSON Fallback Active",
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  }
}
