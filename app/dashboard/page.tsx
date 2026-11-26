import { Suspense } from "react";
import DashboardWorkspace from "@/components/DashboardWorkspace";
export default function Page() {
  return (
    <Suspense fallback={<p>Chargement de votre espace…</p>}>
      <DashboardWorkspace />
    </Suspense>
  );
}
