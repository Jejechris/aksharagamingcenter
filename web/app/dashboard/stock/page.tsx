import { redirect } from "next/navigation";

export default function LegacyStockRedirectPage() {
  redirect("/dashboard/stock-sentry");
}
