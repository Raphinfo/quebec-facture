"use client";
import { useEffect, useState } from "react";
export default function ThemeToggle() {
  const [theme, setTheme] = useState("system");
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      let saved = "system";
      try {
        saved = localStorage.getItem("theme") || "system";
        if (!["light", "dark", "system"].includes(saved)) saved = "system";
      } catch {}
      setTheme(saved);
      document.documentElement.dataset.theme =
        saved === "system" ? (media.matches ? "dark" : "light") : saved;
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);
  function change(value: string) {
    setTheme(value);
    try {
      localStorage.setItem("theme", value);
    } catch {}
    document.documentElement.dataset.theme =
      value === "system"
        ? window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light"
        : value;
  }
  return (
    <label className="theme-select">
      <span className="sr-only">Thème d’affichage</span>
      <select value={theme} onChange={(e) => change(e.target.value)}>
        <option value="system">Système</option>
        <option value="light">Clair</option>
        <option value="dark">Sombre</option>
      </select>
    </label>
  );
}
