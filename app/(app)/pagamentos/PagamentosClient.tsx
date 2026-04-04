"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Table, Thead, Tbody, Th, Td } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input, Label } from "@/components/ui/Input";
import { Plus, Trash2, Pencil, CheckCircle2, Circle } from "lucide-react";

interface Payment {
  id: string;
  description: string;
  dueDay: number;
  isPaid: boolean;
}

interface Props {
  payments: Payment[];
  month: number;
  year: number;
}

function getDueDate(dueDay: number, month: number, year: number): Date {
  const maxDay = new Date(year, month, 0).getDate();
  return new Date(Date.UTC(year, month - 1, Math.min(dueDay, maxDay)));
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" });
}

function getDueStatus(dueDay: number, month: number, year: number, isPaid: boolean): "paid" | "overdue" | "soon" | "ok" {
  if (isPaid) return "paid";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = getDueDate(dueDay, month, year);
  const diff = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return "overdue";
  if (diff <= 3) return "soon";
  return "ok";
}

export function PagamentosClient({ payments: initial, month, year }: Props) {
  const router = useRouter();
  const [payments, setPayments] = useState(initial);
  const [modal, setModal] = useState<"add" | "edit" | null>(null);
  const [editing, setEditing] = useState<Payment | null>(null);
  const [form, setForm] = useState({ description: "", dueDay: "" });
  const [loading, setLoading] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "paid">("all");

  function openAdd() {
    setForm({ description: "", dueDay: "" });
    setModal("add");
  }

  function openEdit(p: Payment) {
    setEditing(p);
    setForm({ description: p.description, dueDay: String(p.dueDay) });
    setModal("edit");
  }

  async function save() {
    setLoading(true);
    try {
      const body = { description: form.description, dueDay: parseInt(form.dueDay) || 1 };
      if (modal === "add") {
        const res = await fetch("/api/payments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error(await res.text());
        const p = await res.json();
        setPayments((prev) => [...prev, { ...p, isPaid: false }].sort((a, b) => a.dueDay - b.dueDay));
      } else if (modal === "edit" && editing) {
        const res = await fetch(`/api/payments/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error(await res.text());
        setPayments((prev) => prev.map((p) => p.id === editing.id ? { ...p, ...body } : p).sort((a, b) => a.dueDay - b.dueDay));
      }
      setModal(null);
      setEditing(null);
      router.refresh();
    } catch {
      alert("Erro ao salvar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  async function togglePaid(p: Payment) {
    const res = await fetch(`/api/payments/${p.id}/toggle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ month, year }),
    });
    if (res.ok) {
      setPayments((prev) => prev.map((x) => x.id === p.id ? { ...x, isPaid: !p.isPaid } : x));
      router.refresh();
    }
  }

  async function confirmDelete() {
    if (!confirmId) return;
    await fetch(`/api/payments/${confirmId}`, { method: "DELETE" });
    setPayments((prev) => prev.filter((p) => p.id !== confirmId));
    setConfirmId(null);
    router.refresh();
  }

  const filtered = payments.filter((p) => {
    if (filter === "pending") return !p.isPaid;
    if (filter === "paid") return p.isPaid;
    return true;
  });

  const pendingCount = payments.filter((p) => !p.isPaid).length;
  const paidCount = payments.filter((p) => p.isPaid).length;

  const monthName = new Date(year, month - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  return (
    <>
      <p className="text-sm mb-5 capitalize" style={{ color: "var(--color-text-muted)" }}>
        Vencimentos de <strong style={{ color: "var(--color-text)" }}>{monthName}</strong>
      </p>

      {/* Filter chips */}
      <div className="flex gap-3 mb-5">
        {(["all", "pending", "paid"] as const).map((f) => {
          const label = f === "all" ? `Todos (${payments.length})` : f === "pending" ? `Pendentes (${pendingCount})` : `Pagos (${paidCount})`;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-4 py-1.5 rounded-full text-sm font-medium transition-colors"
              style={{
                backgroundColor: filter === f ? "var(--color-primary)" : "var(--bg-elevated)",
                color: filter === f ? "#fff" : "var(--color-text-muted)",
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pagamentos Fixos</CardTitle>
          <Button variant="primary" size="sm" onClick={openAdd}>
            <Plus size={14} className="inline mr-1" />Adicionar
          </Button>
        </CardHeader>

        <Table>
          <Thead>
            <tr>
              <Th>Descrição</Th>
              <Th>Vencimento</Th>
              <Th className="text-center">Status</Th>
              <Th />
            </tr>
          </Thead>
          <Tbody>
            {filtered.length === 0 && (
              <tr><Td colSpan={4} className="text-center py-8" style={{ color: "var(--color-text-muted)" }}>Nenhum pagamento cadastrado</Td></tr>
            )}
            {filtered.map((p) => {
              const dueDate = getDueDate(p.dueDay, month, year);
              const status = getDueStatus(p.dueDay, month, year, p.isPaid);
              return (
                <tr key={p.id}>
                  <Td>
                    <span style={{
                      color: status === "overdue" ? "var(--color-danger)" : "var(--color-text)",
                      textDecoration: p.isPaid ? "line-through" : "none",
                      opacity: p.isPaid ? 0.6 : 1,
                    }}>
                      {p.description}
                    </span>
                    {status === "soon" && (
                      <span className="ml-2 text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: "rgba(234,179,8,0.15)", color: "#ca8a04" }}>Vence em breve</span>
                    )}
                    {status === "overdue" && (
                      <span className="ml-2 text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: "rgba(239,68,68,0.15)", color: "var(--color-danger)" }}>Vencido</span>
                    )}
                  </Td>
                  <Td style={{ color: status === "overdue" ? "var(--color-danger)" : "var(--color-text-muted)" }}>
                    Dia {p.dueDay} &nbsp;
                    <span className="text-xs">({formatDate(dueDate)})</span>
                  </Td>
                  <Td className="text-center">
                    <button onClick={() => togglePaid(p)} className="flex items-center gap-1.5 mx-auto transition-opacity hover:opacity-70">
                      {p.isPaid
                        ? <><CheckCircle2 size={16} style={{ color: "var(--color-success)" }} /><span className="text-xs font-medium" style={{ color: "var(--color-success)" }}>Pago</span></>
                        : <><Circle size={16} style={{ color: "var(--color-text-muted)" }} /><span className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>Pendente</span></>
                      }
                    </button>
                  </Td>
                  <Td className="text-right">
                    <button onClick={() => openEdit(p)} className="p-1 rounded mr-1 hover:opacity-70" style={{ color: "var(--color-text-muted)" }}><Pencil size={16} /></button>
                    <button onClick={() => setConfirmId(p.id)} className="p-1 rounded hover:opacity-70" style={{ color: "var(--color-danger)" }}><Trash2 size={16} /></button>
                  </Td>
                </tr>
              );
            })}
          </Tbody>
        </Table>
      </Card>

      {/* Modal: Add/Edit */}
      <Modal open={modal !== null} onClose={() => { setModal(null); setEditing(null); }} title={modal === "add" ? "Novo Pagamento Fixo" : "Editar Pagamento"}>
        <div className="flex flex-col gap-4">
          <div>
            <Label>Descrição</Label>
            <Input value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} placeholder="ex: Cartão C6, Conta de Luz, Aluguel..." />
          </div>
          <div>
            <Label>Dia de Vencimento</Label>
            <Input
              type="number" min="1" max="31"
              value={form.dueDay}
              onChange={(e) => setForm((p) => ({ ...p, dueDay: e.target.value }))}
              placeholder="ex: 10"
            />
          </div>
          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            Este pagamento aparecerá como pendente em todos os meses automaticamente.
          </p>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="ghost" onClick={() => { setModal(null); setEditing(null); }}>Cancelar</Button>
            <Button variant="primary" onClick={save} disabled={loading || !form.description || !form.dueDay}>
              {loading ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Confirm Delete */}
      <Modal open={!!confirmId} onClose={() => setConfirmId(null)} title="Confirmar exclusão">
        <div className="flex flex-col gap-5">
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
            Tem certeza que deseja remover este pagamento? Ele será excluído de todos os meses.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirmId(null)}>Cancelar</Button>
            <Button variant="danger" onClick={confirmDelete}>Excluir</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
