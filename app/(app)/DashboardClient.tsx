"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Table, Thead, Tbody, Th, Td, TotalRow } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input, Label } from "@/components/ui/Input";
import { formatCurrency, getMonthLabel } from "@/lib/utils";
import { CalendarCheck, CheckCircle2, TrendingUp, TrendingDown, Wallet, Scale } from "lucide-react";
import { CategoryIcon } from "@/components/ui/IconPicker";

interface Section { budget: number; actual: number; paid: number }
interface Allocation { essential: number; free: number; investment: number }
interface SpendingByKind { ESSENTIAL: number; FREE: number; INVESTMENT: number }
interface SubcategoryCard { name: string; budget: number; actual: number }
interface CategoryCard { name: string; icon: string | null; color: string; budget: number; actual: number; subcategories: SubcategoryCard[] }

interface Props {
  income: Section;
  expenses: Section;
  lastUpdatedAt: string | null;
  closedAt: string | null;
  hasIncome: boolean;
  monthId: string | null;
  month: number;
  year: number;
  totalAccountBalance: number;
  allocation: Allocation;
  spendingByKind: SpendingByKind;
  categoryCards: CategoryCard[];
  upcomingPayments: { id: string; description: string; dueDay: number; daysUntilDue: number }[];
}

const KINDS = [
  { key: "ESSENTIAL" as const, label: "Essencial",     allocKey: "essential"  as const, color: "var(--color-primary)",  bg: "rgba(99,102,241,0.15)"  },
  { key: "FREE"      as const, label: "Livre",         allocKey: "free"       as const, color: "var(--color-success)",  bg: "rgba(34,197,94,0.15)"   },
  { key: "INVESTMENT"as const, label: "Investimento",  allocKey: "investment" as const, color: "#f59e0b",               bg: "rgba(245,158,11,0.15)"  },
];

function BudgetBar({ budget, actual, showLabel = false, height = 10 }: { budget: number; actual: number; showLabel?: boolean; height?: number }) {
  // Sem orçamento definido: mostra barra neutra com o gasto real
  if (budget <= 0) {
    return (
      <div className="flex flex-col gap-1">
        <div className="relative rounded-full overflow-hidden" style={{ height, backgroundColor: "var(--bg-elevated)" }}>
          {actual > 0 && (
            <div
              className="absolute left-0 top-0 h-full rounded-full"
              style={{ width: "100%", backgroundColor: "var(--color-text-muted)", opacity: 0.4 }}
            />
          )}
        </div>
        {showLabel && actual > 0 && (
          <div className="flex justify-between text-xs">
            <span style={{ color: "var(--color-text-muted)" }}>
              Gasto: <strong style={{ color: "var(--color-text)" }}>{formatCurrency(actual)}</strong>
            </span>
            <span style={{ color: "var(--color-text-muted)" }}>Sem teto definido</span>
          </div>
        )}
      </div>
    );
  }

  const over = actual > budget;
  const diff = Math.abs(actual - budget);
  // A escala da barra é sempre o maior entre budget e actual, com 20% de margem se over
  const scale = over ? actual * 1.1 : budget;
  const budgetPct = (budget / scale) * 100;
  const actualPct = Math.min((actual / scale) * 100, 100);
  const color = !over
    ? actual / budget <= 0.8 ? "var(--color-success)" : "var(--color-warning)"
    : "var(--color-danger)";

  return (
    <div className="flex flex-col gap-1">
      <div className="relative rounded-full overflow-visible" style={{ height, backgroundColor: "var(--bg-elevated)" }}>
        {/* Barra de gasto real */}
        <div
          className="absolute left-0 top-0 h-full rounded-full transition-all"
          style={{ width: `${actualPct}%`, backgroundColor: color }}
        />
        {/* Linha do teto */}
        <div
          className="absolute top-[-3px] bottom-[-3px] w-0.5 rounded-full z-10"
          style={{ left: `${budgetPct}%`, backgroundColor: "var(--color-text)", opacity: 0.5 }}
        />
      </div>
      {showLabel && (
        <div className="flex justify-between text-xs">
          <span style={{ color: "var(--color-text-muted)" }}>
            Gasto: <strong style={{ color }}>{formatCurrency(actual)}</strong>
          </span>
          <span style={{ color: over ? "var(--color-danger)" : "var(--color-success)", fontWeight: 600 }}>
            {over ? `▲ Passou ${formatCurrency(diff)}` : `▼ Sobra ${formatCurrency(diff)}`}
          </span>
        </div>
      )}
    </div>
  );
}

