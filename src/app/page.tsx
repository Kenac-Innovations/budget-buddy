import { AdvisorScreen } from "@/components/advisor/advisor-screen";

export default function Page() {
  return <AdvisorScreen demo={process.env.ADVISOR_MODE !== "live"} />;
}
