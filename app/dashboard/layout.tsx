import Sidebar from "@/components/Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="flex min-h-screen"
      style={{
        backgroundColor: "var(--background)",
        color: "var(--foreground)",
        transition: "background-color 0.25s ease, color 0.25s ease",
      }}
    >
      <Sidebar />

      <main
        className="flex-1 p-6 md:p-8 overflow-y-auto"
        style={{
          backgroundColor: "var(--background)",
          color: "var(--foreground)",
        }}
      >
        {children}
      </main>
    </div>
  );
}