export function DashboardClient({ income, expenses, lastUpdatedAt, closedAt, hasIncome, monthId, month, year, totalAccountBalance, allocation, spendingByKind, categoryCards, upcomingPayments }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [updatedAt, setUpdatedAt] = useState(lastUpdatedAt);
  const [isClosed, setIsClosed] = useState(!!closedAt);

  useEffect(() => { setUpdatedAt(lastUpdatedAt); }, [lastUpdatedAt]);
  useEffect(() => { setIsClosed(!!closedAt); }, [closedAt]);
  const [saving, setSaving] = useState(false);
  const [closing, setClosing] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);

  // Modal de renda
  const [incomeModal, setIncomeModal] = useState(false);
  const [incomeForm, setIncomeForm] = useState({ description: "", expectedAmount: "", actualAmount: "" });
  const [savingIncome, setSavingIncome] = useState(false);

  // Abre modal de renda automaticamente quando redirecionado do fechar mês
  useEffect(() => {
    if (searchParams.get("registrar_renda") === "1" && !hasIncome) {
      setIncomeModal(true);
    }
  }, [searchParams, hasIncome]);

  async function markUpdated() {
    setSaving(true);
    const now = new Date().toISOString();
    if (monthId) {
      await fetch(`/api/months/${monthId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lastUpdatedAt: now }) });
    }
    setUpdatedAt(now);
    setSaving(false);
  }

  async function closeMonth() {
    setClosing(true);
    try {
      const res = await fetch("/api/months/close", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, year }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { nextMonth, nextYear, hasIncome: nextHasIncome } = await res.json();
      setIsClosed(true);
      const suffix = nextHasIncome ? "" : "&registrar_renda=1";
      router.push(`/?mes=${nextMonth}&ano=${nextYear}${suffix}`);
    } catch (err) {
      console.error("Erro ao fechar mês:", err);
      setClosing(false);
    }
  }

  async function reopenMonth() {
    if (!monthId) return;
    setClosing(true);
    try {
      await fetch(`/api/months/${monthId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ closedAt: null }),
      });
      setIsClosed(false);
    } catch (err) {
      console.error("Erro ao reabrir mês:", err);
    } finally {
      setClosing(false);
    }
  }

  async function saveIncome() {
    setSavingIncome(true);
    await fetch("/api/income", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description: incomeForm.description,
        expectedAmount: parseFloat(incomeForm.expectedAmount) || 0,
        actualAmount: parseFloat(incomeForm.actualAmount) || 0,
        month,
        year,
      }),
    });
    setSavingIncome(false);
    setIncomeModal(false);
    setIncomeForm({ description: "", expectedAmount: "", actualAmount: "" });
    // Remove o param da URL e recarrega os dados
    router.push(`/?mes=${month}&ano=${year}`);
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

  const rendaReal = income.actual;
  const despesaReal = expenses.paid;
  const saldoEsperado = rendaReal - despesaReal;
  const discrepancia = totalAccountBalance - saldoEsperado;
  const hasAllocation = allocation.essential + allocation.free + allocation.investment > 0;

  return (
    <>
      {upcomingPayments.length > 0 && (
        <div className="mb-5 rounded-xl p-4" style={{ backgroundColor: "rgba(234,179,8,0.1)", border: "1px solid rgba(234,179,8,0.3)" }}>
          <div className="flex items-center gap-2 mb-2">
            <span style={{ color: "#ca8a04", fontSize: 16 }}>⚠️</span>
            <span className="text-sm font-semibold" style={{ color: "#ca8a04" }}>
              {upcomingPayments.length === 1 ? "1 pagamento vence nos próximos 3 dias" : `${upcomingPayments.length} pagamentos vencem nos próximos 3 dias`}
            </span>
          </div>
          <ul className="flex flex-col gap-1">
            {upcomingPayments.map((p) => (
              <li key={p.id} className="flex items-center justify-between text-sm">
                <span style={{ color: "var(--color-text)" }}>{p.description}</span>
                <span className="text-xs font-medium" style={{ color: p.daysUntilDue === 0 ? "var(--color-danger)" : "#ca8a04" }}>
                  {p.daysUntilDue === 0 ? "Vence hoje" : `Vence em ${p.daysUntilDue} dia${p.daysUntilDue > 1 ? "s" : ""}`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold" style={{ color: "var(--color-text)" }}>
              Dashboard — {getMonthLabel(month, year)}
            </h1>
            {isClosed && (
              <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: "rgba(34,197,94,0.12)", color: "var(--color-success)" }}>
                <CheckCircle2 size={12} /> Fechado
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <CalendarCheck size={14} style={{ color: "var(--color-text-muted)" }} />
            <span className="text-sm" style={{ color: "var(--color-text-muted)" }}>
              {updatedAt
                ? `Atualizado em ${new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(new Date(updatedAt))}`
                : "Nunca atualizado"}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={markUpdated} disabled={saving || isClosed}>
            {saving ? "Salvando..." : "Marcar como atualizado hoje"}
          </Button>
          {isClosed ? (
            <Button variant="ghost" onClick={reopenMonth} disabled={closing}>
              {closing ? "Reabrindo..." : "Reabrir mês"}
            </Button>
          ) : (
            <Button variant="primary" onClick={() => setConfirmClose(true)} disabled={closing}>
              Fechar mês
            </Button>
          )}
        </div>
      </div>

      {/* Defasagem banner */}
      <div className="rounded-lg px-4 py-3 mb-6 text-sm" style={{ backgroundColor: "var(--bg-elevated)", border: "1px solid var(--bg-border)", color: "var(--color-text-muted)" }}>
        <span style={{ color: "var(--color-primary)", fontWeight: 600 }}>Lógica de defasagem: </span>
        A renda de <strong style={{ color: "var(--color-text)" }}>{getMonthLabel(month, year)}</strong> financia os gastos de{" "}
        <strong style={{ color: "var(--color-text)" }}>{getMonthLabel(month === 12 ? 1 : month + 1, month === 12 ? year + 1 : year)}</strong>.
      </div>

      {/* Cards de resumo — Renda Real, Despesa Real, Saldo, Discrepância */}
      <div className="grid grid-cols-2 gap-4 mb-6 lg:grid-cols-4">
        <Card>
          <div className="flex items-start justify-between mb-2">
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>Renda Real</p>
            <div className="flex items-center justify-center rounded-lg" style={{ width: 32, height: 32, backgroundColor: "rgba(34,197,94,0.12)" }}>
              <TrendingUp size={16} style={{ color: "var(--color-success)" }} />
            </div>
          </div>
          <p className="text-2xl font-bold" style={{ color: "var(--color-text)" }}>{formatCurrency(rendaReal)}</p>
          <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>O que foi recebido</p>
        </Card>
        <Card>
          <div className="flex items-start justify-between mb-2">
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>Despesa Real</p>
            <div className="flex items-center justify-center rounded-lg" style={{ width: 32, height: 32, backgroundColor: "rgba(239,68,68,0.12)" }}>
              <TrendingDown size={16} style={{ color: "var(--color-danger)" }} />
            </div>
          </div>
          <p className="text-2xl font-bold" style={{ color: "var(--color-text)" }}>{formatCurrency(despesaReal)}</p>
          <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>O que foi pago</p>
        </Card>
        <Card>
          <div className="flex items-start justify-between mb-2">
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>Saldo em Conta</p>
            <div className="flex items-center justify-center rounded-lg" style={{ width: 32, height: 32, backgroundColor: "rgba(148,163,184,0.12)" }}>
              <Wallet size={16} style={{ color: "var(--color-text-muted)" }} />
            </div>
          </div>
          <p className="text-2xl font-bold" style={{ color: totalAccountBalance >= 0 ? "var(--color-success)" : "var(--color-danger)" }}>
            {formatCurrency(totalAccountBalance)}
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>Saldo atual registrado</p>
        </Card>
        <Card>
          <div className="flex items-start justify-between mb-2">
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>Discrepância</p>
            <div className="flex items-center justify-center rounded-lg" style={{ width: 32, height: 32, backgroundColor: "rgba(99,102,241,0.12)" }}>
              <Scale size={16} style={{ color: "var(--color-primary)" }} />
            </div>
          </div>
          <p className="text-2xl font-bold" style={{ color: Math.abs(discrepancia) < 0.01 ? "var(--color-success)" : discrepancia > 0 ? "var(--color-success)" : "var(--color-danger)" }}>
            {formatCurrency(discrepancia)}
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>
            {Math.abs(discrepancia) < 0.01 ? "Tudo confere" : discrepancia > 0 ? "Saldo acima do esperado" : "Saldo abaixo do esperado"}
          </p>
        </Card>
      </div>

      {/* Resumo do Orçamento */}
      <Card className="mb-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide mb-4" style={{ color: "var(--color-text-muted)" }}>Resumo do Orçamento</h2>
        <Table>
          <Thead>
            <tr>
              <Th />
              <Th className="text-right">Orçamento</Th>
              <Th className="text-right">Atual</Th>
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

      {/* Distribuição de renda */}
      <Card className="mb-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide mb-4" style={{ color: "var(--color-text-muted)" }}>
          Distribuição da Renda
        </h2>
        {!hasAllocation ? (
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
            Defina os percentuais de distribuição na aba <strong>Renda</strong>.
          </p>
        ) : (
          <div className="flex flex-col gap-6">
            {KINDS.map(({ key, label, allocKey, color, bg }) => {
              const pct = allocation[allocKey];
              const target = (rendaReal * pct) / 100;
              const spent = spendingByKind[key];
              const barPct = target > 0 ? Math.min((spent / target) * 100, 100) : 0;
              const over = spent > target && target > 0;
              const diff = target - spent;
              return (
                <div key={key}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: bg, color }}>{label}</span>
                      <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>{pct}% · {formatCurrency(target)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span style={{ color: "var(--color-text-muted)" }}>Gasto: <strong style={{ color: over ? "var(--color-danger)" : "var(--color-text)" }}>{formatCurrency(spent)}</strong></span>
                      <span style={{ color: diff >= 0 ? "var(--color-success)" : "var(--color-danger)", fontWeight: 600 }}>
                        {diff >= 0 ? `+${formatCurrency(diff)}` : `-${formatCurrency(Math.abs(diff))}`}
                      </span>
                    </div>
                  </div>
                  <div className="rounded-full overflow-hidden" style={{ height: 6, backgroundColor: "var(--bg-elevated)" }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${barPct}%`, backgroundColor: over ? "var(--color-danger)" : color }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Modal: Confirmar fechamento do mês */}
      <Modal open={confirmClose} onClose={() => setConfirmClose(false)} title="Fechar mês" width="420px">
        <div className="flex flex-col gap-4">
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
            Tem certeza que deseja fechar{" "}
            <strong style={{ color: "var(--color-text)" }}>{getMonthLabel(month, year)}</strong>?
            <br /><br />
            Você será redirecionado para o mês seguinte e poderá registrar a renda.
          </p>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="ghost" onClick={() => setConfirmClose(false)}>Cancelar</Button>
            <Button
              variant="primary"
              disabled={closing}
              style={{ display: "flex", alignItems: "center", gap: 8 }}
              onClick={() => { setConfirmClose(false); closeMonth(); }}
            >
              {closing && (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ animation: "spin 0.7s linear infinite", flexShrink: 0 }}>
                  <circle cx="7" cy="7" r="5.5" stroke="rgba(255,255,255,0.35)" strokeWidth="2" />
                  <path d="M7 1.5a5.5 5.5 0 0 1 5.5 5.5" stroke="white" strokeWidth="2" strokeLinecap="round" />
                </svg>
              )}
              {closing ? "Fechando..." : "Confirmar fechamento"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Registrar Renda */}
      <Modal open={incomeModal} onClose={() => setIncomeModal(false)} title={`Registrar renda — ${getMonthLabel(month, year)}`} width="460px">
        <div className="flex flex-col gap-4">
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
            Registre ao menos uma fonte de renda para este mês.
          </p>
          <div>
            <Label>Descrição</Label>
            <Input
              value={incomeForm.description}
              onChange={(e) => setIncomeForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="ex: Salário, Freelance..."
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Valor esperado (R$)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={incomeForm.expectedAmount}
                onChange={(e) => setIncomeForm((p) => ({ ...p, expectedAmount: e.target.value }))}
                placeholder="0,00"
              />
            </div>
            <div>
              <Label>Valor recebido (R$)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={incomeForm.actualAmount}
                onChange={(e) => setIncomeForm((p) => ({ ...p, actualAmount: e.target.value }))}
                placeholder="0,00"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="ghost" onClick={() => setIncomeModal(false)}>Agora não</Button>
            <Button
              variant="primary"
              onClick={saveIncome}
              disabled={savingIncome || !incomeForm.description || !incomeForm.expectedAmount}
            >
              {savingIncome ? "Salvando..." : "Salvar renda"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Cards por categoria */}
      {categoryCards.length > 0 && (
        <div className="grid grid-cols-1 gap-4 mb-6 md:grid-cols-2 lg:grid-cols-3">
          {categoryCards.map((cat) => {
            const hasBudget = cat.budget > 0;
            const catOver = hasBudget && cat.actual > cat.budget;
            const catDiff = hasBudget ? Math.abs(cat.actual - cat.budget) : 0;
            const catColor = hasBudget
              ? (!catOver
                  ? cat.actual / cat.budget <= 0.8 ? "var(--color-success)" : "var(--color-warning)"
                  : "var(--color-danger)")
              : "var(--color-text-muted)";
            return (
              <Card key={cat.name} style={{ borderTop: `3px solid ${cat.color}` }}>
                {/* Cabeçalho da categoria */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center rounded-lg" style={{ width: 40, height: 40, backgroundColor: `${cat.color}22`, flexShrink: 0 }}>
                      <CategoryIcon name={cat.icon} size={20} color={cat.color} />
                    </div>
                    <span className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>{cat.name}</span>
                  </div>
                  <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                    {hasBudget
                      ? <>Teto: <strong style={{ color: "var(--color-text)" }}>{formatCurrency(cat.budget)}</strong></>
                      : "Sem teto definido"
                    }
                  </span>
                </div>
                <BudgetBar budget={cat.budget} actual={cat.actual} showLabel />
                {/* Badge de resultado da categoria */}
                {hasBudget && (
                  <div className="mt-4 mb-3">
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{
                      backgroundColor: catOver ? "rgba(239,68,68,0.12)" : "rgba(34,197,94,0.12)",
                      color: catColor,
                    }}>
                      {catOver ? `Estourou ${formatCurrency(catDiff)} acima do teto` : `${formatCurrency(catDiff)} dentro do teto`}
                    </span>
                  </div>
                )}

                {/* Divisor */}
                <div style={{ height: 1, backgroundColor: "var(--bg-border)", marginBottom: 12, marginTop: hasBudget ? 0 : 12 }} />

                {/* Subcategorias */}
                <div className="flex flex-col gap-3">
                  {cat.subcategories.map((sub) => {
                    const subHasBudget = sub.budget > 0;
                    const subOver = subHasBudget && sub.actual > sub.budget;
                    const subDiff = subHasBudget ? Math.abs(sub.actual - sub.budget) : 0;
                    const subColor = subHasBudget
                      ? (!subOver
                          ? sub.actual / sub.budget <= 0.8 ? "var(--color-success)" : "var(--color-warning)"
                          : "var(--color-danger)")
                      : "var(--color-text-muted)";
                    return (
                      <div key={sub.name}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium" style={{ color: "var(--color-text)" }}>{sub.name}</span>
                          <div className="flex items-center gap-2 text-xs">
                            {subHasBudget ? (
                              <>
                                <span style={{ color: "var(--color-text-muted)" }}>Teto {formatCurrency(sub.budget)}</span>
                                <span style={{ color: subColor, fontWeight: 600 }}>
                                  {subOver ? `▲ +${formatCurrency(subDiff)}` : `-${formatCurrency(subDiff)}`}
                                </span>
                              </>
                            ) : (
                              <span style={{ color: "var(--color-text-muted)" }}>
                                {sub.actual > 0 ? formatCurrency(sub.actual) : "Sem teto"}
                              </span>
                            )}
                          </div>
                        </div>
                        <BudgetBar budget={sub.budget} actual={sub.actual} height={6} />
                      </div>
                    );
                  })}
                </div>
              </Card>
            );
          })}
        </div>
      )}

    </>
  );
}
