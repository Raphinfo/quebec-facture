import ThemeToggle from "./ThemeToggle";
export default function DashboardHeader({
  userName = "Entrepreneur",
}: {
  userName?: string;
}) {
  return (
    <header className="workspace-header">
      <div>
        <span className="eyebrow">VOTRE ESPACE</span>
        <h1>Bonjour, {userName}.</h1>
        <p>Retrouvez vos documents et votre activité.</p>
      </div>
      <ThemeToggle />
    </header>
  );
}
