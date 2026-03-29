"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  LayoutDashboard,
  TrendingUp,
  Tags,
  CreditCard,
  Landmark,
  Settings,
} from "lucide-react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useState } from "react";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/renda", label: "Renda", icon: TrendingUp },
  { href: "/categorias", label: "Categorias", icon: Tags },
  { href: "/lancamentos", label: "Lançamentos", icon: CreditCard },
  { href: "/contas", label: "Contas", icon: Landmark },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
];

function NavItem({ href, label, Icon, active, monthQuery }: { href: string; label: string; Icon: React.ElementType; active: boolean; monthQuery: string }) {
  const [hovered, setHovered] = useState(false);
  const fullHref = monthQuery ? `${href}?${monthQuery}` : href;
  return (
    <Link
      href={fullHref}
      className="flex items-center gap-3 px-5 py-2.5 text-sm transition-all"
      style={{ backgroundColor: active ? "rgba(37,99,235,0.15)" : hovered ? "var(--bg-elevated)" : "transparent" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Icon size={16} style={{ color: "var(--color-primary)", flexShrink: 0 }} />
      <span style={{ color: "var(--color-text)", fontWeight: active ? 600 : 400 }}>{label}</span>
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const mes = searchParams.get("mes");
  const ano = searchParams.get("ano");
  const monthQuery = mes && ano ? `mes=${mes}&ano=${ano}` : mes ? `mes=${mes}` : ano ? `ano=${ano}` : "";

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
            <NavItem key={href} href={href} label={label} Icon={Icon} active={active} monthQuery={monthQuery} />
          );
        })}
      </nav>

      <div
        className="flex items-center justify-end px-5 py-3"
        style={{ borderTop: "1px solid var(--bg-border)" }}
      >
        <ThemeToggle />
      </div>
    </aside>
  );
}
