"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input, Label } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { SelectWithNew } from "@/components/ui/SelectWithNew";
import { IconPicker, CategoryIcon } from "@/components/ui/IconPicker";
import { formatCurrency } from "@/lib/utils";
import { Upload, CheckCircle2, XCircle, Loader2, BookMarked } from "lucide-react";

const PALETTE = [
  { hex: "#6366f1", label: "Azul" }, { hex: "#22c55e", label: "Verde" },
  { hex: "#f97316", label: "Laranja" }, { hex: "#ec4899", label: "Rosa" },
  { hex: "#a855f7", label: "Roxo" }, { hex: "#ef4444", label: "Vermelho" },
  { hex: "#eab308", label: "Amarelo" }, { hex: "#06b6d4", label: "Ciano" },
  { hex: "#14b8a6", label: "Teal" }, { hex: "#64748b", label: "Grafite" },
];

interface CategoryItem { id: string; name: string; icon?: string | null; color?: string | null; subcategories: { id: string; name: string }[] }
interface CardItem { id: string; name: string; colorHex: string }
interface MerchantMapping {
  id: string;
  merchantCode: string;
  friendlyName: string | null;
  subcategoryId: string | null;
  subcategory: { id: string; name: string; category: { name: string } } | null;
}

interface ImportRow {
  tempId: string;
  date: string;
  description: string;
  customDescription: string;
  amount: number;
  installmentCurrent: number | null;
  installmentTotal: number | null;
  cardId: string;
  categoryId: string;
  subcategoryId: string;
  originalSubcategoryId: string;
  selected: boolean;
  rememberMerchant: boolean;
  isMapped: boolean;
  isDuplicate: boolean;
}

interface ExistingTransaction {
  date: string;
  description: string;
  amount: number;
}

interface Props {
  categories: CategoryItem[];
  cards: CardItem[];
  merchantMappings: MerchantMapping[];
  month: number;
  year: number;
  existingTransactions: ExistingTransaction[];
}

