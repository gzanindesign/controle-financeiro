"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Table, Thead, Tbody, Th, Td } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input, Label, Select } from "@/components/ui/Input";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Plus, Trash2, Check } from "lucide-react";

interface CardItem { id: string; name: string; colorHex: string }
interface SubcategoryItem { id: string; name: string; categoryName: string }
interface Transaction {
  id: string; date: string; description: string; amount: number;
  type: string; installmentCurrent: number | null; installmentTotal: number | null;
  isCounted: boolean; isPaid: boolean;
  card: CardItem | null;
  subcategory: { id: string; name: string; category: { name: string } } | null;
}

interface Props {
  transactions: Transaction[];
  cards: CardItem[];
  subcategories: SubcategoryItem[];
  month: number;
  year: number;
}

export function LancamentosClient({ transactions: initial, cards, subcategories, month, year }: Props) {
  const [txs, setTxs] = useState(initial);
  const [filter, setFilter] = useState<string>("all");
  const [modal, setModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    date: `${year}-${String(month).padStart(2, "0")}-01`,
    description: "", amount: "", type: "ONE_TIME",
    installmentTotal: "", cardId: "", subcategoryId: "",
  });

  const filtered = filter === "all" ? txs : txs.filter((t) => t.card?.id === filter);
  const cardTotals: Record<string, number> = {};
  txs.forEach((t) => { if (t.card) cardTotals[t.card.id] = (cardTotals[t.card.id] ?? 0) + t.amount; });

  async function toggle(id: string, field: "isCounted" | "isPaid") {
    const tx = txs.find((t) => t.id === id);
    if (!tx) return;
    const value = !tx[field];
    await fetch(`/api/transactions/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ [field]: value }) });
    setTxs((p) => p.map((t) => t.id === id ? { ...t, [field]: value } : t));
  }

  async function remove(id: string) {
    if (!confirm("Remover lançamento?")) return;
    await fetch(`/api/transactions/${id}`, { method: "DELETE" });
    setTxs((p) => p.filter((t) => t.id !== id));
  }

  async function save() {
    setLoading(true);
    const payload = {
      date: form.date, description: form.description,
      amount: parseFloat(form.amount) || 0, type: form.type,
      installmentTotal: form.type === "INSTALLMENT" ? parseInt(form.installmentTotal) || null : null,
      cardId: form.cardId || null, subcategoryId: form.subcategoryId || null,
      month, year,
    };

    const res = await fetch("/api/transactions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const data = await res.json();
    const newTx = Array.isArray(data) ? data[0] : data;
    const card = cards.find((c) => c.id === newTx.cardId) ?? null;
    const sub = subcategories.find((s) => s.id === newTx.subcategoryId) ?? null;
    setTxs((p) => [...p, { ...newTx, card, subcategory: sub ? { id: sub.id, name: sub.name, category: { name: sub.categoryName } } : null }]);
    setLoading(false); setModal(false);
  }

  return (
    <>
      {/* Card totals por cartão */}
      {cards.filter((c) => cardTotals[c.id]).length > 0 && (
        <div className="flex flex-wrap gap-3 mb-5">
          {cards.filter((c) => cardTotals[c.id]).map((c) => (
            <div key={c.id} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: c.colorHex }}>
              {c.name}: {formatCurrency(cardTotals[c.id])}
            </div>
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <CardTitle>Lançamentos</CardTitle>
            <Select className="w-40" value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="all">Todos</option>
              {cards.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </div>
          <Button variant="primary" size="sm" onClick={() => setModal(true)}><Plus size={14} className="inline mr-1" />Adicionar</Button>
        </CardHeader>

        <Table>
          <Thead>
            <tr>
              <Th>Data</Th>
              <Th>Descrição</Th>
              <Th>Cartão</Th>
              <Th>Categoria</Th>
              <Th>Tipo</Th>
              <Th className="text-right">Valor</Th>
              <Th className="text-center">Contado</Th>
              <Th className="text-center">Pago</Th>
              <Th />
            </tr>
          </Thead>
          <Tbody>
            {filtered.length === 0 && (
              <tr><Td colSpan={9} className="text-center py-8" style={{ color: "var(--color-text-muted)" }}>Nenhum lançamento</Td></tr>
            )}
            {filtered.map((t) => (
              <tr key={t.id}>
                <Td className="text-sm">{formatDate(t.date)}</Td>
                <Td>
                  <span>{t.description}</span>
                  {t.type === "INSTALLMENT" && t.installmentCurrent && t.installmentTotal && (
                    <span className="ml-2 text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: "var(--bg-elevated)", color: "var(--color-text-muted)" }}>
                      {t.installmentCurrent}/{t.installmentTotal}
                    </span>
                  )}
                </Td>
                <Td>
                  {t.card ? (
                    <span className="px-2 py-0.5 rounded text-xs text-white" style={{ backgroundColor: t.card.colorHex }}>{t.card.name}</span>
                  ) : "—"}
                </Td>
                <Td className="text-sm">{t.subcategory ? `${t.subcategory.category.name} › ${t.subcategory.name}` : "—"}</Td>
                <Td className="text-xs capitalize" style={{ color: "var(--color-text-muted)" }}>
                  {t.type === "FIXED" ? "Fixo" : t.type === "ONE_TIME" ? "Único" : "Parcelado"}
                </Td>
                <Td className="text-right font-medium">{formatCurrency(t.amount)}</Td>
                <Td className="text-center">
                  <button onClick={() => toggle(t.id, "isCounted")} className="w-5 h-5 rounded flex items-center justify-center mx-auto" style={{ backgroundColor: t.isCounted ? "var(--color-primary)" : "var(--bg-elevated)", border: "1px solid var(--bg-border)" }}>
                    {t.isCounted && <Check size={11} className="text-white" />}
                  </button>
                </Td>
                <Td className="text-center">
                  <button onClick={() => toggle(t.id, "isPaid")} className="w-5 h-5 rounded flex items-center justify-center mx-auto" style={{ backgroundColor: t.isPaid ? "var(--color-success)" : "var(--bg-elevated)", border: "1px solid var(--bg-border)" }}>
                    {t.isPaid && <Check size={11} className="text-white" />}
                  </button>
                </Td>
                <Td>
                  <button onClick={() => remove(t.id)} className="hover:opacity-70" style={{ color: "var(--color-danger)" }}><Trash2 size={13} /></button>
                </Td>
              </tr>
            ))}
          </Tbody>
        </Table>
      </Card>

      <Modal open={modal} onClose={() => setModal(false)} title="Novo Lançamento" width="560px">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Data</Label><Input type="date" value={form.date} onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))} /></div>
            <div><Label>Valor (R$)</Label><Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))} placeholder="0,00" /></div>
          </div>
          <div><Label>Descrição</Label><Input value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} placeholder="ex: Netflix, Supermercado..." /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Tipo</Label>
              <Select value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}>
                <option value="ONE_TIME">Único</option>
                <option value="FIXED">Fixo</option>
                <option value="INSTALLMENT">Parcelado</option>
              </Select>
            </div>
            {form.type === "INSTALLMENT" && (
              <div><Label>Nº de Parcelas</Label><Input type="number" min="2" value={form.installmentTotal} onChange={(e) => setForm((p) => ({ ...p, installmentTotal: e.target.value }))} /></div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Cartão</Label>
              <Select value={form.cardId} onChange={(e) => setForm((p) => ({ ...p, cardId: e.target.value }))}>
                <option value="">— Selecione —</option>
                {cards.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </div>
            <div>
              <Label>Subcategoria</Label>
              <Select value={form.subcategoryId} onChange={(e) => setForm((p) => ({ ...p, subcategoryId: e.target.value }))}>
                <option value="">— Selecione —</option>
                {subcategories.map((s) => <option key={s.id} value={s.id}>{s.categoryName} › {s.name}</option>)}
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="ghost" onClick={() => setModal(false)}>Cancelar</Button>
            <Button variant="primary" onClick={save} disabled={loading || !form.description || !form.amount}>
              {loading ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
