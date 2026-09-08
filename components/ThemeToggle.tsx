"use client";

import { useEffect, useRef, useState } from "react";

type Theme = "light" | "dark" | "system";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const applyTheme = (selectedTheme: Theme) => {
    let resolvedTheme: "light" | "dark";

    if (selectedTheme === "system") {
      resolvedTheme = window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches
        ? "dark"
        : "light";
    } else {
      resolvedTheme = selectedTheme;
    }

    document.documentElement.setAttribute(
      "data-theme",
      resolvedTheme
    );
  };

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");

    const initialTheme: Theme =
      savedTheme === "light" ||
      savedTheme === "dark" ||
      savedTheme === "system"
        ? savedTheme
        : "system";

    setTheme(initialTheme);
    applyTheme(initialTheme);
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia(
      "(prefers-color-scheme: dark)"
    );

    const handleSystemThemeChange = () => {
      if (theme === "system") {
        applyTheme("system");
      }
    };

    mediaQuery.addEventListener(
      "change",
      handleSystemThemeChange
    );

    return () => {
      mediaQuery.removeEventListener(
        "change",
        handleSystemThemeChange
      );
    };
  }, [theme]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener(
      "mousedown",
      handleClickOutside
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
    };
  }, []);

  const changeTheme = (newTheme: Theme) => {
    setTheme(newTheme);

    localStorage.setItem(
      "theme",
      newTheme
    );

    applyTheme(newTheme);

    setOpen(false);
  };

  return (
    <div
      ref={menuRef}
      style={{
        position: "relative",
      }}
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "7px",
          padding: "8px 12px",
          borderRadius: "8px",
          border: "1px solid var(--border)",
          backgroundColor: "var(--surface)",
          color: "var(--foreground)",
          cursor: "pointer",
          fontSize: "13px",
          fontWeight: 600,
        }}
      >
        <span>🎨</span>
        <span>Thème</span>
        <span style={{ fontSize: "10px" }}>
          {open ? "▲" : "▼"}
        </span>
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            width: "170px",
            padding: "6px",
            backgroundColor: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            boxShadow:
              "0 8px 20px rgba(0,0,0,0.18)",
            zIndex: 1000,
          }}
        >
          <button
            type="button"
            onClick={() => changeTheme("light")}
            style={menuButtonStyle(theme === "light")}
          >
            ☀️ Clair
            {theme === "light" && (
              <span style={{ marginLeft: "auto" }}>
                ✓
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => changeTheme("dark")}
            style={menuButtonStyle(theme === "dark")}
          >
            🌙 Sombre
            {theme === "dark" && (
              <span style={{ marginLeft: "auto" }}>
                ✓
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => changeTheme("system")}
            style={menuButtonStyle(theme === "system")}
          >
            💻 Système
            {theme === "system" && (
              <span style={{ marginLeft: "auto" }}>
                ✓
              </span>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

function menuButtonStyle(active: boolean) {
  return {
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "9px 10px",
    border: "none",
    borderRadius: "6px",
    backgroundColor: active
      ? "var(--surface-soft)"
      : "transparent",
    color: "var(--foreground)",
    cursor: "pointer",
    textAlign: "left" as const,
    fontSize: "13px",
  };
}