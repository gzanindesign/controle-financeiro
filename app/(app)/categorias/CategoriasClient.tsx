"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Table, Thead, Tbody, Th, Td, TotalRow } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input, Label, Select } from "@/components/ui/Input";
import { formatCurrency } from "@/lib/utils";
import { Plus, Trash2, ChevronDown, ChevronRight } from "lucide-react";

interface Card_ { id: string; name: string; colorHex: string }
interface Subcategory {
  id: string; name: string; dueDay: number | null;
  paymentMethod: string; cardId: string | null; card: Card_ | null;
  budget: number; actual: number; paid: number;
}
interface Category { id: string; name: string; subcategories: Subcategory[] }

interface Props {
  categories: Category[];
  cards: Card_[];
  month: number;
  year: number;
}

export function CategoriasClient({ categories: initial, cards, month, year }: Props) {
  const [categories, setCategories] = useState(initial);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [modal, setModal] = useState<"cat" | "sub" | "budget" | null>(null);
  const [targetCatId, setTargetCatId] = useState<string>("");
  const [targetSub, setTargetSub] = useState<Subcategory | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  function toggle(id: string) { setCollapsed((p) => ({ ...p, [id]: !p[id] })); }

  function openAddCat() { setForm({ name: "" }); setModal("cat"); }
  function openAddSub(catId: string) { setTargetCatId(catId); setForm({ name: "", dueDay: "", paymentMethod: "CREDIT", cardId: "" }); setModal("sub"); }
  function openBudget(sub: Subcategory) { setTargetSub(sub); setForm({ budgetAmount: String(sub.budget), paidAmount: String(sub.paid) }); setModal("budget"); }

  async function saveCat() {
    setLoading(true);
    const res = await fetch("/api/categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: form.name }) });
    const cat = await res.json();
    setCategories((p) => [...p, { ...cat, subcategories: [] }]);
    setLoading(false); setModal(null);
  }

  async function saveSub() {
    setLoading(true);
    const res = await fetch("/api/subcategories", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryId: targetCatId, name: form.name, dueDay: form.dueDay ? Number(form.dueDay) : null, paymentMethod: form.paymentMethod, cardId: form.cardId || null }),
    });
    const sub = await res.json();
    const card = cards.find((c) => c.id === sub.cardId) ?? null;
    setCategories((p) => p.map((c) => c.id === targetCatId ? { ...c, subcategories: [...c.subcategories, { ...sub, card, budget: 0, actual: 0, paid: 0 }] } : c));
    setLoading(false); setModal(null);
  }

  async function saveBudget() {
    if (!targetSub) return;
    setLoading(true);
    await fetch("/api/budgets", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subcategoryId: targetSub.id, month, year, budgetAmount: parseFloat(form.budgetAmount) || 0, paidAmount: parseFloat(form.paidAmount) || 0 }),
    });
    setCategories((p) => p.map((c) => ({ ...c, subcategories: c.subcategories.map((s) => s.id === targetSub.id ? { ...s, budget: parseFloat(form.budgetAmount) || 0, paid: parseFloat(form.paidAmount) || 0 } : s) })));
    setLoading(false); setModal(null);
  }

  async function deleteCat(id: string) {
    if (!confirm("Remover categoria e todas as subcategorias?")) return;
    await fetch(`/api/categories/${id}`, { method: "DELETE" });
    setCategories((p) => p.filter((c) => c.id !== id));
  }

  async function deleteSub(catId: string, subId: string) {
    if (!confirm("Remover subcategoria?")) return;
    await fetch(`/api/subcategories/${subId}`, { method: "DELETE" });
    setCategories((p) => p.map((c) => c.id === catId ? { ...c, subcategories: c.subcategories.filter((s) => s.id !== subId) } : c));
  }

  const grandTotal = { budget: 0, actual: 0, paid: 0, diff: 0 };
  categories.forEach((c) => c.subcategories.forEach((s) => {
    grandTotal.budget += s.budget; grandTotal.actual += s.actual; grandTotal.paid += s.paid; grandTotal.diff += s.budget - s.actual;
  }));

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button variant="primary" size="sm" onClick={openAddCat}><Plus size={14} className="inline mr-1" />Nova Categoria</Button>
      </div>

      {categories.map((cat) => {
        const catBudget = cat.subcategories.reduce((s, x) => s + x.budget, 0);
        const catActual = cat.subcategories.reduce((s, x) => s + x.actual, 0);
        const catPaid = cat.subcategories.reduce((s, x) => s + x.paid, 0);
        const isCollapsed = collapsed[cat.id];

        return (
          <Card key={cat.id} className="mb-4">
            <div className="flex items-center justify-between mb-3">
              <button className="flex items-center gap-2 font-semibold text-sm" style={{ color: "var(--color-text)" }} onClick={() => toggle(cat.id)}>
                {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                {cat.name}
              </button>
              <div className="flex items-center gap-3">
                <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                  Teto: {formatCurrency(catBudget)} | Atual: {formatCurrency(catActual)} | Pago: {formatCurrency(catPaid)}
                </span>
                <Button size="sm" onClick={() => openAddSub(cat.id)}><Plus size={12} className="inline mr-1" />Sub</Button>
                <button onClick={() => deleteCat(cat.id)} className="hover:opacity-70" style={{ color: "var(--color-danger)" }}><Trash2 size={14} /></button>
              </div>
            </div>

            {!isCollapsed && (
              <Table>
                <Thead>
                  <tr>
                    <Th>Subcategoria</Th>
                    <Th>Meio</Th>
                    <Th>Venc.</Th>
                    <Th className="text-right">Orçamento</Th>
                    <Th className="text-right">Atual (cartão)</Th>
                    <Th className="text-right">Pago</Th>
                    <Th className="text-right">Diferença</Th>
                    <Th />
                  </tr>
                </Thead>
                <Tbody>
                  {cat.subcategories.length === 0 && (
                    <tr><Td colSpan={8} className="text-center py-4" style={{ color: "var(--color-text-muted)" }}>Nenhuma subcategoria</Td></tr>
                  )}
                  {cat.subcategories.map((sub) => {
                    const diff = sub.budget - sub.actual;
                    return (
                      <tr key={sub.id}>
                        <Td>{sub.name}</Td>
                        <Td>
                          {sub.paymentMethod === "CREDIT" && sub.card ? (
                            <span className="px-2 py-0.5 rounded text-xs text-white" style={{ backgroundColor: sub.card.colorHex }}>{sub.card.name}</span>
                          ) : (
                            <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>Débito</span>
                          )}
                        </Td>
                        <Td>{sub.dueDay ? `Dia ${sub.dueDay}` : "—"}</Td>
                        <Td className="text-right">
                          <button onClick={() => openBudget(sub)} className="hover:underline">{formatCurrency(sub.budget)}</button>
                        </Td>
                        <Td className="text-right">{formatCurrency(sub.actual)}</Td>
                        <Td className="text-right">{formatCurrency(sub.paid)}</Td>
                        <Td className="text-right" style={{ color: diff < 0 ? "var(--color-danger)" : diff > 0 ? "var(--color-success)" : undefined }}>
                          {formatCurrency(diff)}
                        </Td>
                        <Td>
                          <button onClick={() => deleteSub(cat.id, sub.id)} className="hover:opacity-70" style={{ color: "var(--color-danger)" }}><Trash2 size={13} /></button>
                        </Td>
                      </tr>
                    );
                  })}
                </Tbody>
                {cat.subcategories.length > 0 && (
                  <tfoot>
                    <TotalRow>
                      <Td className="font-semibold">Subtotal</Td>
                      <Td /><Td />
                      <Td className="text-right font-semibold">{formatCurrency(catBudget)}</Td>
                      <Td className="text-right font-semibold">{formatCurrency(catActual)}</Td>
                      <Td className="text-right font-semibold">{formatCurrency(catPaid)}</Td>
                      <Td className="text-right font-semibold" style={{ color: catBudget - catActual < 0 ? "var(--color-danger)" : "var(--color-success)" }}>
                        {formatCurrency(catBudget - catActual)}
                      </Td>
                      <Td />
                    </TotalRow>
                  </tfoot>
                )}
              </Table>
            )}
          </Card>
        );
      })}

      {categories.length > 0 && (
        <Card>
          <Table>
            <tfoot>
              <TotalRow>
                <Td className="font-bold text-base">Total Geral</Td>
                <Td /><Td />
                <Td className="text-right font-bold">{formatCurrency(grandTotal.budget)}</Td>
                <Td className="text-right font-bold">{formatCurrency(grandTotal.actual)}</Td>
                <Td className="text-right font-bold">{formatCurrency(grandTotal.paid)}</Td>
                <Td className="text-right font-bold" style={{ color: grandTotal.diff < 0 ? "var(--color-danger)" : "var(--color-success)" }}>
                  {formatCurrency(grandTotal.diff)}
                </Td>
                <Td />
              </TotalRow>
            </tfoot>
          </Table>
        </Card>
      )}

      {/* Modal: Nova Categoria */}
      <Modal open={modal === "cat"} onClose={() => setModal(null)} title="Nova Categoria">
        <div className="flex flex-col gap-4">
          <div><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="ex: Moradia, Lazer..." /></div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setModal(null)}>Cancelar</Button>
            <Button variant="primary" onClick={saveCat} disabled={loading || !form.name}>Salvar</Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Nova Subcategoria */}
      <Modal open={modal === "sub"} onClose={() => setModal(null)} title="Nova Subcategoria">
        <div className="flex flex-col gap-4">
          <div><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Meio de Pagamento</Label>
              <Select value={form.paymentMethod} onChange={(e) => setForm((p) => ({ ...p, paymentMethod: e.target.value }))}>
                <option value="CREDIT">Cartão de Crédito</option>
                <option value="DEBIT">Débito / Conta</option>
              </Select>
            </div>
            <div><Label>Dia de Vencimento</Label><Input type="number" min="1" max="31" value={form.dueDay} onChange={(e) => setForm((p) => ({ ...p, dueDay: e.target.value }))} placeholder="ex: 10" /></div>
          </div>
          {form.paymentMethod === "CREDIT" && (
            <div>
              <Label>Cartão</Label>
              <Select value={form.cardId} onChange={(e) => setForm((p) => ({ ...p, cardId: e.target.value }))}>
                <option value="">— Selecione —</option>
                {cards.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setModal(null)}>Cancelar</Button>
            <Button variant="primary" onClick={saveSub} disabled={loading || !form.name}>Salvar</Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Orçamento */}
      <Modal open={modal === "budget"} onClose={() => setModal(null)} title={`Orçamento — ${targetSub?.name}`}>
        <div className="flex flex-col gap-4">
          <div><Label>Teto (Orçamento)</Label><Input type="number" step="0.01" value={form.budgetAmount} onChange={(e) => setForm((p) => ({ ...p, budgetAmount: e.target.value }))} /></div>
          <div><Label>Pago</Label><Input type="number" step="0.01" value={form.paidAmount} onChange={(e) => setForm((p) => ({ ...p, paidAmount: e.target.value }))} /></div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setModal(null)}>Cancelar</Button>
            <Button variant="primary" onClick={saveBudget} disabled={loading}>Salvar</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
