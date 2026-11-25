import { redirect } from "next/navigation";

export default function LegacyRiskRedirectPage() {
  redirect("/dashboard/stock-sentry?tab=risk");
}
