import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const statusPath = path.resolve(process.cwd(), "..", "output", "radar_daemon_status.json");
const bundledStatusPath = path.resolve(process.cwd(), "data", "radar_daemon_status.json");

export async function GET() {
  try {
    const targetPath = fs.existsSync(statusPath) ? statusPath : fs.existsSync(bundledStatusPath) ? bundledStatusPath : null;

    if (targetPath) {
      const raw = fs.readFileSync(targetPath, "utf-8");
      const data = JSON.parse(raw);
      return NextResponse.json({
        status: "success",
        data: data
      });
    }

    return NextResponse.json({
      status: "idle",
      data: {
        status: "STANDBY",
        last_heartbeat: "Belum dimulai",
        interval_minutes: 5,
        games_monitored: 0,
        total_sellers_tracked: 0,
        health: "PENDING",
        summary: "Daemon siap dijalankan."
      }
    });
  } catch (error: any) {
    return NextResponse.json({ status: "error", message: error.message }, { status: 500 });
  }
}
