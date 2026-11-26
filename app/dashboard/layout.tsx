import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/session";
import Sidebar from "@/components/Sidebar";
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await getSessionUserId())) redirect("/login");
  return (
    <div className="workspace">
      <Sidebar />
      <div className="workspace-main">{children}</div>
    </div>
  );
}
