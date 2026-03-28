"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  TrendingUp,
  Tags,
  CreditCard,
  Landmark,
  PieChart,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/renda", label: "Renda", icon: TrendingUp },
  { href: "/categorias", label: "Categorias", icon: Tags },
  { href: "/lancamentos", label: "Lançamentos", icon: CreditCard },
  { href: "/contas", label: "Contas", icon: Landmark },
  { href: "/planejamento", label: "Planejamento", icon: PieChart },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="flex flex-col shrink-0 h-full"
      style={{
        width: "var(--sidebar-width)",
        backgroundColor: "var(--bg-surface)",
        borderRight: "1px solid var(--bg-border)",
      }}
    >
      <div
        className="flex items-center px-5 py-4 font-bold text-base"
        style={{ borderBottom: "1px solid var(--bg-border)" }}
      >
        <span style={{ color: "var(--color-primary)" }}>💰</span>
        <span className="ml-2" style={{ color: "var(--color-text)" }}>
          Financeiro
        </span>
      </div>

      <nav className="flex-1 py-3 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-5 py-2.5 text-sm transition-colors",
                active
                  ? "font-medium"
                  : "hover:opacity-80"
              )}
              style={{
                color: active ? "var(--color-primary)" : "var(--color-text-muted)",
                backgroundColor: active ? "var(--bg-elevated)" : "transparent",
              }}
            >
              <Icon size={16} />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
