"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Table, Thead, Tbody, Th, Td, TotalRow } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { formatCurrency, getMonthLabel } from "@/lib/utils";
import { CalendarCheck, Pencil } from "lucide-react";

interface Section { budget: number; actual: number; paid: number }

interface Props {
  income: Section;
  expenses: Section;
  lastUpdatedAt: string | null;
  monthId: string | null;
  month: number;
  year: number;
}

export function DashboardClient({ income, expenses, lastUpdatedAt, monthId, month, year }: Props) {
  const [updatedAt, setUpdatedAt] = useState(lastUpdatedAt);
  const [saving, setSaving] = useState(false);

  async function markUpdated() {
    setSaving(true);
    const now = new Date().toISOString();
    if (monthId) {
      await fetch(`/api/months/${monthId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lastUpdatedAt: now }) });
    }
    setUpdatedAt(now);
    setSaving(false);
  }

  const result = {
    budget: income.budget - expenses.budget,
    actual: income.actual - expenses.actual,
    paid: income.paid - expenses.paid,
  };

  function DiffCell({ value }: { value: number }) {
    const color = value > 0 ? "var(--color-success)" : value < 0 ? "var(--color-danger)" : "var(--color-text)";
    return <Td className="text-right font-semibold" style={{ color }}>{formatCurrency(value)}</Td>;
  }

  return (
    <>
      {/* Header com data de atualização */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--color-text)" }}>
            Dashboard — {getMonthLabel(month, year)}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <CalendarCheck size={14} style={{ color: "var(--color-text-muted)" }} />
            <span className="text-sm" style={{ color: "var(--color-text-muted)" }}>
              {updatedAt
                ? `Atualizado em ${new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(new Date(updatedAt))}`
                : "Nunca atualizado"}
            </span>
            <button onClick={markUpdated} disabled={saving} className="ml-1 hover:opacity-70" style={{ color: "var(--color-primary)" }}>
              <Pencil size={13} />
            </button>
          </div>
        </div>
        <Button variant="primary" onClick={markUpdated} disabled={saving}>
          {saving ? "Salvando..." : "Marcar como atualizado hoje"}
        </Button>
      </div>

      {/* Defasagem banner */}
      <div className="rounded-lg px-4 py-3 mb-6 text-sm" style={{ backgroundColor: "var(--bg-elevated)", border: "1px solid var(--bg-border)", color: "var(--color-text-muted)" }}>
        <span style={{ color: "var(--color-primary)", fontWeight: 600 }}>Lógica de defasagem: </span>
        A renda de <strong style={{ color: "var(--color-text)" }}>{getMonthLabel(month, year)}</strong> financia os gastos de{" "}
        <strong style={{ color: "var(--color-text)" }}>{getMonthLabel(month === 12 ? 1 : month + 1, month === 12 ? year + 1 : year)}</strong>.
      </div>

      {/* Resumo do Orçamento */}
      <Card className="mb-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide mb-4" style={{ color: "var(--color-text-muted)" }}>Resumo do Orçamento</h2>
        <Table>
          <Thead>
            <tr>
              <Th />
              <Th className="text-right">Orçamento</Th>
              <Th className="text-right">Atual (cartão)</Th>
              <Th className="text-right">Pago</Th>
              <Th className="text-right">Diferença</Th>
            </tr>
          </Thead>
          <Tbody>
            <tr>
              <Td className="font-medium">Renda Total</Td>
              <Td className="text-right">{formatCurrency(income.budget)}</Td>
              <Td className="text-right">{formatCurrency(income.actual)}</Td>
              <Td className="text-right">{formatCurrency(income.paid)}</Td>
              <DiffCell value={income.budget - income.actual} />
            </tr>
            <tr>
              <Td className="font-medium">Despesas Totais</Td>
              <Td className="text-right">{formatCurrency(expenses.budget)}</Td>
              <Td className="text-right">{formatCurrency(expenses.actual)}</Td>
              <Td className="text-right">{formatCurrency(expenses.paid)}</Td>
              <DiffCell value={expenses.budget - expenses.actual} />
            </tr>
          </Tbody>
          <tfoot>
            <TotalRow>
              <Td className="font-bold">Resultado</Td>
              <Td className="text-right font-bold">{formatCurrency(result.budget)}</Td>
              <Td className="text-right font-bold">{formatCurrency(result.actual)}</Td>
              <Td className="text-right font-bold">{formatCurrency(result.paid)}</Td>
              <DiffCell value={result.actual} />
            </TotalRow>
          </tfoot>
        </Table>
      </Card>

      {/* Cards de resumo rápido */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <p className="text-xs mb-2" style={{ color: "var(--color-text-muted)" }}>Renda Prevista</p>
          <p className="text-2xl font-bold" style={{ color: "var(--color-text)" }}>{formatCurrency(income.budget)}</p>
        </Card>
        <Card>
          <p className="text-xs mb-2" style={{ color: "var(--color-text-muted)" }}>Despesas Orçadas</p>
          <p className="text-2xl font-bold" style={{ color: "var(--color-text)" }}>{formatCurrency(expenses.budget)}</p>
        </Card>
        <Card>
          <p className="text-xs mb-2" style={{ color: "var(--color-text-muted)" }}>Resultado (Atual)</p>
          <p className="text-2xl font-bold" style={{ color: result.actual >= 0 ? "var(--color-success)" : "var(--color-danger)" }}>
            {formatCurrency(result.actual)}
          </p>
        </Card>
      </div>
    </>
  );
}
