"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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

interface Props {
  entries: IncomeEntry[];
  month: number;
  year: number;
}

export function IncomeClient({ entries: initial, month, year }: Props) {
  const router = useRouter();
  const [entries, setEntries] = useState(initial);
  const [modal, setModal] = useState<"add" | "edit" | null>(null);
  const [editing, setEditing] = useState<IncomeEntry | null>(null);
  const [form, setForm] = useState({ description: "", expectedAmount: "", actualAmount: "" });
  const [loading, setLoading] = useState(false);

  const totalExpected = entries.reduce((s, e) => s + e.expectedAmount, 0);
  const totalActual = entries.reduce((s, e) => s + e.actualAmount, 0);

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

    if (modal === "add") {
      const res = await fetch("/api/income", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const entry = await res.json();
      setEntries((p) => [...p, entry]);
    } else if (modal === "edit" && editing) {
      await fetch(`/api/income/${editing.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      setEntries((p) => p.map((e) => (e.id === editing.id ? { ...e, ...payload } : e)));
    }

    setLoading(false);
    setModal(null);
  }

  async function remove(id: string) {
    if (!confirm("Remover esta receita?")) return;
    await fetch(`/api/income/${id}`, { method: "DELETE" });
    setEntries((p) => p.filter((e) => e.id !== id));
  }

  return (
    <>
      <Card>
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
                    <button onClick={() => openEdit(e)} className="mr-2 hover:opacity-70" style={{ color: "var(--color-text-muted)" }}><Pencil size={14} /></button>
                    <button onClick={() => remove(e.id)} className="hover:opacity-70" style={{ color: "var(--color-danger)" }}><Trash2 size={14} /></button>
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
    </>
  );
}