export function ImportacaoClient({ categories: initialCategories, cards, merchantMappings: initialMappings, month, year, existingTransactions }: Props) {
  const [mappings, setMappings] = useState(initialMappings);
  const [categories, setCategories] = useState(initialCategories);

  // Sincroniza mappings e categories com as props do servidor ao navegar entre meses
  useEffect(() => { setMappings(initialMappings); }, [initialMappings]);
  useEffect(() => { setCategories(initialCategories); }, [initialCategories]);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [inlineModal, setInlineModal] = useState<"newCat" | "newSub" | null>(null);
  const [pendingRowId, setPendingRowId] = useState<string | null>(null);
  const [catForm, setCatForm] = useState({ name: "", icon: "Tag", color: "#6366f1" });
  const [subForm, setSubForm] = useState({ name: "", categoryId: "", kind: "ESSENTIAL", paymentMethod: "CREDIT" });
  const fileRef = useRef<HTMLInputElement>(null);

  const defaultCardId = cards[0]?.id ?? "";

  async function saveNewCat() {
    setLoading(true);
    const res = await fetch("/api/categories", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: catForm.name, icon: catForm.icon, color: catForm.color }),
    });
    const cat = await res.json();
    const newCat = { id: cat.id, name: cat.name, icon: cat.icon ?? catForm.icon, color: cat.color ?? catForm.color, subcategories: [] };
    setCategories((p) => [...p, newCat].sort((a, b) => a.name.localeCompare(b.name)));
    if (pendingRowId) updateRow(pendingRowId, { categoryId: cat.id, subcategoryId: "" });
    setCatForm({ name: "", icon: "Tag", color: "#6366f1" });
    setLoading(false);
    setInlineModal(null);
  }

  async function saveNewSub() {
    setLoading(true);
    const catId = subForm.categoryId;
    const res = await fetch("/api/subcategories", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryId: catId, name: subForm.name, paymentMethod: subForm.paymentMethod, kind: subForm.kind }),
    });
    const sub = await res.json();
    setCategories((p) => p.map((c) => c.id === catId
      ? { ...c, subcategories: [...c.subcategories, { id: sub.id, name: sub.name }].sort((a, b) => a.name.localeCompare(b.name)) }
      : c
    ));
    if (pendingRowId) updateRow(pendingRowId, { subcategoryId: sub.id });
    setSubForm({ name: "", categoryId: "", kind: "ESSENTIAL", paymentMethod: "CREDIT" });
    setLoading(false);
    setInlineModal(null);
  }

  function resolveCardId(cardLastDigits?: string | null): string | null {
    // Casa pelos últimos 4 dígitos; se não encontrar, descarta a transação
    if (cardLastDigits) {
      const byDigits = cards.find((c) => c.name.includes(cardLastDigits));
      if (byDigits) return byDigits.id;
    }
    return null;
  }

  function buildRows(
    transactions: { date: string; description: string; amount: number; installment_current: number | null; installment_total: number | null; card_name?: string | null; card_last_digits?: string | null }[],
    dbDuplicates: Set<string>
  ): ImportRow[] {
    return transactions
      .filter((t) => resolveCardId(t.card_last_digits) !== null)
      .map((t, i) => {
      const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, "");
      const mapping = mappings.find((m) => normalize(m.merchantCode) === normalize(t.description));
      const subId = mapping?.subcategoryId ?? "";
      const catId = subId ? (categories.find((c) => c.subcategories.some((s) => s.id === subId))?.id ?? "") : "";

      // Checa duplicata em qualquer mês do banco (API) ou no mês atual em memória
      // e.date pode vir como ISO completo ("2025-12-05T03:00:00.000Z"), normaliza para YYYY-MM-DD
      const norm = (s: string) => s.toLowerCase().replace(/\s+/g, "");
      const inCurrentMonth = existingTransactions.some(
        (e) =>
          e.date.slice(0, 10) === t.date &&
          norm(e.description) === norm(t.description) &&
          Math.abs(e.amount - t.amount) < 0.01
      );
      const itemKey = `${t.date}|${norm(t.description)}|${t.amount.toFixed(2)}`;
      const isDuplicate = inCurrentMonth || dbDuplicates.has(itemKey);

      return {
        tempId: `${i}-${t.description}`,
        date: t.date,
        description: t.description,
        customDescription: "",
        amount: t.amount,
        installmentCurrent: t.installment_current,
        installmentTotal: t.installment_total,
        cardId: resolveCardId(t.card_last_digits) ?? "",
        categoryId: catId,
        subcategoryId: subId,
        originalSubcategoryId: subId,
        selected: !isDuplicate,
        rememberMerchant: false,
        isMapped: !!mapping,
        isDuplicate,
      };
    });
  }

  async function handleFile(file: File) {
    setLoading(true);
    setError(null);
    setDone(false);
    setRows([]);

    const isCsv = file.name.toLowerCase().endsWith(".csv") || file.type === "text/csv";
    const formData = new FormData();

    try {
      let res: Response;
      if (isCsv) {
        formData.append("csv", file);
        res = await fetch("/api/import-csv", { method: "POST", body: formData });
      } else {
        formData.append("pdf", file);
        res = await fetch("/api/import-pdf", { method: "POST", body: formData });
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao processar arquivo");
      if (!Array.isArray(data.transactions)) throw new Error("Formato inesperado da resposta");

      // Consulta o banco para detectar duplicatas em qualquer mês
      const checkRes = await fetch("/api/transactions/check-duplicates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: data.transactions.map((t: { date: string; description: string; amount: number }) => ({ date: t.date, description: t.description, amount: t.amount })) }),
      });
      const checkData = await checkRes.json();
      const dbDuplicates = new Set<string>((checkData.duplicates ?? []) as string[]);

      setRows(buildRows(data.transactions, dbDuplicates));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function updateRow(tempId: string, patch: Partial<ImportRow>) {
    setRows((p) => p.map((r) => r.tempId === tempId ? { ...r, ...patch } : r));
  }

  function selectAllMapped() {
    setRows((p) => p.map((r) => ({ ...r, selected: r.isMapped ? true : r.selected })));
  }

  async function importSelected() {
    const selected = rows.filter((r) => r.selected && r.subcategoryId);
    if (selected.length === 0) return;
    setImporting(true);

    try {
      // Salva mapeamentos novos
      const toRemember = selected.filter((r) => r.rememberMerchant && r.subcategoryId);
      const mappingResults = await Promise.all(toRemember.map((r) =>
        fetch("/api/merchant-mappings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ merchantCode: r.description, subcategoryId: r.subcategoryId }),
        })
      ));
      const failedMapping = mappingResults.find((r) => !r.ok);
      if (failedMapping) {
        const errData = await failedMapping.json().catch(() => ({}));
        throw new Error(`Erro ao salvar estabelecimento: ${errData?.error ?? failedMapping.status}`);
      }

      // Cria os lançamentos:
      // - month/year = mês atual da página (onde o lançamento vai aparecer)
      // - date = data original do CSV (para exibir a data real da compra)
      const results = await Promise.all(selected.map((r) =>
        fetch("/api/transactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date: r.date,
            description: r.customDescription.trim() || r.description,
            originalDescription: r.description,
            amount: r.amount,
            type: r.installmentTotal ? "INSTALLMENT" : "ONE_TIME",
            installmentCurrent: r.installmentCurrent ?? null,
            installmentTotal: r.installmentTotal ?? null,
            cardId: r.cardId || null,
            subcategoryId: r.subcategoryId || null,
            month,
            year,
          }),
        })
      ));

      // Verifica se algum request falhou
      const failed = results.find((r) => !r.ok);
      if (failed) {
        const errData = await failed.json().catch(() => ({}));
        throw new Error(errData?.error ? JSON.stringify(errData.error) : `Erro HTTP ${failed.status}`);
      }

      // Atualiza mappings locais com dados completos do servidor
      const newMappingsRes = await fetch("/api/merchant-mappings");
      const newMappings = await newMappingsRes.json();
      setMappings(newMappings.map((m: MerchantMapping) => ({
        id: m.id,
        merchantCode: m.merchantCode,
        friendlyName: m.friendlyName,
        subcategoryId: m.subcategoryId,
        subcategory: m.subcategory ?? null,
      })));
      setDone(true);
      setRows([]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setImporting(false);
    }
  }

  const selectedCount = rows.filter((r) => r.selected).length;
  const mappedCount = rows.filter((r) => r.isMapped).length;
  const readyCount = rows.filter((r) => r.selected && r.subcategoryId).length;

  return (
    <>
    <div className="flex flex-col gap-4">

      {/* Upload */}
      {rows.length === 0 && !loading && (
        <Card>
          <div
            className="flex flex-col items-center justify-center gap-3 py-12 rounded-lg cursor-pointer transition-colors"
            style={{ border: "2px dashed var(--bg-border)" }}
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
          >
            <div className="flex items-center justify-center rounded-xl" style={{ width: 56, height: 56, backgroundColor: "rgba(37,99,235,0.1)" }}>
              <Upload size={24} style={{ color: "var(--color-primary)" }} />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>Arraste a fatura aqui</p>
              <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>CSV — fatura C6 Bank</p>
            </div>
            <input ref={fileRef} type="file" accept="application/pdf,.csv,text/csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
          </div>
          {error && (
            <div className="mt-3 px-4 py-3 rounded-lg text-sm flex items-center gap-2" style={{ backgroundColor: "rgba(239,68,68,0.1)", color: "var(--color-danger)" }}>
              <XCircle size={16} /> {error}
            </div>
          )}
          {done && (
            <div className="mt-3 px-4 py-3 rounded-lg text-sm flex items-center gap-2" style={{ backgroundColor: "rgba(34,197,94,0.1)", color: "var(--color-success)" }}>
              <CheckCircle2 size={16} /> Lançamentos importados com sucesso!
            </div>
          )}
        </Card>
      )}

      {/* Loading */}
      {loading && (
        <Card>
          <div className="flex flex-col items-center justify-center gap-3 py-12">
            <Loader2 size={32} style={{ color: "var(--color-primary)", animation: "spin 0.8s linear infinite" }} />
            <p className="text-sm font-medium" style={{ color: "var(--color-text)" }}>Processando fatura...</p>
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>Aguarde um momento</p>
          </div>
        </Card>
      )}

      {/* Conciliação */}
      {rows.length > 0 && (
        <>
          {/* Sumário */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3 text-sm">
              <span style={{ color: "var(--color-text-muted)" }}>{rows.length} lançamentos extraídos</span>
              {mappedCount > 0 && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: "rgba(37,99,235,0.1)", color: "var(--color-primary)" }}>
                  <BookMarked size={11} /> {mappedCount} reconhecidos
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {mappedCount > 0 && (
                <Button variant="ghost" size="sm" onClick={selectAllMapped}>Selecionar reconhecidos</Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => setRows([])}>Cancelar</Button>
              <Button
                variant="primary"
                size="sm"
                onClick={importSelected}
                disabled={importing || readyCount === 0}
              >
                {importing ? (
                  <span className="flex items-center gap-2">
                    <Loader2 size={13} style={{ animation: "spin 0.8s linear infinite" }} /> Importando...
                  </span>
                ) : `Importar ${readyCount} lançamento${readyCount !== 1 ? "s" : ""}`}
              </Button>
            </div>
          </div>

          {error && (
            <div className="px-4 py-3 rounded-lg text-sm flex items-center gap-2" style={{ backgroundColor: "rgba(239,68,68,0.1)", color: "var(--color-danger)" }}>
              <XCircle size={16} /> {error}
            </div>
          )}

          {/* Tabela de conciliação */}
          <div className="flex flex-col gap-2">
            {rows.map((row) => {
              const filteredSubs = row.categoryId
                ? (categories.find((c) => c.id === row.categoryId)?.subcategories ?? [])
                : categories.flatMap((c) => c.subcategories);

              return (
                <div
                  key={row.tempId}
                  className="rounded-xl px-4 py-3 flex items-start gap-3"
                  style={{
                    backgroundColor: row.isMapped ? "rgba(37,99,235,0.06)" : "var(--bg-surface)",
                    border: `1px solid ${row.isMapped ? "rgba(37,99,235,0.2)" : "var(--bg-border)"}`,
                    opacity: row.selected ? 1 : 0.5,
                  }}
                >
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={row.selected}
                    disabled={row.isDuplicate}
                    onChange={(e) => updateRow(row.tempId, { selected: e.target.checked })}
                    className="mt-1"
                    style={{
                      width: 16, height: 16,
                      accentColor: "var(--color-primary)",
                      flexShrink: 0,
                      cursor: row.isDuplicate ? "not-allowed" : "pointer",
                      opacity: row.isDuplicate ? 0.4 : 1,
                    }}
                  />

                  {/* Info da transação */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium truncate" style={{ color: "var(--color-text)" }}>{row.description}</span>
                          {row.isDuplicate && (
                            <span className="text-xs px-2 py-0.5 rounded-full flex items-center gap-1 font-semibold" style={{ backgroundColor: "rgba(239,68,68,0.18)", color: "var(--color-danger)", border: "1px solid rgba(239,68,68,0.35)" }}>
                              <XCircle size={11} /> já importado
                            </span>
                          )}
                          {row.isMapped && !row.isDuplicate && (
                            <span className="text-xs px-1.5 py-0.5 rounded-full flex items-center gap-1" style={{ backgroundColor: "rgba(37,99,235,0.1)", color: "var(--color-primary)" }}>
                              <BookMarked size={10} /> reconhecido
                            </span>
                          )}
                          {row.installmentTotal && (
                            <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: "var(--bg-elevated)", color: "var(--color-text-muted)" }}>
                              {row.installmentCurrent}/{row.installmentTotal}x
                            </span>
                          )}
                        </div>
                        <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                          {row.date.split("-").reverse().join("/")}
                        </span>
                      </div>
                      <span className="text-sm font-semibold whitespace-nowrap" style={{ color: "var(--color-text)" }}>
                        {formatCurrency(row.amount)}
                      </span>
                    </div>

                    {/* Descrição personalizada */}
                    <div className="mb-2">
                      <Input
                        value={row.customDescription}
                        onChange={(e) => updateRow(row.tempId, { customDescription: e.target.value })}
                        placeholder={row.description}
                        disabled={row.isDuplicate}
                      />
                    </div>

                    {/* Campos de atribuição */}
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <Label style={{ fontSize: 11, marginBottom: 2 }}>Cartão</Label>
                        <SelectWithNew
                          value={row.cardId}
                          onChange={(v) => updateRow(row.tempId, { cardId: v })}
                          options={[{ value: "", label: "— Débito —" }, ...cards.map((c) => ({ value: c.id, label: c.name }))]}
                          disabled={row.isDuplicate}
                        />
                      </div>
                      <div>
                        <Label style={{ fontSize: 11, marginBottom: 2 }}>Categoria</Label>
                        <SelectWithNew
                          value={row.categoryId}
                          onChange={(v) => updateRow(row.tempId, { categoryId: v, subcategoryId: "" })}
                          options={categories.map((c) => ({ value: c.id, label: c.name, icon: c.icon ?? undefined, color: c.color ?? undefined }))}
                          onNew={() => { setPendingRowId(row.tempId); setCatForm({ name: "", icon: "Tag", color: "#6366f1" }); setInlineModal("newCat"); }}
                          newLabel="Nova Categoria"
                          disabled={row.isDuplicate}
                        />
                      </div>
                      <div>
                        <Label style={{ fontSize: 11, marginBottom: 2 }}>Subcategoria</Label>
                        <SelectWithNew
                          value={row.subcategoryId}
                          onChange={(v) => updateRow(row.tempId, { subcategoryId: v })}
                          options={filteredSubs.map((s) => ({ value: s.id, label: s.name }))}
                          onNew={() => { setPendingRowId(row.tempId); setSubForm({ name: "", categoryId: row.categoryId, kind: "ESSENTIAL", paymentMethod: "CREDIT" }); setInlineModal("newSub"); }}
                          newLabel="Nova Subcategoria"
                          disabled={row.isDuplicate}
                        />
                      </div>
                    </div>

                    {/* Lembrar / atualizar mapeamento */}
                    {row.subcategoryId && !row.isDuplicate && (
                      <>
                        {!row.isMapped && (
                          <label className="flex items-center gap-2 mt-2 cursor-pointer w-fit">
                            <input
                              type="checkbox"
                              checked={row.rememberMerchant}
                              onChange={(e) => updateRow(row.tempId, { rememberMerchant: e.target.checked })}
                              style={{ accentColor: "var(--color-primary)" }}
                            />
                            <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                              Lembrar este estabelecimento para próximas faturas
                            </span>
                          </label>
                        )}
                        {row.isMapped && row.subcategoryId !== row.originalSubcategoryId && (
                          <label className="flex items-center gap-2 mt-2 cursor-pointer w-fit">
                            <input
                              type="checkbox"
                              checked={row.rememberMerchant}
                              onChange={(e) => updateRow(row.tempId, { rememberMerchant: e.target.checked })}
                              style={{ accentColor: "var(--color-primary)" }}
                            />
                            <span className="text-xs" style={{ color: "var(--color-primary)" }}>
                              Atualizar mapeamento deste estabelecimento
                            </span>
                          </label>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Rodapé com total */}
          <div className="flex items-center justify-between px-4 py-3 rounded-xl" style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--bg-border)" }}>
            <span className="text-sm" style={{ color: "var(--color-text-muted)" }}>
              Total selecionado
            </span>
            <span className="text-sm font-bold" style={{ color: "var(--color-text)" }}>
              {formatCurrency(rows.filter((r) => r.selected).reduce((s, r) => s + r.amount, 0))}
            </span>
          </div>
        </>
      )}

      {/* Mapeamentos salvos */}
      {mappings.length > 0 && rows.length === 0 && !loading && (
        <Card>
          <CardHeader>
            <CardTitle>Estabelecimentos Reconhecidos</CardTitle>
          </CardHeader>
          <div className="flex flex-col gap-2">
            {mappings.map((m) => (
              <div key={m.id} className="flex items-center justify-between px-3 py-2 rounded-lg text-sm" style={{ backgroundColor: "var(--bg-elevated)" }}>
                <div className="flex items-center gap-2">
                  <BookMarked size={14} style={{ color: "var(--color-primary)" }} />
                  <span style={{ color: "var(--color-text)" }}>{m.merchantCode}</span>
                  {m.subcategory && (
                    <span style={{ color: "var(--color-text-muted)" }}>→ {m.subcategory.category.name} › {m.subcategory.name}</span>
                  )}
                </div>
                <button
                  onClick={async () => {
                    await fetch(`/api/merchant-mappings/${m.id}`, { method: "DELETE" });
                    setMappings((p) => p.filter((x) => x.id !== m.id));
                  }}
                  className="text-xs hover:opacity-70"
                  style={{ color: "var(--color-danger)" }}
                >
                  Remover
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>

    {/* Modais */}
    {/* Modal: Nova Categoria */}
    <Modal open={inlineModal === "newCat"} onClose={() => setInlineModal(null)} title="Nova Categoria" width="480px">
      <div className="flex flex-col gap-4">
        <div><Label>Nome</Label><Input value={catForm.name} onChange={(e) => setCatForm((p) => ({ ...p, name: e.target.value }))} placeholder="ex: Moradia, Lazer..." /></div>
        <div>
          <Label>Cor</Label>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {PALETTE.map(({ hex, label }) => (
              <button key={hex} title={label} type="button" onClick={() => setCatForm((p) => ({ ...p, color: hex }))}
                className="transition-transform hover:scale-110"
                style={{ width: 28, height: 28, borderRadius: "50%", backgroundColor: hex, flexShrink: 0, outline: catForm.color === hex ? `3px solid ${hex}` : "3px solid transparent", outlineOffset: 2 }}
              />
            ))}
          </div>
        </div>
        <div>
          <Label>Ícone</Label>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center justify-center rounded-lg" style={{ width: 36, height: 36, backgroundColor: `${catForm.color}22` }}>
              <CategoryIcon name={catForm.icon || "Tag"} size={18} color={catForm.color} />
            </div>
            <span className="text-sm" style={{ color: "var(--color-text-muted)" }}>{catForm.icon || "Tag"}</span>
          </div>
          <IconPicker value={catForm.icon || "Tag"} onChange={(icon) => setCatForm((p) => ({ ...p, icon }))} />
        </div>
        <div className="flex justify-end gap-2 mt-2">
          <Button variant="ghost" onClick={() => setInlineModal(null)}>Cancelar</Button>
          <Button variant="primary" onClick={saveNewCat} disabled={loading || !catForm.name}>Salvar</Button>
        </div>
      </div>
    </Modal>

    {/* Modal: Nova Subcategoria */}
    <Modal open={inlineModal === "newSub"} onClose={() => setInlineModal(null)} title="Nova Subcategoria" width="480px">
      <div className="flex flex-col gap-4">
        <div>
          <Label>Categoria</Label>
          <SelectWithNew
            value={subForm.categoryId}
            onChange={(v) => setSubForm((p) => ({ ...p, categoryId: v }))}
            options={categories.map((c) => ({ value: c.id, label: c.name, icon: c.icon ?? undefined, color: c.color ?? undefined }))}
          />
        </div>
        <div><Label>Nome</Label><Input value={subForm.name} onChange={(e) => setSubForm((p) => ({ ...p, name: e.target.value }))} placeholder="ex: Aluguel, Netflix..." /></div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Meio de Pagamento</Label>
            <SelectWithNew
              value={subForm.paymentMethod}
              onChange={(v) => setSubForm((p) => ({ ...p, paymentMethod: v }))}
              options={[{ value: "CREDIT", label: "Cartão de Crédito" }, { value: "DEBIT", label: "Débito / Conta" }]}
            />
          </div>
          <div>
            <Label>Tipo de Gasto</Label>
            <SelectWithNew
              value={subForm.kind}
              onChange={(v) => setSubForm((p) => ({ ...p, kind: v }))}
              options={[{ value: "ESSENTIAL", label: "Essencial" }, { value: "FREE", label: "Livre" }, { value: "INVESTMENT", label: "Investimento" }]}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-2">
          <Button variant="ghost" onClick={() => setInlineModal(null)}>Cancelar</Button>
          <Button variant="primary" onClick={saveNewSub} disabled={loading || !subForm.name || !subForm.categoryId}>Salvar</Button>
        </div>
      </div>
    </Modal>
    </>
  );
}
