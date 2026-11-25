import { redirect } from "next/navigation";

export default function RiskOfficerRedirectPage() {
  redirect("/dashboard/stock-sentry?tab=risk");
}
