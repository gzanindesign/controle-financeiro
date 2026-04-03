"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Table, Thead, Tbody, Th, Td, TotalRow } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input, Label } from "@/components/ui/Input";
import { formatCurrency } from "@/lib/utils";
import { Pencil, Trash2, Plus } from "lucide-react";

interface IncomeEntry {
  id: string;
  description: string;
  expectedAmount: number;
  actualAmount: number;
}

interface Allocation { essential: number; free: number; investment: number }
interface SpendingByKind { ESSENTIAL: number; FREE: number; INVESTMENT: number }

interface Props {
  entries: IncomeEntry[];
  month: number;
  year: number;
  allocation: Allocation;
  spendingByKind: SpendingByKind;
}

const KIND_LABELS = { ESSENTIAL: "Essencial", FREE: "Livre", INVESTMENT: "Investimento" };
const KIND_COLORS = {
  ESSENTIAL: "var(--color-primary)",
  FREE: "var(--color-success)",
  INVESTMENT: "#f59e0b",
};

export function IncomeClient({ entries: initial, month, year, allocation: initialAllocation, spendingByKind }: Props) {
  const [entries, setEntries] = useState(initial);
  const [modal, setModal] = useState<"add" | "edit" | null>(null);
  const [editing, setEditing] = useState<IncomeEntry | null>(null);
  const [form, setForm] = useState({ description: "", expectedAmount: "", actualAmount: "" });
  const [loading, setLoading] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{ message: string; onConfirm: () => void } | null>(null);

  const [alloc, setAlloc] = useState(initialAllocation);
  const [allocEditing, setAllocEditing] = useState(false);
  const [allocDraft, setAllocDraft] = useState(initialAllocation);
  const [allocSaving, setAllocSaving] = useState(false);

  const totalExpected = entries.reduce((s, e) => s + e.expectedAmount, 0);
  const totalActual = entries.reduce((s, e) => s + e.actualAmount, 0);
  const allocTotal = alloc.essential + alloc.free + alloc.investment;

  function openAdd() {
    setForm({ description: "", expectedAmount: "", actualAmount: "" });
    setModal("add");
  }

  function openEdit(e: IncomeEntry) {
    setEditing(e);
    setForm({ description: e.description, expectedAmount: String(e.expectedAmount), actualAmount: String(e.actualAmount) });
    setModal("edit");
  }

  async function save() {
    setLoading(true);
    const payload = {
      description: form.description,
      expectedAmount: parseFloat(form.expectedAmount) || 0,
      actualAmount: parseFloat(form.actualAmount) || 0,
      month,
      year,
    };

    try {
      if (modal === "add") {
        const res = await fetch("/api/income", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        if (!res.ok) throw new Error(await res.text());
        const entry = await res.json();
        setEntries((p) => [...p, entry]);
      } else if (modal === "edit" && editing) {
        const res = await fetch(`/api/income/${editing.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        if (!res.ok) throw new Error(await res.text());
        setEntries((p) => p.map((e) => (e.id === editing.id ? { ...e, ...payload } : e)));
      }
      setModal(null);
    } catch (err) {
      console.error("Erro ao salvar receita:", err);
      alert("Erro ao salvar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  function openConfirm(message: string, onConfirm: () => void) {
    setConfirmModal({ message, onConfirm });
  }

  async function remove(id: string) {
    openConfirm("Tem certeza que deseja remover esta receita?", async () => {
      await fetch(`/api/income/${id}`, { method: "DELETE" });
      setEntries((p) => p.filter((e) => e.id !== id));
    });
  }

  async function saveAlloc() {
    setAllocSaving(true);
    await fetch("/api/income-allocation", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ month, year, essential: allocDraft.essential, free: allocDraft.free, investment: allocDraft.investment }),
    });
    setAlloc(allocDraft);
    setAllocSaving(false);
    setAllocEditing(false);
  }

  const kinds = ["ESSENTIAL", "FREE", "INVESTMENT"] as const;

  return (
    <>
      {/* Tabela de receitas */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Receitas</CardTitle>
          <Button variant="primary" size="sm" onClick={openAdd}>
            <Plus size={14} className="inline mr-1" /> Adicionar
          </Button>
        </CardHeader>

        <Table>
          <Thead>
            <tr>
              <Th>Descrição</Th>
              <Th className="text-right">Previsto</Th>
              <Th className="text-right">Recebido</Th>
              <Th className="text-right">Diferença</Th>
              <Th />
            </tr>
          </Thead>
          <Tbody>
            {entries.length === 0 && (
              <tr>
                <Td colSpan={5} className="text-center py-8" style={{ color: "var(--color-text-muted)" }}>
                  Nenhuma receita cadastrada
                </Td>
              </tr>
            )}
            {entries.map((e) => {
              const diff = e.expectedAmount - e.actualAmount;
              return (
                <tr key={e.id}>
                  <Td>{e.description}</Td>
                  <Td className="text-right">{formatCurrency(e.expectedAmount)}</Td>
                  <Td className="text-right">{formatCurrency(e.actualAmount)}</Td>
                  <Td className="text-right" style={{ color: diff > 0 ? "var(--color-warning)" : diff < 0 ? "var(--color-success)" : undefined }}>
                    {formatCurrency(diff)}
                  </Td>
                  <Td className="text-right">
                    <button onClick={() => openEdit(e)} className="p-1 rounded mr-1 hover:opacity-70" style={{ color: "var(--color-text-muted)" }}><Pencil size={16} /></button>
                    <button onClick={() => remove(e.id)} className="p-1 rounded hover:opacity-70" style={{ color: "var(--color-danger)" }}><Trash2 size={16} /></button>
                  </Td>
                </tr>
              );
            })}
          </Tbody>
          {entries.length > 0 && (
            <tfoot>
              <TotalRow>
                <Td className="font-semibold">Total</Td>
                <Td className="text-right font-semibold">{formatCurrency(totalExpected)}</Td>
                <Td className="text-right font-semibold">{formatCurrency(totalActual)}</Td>
                <Td className="text-right font-semibold" style={{ color: totalExpected - totalActual > 0 ? "var(--color-warning)" : "var(--color-success)" }}>
                  {formatCurrency(totalExpected - totalActual)}
                </Td>
                <Td />
              </TotalRow>
            </tfoot>
          )}
        </Table>
      </Card>

      {/* Distribuição por tipo */}
      {totalActual > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Distribuição da Renda Real</CardTitle>
            <div className="flex gap-2">
              {allocEditing ? (
                <>
                  <Button variant="ghost" size="sm" onClick={() => { setAllocDraft(alloc); setAllocEditing(false); }}>Cancelar</Button>
                  <Button variant="primary" size="sm" onClick={saveAlloc} disabled={allocSaving}>
                    {allocSaving ? "Salvando..." : "Salvar"}
                  </Button>
                </>
              ) : (
                <Button size="sm" onClick={() => { setAllocDraft(alloc); setAllocEditing(true); }}>Editar %</Button>
              )}
            </div>
          </CardHeader>

          <p className="text-sm mb-4" style={{ color: "var(--color-text-muted)" }}>
            Baseado na renda real recebida de <strong style={{ color: "var(--color-text)" }}>{formatCurrency(totalActual)}</strong>
          </p>

          <div className="flex flex-col gap-4">
            {kinds.map((kind) => {
              const pct = allocEditing ? allocDraft[kind.toLowerCase() as keyof Allocation] : alloc[kind.toLowerCase() as keyof Allocation];
              const targetValue = (totalActual * pct) / 100;
              const spent = spendingByKind[kind];
              const diff = targetValue - spent;
              const barPct = targetValue > 0 ? Math.min((spent / targetValue) * 100, 100) : 0;
              const color = KIND_COLORS[kind];
              const overBudget = spent > targetValue && targetValue > 0;

              return (
                <div key={kind} className="rounded-lg p-4" style={{ backgroundColor: "var(--bg-elevated)", border: "1px solid var(--bg-border)" }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold" style={{ color }}>{KIND_LABELS[kind]}</span>
                      {allocEditing ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="number" min="0" max="100" step="1"
                            value={allocDraft[kind.toLowerCase() as keyof Allocation]}
                            onChange={(e) => setAllocDraft((p) => ({ ...p, [kind.toLowerCase()]: parseFloat(e.target.value) || 0 }))}
                            className="w-16 text-center text-sm rounded px-2 py-0.5"
                            style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--bg-border)", color: "var(--color-text)" }}
                          />
                          <span className="text-sm" style={{ color: "var(--color-text-muted)" }}>%</span>
                        </div>
                      ) : (
                        <span className="text-sm" style={{ color: "var(--color-text-muted)" }}>{pct}%</span>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>{formatCurrency(targetValue)}</span>
                      <span className="text-xs ml-2" style={{ color: "var(--color-text-muted)" }}>previsto</span>
                    </div>
                  </div>

                  {/* Barra de progresso */}
                  <div className="rounded-full overflow-hidden mb-2" style={{ height: 8, backgroundColor: "var(--bg-surface)" }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${barPct}%`, backgroundColor: overBudget ? "var(--color-danger)" : color }} />
                  </div>

                  <div className="flex justify-between text-xs" style={{ color: "var(--color-text-muted)" }}>
                    <span>Gasto: <strong style={{ color: overBudget ? "var(--color-danger)" : "var(--color-text)" }}>{formatCurrency(spent)}</strong></span>
                    <span style={{ color: diff >= 0 ? "var(--color-success)" : "var(--color-danger)" }}>
                      {diff >= 0 ? `Sobra ${formatCurrency(diff)}` : `Excedeu ${formatCurrency(Math.abs(diff))}`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Aviso se % não soma 100 */}
          {allocTotal > 0 && Math.abs(allocTotal - 100) > 0.1 && (
            <p className="mt-4 text-xs" style={{ color: "var(--color-danger)" }}>
              A soma dos percentuais é {allocTotal.toFixed(1)}%. O ideal é que some 100%.
            </p>
          )}
        </Card>
      )}

      {/* Modal: Receita */}
      <Modal open={modal !== null} onClose={() => setModal(null)} title={modal === "add" ? "Nova Receita" : "Editar Receita"}>
        <div className="flex flex-col gap-4">
          <div>
            <Label>Descrição</Label>
            <Input value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} placeholder="ex: Salário, Freela..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Valor Previsto (R$)</Label>
              <Input type="number" step="0.01" value={form.expectedAmount} onChange={(e) => setForm((p) => ({ ...p, expectedAmount: e.target.value }))} placeholder="0,00" />
            </div>
            <div>
              <Label>Valor Recebido (R$)</Label>
              <Input type="number" step="0.01" value={form.actualAmount} onChange={(e) => setForm((p) => ({ ...p, actualAmount: e.target.value }))} placeholder="0,00" />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="ghost" onClick={() => setModal(null)}>Cancelar</Button>
            <Button variant="primary" onClick={save} disabled={loading || !form.description}>
              {loading ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Confirmação */}
      <Modal open={!!confirmModal} onClose={() => setConfirmModal(null)} title="Confirmar exclusão">
        <div className="flex flex-col gap-5">
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>{confirmModal?.message}</p>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="ghost" onClick={() => setConfirmModal(null)}>Cancelar</Button>
            <Button variant="danger" onClick={() => { confirmModal?.onConfirm(); setConfirmModal(null); }}>Excluir</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
