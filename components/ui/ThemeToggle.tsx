"use client";

import { Sun, Moon } from "lucide-react";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const saved = localStorage.getItem("theme") as "dark" | "light" | null;
    if (saved) {
      setTheme(saved);
      document.documentElement.setAttribute("data-theme", saved);
    }
  }, []);

  function apply(next: "dark" | "light") {
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
  }

  return (
    <div
      className="flex rounded-lg overflow-hidden"
      style={{ border: "1px solid var(--bg-border)", width: "fit-content" }}
    >
      <button
        onClick={() => apply("light")}
        title="Modo Claro"
        className="flex items-center justify-center p-2 transition-all"
        style={{
          backgroundColor: theme === "light" ? "var(--color-primary)" : "var(--bg-elevated)",
          color: theme === "light" ? "#fff" : "var(--color-text-muted)",
          borderRight: "1px solid var(--bg-border)",
        }}
      >
        <Sun size={15} />
      </button>
      <button
        onClick={() => apply("dark")}
        title="Modo Escuro"
        className="flex items-center justify-center p-2 transition-all"
        style={{
          backgroundColor: theme === "dark" ? "var(--color-primary)" : "var(--bg-elevated)",
          color: theme === "dark" ? "#fff" : "var(--color-text-muted)",
        }}
      >
        <Moon size={15} />
      </button>
    </div>
  );
}
