"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Table, Thead, Tbody, Th, Td, TotalRow } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input, Label } from "@/components/ui/Input";
import { SelectWithNew } from "@/components/ui/SelectWithNew";
import { formatCurrency } from "@/lib/utils";
import { Plus, Trash2, Pencil } from "lucide-react";

interface Account { id: string; name: string; type: string; balance: number }

interface Props {
  accounts: Account[];
  totalIncome: number;
  totalPaid: number;
  month: number;
  year: number;
}

export function ContasClient({ accounts: initial, totalIncome, totalPaid, month, year }: Props) {
  const [accounts, setAccounts] = useState(initial);
  const [modal, setModal] = useState<"add" | "balance" | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", type: "CHECKING", balance: "" });
  const [loading, setLoading] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{ message: string; onConfirm: () => void } | null>(null);

  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);
  const expectedBalance = totalIncome - totalPaid;
  const discrepancy = totalBalance - expectedBalance;

  async function addAccount() {
    setLoading(true);
    const res = await fetch("/api/accounts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: form.name, type: form.type }) });
    const acc = await res.json();
    setAccounts((p) => [...p, { ...acc, balance: 0 }]);
    setLoading(false); setModal(null);
  }

  function openBalance(id: string) {
    const acc = accounts.find((a) => a.id === id);
    setEditingId(id); setForm((p) => ({ ...p, balance: String(acc?.balance ?? 0) })); setModal("balance");
  }

  async function saveBalance() {
    if (!editingId) return;
    setLoading(true);
    await fetch("/api/balances", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accountId: editingId, balance: parseFloat(form.balance) || 0, month, year }) });
    setAccounts((p) => p.map((a) => a.id === editingId ? { ...a, balance: parseFloat(form.balance) || 0 } : a));
    setLoading(false); setModal(null);
  }

  function remove(id: string) {
    setConfirmModal({
      message: "Tem certeza que deseja remover esta conta?",
      onConfirm: async () => {
        await fetch(`/api/accounts/${id}`, { method: "DELETE" });
        setAccounts((p) => p.filter((a) => a.id !== id));
      },
    });
  }

  return (
    <>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card>
          <p className="text-xs mb-1" style={{ color: "var(--color-text-muted)" }}>Saldo Total</p>
          <p className="text-2xl font-bold" style={{ color: "var(--color-text)" }}>{formatCurrency(totalBalance)}</p>
        </Card>
        <Card>
          <p className="text-xs mb-1" style={{ color: "var(--color-text-muted)" }}>Saldo Esperado</p>
          <p className="text-2xl font-bold" style={{ color: "var(--color-text)" }}>{formatCurrency(expectedBalance)}</p>
          <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>Renda − Pago</p>
        </Card>
        <Card>
          <p className="text-xs mb-1" style={{ color: "var(--color-text-muted)" }}>Discrepância</p>
          <p className="text-2xl font-bold" style={{ color: discrepancy === 0 ? "var(--color-text)" : discrepancy > 0 ? "var(--color-success)" : "var(--color-danger)" }}>
            {formatCurrency(discrepancy)}
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>
            {discrepancy === 0 ? "Tudo conferido" : discrepancy > 0 ? "Sobrou" : "Faltou"}
          </p>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Contas</CardTitle>
          <Button variant="primary" size="sm" onClick={() => { setForm({ name: "", type: "CHECKING", balance: "" }); setModal("add"); }}>
            <Plus size={14} className="inline mr-1" />Adicionar Conta
          </Button>
        </CardHeader>

        <Table>
          <Thead>
            <tr>
              <Th>Conta</Th>
              <Th>Tipo</Th>
              <Th className="text-right">Saldo Atual</Th>
              <Th />
            </tr>
          </Thead>
          <Tbody>
            {accounts.length === 0 && (
              <tr><Td colSpan={4} className="text-center py-8" style={{ color: "var(--color-text-muted)" }}>Nenhuma conta cadastrada</Td></tr>
            )}
            {accounts.map((a) => (
              <tr key={a.id}>
                <Td className="font-medium">{a.name}</Td>
                <Td style={{ color: "var(--color-text-muted)" }}>{a.type === "CHECKING" ? "Conta Corrente" : "Dinheiro em Mão"}</Td>
                <Td className="text-right font-medium">{formatCurrency(a.balance)}</Td>
                <Td className="text-right">
                  <button onClick={() => openBalance(a.id)} className="p-1 rounded mr-2 hover:opacity-70" style={{ color: "var(--color-text-muted)" }}><Pencil size={16} /></button>
                  <button onClick={() => remove(a.id)} className="p-1 rounded hover:opacity-70" style={{ color: "var(--color-danger)" }}><Trash2 size={16} /></button>
                </Td>
              </tr>
            ))}
          </Tbody>
          {accounts.length > 0 && (
            <tfoot>
              <TotalRow>
                <Td className="font-semibold">Total</Td>
                <Td />
                <Td className="text-right font-semibold">{formatCurrency(totalBalance)}</Td>
                <Td />
              </TotalRow>
            </tfoot>
          )}
        </Table>
      </Card>

      <Modal open={modal === "add"} onClose={() => setModal(null)} title="Nova Conta">
        <div className="flex flex-col gap-4">
          <div><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="ex: Itaú Ana, Nubank..." /></div>
          <div>
            <Label>Tipo</Label>
            <SelectWithNew
              value={form.type}
              onChange={(v) => setForm((p) => ({ ...p, type: v }))}
              options={[{ value: "CHECKING", label: "Conta Corrente" }, { value: "CASH", label: "Dinheiro em Mão" }]}
            />
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="ghost" onClick={() => setModal(null)}>Cancelar</Button>
            <Button variant="primary" onClick={addAccount} disabled={loading || !form.name}>Salvar</Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!confirmModal} onClose={() => setConfirmModal(null)} title="Confirmar exclusão">
        <div className="flex flex-col gap-4">
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>{confirmModal?.message}</p>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="ghost" onClick={() => setConfirmModal(null)}>Cancelar</Button>
            <Button variant="danger" onClick={() => { confirmModal?.onConfirm(); setConfirmModal(null); }}>Excluir</Button>
          </div>
        </div>
      </Modal>

      <Modal open={modal === "balance"} onClose={() => setModal(null)} title="Atualizar Saldo">
        <div className="flex flex-col gap-4">
          <div><Label>Saldo Atual (R$)</Label><Input type="number" step="0.01" value={form.balance} onChange={(e) => setForm((p) => ({ ...p, balance: e.target.value }))} /></div>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="ghost" onClick={() => setModal(null)}>Cancelar</Button>
            <Button variant="primary" onClick={saveBalance} disabled={loading}>Salvar</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
