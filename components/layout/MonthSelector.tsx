"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback } from "react";

const MONTHS = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];

export function MonthSelector() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const now = new Date();
  const month = Number(searchParams.get("mes") ?? now.getMonth() + 1);
  const year = Number(searchParams.get("ano") ?? now.getFullYear());

  const navigate = useCallback(
    (m: number, y: number) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("mes", String(m));
      params.set("ano", String(y));
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  function prev() {
    if (month === 1) navigate(12, year - 1);
    else navigate(month - 1, year);
  }

  function next() {
    if (month === 12) navigate(1, year + 1);
    else navigate(month + 1, year);
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={prev}
        className="p-1 rounded transition-opacity hover:opacity-70"
        style={{ color: "var(--color-text-muted)" }}
      >
        <ChevronLeft size={18} />
      </button>
      <span className="text-sm font-semibold min-w-[140px] text-center" style={{ color: "var(--color-text)" }}>
        {MONTHS[month - 1]} {year}
      </span>
      <button
        onClick={next}
        className="p-1 rounded transition-opacity hover:opacity-70"
        style={{ color: "var(--color-text-muted)" }}
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );
}
